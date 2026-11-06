from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import timedelta

import discord

from .config import Config
from .database import Database, RadioOccurrence
from .embeds import radio_listen_links
from .radio import (
    DJ_TWITCH_STREAMS,
    LIVE,
    RadioClient,
    RadioShow,
    RadioSnapshot,
    dj_stream_url,
    parse_dj_streams,
)


LOGGER = logging.getLogger(__name__)
RADIO_LISTEN_URL = (
    "https://radio.octowow.st/public/booty_bay_pirate_radio"
)
# A scheduled show is announced once its start time has passed. If the bot was down
# at that moment it still announces on the next poll, but not once the show is this
# far in: a late ping is worse than none.
SCHEDULE_ANNOUNCE_GRACE = timedelta(minutes=10)


def radio_notification_message(
    show_name: str,
    role_id: int | None,
    listen_url: str = RADIO_LISTEN_URL,
    twitch_url: str | None = None,
    discord_url: str = "https://discord.com/channels/1547014756463026197/1568053765347741828",
) -> str:
    audience = f"<@&{role_id}>\n\n" if role_id is not None else ""
    show_name = discord.utils.escape_markdown(discord.utils.escape_mentions(show_name))
    return (
        audience
        + f"# 🏴‍☠️ Pirate Radio Announcement Service: {show_name}!\n\n"
        "AHOY SCALLYWAGS! This be the Booty Bay Pirate Radio Announcement Service, "
        f"lettin’ all ye landlubbers know that {show_name} has just gone **LIVE** "
        "on the airwaves!\n\n"
        "Raise the sails, turn it up, and enjoy the show! YARRR! 💀 📻\n\n"
        f"{radio_listen_links(listen_url, twitch_url, discord_url)}"
    )


class RadioMonitor:
    def __init__(
        self,
        bot: discord.Client,
        config: Config,
        database: Database,
        client: RadioClient,
    ):
        self.bot = bot
        self.config = config
        self.database = database
        self.client = client
        self._task: asyncio.Task[None] | None = None
        self._lock = asyncio.Lock()
        self.dj_streams = (
            parse_dj_streams(config.radio_dj_streams)
            if config.radio_dj_streams
            else dict(DJ_TWITCH_STREAMS)
        )

    def start(self) -> None:
        if self._task is not None:
            return
        if not self.config.radio_enabled:
            LOGGER.info("Radio monitoring is disabled by configuration")
            return
        if self.config.radio_channel_id is None:
            LOGGER.info("Radio monitoring is disabled because no channel is configured")
            return
        self._task = asyncio.create_task(self._loop(), name="radio-monitor")

    async def stop(self) -> None:
        task, self._task = self._task, None
        if task is None:
            return
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

    async def _loop(self) -> None:
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            try:
                await self.check()
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error in radio monitor")
            await asyncio.sleep(self.config.radio_poll_seconds)

    async def check(self) -> RadioSnapshot:
        async with self._lock:
            snapshot = await self.client.fetch()
            state, _ = await self.database.apply_radio_snapshot(
                snapshot, self.config.radio_go_live_confirmations
            )
            if snapshot.source_ok and snapshot.schedule_available:
                await self._announce_scheduled_shows(snapshot)
            # Never deliver a stale "now live" alert after the source has already
            # moved back to AutoDJ/offline. Only the currently confirmed live
            # occurrence is eligible for delivery.
            if (
                self.config.radio_live_alerts
                and snapshot.source_ok
                and snapshot.is_live
                and state.current_state == LIVE
                and state.current_occurrence_key is not None
            ):
                await self._send_pending_notifications(
                    state.current_occurrence_key
                )
            return snapshot

    def _due_scheduled_shows(self, snapshot: RadioSnapshot) -> list[RadioShow]:
        """Scheduled shows whose start time has just passed and are not too far in."""
        now = snapshot.checked_at
        due = []
        for show in snapshot.schedule:
            if show.occurrence_key is None or show.scheduled_start is None:
                continue
            if show.scheduled_start > now:
                continue
            if now - show.scheduled_start > SCHEDULE_ANNOUNCE_GRACE:
                continue
            if show.scheduled_end is not None and now >= show.scheduled_end:
                continue
            due.append(show)
        return due

    async def _announce_scheduled_shows(self, snapshot: RadioSnapshot) -> None:
        if not self.announce_channel_ids:
            return
        due = self._due_scheduled_shows(snapshot)
        if not due:
            return
        station = self.config.radio_station_shortcode
        already = await self.database.announced_radio_schedule_keys(
            station, (show.occurrence_key for show in due)
        )
        for show in due:
            if show.occurrence_key in already:
                continue
            occurrence = RadioOccurrence(
                occurrence_key=show.occurrence_key,
                station_identifier=station,
                source_event_id=show.source_event_id,
                title=show.title,
                presenter=show.presenter,
                scheduled_start=show.scheduled_start,
                scheduled_end=show.scheduled_end,
                detected_live_at=show.scheduled_start,
                detected_end_at=None,
                description=show.description,
                artwork_url=show.artwork_url,
                notification_sent=False,
                notification_message_id=None,
            )
            message_id = await self._send_occurrence(occurrence)
            if message_id is None:
                # Channel trouble: retry on the next poll while still inside the grace window.
                break
            await self.database.mark_radio_schedule_announced(
                station, show, snapshot.checked_at, message_id
            )
            LOGGER.info(
                "Announced scheduled radio show %s (%s)", show.title, show.occurrence_key
            )

    async def fetch_current(self) -> RadioSnapshot:
        """Fetch display data without changing notification/deduplication state."""
        return await self.client.fetch()

    @property
    def announce_channel_ids(self) -> list[int]:
        """The radio channel first, then any extra channels, without duplicates."""
        ids: list[int] = []
        if self.config.radio_channel_id is not None:
            ids.append(self.config.radio_channel_id)
        for channel_id in sorted(self.config.radio_extra_channel_ids):
            if channel_id not in ids:
                ids.append(channel_id)
        return ids

    async def _resolve_channel(self, channel_id: int):
        channel = self.bot.get_channel(channel_id)
        if channel is None:
            try:
                channel = await self.bot.fetch_channel(channel_id)
            except (discord.Forbidden, discord.NotFound, discord.HTTPException):
                LOGGER.exception("Could not access radio channel %s", channel_id)
                return None
        if not hasattr(channel, "send"):
            LOGGER.error("Radio channel %s cannot receive messages", channel_id)
            return None
        return channel

    async def _send_pending_notifications(self, occurrence_key: str) -> None:
        if not self.announce_channel_ids:
            return
        station = self.config.radio_station_shortcode
        # A slot already announced from the schedule is never announced again here.
        already = await self.database.announced_radio_schedule_keys(station, (occurrence_key,))
        for occurrence in await self.database.pending_radio_notifications(station):
            if occurrence.occurrence_key != occurrence_key:
                continue
            if occurrence.occurrence_key in already:
                await self.database.mark_radio_notification_sent(occurrence.occurrence_key, None)
                continue
            message_id = await self._send_occurrence(occurrence)
            if message_id is None:
                break
            await self.database.mark_radio_notification_sent(
                occurrence.occurrence_key, message_id
            )

    async def send_test_notification(self, show_name: str = "Tekeela N Trouble") -> discord.Message:
        """Send a clearly labelled radio test without changing radio deduplication state."""
        channel_id = self.config.radio_channel_id
        role_id = self.config.radio_ping_role_id
        if channel_id is None:
            raise RuntimeError("The main Pirate Radio announcement channel is not configured.")
        if role_id is None:
            raise RuntimeError("The Pirate Radio ping role is not configured.")
        channel = await self._resolve_channel(channel_id)
        if channel is None:
            raise RuntimeError("The Pirate Radio announcement channel is inaccessible.")

        guild = getattr(channel, "guild", None)
        if guild is None or guild.id != self.config.guild_id:
            raise RuntimeError("The configured radio channel is not in this server.")
        role = guild.get_role(role_id)
        if role is None:
            raise RuntimeError(f"Pirate Radio role {role_id} was not found in this server.")
        bot_member = guild.me
        if bot_member is None:
            raise RuntimeError("Could not check OctoBot channel permissions.")
        permissions = channel.permissions_for(bot_member)
        if not role.mentionable and not permissions.mention_everyone:
            raise RuntimeError(
                "The radio role is not mentionable and OctoBot lacks "
                "the Mention @everyone, @here, and All Roles permission in the radio channel."
            )

        twitch_url = dj_stream_url(show_name, self.dj_streams)
        discord_url = (
            f"https://discord.com/channels/{self.config.guild_id}/"
            f"{self.config.radio_discord_channel_id}"
        )
        content = (
            "**🧪 TEST ALERT: This is not a live broadcast.**\n\n"
            + radio_notification_message(
                show_name, role_id, self.client.public_url, twitch_url, discord_url
            )
        )
        return await channel.send(
            content=content,
            allowed_mentions=discord.AllowedMentions(
                everyone=False, users=False,
                roles=[discord.Object(id=role_id)], replied_user=False,
            ),
        )

    async def _send_occurrence(self, occurrence: RadioOccurrence) -> int | None:
        """Announce the show in every configured channel.

        Only the main radio channel pings the listener role; the extra channels get
        the same announcement without the mention, so nobody is pinged twice.
        Returns the main channel's message id, or None when nothing could be sent.
        """
        dj_name = occurrence.presenter or occurrence.title
        twitch_url = dj_stream_url(dj_name, self.dj_streams)
        discord_url = f"https://discord.com/channels/{self.config.guild_id}/{self.config.radio_discord_channel_id}"
        role_id = self.config.radio_ping_role_id
        first_message_id: int | None = None
        sent_any = False

        for index, channel_id in enumerate(self.announce_channel_ids):
            channel = await self._resolve_channel(channel_id)
            if channel is None:
                continue
            ping_here = index == 0 and role_id is not None
            allowed_mentions = (
                discord.AllowedMentions(
                    everyone=False,
                    users=False,
                    roles=[discord.Object(id=role_id)],
                    replied_user=False,
                )
                if ping_here
                else discord.AllowedMentions.none()
            )
            try:
                message = await channel.send(
                    content=radio_notification_message(
                        occurrence.title, role_id if ping_here else None, self.client.public_url, twitch_url, discord_url
                    ),
                    allowed_mentions=allowed_mentions,
                )
            except (discord.Forbidden, discord.HTTPException):
                LOGGER.exception("Could not send radio notification to %s", channel_id)
                continue
            sent_any = True
            if first_message_id is None:
                first_message_id = message.id
        return first_message_id if sent_any else None

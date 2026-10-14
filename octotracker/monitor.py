from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import datetime, timedelta, timezone

import discord

from .announcements import AnnouncementClient
from .auth import AuthProbe, AuthProbeResult
from .config import Config
from .database import (
    AuthIncidentNotification,
    Database,
    IncidentNotification,
    ReportIncidentNotification,
)
from .embeds import (
    announcement_embeds,
    authcheck_embed,
    auth_degraded_embed,
    auth_recovery_embed,
    outage_embed,
    recovery_embed,
    report_degraded_embed,
    report_recovery_embed,
    status_embed,
)
from .status import (
    CombinedStatusSnapshot,
    ServiceTransition,
    StatusClient,
    StatusSnapshot,
    combine_status,
)


LOGGER = logging.getLogger(__name__)

# Each of these is a single standing message, edited in place rather than reposted.
# The title sets let the monitor recognise its own earlier message when the stored
# id has been lost, so a channel converges on one message of each kind by itself.
STATUS_EMBED_TITLE = "OctoBot — Server Status"
STATUS_EMBED_TITLES = frozenset({
    STATUS_EMBED_TITLE,
    "OctoTracker — Server Status",  # pre-1.0.23 name, adopted and reused
})
AUTH_DIAGNOSTIC_TITLES = frozenset({"OctoWoW authentication diagnostic"})
ALERT_EMBED_TITLES = frozenset({
    "🟠 Community connection issues reported",
    "🟢 Community reports cleared",
    "🔴 OctoWoW authentication degraded",
    "🟢 OctoWoW authentication recovered",
    "🟢 OctoWoW service recovered",
    "🔴 OctoWoW outage confirmed",
    "🟠 OctoWoW outage confirmed",
    "🟡 OctoWoW outage confirmed",
    "⚪ OctoWoW outage confirmed",
})
STATUS_MESSAGE_SCAN_LIMIT = 50


class Monitor:
    def __init__(
        self,
        bot: discord.Client,
        config: Config,
        database: Database,
        status_client: StatusClient,
        auth_probe: AuthProbe,
        announcement_client: AnnouncementClient,
        patch_note_client: AnnouncementClient | None = None,
    ):
        self.bot = bot
        self.config = config
        self.database = database
        self.status_client = status_client
        self.auth_probe = auth_probe
        self.announcement_client = announcement_client
        self.patch_note_client = patch_note_client
        self._tasks: list[asyncio.Task[None]] = []
        self._status_lock = asyncio.Lock()
        self._announcement_lock = asyncio.Lock()
        self._patch_note_lock = asyncio.Lock()
        self._last_health_signature = None
        # Channel ids already reported as missing, so a wrong id in .env is logged
        # once rather than every poll.
        self._unreachable_channels: set[int] = set()

    def start(self) -> None:
        if self._tasks:
            return
        self._tasks = [
            asyncio.create_task(self._status_loop(), name="status-monitor"),
            asyncio.create_task(
                self._announcement_loop(), name="announcement-monitor"
            ),
        ]
        if self.patch_note_client is not None:
            self._tasks.append(
                asyncio.create_task(self._patch_note_loop(), name="patch-note-monitor")
            )

    async def stop(self) -> None:
        tasks, self._tasks = self._tasks, []
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError):
                await task

    async def _status_loop(self) -> None:
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            try:
                await self.check_status()
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error in status monitor")
            await asyncio.sleep(self.config.status_poll_seconds)
    async def _send_auth_diagnostic(
        self,
        result: AuthProbeResult,
    ) -> None:
        channel_id = self.config.alert_channel_id or self.config.status_channel_id

        if channel_id is None:
            return

        await self.upsert_standing_message(
            channel_id,
            f"auth_diagnostic_message_id:{channel_id}",
            authcheck_embed(result),
            AUTH_DIAGNOSTIC_TITLES,
            label="authentication diagnostic",
        )

    @staticmethod
    def _health_signature(snapshot: CombinedStatusSnapshot) -> tuple[object, ...]:
        """Return only meaningful health state, excluding volatile latency/timestamps."""
        return (
            snapshot.overall_status,
            snapshot.official.source_ok,
            tuple((realm.name, realm.status) for realm in snapshot.official.realms),
            snapshot.connectivity.status,
            snapshot.authentication.status if snapshot.authentication else None,
            snapshot.reports.degraded,
        )

    async def _send_diagnostic_if_health_changed(
        self, snapshot: CombinedStatusSnapshot
    ) -> None:
        """Establish a startup baseline, then diagnose subsequent health changes."""
        health_signature = self._health_signature(snapshot)
        health_changed = (
            self._last_health_signature is not None
            and health_signature != self._last_health_signature
        )
        self._last_health_signature = health_signature

        if not health_changed:
            return

        diagnostic = await self.probe_authentication()
        await self._send_auth_diagnostic(diagnostic)

    async def _announcement_loop(self) -> None:
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            try:
                await self.check_announcements()
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error in announcement monitor")
            await asyncio.sleep(self.config.announcement_poll_seconds)

    async def _patch_note_loop(self) -> None:
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            try:
                await self.check_patch_notes()
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error in patch note monitor")
            await asyncio.sleep(self.config.announcement_poll_seconds)

    async def check_status(self) -> CombinedStatusSnapshot:
        async with self._status_lock:
            status_result, auth_result = await asyncio.gather(
                self.status_client.fetch(), self.auth_probe.probe()
            )
            official, _ = await self.database.apply_status_result(
                status_result, self.config.confirmation_checks
            )
            connectivity = await self.database.apply_connectivity_result(
                auth_result.connectivity_result(), self.config.confirmation_checks
            )
            authentication, _ = await self.database.apply_auth_result(
                auth_result,
                self.config.auth_failure_confirmations,
                self.config.auth_recovery_confirmations,
            )
            reports = await self.database.report_summary(
                self.config.guild_id,
                self.config.report_active_minutes,
                self.config.report_degraded_threshold,
            )
            await self.database.apply_report_alert_state(
                self.config.guild_id, reports
            )
            snapshot = combine_status(
                official, connectivity, reports, authentication
            )
            await self._update_status_message(snapshot)
            await self._send_diagnostic_if_health_changed(snapshot)
            await self._send_pending_incident_alerts(official)
            await self._send_pending_auth_incident_alerts()
            await self._send_pending_report_incident_alerts(snapshot)
            return snapshot

    async def probe_authentication(self) -> AuthProbeResult:
        """Run a diagnostic probe without changing confirmed or historical state."""
        return await self.auth_probe.probe()

    async def refresh_status_from_database(self) -> CombinedStatusSnapshot:
        """Refresh the persistent dashboard using stored state without probing upstreams."""
        async with self._status_lock:
            official, connectivity, authentication = await asyncio.gather(
                self.database.get_status_snapshot(),
                self.database.get_connectivity_state(),
                self.database.get_auth_state(),
            )
            reports = await self.database.report_summary(
                self.config.guild_id,
                self.config.report_active_minutes,
                self.config.report_degraded_threshold,
            )
            await self.database.apply_report_alert_state(
                self.config.guild_id, reports
            )
            snapshot = combine_status(
                official, connectivity, reports, authentication
            )

            await self._update_status_message(snapshot)
            await self._send_diagnostic_if_health_changed(snapshot)

            await self._send_pending_incident_alerts(official)
            await self._send_pending_auth_incident_alerts()
            await self._send_pending_report_incident_alerts(snapshot)

            return snapshot

    async def make_status_embed(
        self, snapshot: CombinedStatusSnapshot
    ) -> discord.Embed:
        stats = await asyncio.gather(
            self.database.uptime_stats(timedelta(days=1)),
            self.database.uptime_stats(timedelta(days=7)),
            self.database.uptime_stats(timedelta(days=30)),
        )
        incidents, auth_incidents = await asyncio.gather(
            self.database.recent_incidents(limit=1),
            self.database.recent_auth_incidents(limit=1),
        )
        return status_embed(
            snapshot,
            list(zip(("Last 24 hours", "Last 7 days", "Last 30 days"), stats)),
            incidents[0] if incidents else None,
            self.config.confirmation_checks,
            last_auth_incident=auth_incidents[0] if auth_incidents else None,
            auth_failure_confirmations=self.config.auth_failure_confirmations,
            auth_recovery_confirmations=self.config.auth_recovery_confirmations,
        )

    async def check_announcements(self) -> None:
        await self._check_forum(
            client=self.announcement_client,
            kind="announcement",
            channel_id=self.config.announcement_channel_id,
            lock=self._announcement_lock,
        )

    async def check_patch_notes(self) -> None:
        if self.patch_note_client is None:
            return
        await self._check_forum(
            client=self.patch_note_client,
            kind="patch_note",
            channel_id=self.config.patch_note_channel_id,
            lock=self._patch_note_lock,
        )

    async def _check_forum(
        self,
        *,
        client: AnnouncementClient,
        kind: str,
        channel_id: int | None,
        lock: asyncio.Lock,
    ) -> None:
        """Store new topics from one forum and post the ones not yet delivered."""
        async with lock:
            topics = await client.fetch_topics()
            if not topics:
                return

            if not await self.database.announcements_initialized(kind):
                # First run: treat everything already on the forum as seen, so the
                # channel is not flooded with the whole back catalogue.
                await self.database.seed_announcements(topics, kind)
                LOGGER.info("Initialized %s existing %s topic(s) as seen", len(topics), kind)
                return

            known_ids = await self.database.known_topic_ids(kind)
            new_topics = [topic for topic in topics if topic.topic_id not in known_ids]
            for topic in sorted(new_topics, key=lambda item: item.topic_id):
                enriched = await client.enrich(topic)
                await self.database.store_announcement(enriched, kind=kind)

            if channel_id is None:
                return

            for announcement in await self.database.pending_announcements(kind):
                pages = announcement_embeds(announcement, kind=kind)
                progress = await self.database.announcement_delivery_progress(
                    announcement.topic_id
                )
                delivery_failed = False
                for page_number, embed in enumerate(pages[progress:], start=progress + 1):
                    if not await self._send_embed(channel_id, embed):
                        delivery_failed = True
                        break
                    await self.database.mark_announcement_page_sent(
                        announcement.topic_id, page_number
                    )
                if delivery_failed:
                    break
                await self.database.mark_announcement_sent(announcement.topic_id)

    async def latest_announcement(self):
        await self.check_announcements()
        return await self._latest(self.announcement_client, "announcement")

    async def latest_patch_note(self):
        if self.patch_note_client is None:
            return None
        await self.check_patch_notes()
        return await self._latest(self.patch_note_client, "patch_note")

    async def _latest(self, client: AnnouncementClient, kind: str):
        announcement = await self.database.latest_announcement(kind)
        if announcement is None or announcement.body:
            return announcement
        enriched = await client.enrich(announcement)
        await self.database.store_announcement(enriched, kind=kind)
        return enriched

    async def _get_channel(self, channel_id: int) -> object | None:
        channel = self.bot.get_channel(channel_id)
        if channel is not None:
            self._unreachable_channels.discard(channel_id)
            return channel
        try:
            channel = await self.bot.fetch_channel(channel_id)
        except discord.NotFound:
            # A deleted channel or a wrong id in .env: it will not fix itself, and
            # the status poll asks every few seconds, so say it once and stay quiet.
            self._report_unreachable_channel(
                channel_id,
                "Channel %s does not exist. Check the channel ids in .env.",
            )
            return None
        except discord.Forbidden:
            self._report_unreachable_channel(
                channel_id,
                "No access to channel %s. Check the bot's permissions there.",
            )
            return None
        except discord.HTTPException:
            LOGGER.warning("Could not reach Discord channel %s; will retry", channel_id)
            return None
        self._unreachable_channels.discard(channel_id)
        return channel

    def _report_unreachable_channel(self, channel_id: int, message: str) -> None:
        """Log a misconfigured channel once, not on every poll."""
        if channel_id in self._unreachable_channels:
            LOGGER.debug(message, channel_id)
            return
        self._unreachable_channels.add(channel_id)
        LOGGER.error(message, channel_id)

    async def _send_embed(self, channel_id: int, embed: discord.Embed) -> bool:
        channel = await self._get_channel(channel_id)
        if channel is None or not hasattr(channel, "send"):
            self._report_unreachable_channel(
                channel_id, "Discord channel %s cannot receive messages"
            )
            return False
        try:
            await channel.send(embed=embed)
            return True
        except (discord.Forbidden, discord.HTTPException):
            LOGGER.exception("Could not send a message to channel %s", channel_id)
            return False

    async def _update_status_message(
        self, snapshot: CombinedStatusSnapshot
    ) -> None:
        channel_id = self.config.status_channel_id
        if channel_id is None:
            return
        await self.upsert_standing_message(
            channel_id,
            f"status_message_id:{channel_id}",
            await self.make_status_embed(snapshot),
            STATUS_EMBED_TITLES,
            label="status",
        )

    async def upsert_standing_message(
        self,
        channel_id: int,
        metadata_key: str,
        embed: discord.Embed,
        titles: frozenset[str],
        *,
        label: str,
    ) -> bool:
        """Keep exactly one message of this kind in the channel, edited in place.

        The stored id is used first. When it is gone (new database, cleared
        metadata, deleted message) the monitor adopts its own earlier message of
        the same kind and deletes any duplicates, so the channel converges on one.
        """
        channel = await self._get_channel(channel_id)
        if channel is None or not hasattr(channel, "send"):
            self._report_unreachable_channel(
                channel_id, "Channel %s cannot receive messages"
            )
            return False

        message_id = await self.database.get_metadata(metadata_key)
        if message_id and hasattr(channel, "fetch_message"):
            try:
                message = await channel.fetch_message(int(message_id))
                await message.edit(embed=embed)
                return True
            except discord.NotFound:
                LOGGER.warning("The %s message is gone; looking for another", label)
            except (discord.Forbidden, discord.HTTPException, ValueError):
                LOGGER.exception("Could not update the %s message", label)
                return False

        existing = await self._find_standing_message(channel, titles, label)
        if existing is not None:
            try:
                await existing.edit(embed=embed)
                await self.database.set_metadata(metadata_key, str(existing.id))
                LOGGER.info("Reused the existing %s message %s", label, existing.id)
                return True
            except (discord.Forbidden, discord.HTTPException):
                LOGGER.exception("Could not reuse the existing %s message", label)
                return False

        try:
            message = await channel.send(embed=embed)
            await self.database.set_metadata(metadata_key, str(message.id))
            return True
        except (discord.Forbidden, discord.HTTPException):
            LOGGER.exception("Could not create the %s message", label)
            return False

    async def _find_standing_message(
        self, channel: object, titles: frozenset[str], label: str
    ):
        """The bot's own message of this kind, with any duplicates removed.

        Returns the newest one found, or None. Older copies are deleted, so a channel
        that already accumulated several is tidied up on the next poll.
        """
        me = self.bot.user
        if me is None or not hasattr(channel, "history"):
            return None
        found = []
        try:
            async for message in channel.history(limit=STATUS_MESSAGE_SCAN_LIMIT):
                if message.author.id != me.id or not message.embeds:
                    continue
                if (message.embeds[0].title or "") in titles:
                    found.append(message)
        except (discord.Forbidden, discord.HTTPException):
            LOGGER.exception("Could not read channel %s looking for the %s message", channel, label)
            return None
        if not found:
            return None

        newest, *stale = found  # history() yields newest first.
        for message in stale:
            try:
                await message.delete()
            except (discord.NotFound, discord.Forbidden, discord.HTTPException):
                LOGGER.warning("Could not remove the duplicate %s message %s", label, message.id)
        if stale:
            LOGGER.info("Removed %s duplicate %s message(s)", len(stale), label)
        return newest

    async def _upsert_alert(self, channel_id: int, embed: discord.Embed) -> bool:
        """Show the newest incident alert in one standing message."""
        return await self.upsert_standing_message(
            channel_id, f"alert_message_id:{channel_id}", embed, ALERT_EMBED_TITLES,
            label="alert",
        )

    async def _send_pending_incident_alerts(
        self, snapshot: StatusSnapshot
    ) -> None:
        channel_id = self.config.alert_channel_id
        if channel_id is None:
            return

        for notification in await self.database.pending_incident_alerts():
            embed = self._incident_embed(snapshot, notification)
            if not await self._upsert_alert(channel_id, embed):
                break
            await self.database.mark_incident_alert_sent(
                notification.incident.incident_id, notification.kind
            )

    async def _send_pending_auth_incident_alerts(self) -> None:
        channel_id = self.config.alert_channel_id
        if channel_id is None:
            return

        for notification in await self.database.pending_auth_incident_alerts():
            embed = self._auth_incident_embed(notification)
            if not await self._upsert_alert(channel_id, embed):
                break
            await self.database.mark_auth_incident_alert_sent(
                notification.incident.incident_id, notification.kind
            )

    async def _send_pending_report_incident_alerts(
        self, snapshot: CombinedStatusSnapshot
    ) -> None:
        channel_id = self.config.alert_channel_id
        if channel_id is None:
            return

        for notification in await self.database.pending_report_incident_alerts(
            self.config.guild_id
        ):
            embed = self._report_incident_embed(notification, snapshot)
            if not await self._upsert_alert(channel_id, embed):
                break
            await self.database.mark_report_incident_alert_sent(
                notification.incident.incident_id, notification.kind
            )

    @staticmethod
    def _report_incident_embed(
        notification: ReportIncidentNotification,
        snapshot: CombinedStatusSnapshot,
    ) -> discord.Embed:
        if notification.kind == "degraded":
            return report_degraded_embed(
                notification.incident, snapshot.reports, snapshot
            )
        return report_recovery_embed(notification.incident)

    @staticmethod
    def _incident_embed(
        snapshot: StatusSnapshot, notification: IncidentNotification
    ) -> discord.Embed:
        incident = notification.incident
        if notification.kind == "outage":
            transition = ServiceTransition(
                kind="outage",
                old_status="online",
                new_status=incident.initial_status,
                changed_at=incident.started_at,
                incident_id=incident.incident_id,
            )
            return outage_embed(snapshot, transition)

        ended_at = incident.ended_at or datetime.now(timezone.utc)
        transition = ServiceTransition(
            kind="recovery",
            old_status=incident.worst_status,
            new_status="online",
            changed_at=ended_at,
            incident_id=incident.incident_id,
            duration_seconds=incident.duration_seconds,
        )
        return recovery_embed(transition)

    @staticmethod
    def _auth_incident_embed(
        notification: AuthIncidentNotification,
    ) -> discord.Embed:
        if notification.kind == "degraded":
            return auth_degraded_embed(notification.incident)
        return auth_recovery_embed(notification.incident)

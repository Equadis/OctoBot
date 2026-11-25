from __future__ import annotations

import asyncio
import logging
import hashlib
import json
import re
from copy import deepcopy
from contextlib import suppress
from datetime import datetime, timedelta, timezone

import discord

from octobot.discord_api import DeferredDiscordRequest, background_api, collect

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
STATUS_PUBLISH_INTERVAL = 60
STATUS_REFRESH_INTERVAL = 900
DISCORD_FAILURES = (discord.HTTPException, discord.RateLimited, DeferredDiscordRequest, OSError, TimeoutError)


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
        self.api = background_api(bot)
        self._standing_lock = asyncio.Lock()
        self._published = {}
        self._pending_diagnostic = None
        self._standing_recovery = {}
        self._publish_lock = asyncio.Lock()
        self._publish_ready = asyncio.Event()
        self._next_snapshot = None
        self._last_published_check = None
        self._forum_delivery = {}
        self._forum_publish_ready = asyncio.Event()
        self._forum_delivery_lock = asyncio.Lock()

    def invalidate_message(self, channel_id, message_id):
        for key, (_, _, published_channel, published_id, _) in tuple(self._published.items()):
            if channel_id == published_channel and message_id == published_id:
                self._standing_recovery[key] = self._published.pop(key)

    def start(self) -> None:
        if self._tasks:
            return
        self._tasks = [
            asyncio.create_task(self._status_loop(), name="status-monitor"),
            asyncio.create_task(self._status_publish_loop(), name="status-publisher"),
            asyncio.create_task(self._forum_publish_loop(), name="forum-publisher"),
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
                self._next_snapshot = await self.check_status(publish=False)
                self._publish_ready.set()
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error in status monitor")
            await asyncio.sleep(self.config.status_poll_seconds)
    async def _status_publish_loop(self) -> None:
        while not self.bot.is_closed():
            await self._publish_ready.wait()
            self._publish_ready.clear()
            try:
                await self._publish_status(self._next_snapshot)
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error publishing Discord status")

    async def _publish_status(self, snapshot):
        async with self._publish_lock:
            checked_at = snapshot.official.checked_at
            if self._last_published_check and checked_at < self._last_published_check:
                return
            self._last_published_check = checked_at
            await self._update_status_message(snapshot)
            await self._send_diagnostic_if_health_changed(snapshot)
            await self._send_pending_incident_alerts(snapshot.official)
            await self._send_pending_auth_incident_alerts()
            await self._send_pending_report_incident_alerts(snapshot)
            await self._recover_standing_messages()

    async def _send_auth_diagnostic(
        self,
        result: AuthProbeResult,
    ) -> bool:
        channel_id = self.config.alert_channel_id or self.config.status_channel_id

        if channel_id is None:
            return True

        return await self.upsert_standing_message(
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

        if health_changed:
            self._pending_diagnostic = await self.probe_authentication()
        if self._pending_diagnostic is not None:
            if await self._send_auth_diagnostic(self._pending_diagnostic):
                self._pending_diagnostic = None

    async def _announcement_loop(self) -> None:
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            try:
                await self.check_announcements(publish=False)
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error in announcement monitor")
            await asyncio.sleep(self.config.announcement_poll_seconds)

    async def _patch_note_loop(self) -> None:
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            try:
                await self.check_patch_notes(publish=False)
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected error in patch note monitor")
            await asyncio.sleep(self.config.announcement_poll_seconds)

    async def check_status(self, *, publish=True) -> CombinedStatusSnapshot:
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
        if publish:
            await self._publish_status(snapshot)
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

        await self._publish_status(snapshot)
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

    async def check_announcements(self, *, publish=True) -> None:
        await self._check_forum(
            client=self.announcement_client,
            kind="announcement",
            channel_id=self.config.announcement_channel_id,
            lock=self._announcement_lock,
            ping_role_id=self.config.announcement_ping_role_id, publish=publish,
        )

    async def check_patch_notes(self, *, publish=True) -> None:
        if self.patch_note_client is None:
            return
        await self._check_forum(
            client=self.patch_note_client,
            kind="patch_note",
            channel_id=self.config.patch_note_channel_id,
            lock=self._patch_note_lock,
            ping_role_id=self.config.patch_note_ping_role_id, publish=publish,
        )

    async def _check_forum(
        self,
        *,
        client: AnnouncementClient,
        kind: str,
        channel_id: int | None,
        lock: asyncio.Lock,
        ping_role_id: int | None = None,
        publish: bool = True,
    ) -> None:
        """Store new topics from one forum and post the ones not yet delivered."""
        async with lock:
            topics = await client.fetch_topics()
            if not await self.database.announcements_initialized(kind):
                if not topics:
                    return
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
        if publish:
            await self._publish_forum(kind, channel_id, ping_role_id)
        else:
            self._forum_delivery[kind] = (channel_id, ping_role_id)
            self._forum_publish_ready.set()

    async def _forum_publish_loop(self):
        while not self.bot.is_closed():
            await self._forum_publish_ready.wait()
            self._forum_publish_ready.clear()
            for kind, (channel_id, ping_role_id) in tuple(self._forum_delivery.items()):
                try:
                    await self._publish_forum(kind, channel_id, ping_role_id)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    LOGGER.exception("Unexpected error publishing Discord forum updates kind=%s", kind)

    async def _publish_forum(self, kind, channel_id, ping_role_id):
        async with self._forum_delivery_lock:
            for announcement in await self.database.pending_announcements(kind):
                pages = announcement_embeds(announcement, kind=kind)
                progress = await self.database.announcement_delivery_progress(announcement.topic_id)
                for page_number, embed in enumerate(pages[progress:], start=progress + 1):
                    # Only the opening page pings, so a long post notifies once.
                    ping = ping_role_id if page_number == 1 else None
                    nonce = hashlib.sha256(
                        f"{kind}:{channel_id}:{announcement.topic_id}:{page_number}".encode()
                    ).hexdigest()[:24]
                    if not await self._send_embed(channel_id, embed, ping_role_id=ping, nonce=nonce):
                        return
                    await self.database.mark_announcement_page_sent(announcement.topic_id, page_number)
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
        try:
            return await self.api.resolve_channel(self.bot, channel_id)
        except discord.NotFound:
            LOGGER.error("Channel %s does not exist. Check the channel ids in .env.", channel_id)
        except discord.Forbidden:
            LOGGER.error("No access to channel %s. Check the bot's permissions there.", channel_id)
        except DeferredDiscordRequest:
            LOGGER.debug("Discord channel lookup deferred channel=%s", channel_id)
        except DISCORD_FAILURES:
            LOGGER.warning("Discord channel lookup failed channel=%s", channel_id)
        return None

    async def _send_embed(
        self, channel_id: int, embed: discord.Embed, *, ping_role_id: int | None = None, nonce: str | None = None,
    ) -> bool:
        channel = await self._get_channel(channel_id)
        if channel is None or not hasattr(channel, "send"):
            return False
        content = f"<@&{ping_role_id}>" if ping_role_id is not None else None
        allowed_mentions = (
            discord.AllowedMentions(
                everyone=False, users=False, replied_user=False,
                roles=[discord.Object(id=ping_role_id)],
            )
            if ping_role_id is not None
            else discord.AllowedMentions.none()
        )
        try:
            await self.api.call("channel_send", channel_id, lambda: channel.send(
                content=content, embed=embed, allowed_mentions=allowed_mentions, nonce=nonce,
            ))
            return True
        except DISCORD_FAILURES:
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
            urgent=snapshot is not None and self._health_signature(snapshot) != self._last_health_signature,
        )

    async def upsert_standing_message(
        self,
        channel_id: int,
        metadata_key: str,
        embed: discord.Embed,
        titles: frozenset[str],
        *,
        label: str,
        urgent: bool = False,
    ) -> bool:
        """Edit one persistent message, adopting an existing copy during recovery."""
        payload = deepcopy(embed.to_dict())
        payload.pop("timestamp", None)
        for field in payload.get("fields", ()):
            if field["name"] == "Authentication":
                field["value"] = re.sub(r" · \d+ ms", "", field["value"])
            elif field["name"] == "Response latency":
                field["value"] = "observed" if field["value"] != "N/A" else "N/A"
            elif field["name"] in {"Current official uptime", "Current official interruption", "Official uptime"}:
                field["value"] = ""
            elif field["value"].startswith("Ongoing since"):
                field["value"] = field["value"].split(" (", 1)[0]
        signature = json.dumps(payload, sort_keys=True)
        async with self._standing_lock:
            previous = self._published.get(metadata_key)
            if previous:
                old_signature, published_at, _, _, _ = previous
                elapsed = self.api.clock() - published_at
                if old_signature == signature and (label != "status" or elapsed < STATUS_REFRESH_INTERVAL):
                    self.api.count("standing_message", "unchanged")
                    return True
                if label == "status" and not urgent and elapsed < STATUS_PUBLISH_INTERVAL:
                    self.api.count("standing_message", "coalesced")
                    return False
            channel = await self._get_channel(channel_id)
            if channel is None or not hasattr(channel, "send"):
                return False
            try:
                message_id = await self._write_standing_message(channel, metadata_key, titles, embed)
            except DISCORD_FAILURES:
                return False
            self._standing_recovery.pop(metadata_key, None)
            self._published[metadata_key] = (signature, self.api.clock(), channel_id, message_id, embed)
            self.api.count("standing_message", "published")
            return True

    async def _write_standing_message(self, channel, key, titles, embed):
        message_id = await self.database.get_metadata(key)
        if message_id and message_id.isdecimal():
            partial = channel.get_partial_message(int(message_id))
            try:
                await self.api.call("message_edit", channel.id, lambda: partial.edit(embed=embed), cache_missing=False)
            except discord.NotFound as exc:
                if exc.code == 10003:  # Unknown Channel rather than Unknown Message.
                    raise
            else:
                return int(message_id)

        existing = await self._find_standing_message(channel, titles)
        if existing is not None:
            await self.api.call("message_edit", channel.id, lambda: existing.edit(embed=embed), cache_missing=False)
            message_id = existing.id
        else:
            # Discord's enforced nonce covers an ambiguous send within its deduplication window.
            nonce = hashlib.sha256(f"{key}:{message_id}".encode()).hexdigest()[:24]
            message = await self.api.call("channel_send", channel.id, lambda: channel.send(embed=embed, nonce=nonce))
            message_id = message.id
        await self.database.set_metadata(key, str(message_id))
        return message_id

    async def _find_standing_message(self, channel, titles):
        me = self.bot.user
        if me is None or not hasattr(channel, "history"):
            return None
        messages = await self.api.call(
            "channel_history", channel.id, lambda: collect(channel.history(limit=STATUS_MESSAGE_SCAN_LIMIT))
        )
        found = [
            message for message in messages
            if message.author.id == me.id and message.embeds and message.embeds[0].title in titles
        ]
        if not found:
            return None
        newest, *stale = found
        for message in stale:
            try:
                await self.api.call("message_delete", channel.id, message.delete, cache_missing=False)
            except DISCORD_FAILURES:
                break
        return newest

    async def _recover_standing_messages(self):
        for key, (_, _, channel_id, _, embed) in tuple(self._standing_recovery.items()):
            if key.startswith("alert_message_id:"):
                await self._upsert_alert(channel_id, embed)
            elif key.startswith("auth_diagnostic_message_id:"):
                await self.upsert_standing_message(
                    channel_id, key, embed, AUTH_DIAGNOSTIC_TITLES, label="authentication diagnostic",
                )

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

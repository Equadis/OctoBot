from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, patch

import discord

from octobot.daily_chatter import (
    ChatterStore, DailyChatterCog, ReconciliationIncomplete, announcement,
    check_database_path, day_label, latest_boundary, messages_label,
)

UTC = timezone.utc
END = datetime(2026, 11, 24, 17, tzinfo=UTC)
EXCLUDED = 1547025818914525254


def http_error(cls, status):
    return cls(NS(status=status, reason='x'), 'boom')


async def _gen(items):
    for item in items:
        yield item


class FakeChannel:
    def __init__(self, cid, messages=(), parent_id=None, error=None, archived=()):
        self.id, self.parent_id, self.error = cid, parent_id, error
        self.messages, self.archived = list(messages), list(archived)

    def history(self, limit=None, after=None, before=None, oldest_first=True):
        async def gen():
            if self.error:
                raise self.error
            for m in sorted(self.messages, key=lambda m: m.created_at):
                if (after is None or m.created_at > after) and (before is None or m.created_at < before):
                    yield m
        return gen()

    def archived_threads(self, limit=None):
        return _gen(self.archived)


def fake_message(mid, uid, when, channel, *, bot=False, webhook=None, system=False):
    return NS(id=mid, author=NS(id=uid, bot=bot), created_at=when, webhook_id=webhook,
              is_system=lambda: system, guild=NS(id=123), channel=channel)


class DailyChatterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = ChatterStore(Path(self.tmp.name) / 'bot.db', 123)
        await self.store.connect(END - timedelta(hours=1))

    async def asyncTearDown(self):
        await self.store.close()
        self.tmp.cleanup()

    async def record(self, mid, uid, when):
        await self.store.record(NS(id=mid, author=NS(id=uid), created_at=when))

    def test_boundary_and_dates(self):
        self.assertEqual(latest_boundary(END), END)
        self.assertEqual(latest_boundary(END - timedelta(seconds=1)), END - timedelta(days=1))
        self.assertEqual(latest_boundary(END + timedelta(hours=23)), END)
        for n, suffix in [(1, 'st'), (2, 'nd'), (3, 'rd'), (11, 'th'), (12, 'th'), (13, 'th'), (21, 'st')]:
            self.assertEqual(day_label(END.replace(day=n)), f'{n}{suffix} Nov')

    async def test_window_dedup_ties_and_restart(self):
        await self.record(1, 20, END - timedelta(days=1))
        await self.record(1, 20, END - timedelta(days=1))
        await self.record(2, 10, END - timedelta(seconds=1))
        await self.record(3, 30, END)
        await self.record(4, 40, END - timedelta(days=1, seconds=1))
        self.assertEqual(await self.store.counts(END), [(10, 1), (20, 1)])
        await self.store.close()
        await self.store.connect(END + timedelta(minutes=1))
        self.assertIsNone(await self.store.run(END))
        self.assertEqual(await self.store.counts(END), [(10, 1), (20, 1)])

    async def make_cog(self):
        role = NS(id=777)
        events = []
        members = []
        for uid, has_role in [(1, False), (2, True), (3, True)]:
            member = NS(id=uid, bot=False, roles=[role] if has_role else [])
            async def remove(r, *, reason, m=member):
                events.append(('remove', m.id))
                m.roles.remove(r)
            async def add(r, *, reason, m=member):
                events.append(('add', m.id))
                m.roles.append(r)
            member.remove_roles = AsyncMock(side_effect=remove)
            member.add_roles = AsyncMock(side_effect=add)
            members.append(member)
        async def fetch_members(limit):
            for member in members:
                yield member
        self.departed = set()
        by_id = {m.id: m for m in members}

        async def fetch_member(uid):
            if uid in by_id and uid not in self.departed:
                return by_id[uid]
            raise http_error(discord.NotFound, 404)
        self.channels = []
        guild = NS(id=123, get_role=lambda rid: role, fetch_members=fetch_members,
                   get_member=lambda uid: None, fetch_member=fetch_member,
                   text_channels=self.channels, voice_channels=[], stage_channels=[],
                   forum_channels=[], threads=[])
        self.guild = guild
        message = NS(id=999, edit=AsyncMock())
        channel = NS(guild=guild, send=AsyncMock(return_value=message),
                     get_partial_message=lambda mid: message, history=lambda **kw: _gen([]))
        bot = NS(config=NS(database_path=self.store.path, guild_id=123,
                           daily_chatter_role_id=777, daily_chatter_channel_id=888),
                 get_guild=lambda gid: guild, get_channel=lambda cid: channel, user=NS(id=555))
        cog = DailyChatterCog(bot)
        cog.store = self.store
        await self.record(1, 1, END - timedelta(hours=1))
        await self.record(2, 1, END - timedelta(hours=1))
        await self.record(3, 2, END - timedelta(hours=1))
        return cog, events, members, channel, message

    async def test_handover_placeholder_edit_and_no_repeat(self):
        cog, events, members, channel, message = await self.make_cog()
        await cog.award(END)
        self.assertEqual(events, [('remove', 2), ('remove', 3), ('add', 1)])
        self.assertEqual(sum(bool(m.roles) for m in members), 1)
        initial = channel.send.call_args.args[0]
        self.assertIn('# Top Daily Chatter: @ - (24th Nov)', initial)
        self.assertNotIn('<@', initial)
        edited = message.edit.call_args.kwargs['content']
        self.assertIn('<@1>', edited)
        self.assertIn('<@&777>', edited)
        self.assertIn('with 2 messages and', edited)
        self.assertIn('2nd place: <@2> - 1 message', edited)
        self.assertNotIn('1 messages', edited)
        send_mentions = channel.send.call_args.kwargs['allowed_mentions'].to_dict()
        self.assertEqual(send_mentions, {'parse': []})
        self.assertTrue(channel.send.call_args.kwargs['silent'])
        edit_mentions = message.edit.call_args.kwargs['allowed_mentions'].to_dict()
        self.assertEqual(edit_mentions['parse'], [])  # roles/everyone never ping
        self.assertEqual(sorted(edit_mentions['users']), [1, 2])
        await cog.award(END)
        self.assertEqual(channel.send.await_count, 1)
        self.assertEqual(message.edit.await_count, 1)

    async def test_exalted_preview_is_read_only_and_renders_real_ranking(self):
        cog, events, members, channel, message = await self.make_cog()
        preview = await cog.test_preview(END - timedelta(minutes=1))
        self.assertIn("TEST ALERT: Daily Exalted", preview)
        self.assertIn("no notifications or role changes", preview)
        self.assertIn("# Top Daily Chatter: <@1> - (24th Nov)", preview)
        self.assertIn("<@&777>", preview)
        self.assertIn("2nd place: <@2> - 1 message", preview)
        self.assertEqual(events, [])
        channel.send.assert_not_awaited()
        message.edit.assert_not_awaited()
        for member in members:
            member.add_roles.assert_not_awaited()
            member.remove_roles.assert_not_awaited()
        self.assertIsNone(await self.store.run(END))

    async def test_exalted_preview_with_no_activity_does_not_invent_winner(self):
        cog, events, _, channel, _ = await self.make_cog()
        preview = await cog.test_preview(END + timedelta(days=3))
        self.assertIn("No eligible chat messages", preview)
        self.assertNotIn("has been awarded", preview)
        self.assertEqual(events, [])
        channel.send.assert_not_awaited()

    async def test_removal_failure_never_grants_second_holder(self):
        cog, _, members, channel, _ = await self.make_cog()
        members[1].remove_roles.side_effect = RuntimeError('role hierarchy')
        with self.assertRaises(RuntimeError):
            await cog.award(END)
        members[0].add_roles.assert_not_awaited()
        channel.send.assert_not_awaited()

    async def test_failed_edit_retries_same_message(self):
        cog, _, _, channel, message = await self.make_cog()
        message.edit.side_effect = [RuntimeError('network'), None]
        with self.assertRaises(RuntimeError):
            await cog.award(END)
        await cog.award(END)
        self.assertEqual(channel.send.await_count, 1)
        self.assertEqual(message.edit.await_count, 2)
        self.assertTrue((await self.store.run(END))[2])

    async def test_empty_day_expires_role_without_post(self):
        cog, events, members, channel, _ = await self.make_cog()
        await cog.award(END + timedelta(days=1))
        self.assertEqual(events, [('remove', 2), ('remove', 3)])
        self.assertFalse(any(m.roles for m in members))
        channel.send.assert_not_awaited()

    async def test_listener_exclusions(self):
        cog, _, _, _, _ = await self.make_cog()
        def msg(mid, **kwargs):
            base = dict(id=mid, guild=NS(id=123), author=NS(id=5, bot=False),
                        channel=NS(id=789, parent_id=None),
                        webhook_id=None, created_at=END - timedelta(minutes=1), is_system=lambda: False)
            base.update(kwargs)
            return NS(**base)
        await cog.on_message(msg(100))
        await cog.on_message(msg(101, guild=None))
        await cog.on_message(msg(102, guild=NS(id=456)))
        await cog.on_message(msg(103, author=NS(id=6, bot=True)))
        await cog.on_message(msg(104, webhook_id=123))
        await cog.on_message(msg(105, is_system=lambda: True))
        for index, channel_id in enumerate((1547025818914525254, 1547064843909988433)):
            await cog.on_message(msg(110 + index, channel=NS(id=channel_id, parent_id=None)))
            await cog.on_message(msg(120 + index, channel=NS(id=999, parent_id=channel_id)))
        await cog.on_message(msg(130, channel=NS(id=998, parent_id=789)))
        self.assertEqual(dict(await self.store.counts(END))[5], 2)
        self.assertNotIn(6, dict(await self.store.counts(END)))

    # ---- reliability regression tests ----

    def test_plural_formatting(self):
        self.assertEqual(messages_label(1), '1 message')
        self.assertEqual(messages_label(0), '0 messages')
        self.assertEqual(messages_label(2), '2 messages')
        text = announcement([(1, 1), (2, 2), (3, 1)], END, 777, mentions=True)
        self.assertIn('with 1 message and', text)
        self.assertIn('2nd place: <@2> - 2 messages', text)
        self.assertIn('3rd place: <@3> - 1 message', text)
        self.assertNotIn('1 messages', text)

    async def test_backfill_recovers_dedups_and_respects_boundaries(self):
        cog, *_ = await self.make_cog()
        start = END - timedelta(days=1)
        main, thread = FakeChannel(10), FakeChannel(11, parent_id=10)
        excluded, excl_thread = FakeChannel(EXCLUDED), FakeChannel(12, parent_id=EXCLUDED)
        self.channels.extend([main, excluded])
        self.guild.threads.extend([thread, excl_thread])
        main.messages = [
            fake_message(1, 1, END - timedelta(hours=1), main),          # already live-recorded
            fake_message(50, 7, start + timedelta(seconds=1), main),
            fake_message(51, 7, END, main),                              # end boundary: excluded
            fake_message(52, 7, start - timedelta(seconds=1), main),     # before window
            fake_message(53, 8, END - timedelta(hours=2), main, bot=True),
            fake_message(54, 8, END - timedelta(hours=2), main, webhook=9),
            fake_message(55, 8, END - timedelta(hours=2), main, system=True),
        ]
        thread.messages = [fake_message(60, 7, END - timedelta(hours=3), thread)]
        excluded.messages = [fake_message(70, 9, END - timedelta(hours=3), excluded)]
        excl_thread.messages = [fake_message(71, 9, END - timedelta(hours=3), excl_thread)]
        result = await cog.reconcile_window(self.guild, END)
        self.assertEqual(result.recovered, 2)  # messages 50 and 60 only
        counts = dict(await self.store.counts(END))
        self.assertEqual(counts[7], 2)
        self.assertEqual(counts[1], 2)  # live rows not inflated by the backfill
        self.assertNotIn(8, counts)
        self.assertNotIn(9, counts)
        again = await cog.backfill(self.guild, start, END)
        self.assertEqual(again.recovered, 0)
        self.assertEqual(dict(await self.store.counts(END))[7], 2)

    async def test_archived_threads_are_scanned(self):
        cog, *_ = await self.make_cog()
        parent = FakeChannel(10)
        arch = FakeChannel(13, parent_id=10)
        arch.archive_timestamp = END - timedelta(hours=2)
        old = FakeChannel(14, parent_id=10)
        old.archive_timestamp = END - timedelta(days=5)
        parent.archived = [arch, old]
        arch.messages = [fake_message(80, 7, END - timedelta(hours=3), arch)]
        old.messages = [fake_message(81, 7, END - timedelta(hours=3), old)]
        self.channels.append(parent)
        await cog.reconcile_window(self.guild, END)
        self.assertEqual(dict(await self.store.counts(END))[7], 1)

    async def test_backfill_state_survives_restart(self):
        cog, *_ = await self.make_cog()
        main = FakeChannel(10)
        self.channels.append(main)
        main.messages = [fake_message(90, 7, END - timedelta(hours=5), main)]
        await cog.reconcile_window(self.guild, END)
        await self.store.close()
        await self.store.connect()
        self.assertEqual(dict(await self.store.counts(END))[7], 1)
        self.assertTrue(await self.store.is_reconciled(10, END - timedelta(days=1), END))
        main.error = RuntimeError('must not be rescanned')  # marker prevents a second scan
        await cog.reconcile_window(self.guild, END)

    async def test_inaccessible_channel_does_not_block_but_transient_failure_does(self):
        cog, events, members, channel, _ = await self.make_cog()
        locked = FakeChannel(10, error=http_error(discord.Forbidden, 403))
        flaky = FakeChannel(11, error=http_error(discord.HTTPException, 500))
        self.channels.extend([locked, flaky])
        with self.assertRaises(ReconciliationIncomplete):
            await cog.award(END)
        self.assertEqual(events, [])
        channel.send.assert_not_awaited()
        self.assertIsNone(await self.store.run(END))  # nothing frozen from partial data
        flaky.error = None
        await cog.award(END)
        self.assertTrue((await self.store.run(END))[2])
        self.assertEqual(channel.send.await_count, 1)

    async def test_deleted_channel_is_ignored(self):
        cog, *_ = await self.make_cog()
        self.channels.append(FakeChannel(10, error=http_error(discord.NotFound, 404)))
        self.assertTrue((await cog.reconcile_window(self.guild, END)).complete)

    async def test_award_uses_reconciled_history_for_missed_messages(self):
        cog, events, members, channel, message = await self.make_cog()
        main = FakeChannel(10)
        self.channels.append(main)
        # User 3 sent 5 messages while the bot was down; live recording never saw them.
        main.messages = [fake_message(200 + i, 3, END - timedelta(hours=4, minutes=i), main) for i in range(5)]
        await cog.award(END)
        self.assertIn('<@3>', message.edit.call_args.kwargs['content'].splitlines()[0])
        self.assertEqual(events, [('remove', 2)])  # 3 already held it and keeps it
        self.assertEqual([m.id for m in members if m.roles], [3])

    async def test_member_resolution_falls_back_to_api_and_skips_departed(self):
        cog, events, members, channel, message = await self.make_cog()
        self.departed.add(1)  # top counted user has left
        await cog.award(END)
        self.assertEqual(events, [('remove', 3)])  # departed #1 skipped; #2 keeps the role
        self.assertEqual([m.id for m in members if m.roles], [2])
        first_line = message.edit.call_args.kwargs['content'].splitlines()[0]
        self.assertIn('<@2>', first_line)
        found = await cog.resolve_members(self.guild, [1, 2, 99])
        self.assertEqual(list(found), [2])

    async def test_transient_member_lookup_failure_retries(self):
        cog, events, *_ = await self.make_cog()
        async def boom(uid):
            raise http_error(discord.HTTPException, 503)
        self.guild.fetch_member = boom
        with self.assertRaises(discord.HTTPException):
            await cog.award(END)
        self.assertEqual(events, [])
        self.assertIsNone(await self.store.run(END))

    async def test_existing_announcement_is_adopted_not_repeated(self):
        cog, events, members, channel, message = await self.make_cog()
        old = NS(id=4242, author=NS(id=555), content='# Top Daily Chatter: <@9> - (24th Nov)\nx')
        channel.history = lambda **kw: _gen([old])
        await cog.award(END)
        channel.send.assert_not_awaited()
        message.edit.assert_not_awaited()
        self.assertEqual(events, [])
        self.assertEqual(await self.store.run(END), ([], 4242, True))

    async def test_fresh_database_does_not_mark_award_complete(self):
        self.assertIsNone(await self.store.run(latest_boundary(END + timedelta(hours=1))))

    async def test_completed_award_is_never_repeated_after_restart(self):
        cog, events, members, channel, message = await self.make_cog()
        await cog.award(END)
        await self.store.close()
        await self.store.connect()
        events.clear()
        await cog.award(END)
        self.assertEqual(events, [])
        self.assertEqual(channel.send.await_count, 1)

    async def test_failed_send_retries_without_duplicate_role_changes(self):
        cog, events, members, channel, message = await self.make_cog()
        channel.send.side_effect = [RuntimeError('discord down'), message]
        with self.assertRaises(RuntimeError):
            await cog.award(END)
        self.assertTrue(members[0].roles)  # role granted before the send failed
        await cog.award(END)
        self.assertEqual(events.count(('add', 1)), 1)
        self.assertEqual(sum(bool(m.roles) for m in members), 1)
        self.assertTrue((await self.store.run(END))[2])

    async def test_live_record_failure_schedules_catchup(self):
        cog, *_ = await self.make_cog()
        self.store.record = AsyncMock(side_effect=RuntimeError('db locked'))
        when = END - timedelta(minutes=1)
        await cog.on_message(fake_message(300, 5, when, FakeChannel(10)))
        self.assertEqual(cog.record_failures, 1)
        self.assertLessEqual(cog.catchup_from, when)

    async def test_live_recording_is_not_blocked_by_award_lock(self):
        cog, *_ = await self.make_cog()
        async with cog.lock:
            await cog.on_message(fake_message(301, 5, END - timedelta(minutes=1), FakeChannel(10)))
        self.assertEqual(dict(await self.store.counts(END))[5], 1)

    async def test_catchup_clears_only_after_success(self):
        cog, *_ = await self.make_cog()
        flaky = FakeChannel(10, error=http_error(discord.HTTPException, 500))
        self.channels.append(flaky)
        cog.catchup_from = datetime.now(UTC) - timedelta(minutes=5)
        await cog.run_catchup(self.guild)
        self.assertIsNotNone(cog.catchup_from)
        flaky.error = None
        await cog.run_catchup(self.guild)
        self.assertIsNone(cog.catchup_from)

    def test_database_path_validation(self):
        with patch.dict('os.environ', {'RAILWAY_VOLUME_MOUNT_PATH': '/data'}):
            _, problems = check_database_path('data/octobot.db')
            self.assertTrue(any('NOT on the mounted volume' in p for p in problems))
            self.assertTrue(any('relative' in p for p in problems))
        with patch.dict('os.environ', {'RAILWAY_VOLUME_MOUNT_PATH': self.tmp.name}):
            _, problems = check_database_path(Path(self.tmp.name) / 'octobot.db')
            self.assertEqual(problems, [])

    async def test_health_report_has_no_sensitive_values(self):
        cog, *_ = await self.make_cog()
        report = await cog.health_report(END - timedelta(minutes=1))
        self.assertIn('Messages recorded: 3 from 2 user(s)', report)
        self.assertIn('Last recorded message', report)
        self.assertNotIn(self.tmp.name, report)

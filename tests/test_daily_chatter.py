from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

from octobot.daily_chatter import ChatterStore, DailyChatterCog, announcement, day_label, latest_boundary

UTC = timezone.utc
END = datetime(2026, 11, 24, 17, tzinfo=UTC)


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
        guild = NS(id=123, get_role=lambda rid: role, fetch_members=fetch_members)
        message = NS(id=999, edit=AsyncMock())
        channel = NS(guild=guild, send=AsyncMock(return_value=message), get_partial_message=lambda mid: message)
        bot = NS(config=NS(database_path=self.store.path, guild_id=123,
                           daily_chatter_role_id=777, daily_chatter_channel_id=888),
                 get_guild=lambda gid: guild, get_channel=lambda cid: channel)
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
        self.assertIn('2nd place: <@2> - 1 messages', edited)
        for call in [channel.send.call_args, message.edit.call_args]:
            self.assertEqual(call.kwargs['allowed_mentions'].to_dict(), {'parse': []})
        await cog.award(END)
        self.assertEqual(channel.send.await_count, 1)
        self.assertEqual(message.edit.await_count, 1)

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

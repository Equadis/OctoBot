from __future__ import annotations

import io
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, patch

from PIL import Image
from octobot.serverinfo import (RANGES, ServerInfoCog, ServerInfoView, demo_samples,
                               range_start, render_chart, selectable_indices)

END = datetime(2026, 11, 6, 11, 26, 26, tzinfo=timezone.utc)


def interaction(admin=True, user=1, guild=123):
    return NS(guild_id=guild, user=NS(id=user), permissions=NS(administrator=admin),
              response=NS(send_message=AsyncMock(), defer=AsyncMock()),
              followup=NS(send=AsyncMock()), edit_original_response=AsyncMock())


class ServerInfoDataTests(unittest.TestCase):
    def test_ranges_and_consistency(self):
        self.assertEqual(range_start(END, '1W'), END - timedelta(days=7))
        self.assertEqual(range_start(END, 'YTD'), datetime(2026, 1, 1, tzinfo=timezone.utc))
        for period in RANGES:
            samples = demo_samples(END, period)
            self.assertLess(len(samples), 170)
            self.assertEqual(samples[0].time, range_start(END, period))
            self.assertEqual(samples[-1].time, END)
            self.assertEqual(samples[-1].players, 1019)
            self.assertEqual(samples, sorted(samples, key=lambda s: s.time))
            self.assertTrue(any(s.players is None for s in samples))
            choices = selectable_indices(samples, len(samples) - 1)
            self.assertLessEqual(len(choices), 25)
            self.assertTrue(any(samples[i].players is None for i in choices))
            self.assertIn(len(samples) - 1, choices)
        # January boundary must still produce valid choices and a nonempty range.
        self.assertTrue(demo_samples(END.replace(month=1, day=1), 'YTD'))

    def test_renderer_needs_no_plotting_stack(self):
        import subprocess
        import sys
        result = subprocess.run([sys.executable, '-c',
            "import sys; import octobot.serverinfo; "
            "assert 'matplotlib' not in sys.modules; assert 'numpy' not in sys.modules"],
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_minimal_host_font_fallback(self):
        from octobot.serverinfo import _font
        from PIL import ImageFont
        original = ImageFont.truetype
        def no_system_font(font, *args, **kwargs):
            if isinstance(font, str):
                raise OSError('no system font')
            return original(font, *args, **kwargs)
        with patch('octobot.serverinfo.ImageFont.truetype', side_effect=no_system_font):
            self.assertIsNotNone(_font(18))

    def test_every_range_renders_and_down_selection(self):
        for period in RANGES:
            samples = demo_samples(END, period)
            selected = next(i for i, s in enumerate(samples) if s.players is None)
            image = Image.open(io.BytesIO(render_chart(END, period, samples, selected)))
            self.assertEqual(image.format, 'PNG')
            self.assertEqual(image.size, (1300, 520))


class ServerInfoInteractionTests(unittest.IsolatedAsyncioTestCase):
    async def test_registration_and_runtime_permission(self):
        command = ServerInfoCog.serverinfo
        self.assertTrue(command.default_permissions.administrator)
        cog = ServerInfoCog()
        for event in (interaction(admin=False), interaction(guild=None)):
            await command.callback(cog, event)
            event.response.send_message.assert_awaited_once()
            event.followup.send.assert_not_awaited()
        event = interaction()
        await command.callback(cog, event)
        sent = event.followup.send.call_args.kwargs
        self.assertTrue(sent['ephemeral'])
        self.assertEqual(sent['view'].period, '1W')
        self.assertIn('Synthetic test data', sent['embed'].description)
        sent['view'].stop()
        sent['file'].close()

    async def test_view_permissions_and_range_time_changes(self):
        view = ServerInfoView(1, END)
        self.assertEqual(view.period, '1W')
        for event in (interaction(admin=False), interaction(user=2), interaction(guild=None)):
            self.assertFalse(await view.interaction_check(event))
        self.assertTrue(await view.interaction_check(interaction()))
        for period in RANGES:
            event = interaction()
            button = next(c for c in view.children if getattr(c, 'period', None) == period)
            await button.callback(event)
            self.assertEqual(view.period, period)
            edit = event.edit_original_response.call_args.kwargs
            self.assertEqual(len(edit['attachments']), 1)
            edit['attachments'][0].close()
            self.assertEqual(len([c for c in view.children if hasattr(c, 'period')]), 6)
        down = next(i for i, sample in enumerate(view.samples) if sample.players is None)
        event = interaction()
        await view.update_chart(event, selected=down)
        self.assertIn('SERVER DOWN', view.embed().fields[0].value)
        self.assertIn('Players online: **1019**', view.embed().description)
        event.edit_original_response.call_args.kwargs['attachments'][0].close()
        view.message = NS(edit=AsyncMock())
        await view.on_timeout()
        self.assertTrue(all(item.disabled for item in view.children))
        view.message.edit.assert_awaited_once()
        view.stop()

    async def test_failed_edit_restores_state(self):
        view = ServerInfoView(1, END)
        event = interaction()
        event.edit_original_response.side_effect = RuntimeError('test edit failure')
        await view.update_chart(event, period='1H')
        self.assertEqual(view.period, '1W')
        event.followup.send.assert_awaited_once()
        event.edit_original_response.call_args.kwargs['attachments'][0].close()
        view.stop()

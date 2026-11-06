from __future__ import annotations

import io
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, patch

from PIL import Image
from octobot.serverinfo import (RANGES, ServerInfoCog, ServerInfoView, demo_samples,
                               range_start, render_chart, interactive_url, average_population, format_uptime, Sample)

END = datetime(2026, 11, 6, 11, 26, 26, tzinfo=timezone.utc)


def interaction(admin=True, user=1, guild=123):
    return NS(guild_id=guild, user=NS(id=user), permissions=NS(administrator=admin),
              response=NS(send_message=AsyncMock(), defer=AsyncMock()),
              followup=NS(send=AsyncMock()), edit_original_response=AsyncMock())


class ServerInfoDataTests(unittest.TestCase):
    def test_github_pages_source_and_link(self):
        from pathlib import Path
        from urllib.parse import urlsplit
        url = urlsplit(interactive_url(END))
        self.assertEqual(url.netloc, 'equadis.github.io')
        self.assertEqual(url.path, '/OctoBot/')
        root = Path(__file__).resolve().parents[1]
        self.assertTrue((root / 'docs' / '.nojekyll').is_file())
        html = (root / 'docs' / 'index.html').read_text()
        self.assertIn("const periods=['1H','1D','1W','1M','1Y','YTD']", html)
        self.assertNotIn('chatgpt.site', html)

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
            self.assertEqual(image.size, (1200, 660))


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
        self.assertFalse(sent.get('ephemeral', False))
        self.assertIn('#at=', sent['embed'].url)
        self.assertEqual(sent['view'].period, '1D')
        self.assertIn('Synthetic test data', sent['embed'].description)
        sent['view'].stop()
        sent['file'].close()

    async def test_link_only_public_panel(self):
        view = ServerInfoView(1, END)
        self.assertEqual(view.period, '1D')
        self.assertIsNone(view.timeout)
        self.assertEqual(len(view.children), 1)
        button = view.children[0]
        self.assertEqual(button.url, interactive_url(END))
        self.assertEqual(button.label, 'Open interactive graph ↗')
        embed = view.embed()
        self.assertEqual([f.name for f in embed.fields],
                         ['Online now', '24h peak', 'All-time peak', 'Server uptime'])
        self.assertEqual(embed.fields[-1].value, '02:02:54:59')
        self.assertIsNone(embed.image.url)
        self.assertNotIn('Selected time', str(embed.to_dict()))
        self.assertNotIn('Server Time', str(embed.to_dict()))
        self.assertEqual(embed.fields[1].value, f"{max(s.players or 0 for s in view.samples):,}")
        view.stop()

    async def test_invalid_config_does_not_publish_unsafe_link(self):
        with patch.dict('os.environ', {'SERVERINFO_GRAPH_URL': 'javascript:alert(1)'}):
            self.assertTrue(interactive_url(END).startswith('https://'))
        with patch.dict('os.environ', {'SERVERINFO_GRAPH_URL': 'https://example.com/chart#theme=dark'}):
            self.assertIn('theme=dark&at=', interactive_url(END))

    def test_average_is_time_weighted_and_downtime_zero(self):
        samples = [Sample(END, 100), Sample(END+timedelta(seconds=1), 100),
                   Sample(END+timedelta(seconds=10), None)]
        self.assertEqual(average_population(samples), 55)
        self.assertEqual(average_population([]), 0)
        self.assertEqual(average_population([Sample(END, 1019)]), 1019)
        self.assertEqual(format_uptime(0), '00:00:00:00')
        self.assertEqual(format_uptime(100*86400+61), '100:00:01:01')

"""Admin-only server-info prototype. Every displayed value is synthetic."""
from __future__ import annotations

import asyncio
import io
import logging
import math
import os
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import discord
from discord import app_commands
from discord.ext import commands
from PIL import Image, ImageDraw, ImageFont

UTC = timezone.utc
RANGES = ("1H", "1D", "1W", "1M", "1Y", "YTD")
_RENDER_LOCK = threading.Lock()
log = logging.getLogger(__name__)
DEFAULT_GRAPH_URL = "https://equadis.github.io/OctoBot/"


def interactive_url(end: datetime) -> str:
    base = os.getenv("SERVERINFO_GRAPH_URL", DEFAULT_GRAPH_URL).strip()
    parts = urlsplit(base)
    if parts.scheme not in ("https", "http") or not parts.netloc or parts.username or parts.password:
        log.warning("Invalid SERVERINFO_GRAPH_URL; using the hosted demo")
        parts = urlsplit(DEFAULT_GRAPH_URL)
    fragment = dict(parse_qsl(parts.fragment))
    fragment["at"] = str(int(end.timestamp()))
    return urlunsplit(parts._replace(fragment=urlencode(fragment)))


@dataclass(frozen=True)
class Sample:
    time: datetime
    players: int | None  # None denotes a confirmed synthetic outage, not a scrape failure.


def range_start(end: datetime, period: str) -> datetime:
    if period == "YTD":
        return end.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return end - timedelta(seconds={"1H": 3600, "1D": 86400, "1W": 604800,
                                    "1M": 30 * 86400, "1Y": 365 * 86400}[period])


def demo_outages(end: datetime) -> tuple[tuple[datetime, datetime], ...]:
    return ((end - timedelta(minutes=25), end - timedelta(minutes=20)),
            (end - timedelta(days=2, hours=2), end - timedelta(days=2)))


def demo_samples(end: datetime, period: str) -> list[Sample]:
    """Bounded preview data, anchored to one snapshot across every range."""
    start = range_start(end, period)
    times = {start + (end - start) * i / 144 for i in range(145)}
    for a, b in demo_outages(end):
        # Include outage boundaries/midpoints even when a long range downsamples them.
        for t in (a - timedelta(seconds=1), a, a + (b - a) / 2,
                  b - timedelta(seconds=1), b):
            if start <= t <= end:
                times.add(t)
    result = []
    for t in sorted(times):
        age = (end - t).total_seconds() / 86400
        value = round(1019 + 480 * math.sin(age * math.tau)
                      + 190 * math.sin(age * math.tau / 7)
                      + 95 * math.sin(age * 41))
        down = any(a <= t < b for a, b in demo_outages(end))
        result.append(Sample(t, None if down else max(100, value)))
    return result


DEMO_ALL_TIME_PEAK = 2476
DEMO_UPTIME_SECONDS = 2 * 86400 + 2 * 3600 + 54 * 60 + 59


def format_uptime(seconds: int) -> str:
    days, remaining = divmod(max(0, seconds), 86400)
    hours, remaining = divmod(remaining, 3600)
    minutes, seconds = divmod(remaining, 60)
    return f"{days:02}:{hours:02}:{minutes:02}:{seconds:02}"


def average_population(samples: list[Sample]) -> float:
    """Time-weighted average of the selected window; simulated downtime counts as zero."""
    if not samples:
        return 0.0
    span = (samples[-1].time - samples[0].time).total_seconds()
    if span <= 0:
        return float(samples[-1].players or 0)
    area = sum((b.time - a.time).total_seconds() * ((a.players or 0) + (b.players or 0)) / 2
               for a, b in zip(samples, samples[1:]))
    return area / span


def demo_releases(end: datetime) -> tuple[tuple[str, datetime], ...]:
    # Preview dates only: these are deliberately not presented as real OctoWoW releases.
    return (("Phase 1", end - timedelta(days=120)),
            ("Phase 2", end - timedelta(days=45)),
            ("Phase 3", end - timedelta(hours=6)))


def _font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        # Pillow bundles a scalable default font, so minimal containers need no font packages.
        return ImageFont.load_default(size=size)


def render_chart(end: datetime, period: str, samples: list[Sample], selected: int) -> bytes:
    """Draw a bounded PNG without NumPy or Matplotlib; suitable for small bot hosts."""
    with _RENDER_LOCK:
        image = Image.new("RGB", (1200, 660), "#202225")
        draw = ImageDraw.Draw(image)
        title_font, label_font, small_font = _font(30), _font(22), _font(20)
        green, red, muted = "#46df88", "#ef7777", "#b9bdc5"
        left, right, top, bottom = 85, 1160, 155, 550
        start = samples[0].time
        span = max((end - start).total_seconds(), 1)

        def x(time: datetime) -> int:
            return round(left + (time - start).total_seconds() / span * (right - left))

        def y(value: int) -> int:
            return round(bottom - value / 2600 * (bottom - top))

        draw.text((left, 28), f"Population  /  {period}", font=title_font, fill="white")
        draw.text((right, 34), "SYNTHETIC TEST DATA", font=small_font, fill="#f2c66d", anchor="ra")
        point = samples[selected]
        value = f"{point.players:,} players" if point.players is not None else "SERVER DOWN"
        colour = green if point.players is not None else red
        draw.text((left, 76), f"{point.time:%d %b %Y %H:%M:%S} UTC  ·  {value}", font=label_font, fill=colour)
        for players in range(0, 2501, 500):
            row = y(players)
            draw.line((left, row, right, row), fill="#34373c")
            draw.text((left - 12, row), f"{players:,}", font=small_font, fill=muted, anchor="rm")
        draw.text((left, top - 27), "Players online", font=small_font, fill=muted)
        for i in range(6):
            time = start + (end - start) * i / 5
            column = x(time)
            draw.line((column, top, column, bottom), fill="#34373c")
            pattern = "%H:%M" if period in ("1H", "1D") else "%d %b"
            if period in ("1Y", "YTD"):
                pattern = "%d %b %Y"
            draw.text((column, bottom + 17), time.strftime(pattern), font=small_font,
                      fill=muted, anchor="ma")
        for a, b in demo_outages(end):
            a, b = max(a, start), min(b, end)
            if a < b:
                xa, xb = x(a), x(b)
                draw.rectangle((xa, top, max(xa + 1, xb), bottom), fill="#3b292e")
                for dash in range(xa, max(xa + 1, xb), 13):
                    draw.line((dash, bottom, min(dash + 7, max(xa + 1, xb)), bottom), fill=red, width=3)
        peak_y = y(DEMO_ALL_TIME_PEAK)
        # Preblend white at exactly 50% opacity onto the opaque dark canvas.
        peak_colour = tuple(round((component + 255) / 2) for component in (32, 34, 37))
        for dash in range(left, right, 15):
            draw.line((dash, peak_y, min(dash + 8, right), peak_y), fill=peak_colour, width=2)
        mean = average_population(samples)
        draw.line((left, y(round(mean)), right, y(round(mean))), fill="#6bafff", width=2)
        draw.text((right, peak_y - 6), f"All-time peak  {DEMO_ALL_TIME_PEAK:,}", font=small_font,
                  fill=peak_colour, anchor="rd")
        for phase, time in demo_releases(end):
            if start <= time <= end:
                column = x(time)
                for dash in range(top, bottom, 12):
                    draw.line((column, dash, column, min(dash + 5, bottom)), fill="#ba98e5")
                draw.text((column + 5, top + 30), phase + " · demo", font=small_font, fill="#c5a7ed")
        segment: list[tuple[int, int]] = []
        for sample in samples:
            if sample.players is None:
                if len(segment) > 1:
                    draw.line(segment, fill=green, width=3)
                segment = []
            else:
                segment.append((x(sample.time), y(sample.players)))
        if len(segment) > 1:
            draw.line(segment, fill=green, width=3)
        px, py = x(point.time), y(point.players if point.players is not None else 0)
        draw.line((px, top, px, bottom), fill="#56836c" if point.players is not None else "#995555")
        draw.ellipse((px - 6, py - 6, px + 6, py + 6), fill=colour, outline="white", width=2)
        draw.text((right, 618), f"Average {mean:,.0f}  ·  Dashed red: simulated outage  ·  All times UTC", font=small_font,
                  fill=muted, anchor="ra")
        output = io.BytesIO()
        image.save(output, format="PNG")
        image.close()
        return output.getvalue()


class ServerInfoView(discord.ui.View):
    """A permanent link only. All range/date interactions live on the website."""
    def __init__(self, owner_id: int, end: datetime | None = None, *, shared: bool = True):
        super().__init__(timeout=None)
        self.end = (end or datetime.now(UTC)).replace(microsecond=0)
        self.period = "1D"
        self.samples = demo_samples(self.end, self.period)
        self.add_item(discord.ui.Button(label="Open interactive graph ↗", style=discord.ButtonStyle.link,
                                        url=interactive_url(self.end)))

    def embed(self) -> discord.Embed:
        peak = max(s.players or 0 for s in self.samples)
        embed = discord.Embed(title="Server Info ↗", url=interactive_url(self.end), colour=0x46DF88,
                              description="**Synthetic test data: not live server statistics.**")
        for name, value in (("Online now", "1,019"), ("24h peak", f"{peak:,}"),
                            ("All-time peak", f"{DEMO_ALL_TIME_PEAK:,}"),
                            ("Server uptime", format_uptime(DEMO_UPTIME_SECONDS))):
            embed.add_field(name=name, value=value, inline=True)
        # Leave the image unreferenced so Discord displays the full attachment
        # outside the narrower stats embed. Increasing PNG resolution alone cannot widen an embed.
        embed.set_footer(text="Past 24 hours · Open the interactive graph for ranges, dates and hover details. All times UTC.")
        return embed

    async def attachment(self) -> discord.File:
        data = await asyncio.to_thread(render_chart, self.end, self.period, self.samples, len(self.samples) - 1)
        return discord.File(io.BytesIO(data), filename="serverinfo.png")


class ServerInfoCog(commands.Cog):
    @app_commands.command(name="serverinfo", description="Preview server stats and population graphs (synthetic admin test).")
    @app_commands.guild_only()
    @app_commands.default_permissions(administrator=True)
    async def serverinfo(self, interaction: discord.Interaction) -> None:
        # Runtime enforcement remains necessary even if command permissions are overridden in Discord.
        if interaction.guild_id is None or not interaction.permissions.administrator:
            await interaction.response.send_message("This test command requires Discord Administrator permission.", ephemeral=True)
            return
        await interaction.response.defer(thinking=True)
        view = ServerInfoView(interaction.user.id, shared=True)
        try:
            attachment = await view.attachment()
            await interaction.followup.send(embed=view.embed(), file=attachment,
                                                          view=view, wait=True)
        except Exception:
            view.stop()
            log.exception("Could not open server-info preview")
            await interaction.followup.send("Could not generate the server-info preview. Try again.", ephemeral=True)

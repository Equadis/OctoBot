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


def selectable_indices(samples: list[Sample], selected: int) -> list[int]:
    # Leave space for outage points and the current selection; Discord allows 25 options.
    indices = {round(i * (len(samples) - 1) / 20) for i in range(21)}
    down = [i for i, sample in enumerate(samples) if sample.players is None]
    if down:
        indices.add(down[len(down) // 2])
        indices.add(down[0])
    indices.add(selected)
    return sorted(indices)


def _font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        # Pillow bundles a scalable default font, so minimal containers need no font packages.
        return ImageFont.load_default(size=size)


def render_chart(end: datetime, period: str, samples: list[Sample], selected: int) -> bytes:
    """Draw a bounded PNG without NumPy or Matplotlib; suitable for small bot hosts."""
    with _RENDER_LOCK:
        image = Image.new("RGB", (1300, 520), "#202225")
        draw = ImageDraw.Draw(image)
        title_font, label_font, small_font = _font(25), _font(18), _font(15)
        green, red, muted = "#46df88", "#ef7777", "#b9bdc5"
        left, right, top, bottom = 85, 1260, 125, 420
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
        draw.text((right, 486), "Dashed red: simulated outage  ·  All times UTC", font=small_font,
                  fill=muted, anchor="ra")
        output = io.BytesIO()
        image.save(output, format="PNG")
        image.close()
        return output.getvalue()


class RangeButton(discord.ui.Button):
    def __init__(self, period: str, active: str, row: int):
        super().__init__(label=period, row=row,
                         style=discord.ButtonStyle.success if period == active else discord.ButtonStyle.secondary)
        self.period = period

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.view.update_chart(interaction, period=self.period)


class TimeSelect(discord.ui.Select):
    def __init__(self, samples: list[Sample], selected: int):
        options = []
        for index in selectable_indices(samples, selected):
            sample = samples[index]
            value = f"{sample.players:,} players" if sample.players is not None else "SERVER DOWN"
            options.append(discord.SelectOption(label=f"{sample.time:%d %b %Y %H:%M:%S} UTC",
                                                description=value, value=str(index), default=index == selected))
        super().__init__(placeholder="Select a sampled time to move the dot", options=options, row=2)

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.view.update_chart(interaction, selected=int(self.values[0]))


class ServerInfoView(discord.ui.View):
    def __init__(self, owner_id: int, end: datetime | None = None, *, shared: bool = False):
        super().__init__(timeout=600)
        self.owner_id = owner_id
        self.shared = shared
        self.end = (end or datetime.now(UTC)).replace(microsecond=0)
        self.period = "1W"
        self.samples = demo_samples(self.end, self.period)
        self.selected = len(self.samples) - 1
        self.message: discord.InteractionMessage | discord.WebhookMessage | None = None
        self.lock = asyncio.Lock()
        self.rebuild_controls()

    def rebuild_controls(self) -> None:
        self.clear_items()
        for i, period in enumerate(RANGES):
            self.add_item(RangeButton(period, self.period, row=i // 3))
        self.add_item(TimeSelect(self.samples, self.selected))
        self.add_item(discord.ui.Button(label="Open interactive graph ↗", style=discord.ButtonStyle.link,
                                        url=interactive_url(self.end), row=3))

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.guild_id is not None and (self.shared or interaction.user.id == self.owner_id):
            return True
        await interaction.response.send_message("This private chart belongs to the person who opened it.",
                                                ephemeral=True)
        return False

    def embed(self) -> discord.Embed:
        point = self.samples[self.selected]
        value = f"{point.players:,} players" if point.players is not None else "SERVER DOWN"
        embed = discord.Embed(title="Server Info: Test Preview ↗", url=interactive_url(self.end), colour=0x46DF88,
                              description="**Synthetic test data: these are not live server statistics.**\n\n"
                              "Players online: **1019**. Max online: **2476**.\n"
                              "Server uptime: **2 Days 2 Hours 54 Minutes 59 Seconds**\n"
                              f"Server Time: **{self.end:%a, %d.%m.%Y %H:%M:%S} UTC**")
        embed.add_field(name=f"Selected time · {self.period}", value=f"{point.time:%d %b %Y %H:%M:%S} UTC: **{value}**", inline=False)
        embed.set_image(url="attachment://serverinfo.png")
        embed.set_footer(text="Open the interactive graph for hover details. Range buttons open your own private chart. Discord controls expire after 10 minutes; the web link stays available.")
        return embed

    async def attachment(self) -> discord.File:
        data = await asyncio.to_thread(render_chart, self.end, self.period, self.samples, self.selected)
        return discord.File(io.BytesIO(data), filename="serverinfo.png")

    async def update_chart(self, interaction: discord.Interaction, *, period: str | None = None,
                           selected: int | None = None) -> None:
        if self.shared:
            # A shared Discord message cannot display a different attachment for each viewer.
            # Fork a private view rather than editing the public panel or another user's chart.
            await interaction.response.defer(thinking=True, ephemeral=True)
            private = ServerInfoView(interaction.user.id, self.end)
            if period is not None:
                private.period = period
                private.samples = demo_samples(self.end, period)
                private.selected = len(private.samples) - 1
            elif selected is not None:
                private.selected = max(0, min(selected, len(private.samples) - 1))
            private.rebuild_controls()
            try:
                attachment = await private.attachment()
                private.message = await interaction.followup.send(embed=private.embed(), file=attachment,
                                                                 view=private, ephemeral=True, wait=True)
            except Exception:
                private.stop()
                log.exception("Could not open private server-info chart")
                await interaction.followup.send("Could not generate your chart. Try again.", ephemeral=True)
            return
        await interaction.response.defer()
        async with self.lock:
            old = self.period, self.samples, self.selected
            try:
                if period is not None:
                    self.period = period
                    self.samples = demo_samples(self.end, period)
                    self.selected = len(self.samples) - 1
                elif selected is not None:
                    self.selected = max(0, min(selected, len(self.samples) - 1))
                attachment = await self.attachment()
                self.rebuild_controls()
                await interaction.edit_original_response(embed=self.embed(), attachments=[attachment], view=self)
            except Exception:
                self.period, self.samples, self.selected = old
                self.rebuild_controls()
                log.exception("Could not update server-info preview")
                await interaction.followup.send("Could not redraw the preview. Try again.", ephemeral=True)

    async def on_timeout(self) -> None:
        async with self.lock:
            for item in self.children:
                if not isinstance(item, discord.ui.Button) or item.url is None:
                    item.disabled = True
            if self.message is not None:
                try:
                    await self.message.edit(view=self)
                except discord.HTTPException:
                    log.debug("Server-info preview expired or was deleted")


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
            view.message = await interaction.followup.send(embed=view.embed(), file=attachment,
                                                          view=view, wait=True)
        except Exception:
            view.stop()
            log.exception("Could not open server-info preview")
            await interaction.followup.send("Could not generate the server-info preview. Try again.", ephemeral=True)

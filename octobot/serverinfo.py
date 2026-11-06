"""Admin-only server-info prototype. Every displayed value is synthetic."""
from __future__ import annotations

import asyncio
import io
import logging
import math
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import discord
from discord import app_commands
from discord.ext import commands
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.figure import Figure
import matplotlib.dates as mdates

UTC = timezone.utc
RANGES = ("1H", "1D", "1W", "1M", "1Y", "YTD")
_RENDER_LOCK = threading.Lock()
log = logging.getLogger(__name__)


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


def render_chart(end: datetime, period: str, samples: list[Sample], selected: int) -> bytes:
    """Use an isolated Agg figure in a worker; serialise Matplotlib's shared state."""
    with _RENDER_LOCK:
        figure = Figure(figsize=(10, 4), dpi=130, facecolor="#202225")
        FigureCanvasAgg(figure)
        ax = figure.add_subplot(111, facecolor="#202225")
        figure.subplots_adjust(left=.075, right=.975, bottom=.19, top=.82)
        times = [s.time for s in samples]
        ax.plot(times, [math.nan if s.players is None else s.players for s in samples],
                color="#46df88", linewidth=1.8)
        for a, b in demo_outages(end):
            a, b = max(a, times[0]), min(b, end)
            if a < b:
                ax.axvspan(a, b, color="#ef7777", alpha=.13)
                ax.plot([a, b], [0, 0], color="#ef7777", linestyle="--", linewidth=2)
        point = samples[selected]
        y = point.players if point.players is not None else 0
        colour = "#46df88" if point.players is not None else "#ef7777"
        ax.axvline(point.time, color=colour, linewidth=.8, alpha=.6)
        ax.scatter([point.time], [y], color=colour, edgecolor="#ffffff", s=45, zorder=5, clip_on=False)
        label = f"{point.players:,} players" if point.players is not None else "SERVER DOWN"
        figure.text(.075, .91, f"Population  /  {period}", color="white", fontsize=13, weight="bold")
        figure.text(.075, .84, f"{point.time:%d %b %Y %H:%M} UTC  ·  {label}", color=colour, fontsize=10)
        figure.text(.975, .92, "SYNTHETIC TEST DATA", ha="right", color="#f2c66d", fontsize=9)
        figure.text(.975, .025, "Dashed red: simulated outage  ·  All times UTC", ha="right",
                    color="#b9bdc5", fontsize=8)
        ax.set_xlim(times[0], end)
        ax.set_ylim(-80, 2600)
        ax.set_ylabel("Players online", color="#b9bdc5")
        locator = mdates.AutoDateLocator(minticks=3, maxticks=7, tz=UTC)
        ax.xaxis.set_major_locator(locator)
        ax.xaxis.set_major_formatter(mdates.ConciseDateFormatter(locator, tz=UTC))
        ax.tick_params(colors="#b9bdc5", labelsize=8)
        ax.grid(color="#ffffff", alpha=.07)
        for spine in ax.spines.values():
            spine.set_visible(False)
        output = io.BytesIO()
        figure.savefig(output, format="png", facecolor=figure.get_facecolor())
        figure.clear()
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
    def __init__(self, owner_id: int, end: datetime | None = None):
        super().__init__(timeout=600)
        self.owner_id = owner_id
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

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if (interaction.guild_id is not None and interaction.user.id == self.owner_id
                and interaction.permissions.administrator):
            return True
        await interaction.response.send_message("This test panel is restricted to the administrator who opened it.",
                                                ephemeral=True)
        return False

    def embed(self) -> discord.Embed:
        point = self.samples[self.selected]
        value = f"{point.players:,} players" if point.players is not None else "SERVER DOWN"
        embed = discord.Embed(title="Server Info: Test Preview", colour=0x46DF88,
                              description="**Synthetic test data: these are not live server statistics.**\n\n"
                              "Players online: **1019**. Max online: **2476**.\n"
                              "Server uptime: **2 Days 2 Hours 54 Minutes 59 Seconds**\n"
                              f"Server Time: **{self.end:%a, %d.%m.%Y %H:%M:%S} UTC**")
        embed.add_field(name=f"Selected time · {self.period}", value=f"{point.time:%d %b %Y %H:%M:%S} UTC: **{value}**", inline=False)
        embed.set_image(url="attachment://serverinfo.png")
        embed.set_footer(text="Select a range or sampled time below. Image graphs cannot respond to hover. Controls expire after 10 minutes; run /serverinfo again.")
        return embed

    async def attachment(self) -> discord.File:
        data = await asyncio.to_thread(render_chart, self.end, self.period, self.samples, self.selected)
        return discord.File(io.BytesIO(data), filename="serverinfo.png")

    async def update_chart(self, interaction: discord.Interaction, *, period: str | None = None,
                           selected: int | None = None) -> None:
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
        await interaction.response.defer(thinking=True, ephemeral=True)
        view = ServerInfoView(interaction.user.id)
        try:
            attachment = await view.attachment()
            view.message = await interaction.followup.send(embed=view.embed(), file=attachment,
                                                          view=view, ephemeral=True, wait=True)
        except Exception:
            view.stop()
            log.exception("Could not open server-info preview")
            await interaction.followup.send("Could not generate the server-info preview. Try again.", ephemeral=True)

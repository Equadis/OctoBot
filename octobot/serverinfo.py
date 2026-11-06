"""Real population collection and an admin-posted public server information panel."""
from __future__ import annotations

import asyncio
import io
import json
import logging
import math
import os
import threading
import urllib.request
from datetime import datetime, timedelta
from typing import Literal
from urllib.parse import urlsplit, urlunsplit

import discord
from discord import app_commands
from discord.ext import commands, tasks
from PIL import Image, ImageDraw, ImageFont

from .population import (UTC, HISTORY, RELEASES, GAP_SECONDS, PopulationStore, Reading,
                         fetch_reading, load_history, missing_intervals, observed_average, parse_time, HISTORIES, REALMS)

RANGES = ('1H', '1D', '1W', '1M', '1Y', 'YTD')
DEFAULT_GRAPH_URL = 'https://equadis.github.io/OctoBot/'
_RENDER_LOCK = threading.Lock()
log = logging.getLogger(__name__)


def interactive_url(end: datetime | None = None, realm: str = 'nzoth') -> str:
    # Live history must not be frozen to a synthetic timestamp in old #at links.
    base = os.getenv('SERVERINFO_GRAPH_URL', DEFAULT_GRAPH_URL).strip()
    try:
        parts = urlsplit(base)
        if parts.scheme not in ('http', 'https') or not parts.netloc or parts.username or parts.password:
            raise ValueError('Invalid graph URL')
    except ValueError:
        log.warning('Invalid SERVERINFO_GRAPH_URL; using GitHub Pages')
        parts = urlsplit(DEFAULT_GRAPH_URL)
    return urlunsplit(parts._replace(fragment='server='+realm))


def _font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype('DejaVuSans.ttf', size)
    except OSError:
        return ImageFont.load_default(size=size)


def render_chart(end: datetime, rows: list[Reading]) -> bytes:
    start = end-timedelta(days=1)
    with _RENDER_LOCK:
        image = Image.new('RGB', (1200, 660), '#202225')
        draw = ImageDraw.Draw(image)
        title, font, small = _font(30), _font(22), _font(20)
        left, right, top, bottom = 85, 1160, 155, 550
        peak = max((r.online for r in rows), default=0)
        ceiling = max(500, math.ceil(peak*1.15/500)*500)
        x = lambda t: round(left+(t-start).total_seconds()/86400*(right-left))
        y = lambda n: round(bottom-n/ceiling*(bottom-top))
        draw.text((left, 28), 'Population / 1D', font=title, fill='white')
        latest = rows[-1] if rows else None
        label = f'{latest.time:%d %b %Y %H:%M:%S} UTC · {latest.online:,} last observed' if latest else 'NO DATA'
        draw.text((left, 76), label, font=font, fill='#79dfa7' if latest else '#e3bd57')
        for a, b in missing_intervals(rows, start, end):
            xa, xb = x(a), x(b)
            draw.rectangle((xa, top, max(xa+1, xb), bottom), fill='#3d3523')
            draw.line((xa, bottom, max(xa+1, xb), bottom), fill='#e3bd57', width=3)
            if xb-xa > 100:
                draw.text(((xa+xb)/2, top+25), 'NO DATA', anchor='mm', font=small, fill='#e3bd57')
        step = max(100, math.ceil(ceiling/6/100)*100)
        for n in range(0, ceiling+1, step):
            draw.line((left,y(n),right,y(n)),fill='#34373c')
            draw.text((left-12,y(n)),f'{n:,}',font=small,fill='#b9bdc5',anchor='rm')
        for i in range(6):
            t=start+timedelta(seconds=86400*i/5)
            draw.text((x(t),bottom+18),t.strftime('%H:%M'),font=small,fill='#b9bdc5',anchor='ma')
        draw.text((left,top-27),'Players online',font=small,fill='#b9bdc5')
        if rows:
            for dash in range(left,right,15):
                draw.line((dash,y(peak),min(dash+8,right),y(peak)),fill='#909193',width=2)
            draw.text((right,y(peak)-7),f'All-time recorded peak {peak:,}',font=small,fill='#aab4c1',anchor='rd')
        mean=observed_average(rows,start,end)
        if mean is not None:
            draw.line((left,y(mean),right,y(mean)),fill='#74b6ff',width=2)
        segment=[]
        previous=None
        for row in rows:
            if row.time<start or row.time>end:
                if segment and len(segment)>1:draw.line(segment,fill='#63df9a',width=3)
                segment=[];previous=None;continue
            if previous and (row.time-previous.time).total_seconds()>GAP_SECONDS:
                if len(segment)>1:draw.line(segment,fill='#63df9a',width=3)
                segment=[]
            segment.append((x(row.time),y(row.online)));previous=row
        if len(segment)>1:draw.line(segment,fill='#63df9a',width=3)
        if latest and start<=latest.time<=end:
            px,py=x(latest.time),y(latest.online)
            draw.ellipse((px-5,py-5,px+5,py+5),fill='#63df9a',outline='white',width=2)
        avg=f'Average {mean:,.0f}' if mean is not None else 'Average unavailable'
        draw.text((right,618),f'{avg} · Yellow: NO DATA · All times UTC',font=small,fill='#b9bdc5',anchor='ra')
        output=io.BytesIO();image.save(output,format='PNG');image.close()
        return output.getvalue()


class ServerInfoView(discord.ui.View):
    def __init__(self, rows: list[Reading], end: datetime | None = None, realm: str = 'nzoth'):
        super().__init__(timeout=None)
        self.realm=realm
        self.end=end or datetime.now(UTC)
        self.rows=rows
        self.add_item(discord.ui.Button(label='Open interactive graph ↗',style=discord.ButtonStyle.link,url=interactive_url(realm=realm)))

    def embed(self) -> discord.Embed:
        latest=self.rows[-1] if self.rows else None
        fresh=latest is not None and (self.end-latest.time).total_seconds()<=GAP_SECONDS
        recent=[r.online for r in self.rows if self.end-timedelta(days=1)<=r.time<=self.end]
        peak=max((r.online for r in self.rows),default=None)
        embed=discord.Embed(title=REALMS[self.realm]+' ↗',url=interactive_url(realm=self.realm),colour=0x46DF88,
                            description='Recorded population observations. Uptime is not supplied by the census source.')
        for name,value in [('Online now',f'{latest.online:,}' if fresh else 'NO DATA'),
                           ('24h peak',f'{max(recent):,}' if recent else 'NO DATA'),
                           ('All-time peak',f'{peak:,}' if peak is not None else 'NO DATA'),
                           ('Server uptime','--:--:--:--')]:
            embed.add_field(name=name,value=value,inline=True)
        since=self.rows[0].time.strftime('%d %b %Y %H:%M UTC') if self.rows else 'no history'
        observed=latest.time.strftime('%d %b %Y %H:%M:%S UTC') if latest else 'never'
        embed.set_footer(text=f'Last observed {observed} · Peak recorded since {since} · Yellow: NO DATA')
        return embed

    async def attachment(self) -> discord.File:
        data=await asyncio.to_thread(render_chart,self.end,self.rows)
        return discord.File(io.BytesIO(data),filename='serverinfo.png')


class ServerInfoCog(commands.Cog):
    def __init__(self, bot):
        self.bot=bot
        self.store=PopulationStore(bot.config.database_path)
        self.poll_count=0

    async def cog_load(self) -> None:
        for realm,path in HISTORIES.items():
            await asyncio.to_thread(self.store.add,load_history(path,realm))
        self.collect.start()

    async def cog_unload(self) -> None:
        self.collect.cancel()

    @tasks.loop(seconds=60)
    async def collect(self) -> None:
        # Pull public observations too so gaps while this bot was stopped can be recovered.
        for realm in REALMS:
            if realm != 'nzoth' and not os.getenv('POPULATION_'+realm.upper()+'_URL','').strip():
                continue
            if self.poll_count%10==0:
                try:
                    remote=await asyncio.to_thread(self._public_history,realm)
                    await asyncio.to_thread(self.store.add,remote)
                except Exception:
                    log.warning('Could not sync public history for %s; retaining local readings',realm)
            try:
                reading=await asyncio.to_thread(fetch_reading,realm)
                await asyncio.to_thread(self.store.add,[reading])
            except Exception as exc:
                log.warning('Population poll for %s: %s; no reading invented',realm,exc)
        self.poll_count+=1

    @staticmethod
    def _public_history(realm: str) -> list[Reading]:
        relative=HISTORIES[realm].relative_to(HISTORY.parent).as_posix()
        with urllib.request.urlopen(DEFAULT_GRAPH_URL+relative,timeout=20) as response:
            data=response.read(20_000_001)
        if len(data)>20_000_000:raise ValueError('History exceeds sync limit')
        from .population import decode_history
        return decode_history(json.loads(data),realm)

    @app_commands.command(name='serverinfo',description='Show recorded server population and its interactive history.')
    @app_commands.guild_only()
    @app_commands.default_permissions(administrator=True)
    async def serverinfo(self,interaction:discord.Interaction, server: Literal["N'Zoth (Normal)", "Y'Shaarj (PvP)", "C'Thun (Hardcore)"] = "N'Zoth (Normal)")->None:
        if interaction.guild_id is None or not interaction.permissions.administrator:
            await interaction.response.send_message('This test command requires Discord Administrator permission.',ephemeral=True)
            return
        await interaction.response.defer(thinking=True)
        try:
            realm=next(key for key,name in REALMS.items() if name==server)
            rows=await asyncio.to_thread(self.store.all,realm)
            view=ServerInfoView(rows,realm=realm)
            attachment=await view.attachment()
            await interaction.followup.send(embed=view.embed(),file=attachment,view=view,wait=True)
        except Exception:
            log.exception('Could not load server information')
            await interaction.followup.send('Could not load server information. Try again.',ephemeral=True)

from __future__ import annotations
import io,json,sqlite3,tempfile,unittest
from datetime import datetime,timedelta
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock,patch
from PIL import Image
from octobot.population import (UTC,Reading,PopulationStore,load_history,decode_history,save_history,
                               missing_intervals,observed_average,parse_online,fetch_reading,collect_file,HISTORY)
from octobot.serverinfo import ServerInfoCog,ServerInfoView,interactive_url,render_chart
END=datetime(2026,11,6,17,tzinfo=UTC)

class PopulationTests(unittest.TestCase):
 def test_import_real_history_and_peak(self):
  rows=load_history(HISTORY)
  self.assertGreaterEqual(len(rows),9485)
  self.assertEqual(rows[0].time.isoformat(),'2026-10-30T14:59:20.708000+00:00')
  self.assertEqual(max(r.online for r in rows),3470)
  self.assertEqual({r.realm for r in rows},{'all'})
 def test_validation_sort_dedup_zero_and_realms(self):
  data=[{'timestamp':'2026-11-06T01:00:00Z','online':0},{'timestamp':'2026-11-06T00:00:00Z','online':25}]
  rows=decode_history(data+data,'cthun')
  self.assertEqual([r.online for r in rows],[25,0]);self.assertEqual(rows[-1].realm,'cthun')
  for count in [-1,True,1.5,'100']:
   with self.assertRaises(ValueError):decode_history([{'timestamp':'2026-11-06T01:00:00Z','online':count}])
  with self.assertRaises(ValueError):decode_history([{'timestamp':'2026-11-06T01:00:00','online':1}])
 def test_missing_pre_history_and_collection_gap_not_zero(self):
  rows=[Reading(END-timedelta(minutes=30),100),Reading(END-timedelta(minutes=29),200),Reading(END-timedelta(minutes=1),100)]
  gaps=missing_intervals(rows,END-timedelta(hours=1),END)
  self.assertEqual(gaps,[(END-timedelta(hours=1),rows[0].time),(rows[1].time,END)])
  self.assertEqual(observed_average(rows,END-timedelta(hours=1),END),150)
  self.assertIsNone(observed_average([],END-timedelta(days=1),END))
 def test_window_boundary_average(self):
  rows=[Reading(END-timedelta(minutes=2),0),Reading(END,200)]
  self.assertEqual(observed_average(rows,END-timedelta(minutes=1),END),150)
 def test_sqlite_realm_isolation_persistence_and_dedup(self):
  with tempfile.TemporaryDirectory() as directory:
   store=PopulationStore(Path(directory)/'bot.db')
   store.add([Reading(END,100,'all'),Reading(END,20,'cthun'),Reading(END,3,'yshaarj')])
   store.add([Reading(END,100,'all')])
   self.assertEqual(store.all(),[Reading(END,100)])
   self.assertEqual(PopulationStore(store.path).all('cthun'),[Reading(END,20,'cthun')])
 def test_migrate_existing_nzoth_census_into_all_exactly_once(self):
  with tempfile.TemporaryDirectory() as directory:
   path=Path(directory)/'bot.db'
   with sqlite3.connect(path) as db:
    db.execute('CREATE TABLE population_readings_v2 (realm TEXT NOT NULL, timestamp TEXT NOT NULL, online INTEGER NOT NULL, PRIMARY KEY (realm,timestamp))')
    db.execute('INSERT INTO population_readings_v2 VALUES (?, ?, ?)',('nzoth',END.isoformat(),123))
   store=PopulationStore(path)
   self.assertEqual(store.all(),[Reading(END,123,'all')])
   self.assertEqual(store.all('nzoth'),[])
   # A future verified N'Zoth observation remains independent after the one-time migration.
   store.add([Reading(END+timedelta(minutes=1),9,'nzoth')])
   self.assertEqual(store.all('nzoth'),[Reading(END+timedelta(minutes=1),9,'nzoth')])
   self.assertEqual(store.all(),[Reading(END,123,'all')])
 def test_parser_failure_does_not_create_zero_and_atomic_export(self):
  self.assertEqual(parse_online('Players online now: <b>1,234</b>'),1234)
  with self.assertRaises(ValueError):parse_online('<html>temporarily unavailable</html>')
  with tempfile.TemporaryDirectory() as directory:
   path=Path(directory)/'history.json';save_history(path,[Reading(END,123)])
   before=path.read_bytes()
   with patch('octobot.population.fetch_reading',side_effect=OSError('network')):self.assertIsNone(collect_file(path))
   self.assertEqual(path.read_bytes(),before)
 def test_other_realms_never_fall_back_to_nzoth(self):
  with patch.dict('os.environ',{'POPULATION_NZOTH_URL':'','POPULATION_YSHAARJ_URL':'','POPULATION_CTHUN_URL':''}):
   for realm in ['nzoth','cthun','yshaarj']:
    with self.assertRaisesRegex(ValueError,'No verified population feed'):fetch_reading(realm)
 def test_real_renderer_has_no_fake_counts_and_handles_no_data(self):
  rows=load_history(HISTORY)
  for data in [rows,[]]:
   image=Image.open(io.BytesIO(render_chart(END,data)));self.assertEqual(image.size,(1200,660))
 def test_node_data_semantics(self):
  import subprocess
  code="""const assert=require('node:assert/strict');const D=require('./docs/chart-data.js');
  const h=D.normalise([{timestamp:'2026-11-06T00:10:00Z',online:100},{timestamp:'2026-11-06T00:11:00Z',online:200},{timestamp:'2026-11-06T00:40:00Z',online:9}]);
  const start=Date.parse('2026-11-06T00:00:00Z'),end=Date.parse('2026-11-06T01:00:00Z');const r=D.intervals(h,start,end);assert.equal(r.average,150);assert.equal(r.missing.length,2);assert.equal(D.at(h,start),null);assert.equal(D.at(h,Date.parse('2026-11-06T00:30:00Z')),null);
  const p=Array.from({length:10000},(_,t)=>({t,value:t===4312?3470:10}));assert(D.downsample(p).some(r=>r.value===3470));
  """
  result=subprocess.run(['node','-e',code],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)

class ServerInfoInteractionTests(unittest.IsolatedAsyncioTestCase):
 def event(self,admin=True):
  return NS(guild_id=123,user=NS(id=1),permissions=NS(administrator=admin),response=NS(send_message=AsyncMock(),defer=AsyncMock()),followup=NS(send=AsyncMock()))
 async def test_admin_command_only_and_public_link(self):
  bot=NS(config=NS(database_path=Path('/tmp/unused-population-test.db')));cog=ServerInfoCog(bot);cog.store=NS(all=lambda realm:[])
  command=ServerInfoCog.serverinfo;self.assertTrue(command.default_permissions.administrator)
  self.assertEqual([choice.value for choice in command.get_parameter('server').choices],
                   ['all','total','nzoth','cthun','yshaarj'])
  self.assertEqual(command.get_parameter('server').default,'all')
  event=self.event(False);await command.callback(cog,event);event.followup.send.assert_not_awaited()
  event=self.event();await command.callback(cog,event,'cthun')
  sent=event.followup.send.call_args.kwargs;self.assertFalse(sent.get('ephemeral',False));self.assertIn('C\'Thun',sent['embed'].title)
  self.assertEqual(len(sent['view'].children),1)
  self.assertEqual(sent['view'].children[0].url,'https://equadis.github.io/OctoBot/#server=cthun')
  self.assertEqual(sent['embed'].url,sent['view'].children[0].url)
  sent['file'].close();sent['view'].stop()
 async def test_default_and_other_realm_link_destinations(self):
  bot=NS(config=NS(database_path=Path('/tmp/unused-population-test.db')));cog=ServerInfoCog(bot);cog.store=NS(all=lambda realm:[])
  for selected,expected in [('all','https://equadis.github.io/OctoBot/'),
                            ('total','https://equadis.github.io/OctoBot/'),
                            ('nzoth','https://equadis.github.io/OctoBot/#server=nzoth'),
                            ('cthun','https://equadis.github.io/OctoBot/#server=cthun'),
                            ('yshaarj','https://equadis.github.io/OctoBot/#server=yshaarj')]:
   event=self.event()
   if selected=='all':await ServerInfoCog.serverinfo.callback(cog,event)
   else:await ServerInfoCog.serverinfo.callback(cog,event,selected)
   sent=event.followup.send.call_args.kwargs
   self.assertEqual(sent['view'].children[0].url,expected)
   self.assertEqual(sent['embed'].url,expected)
   if selected=='total':self.assertIn('All Realms',sent['embed'].title)
   sent['file'].close();sent['view'].stop()
 def test_interactive_url_never_uses_legacy_host(self):
  import os
  with patch.dict(os.environ,{'SERVERINFO_GRAPH_URL':'https://outdated.example.test/graph'}):
   self.assertEqual(interactive_url(),'https://equadis.github.io/OctoBot/')
   for slug in ('nzoth','cthun','yshaarj'):
    self.assertEqual(interactive_url(realm=slug),'https://equadis.github.io/OctoBot/#server='+slug)
 async def test_stats_use_real_peak_and_unknown_uptime(self):
  rows=[Reading(END-timedelta(minutes=5),10),Reading(END-timedelta(days=2),3470),Reading(END-timedelta(minutes=1),15)]
  rows.sort(key=lambda r:r.time);view=ServerInfoView(rows,END);embed=view.embed()
  self.assertEqual([f.value for f in embed.fields],['15','15','3,470','--:--:--:--']);self.assertIsNone(embed.image.url);self.assertIsNone(view.timeout);view.stop()
  self.assertNotIn('at=',interactive_url(END));self.assertEqual(interactive_url(),'https://equadis.github.io/OctoBot/')

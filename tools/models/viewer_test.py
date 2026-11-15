"""Local viewer test for the model conversion project (README step 5).
    python tools/models/viewer_test.py <v256 model> [port]
Converts the model, writes it to tools/models/out/srv (git-ignored), and serves http://127.0.0.1:<port>/ with the Zam viewer pointed at it.
Anything the viewer asks for that is not local is fetched from Zam's asset host. Gear: add ?items=[[slot,displayId],...] to the URL (viewer slots as the site uses them: 1 head, 3 shoulder, 5 chest, 6 waist,
7 legs, 8 feet, 9 wrist, 10 hands, 16 back, 21 main hand, 22 off hand). Customisation data comes from the client tables
(customisation.py); set RACE and SEX (9 Goblin or 10 Blood Elf, 0 or 1) in the environment. Everything stays local; nothing is published."""
import json, os, struct, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

import m2v274, blp, octo_mpq  # noqa

model_path = sys.argv[1]
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
HERE = os.path.dirname(os.path.abspath(__file__))
SRV = os.path.join(HERE, 'out', 'srv')
data = open(model_path, 'rb').read()
files, ids = m2v274.convert(data)
for rel, blob in files.items():
    path = os.path.join(SRV, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(blob)
client = octo_mpq.Client('D:/Octowow/Data')
os.makedirs(os.path.join(SRV, 'textures'), exist_ok=True)
for name, fid in ids['textures'].items():
    d = client.read(name) or client.read(name.title())
    if d:
        open(os.path.join(SRV, 'textures', f'{fid}.webp'), 'wb').write(blp.blp_to_webp(d)[0])
    else:
        print('missing texture', name)
ZAM = 'https://wow.zamimg.com/modelviewer/classic/meta/'
meta = json.load(urllib.request.urlopen(urllib.request.Request(ZAM + 'character/17.json', headers={'User-Agent': 'local-test'})))
meta['Model'] = ids['model']
os.makedirs(os.path.join(SRV, 'meta', 'character'), exist_ok=True)
json.dump(meta, open(os.path.join(SRV, 'meta', 'character', '17.json'), 'w'))
os.makedirs(os.path.join(SRV, 'meta', 'charactercustomization'), exist_ok=True)
import customisation  # noqa: E402
RACE, SEX = int(os.environ.get('RACE', 9)), int(os.environ.get('SEX', 0))
builder = customisation.Builder(client)
cust = builder.build(RACE, SEX)
json.dump(cust, open(os.path.join(SRV, 'meta', 'charactercustomization', '17.json'), 'w'))
for path, fid in builder.textures.items():
    d = client.read(path)
    if d:
        open(os.path.join(SRV, 'textures', f'{fid}.webp'), 'wb').write(blp.blp_to_webp(d)[0])
# default look: first skin colour, first face, second hair style (the first is the bald one with no mesh), first hair colour
def pick(name, index):
    o = next(o for o in cust['Options'] if o['Name'] == name)
    return {'optionId': o['Id'], 'choiceId': o['Choices'][min(index, len(o['Choices']) - 1)]['Id']}
LOOK = json.dumps([pick(n, i) for n, i in (('Skin Color', 0), ('Face', 0), ('Hair Style', 1), ('Hair Color', 1), ('Facial Hair', 0)) if any(o['Name'] == n for o in cust['Options'])])

VIEWER = 'https://wow.zamimg.com/modelviewer/classic/deployment/viewer/35ee72d/viewer.min.js'  # the same build the site pins
PAGE_T = '''<!doctype html><meta charset=utf-8><body style="margin:0;background:#101727"><div id=v style="width:900px;height:700px"></div>
<script>window.WH={debug:function(){if(location.search.indexOf('debug')>=0)console.log.apply(console,['WHDBG'].concat([].slice.call(arguments).map(function(a){try{return JSON.stringify(a).slice(0,300)}catch(e){return String(a)}})))},defaultAnimation:'Stand',WebP:{getImageExtension:function(){return '.webp'}}};</script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/viewer.js"></script>
<script>
window.log=[];window.addEventListener('error',e=>{if(window.log.length<3)window.log.push(String(e.message)+' '+(e.error&&e.error.stack||''))});
// Console helper: pose('Walk', 0.3) freezes that animation at 30 percent of its length and redraws (wait a moment before a screenshot).
window.pose=function(name,f){return new Promise(function(res){var a=viewer.renderer.actors[0];a.setAnimPaused(false);a.setAnimation(name,true);var t=0;(function go(){var s=a.d.B&&a.d.B.c;if(s&&s.e&&s.e.i===name&&s.e.h>0){a.setAnimPaused(true);s.c=f*s.e.h;var was=a.d.ao;try{a.d.ao=false;viewer.renderer.draw(viewer.renderer.time)}catch(e){}a.d.ao=was;setTimeout(function(){res(name+' length '+s.e.h)},600)}else if(++t<40)setTimeout(go,100);else res('timeout '+name)})()})};
function go(){try{window.viewer=new ZamModelViewer({type:2,container:jQuery('#v'),aspect:900/700,contentPath:location.origin+'/assets/',dataEnv:'classic',env:'classic',gameDataEnv:'classic',hd:false,physics:false,charCustomization:{options:LOOKJSON},models:{id:17,type:16},items:JSON.parse(new URLSearchParams(location.search).get('items')||'[]')});}catch(e){window.log.push('init '+e)}}
window.addEventListener('load',()=>setTimeout(go,300));
</script>'''

PAGE = PAGE_T.replace('LOOKJSON', LOOK)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.command, self.path))

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        if self.path == '/' or self.path.startswith('/?'):
            body = PAGE.encode()
            self.send_response(200); self.send_header('Content-Type', 'text/html'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
            return
        if self.path.startswith('/viewer.js'):
            body = open(os.path.join(HERE, 'out', 'viewer.js'), 'rb').read() if os.path.exists(os.path.join(HERE, 'out', 'viewer.js')) else urllib.request.urlopen(urllib.request.Request(VIEWER, headers={'User-Agent': 'local-test'}), timeout=30).read()
            self.send_response(200); self.send_header('Content-Type', 'application/javascript'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
            return
        rel = self.path.split('?')[0][len('/assets/'):] if self.path.startswith('/assets/') else None
        if rel is None:
            self.send_error(404); return
        local = os.path.join(SRV, rel)
        if os.path.isfile(local):
            body = open(local, 'rb').read(); status = 200
        else:
            try:
                body = urllib.request.urlopen(urllib.request.Request('https://wow.zamimg.com/modelviewer/classic/' + rel, headers={'User-Agent': 'local-test'}), timeout=20).read(); status = 200
            except Exception as e:
                self.send_error(404, str(e)); return
        ctype = 'application/json' if rel.endswith('.json') else 'image/webp' if rel.endswith('.webp') else 'application/octet-stream'
        self.send_response(status); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)


print('serving on', port, flush=True)
ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()

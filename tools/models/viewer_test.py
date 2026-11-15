"""Local viewer test for the model conversion project (README step 5).
    python tools/models/viewer_test.py <v256 model> <body skin blp path> [port]
Converts the model, writes it to tools/models/out/srv (git-ignored), and serves http://127.0.0.1:<port>/ with the Zam viewer pointed at it.
Anything the viewer asks for that is not local is fetched from Zam's asset host. Test-only: the body-skin texture is turned into a plain
file texture so the skin shows without customisation data. Everything stays local; nothing is published."""
import json, os, struct, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

import m2v274, blp, octo_mpq  # noqa

model_path, skin_blp = sys.argv[1], sys.argv[2]
port = int(sys.argv[3]) if len(sys.argv) > 3 else 8765
HERE = os.path.dirname(os.path.abspath(__file__))
SRV = os.path.join(HERE, 'out', 'srv')
data = open(model_path, 'rb').read()
files, ids = m2v274.convert(data)
body_id = 9000020
# test-only patch: make the body-skin texture a plain file texture so our own skin shows without customisation data
for rel, blob in list(files.items()):
    if rel.endswith('.m2'):
        buf = bytearray(blob)
        md = struct.unpack_from('<I', buf, 4)[0]
        t_n, t_o = struct.unpack_from('<II', buf, 8 + 0x50)
        for k in range(t_n):
            if struct.unpack_from('<I', buf, 8 + t_o + 16 * k)[0] == 1:
                struct.pack_into('<I', buf, 8 + t_o + 16 * k, 0)
                tx = buf.rfind(b'TXID')
                struct.pack_into('<I', buf, tx + 8 + 4 * k, body_id)
        files[rel] = bytes(buf)
for rel, blob in files.items():
    path = os.path.join(SRV, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(blob)
client = octo_mpq.Client('D:/Octowow/Data')
os.makedirs(os.path.join(SRV, 'textures'), exist_ok=True)
for name, fid in [(skin_blp, body_id)] + [(k, v) for k, v in ids['textures'].items()]:
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
cust = json.load(urllib.request.urlopen(urllib.request.Request(ZAM + 'charactercustomization/17.json', headers={'User-Agent': 'local-test'}))); cust['Options'] = []
json.dump(cust, open(os.path.join(SRV, 'meta', 'charactercustomization', '17.json'), 'w'))

PAGE = '''<!doctype html><meta charset=utf-8><body style="margin:0;background:#101727"><div id=v style="width:900px;height:700px"></div>
<script>window.WH={debug:function(){},defaultAnimation:'Stand',WebP:{getImageExtension:function(){return '.webp'}}};</script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://wow.zamimg.com/modelviewer/classic/deployment/viewer/35ee72d/viewer.min.js"></script>
<script>
window.log=[];window.addEventListener('error',e=>window.log.push(String(e.message)));
function go(){try{window.viewer=new ZamModelViewer({type:2,container:jQuery('#v'),aspect:900/700,contentPath:location.origin+'/assets/',dataEnv:'classic',env:'classic',gameDataEnv:'classic',hd:false,physics:false,models:{id:17,type:16},items:[]});}catch(e){window.log.push('init '+e)}}
window.addEventListener('load',()=>setTimeout(go,300));
</script>'''


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

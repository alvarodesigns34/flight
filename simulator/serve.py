"""Local offline static server. Does not expose the Blender repository or bind publicly."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port',type=int,default=5173)
a=parser.parse_args()
root=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.glb':'model/gltf-binary'}
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
print(f'Tomcat Flight Lab: http://127.0.0.1:{a.port} (Ctrl+C to stop)',flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()

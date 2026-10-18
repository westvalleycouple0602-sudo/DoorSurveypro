from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/embed":
            self.send_response(404); self.end_headers(); return
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')
        payload = json.loads(body)
        # Expect: {"inputs":[{"id":"cap-uuid","text":"...", "image_url":"..."}]}
        # Return: {"vectors":[{"id":"cap-uuid","vec":[0.0, 0.1, ...]}]}
        # Placeholder returns a zero vector
        vectors = [{"id": item.get("id"), "vec": [0.0]*16} for item in payload.get("inputs", [])]
        resp = json.dumps({"vectors": vectors}).encode('utf-8')
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)

def run():
    port = 8000
    httpd = HTTPServer(("0.0.0.0", port), Handler)
    print(f"[embeddings] listening on {port}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()

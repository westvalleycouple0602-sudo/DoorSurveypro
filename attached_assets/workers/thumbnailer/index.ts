// Minimal CF Worker thumbnailer placeholder (stores same bytes as 'thumb')
export default {
  async fetch(req: Request, env: any) {
    const url = new URL(req.url);
    if (url.pathname === "/process" && req.method === "POST") {
      const { fileId, key } = await req.json();
      return new Response(JSON.stringify({ ok: true, fileId, key, thumbUrl: `${url.origin}/thumbs/${key}` }), { headers: { "content-type": "application/json" } });
    }
    return new Response("OK");
  }
}
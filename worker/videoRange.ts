// Workers Static Assets ignores Range headers, and a browser that can't ask for
// part of a video can't seek in it: a jump along the progress line would send
// the clip back to its start. So the Worker answers them for videos, from the
// whole file (wrangler.jsonc's run_worker_first sends those requests here).
function parseRange(header: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) {
    const length = Number(match[2]);
    return length > 0 ? { start: Math.max(0, size - length), end: size - 1 } : "unsatisfiable";
  }
  const start = Number(match[1]);
  if (start >= size) return "unsatisfiable";
  const end = match[2] ? Number(match[2]) : size - 1;
  return end < start ? null : { start, end: Math.min(end, size - 1) };
}

export async function respondToVideoRange(request: Request, asset: Response): Promise<Response> {
  if (asset.status !== 200) return asset;
  const headers = new Headers(asset.headers);
  headers.set("accept-ranges", "bytes");
  const header = request.headers.get("range");
  if (!header) return new Response(asset.body, { status: 200, headers });

  const bytes = await asset.arrayBuffer();
  const range = parseRange(header, bytes.byteLength);
  if (!range) return new Response(bytes, { status: 200, headers });
  if (range === "unsatisfiable") {
    headers.set("content-range", `bytes */${bytes.byteLength}`);
    headers.delete("content-length");
    return new Response(null, { status: 416, headers });
  }
  headers.set("content-range", `bytes ${range.start}-${range.end}/${bytes.byteLength}`);
  headers.set("content-length", String(range.end - range.start + 1));
  return new Response(bytes.slice(range.start, range.end + 1), { status: 206, headers });
}

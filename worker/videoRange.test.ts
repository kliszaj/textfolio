/**
 * @jest-environment node
 */
import { respondToVideoRange } from "./videoRange";

const BYTES = Uint8Array.from({ length: 100 }, (_, index) => index);
const asset = (status = 200) =>
  new Response(status === 200 ? BYTES : null, {
    status,
    headers: { "content-type": "video/mp4", "cache-control": "public, max-age=86400" },
  });
const asked = (range?: string) =>
  new Request("https://example.com/assets/clip.mp4", { headers: range ? { range } : {} });
const body = async (response: Response) => [...new Uint8Array(await response.arrayBuffer())];

test("says it takes ranges, on a whole video too", async () => {
  const response = await respondToVideoRange(asked(), asset());
  expect(response.status).toBe(200);
  expect(response.headers.get("accept-ranges")).toBe("bytes");
  expect(response.headers.get("content-type")).toBe("video/mp4");
  expect(await body(response)).toHaveLength(100);
});

test("answers a closed range with just those bytes", async () => {
  const response = await respondToVideoRange(asked("bytes=10-19"), asset());
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toBe("bytes 10-19/100");
  expect(response.headers.get("content-length")).toBe("10");
  expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
  expect(await body(response)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
});

test("answers an open range through to the end", async () => {
  const response = await respondToVideoRange(asked("bytes=95-"), asset());
  expect(response.headers.get("content-range")).toBe("bytes 95-99/100");
  expect(await body(response)).toEqual([95, 96, 97, 98, 99]);
});

test("answers a range from the end", async () => {
  const response = await respondToVideoRange(asked("bytes=-2"), asset());
  expect(response.headers.get("content-range")).toBe("bytes 98-99/100");
  expect(await body(response)).toEqual([98, 99]);
});

test("stops a range that runs past the end at the end", async () => {
  const response = await respondToVideoRange(asked("bytes=98-500"), asset());
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toBe("bytes 98-99/100");
});

test("refuses a range that starts past the end", async () => {
  const response = await respondToVideoRange(asked("bytes=100-"), asset());
  expect(response.status).toBe(416);
  expect(response.headers.get("content-range")).toBe("bytes */100");
});

test("sends the whole video for a range it can't read", async () => {
  for (const range of ["bytes=0-1,5-6", "items=1-2", "bytes=9-3"]) {
    const response = await respondToVideoRange(asked(range), asset());
    expect(response.status).toBe(200);
    expect(await body(response)).toHaveLength(100);
  }
});

test("passes anything but a found video straight through", async () => {
  const missing = asset(404);
  expect(await respondToVideoRange(asked("bytes=0-1"), missing)).toBe(missing);
  const unchanged = asset(304);
  expect(await respondToVideoRange(asked("bytes=0-1"), unchanged)).toBe(unchanged);
});

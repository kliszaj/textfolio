// Shrinks the desk's mouse GLB: welds the SketchUp export's unshared
// vertices (every triangle has its own, with a flat normal), simplifies the
// mesh with smooth normals, meshopt-encodes it (EXT_meshopt_compression)
// and turns its textures into small WebPs (EXT_texture_webp).
//
//   node scripts/compress-mouse.mjs <source.glb> <out.glb>
//
// The original 7.3 MB export is in git history (public/models/mx-master-3s.glb
// before this script was added).
import fs from "node:fs";
import sharp from "sharp";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const [source, out] = process.argv.slice(2);
if (!source || !out) throw new Error("usage: node scripts/compress-mouse.mjs <source.glb> <out.glb>");

// Fraction of triangles kept, and the simplifier's relative error ceiling.
const KEEP = 0.25;
const MAX_ERROR = 0.005;
const TEXTURE_PX = 512;

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const glb = fs.readFileSync(source);
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
const bin = glb.subarray(20 + jsonLength + 8);

const view = (index) => {
  const bv = gltf.bufferViews[index];
  return bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
};
const floats = (accessor) => {
  const a = gltf.accessors[accessor];
  const bytes = view(a.bufferView);
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
};

if (gltf.meshes.length !== 1 || gltf.meshes[0].primitives.length !== 1) throw new Error("expected one primitive");
const primitive = gltf.meshes[0].primitives[0];
const position = floats(primitive.attributes.POSITION);
const uv = floats(primitive.attributes.TEXCOORD_0);
const indexBytes = view(gltf.accessors[primitive.indices].bufferView);
const sourceIndices = new Uint32Array(indexBytes.buffer.slice(indexBytes.byteOffset, indexBytes.byteOffset + indexBytes.byteLength));

// Weld: identical position + uv become one vertex. Normals are left out --
// they are per face in the export, so they would keep every triangle apart.
const weldKey = (i) => [
  ...[0, 1, 2].map((k) => Math.round(position[i * 3 + k] * 1e3)),
  ...[0, 1].map((k) => Math.round(uv[i * 2 + k] * 1e5)),
].join(",");
const welded = new Map();
const remap = new Uint32Array(position.length / 3);
for (let i = 0; i < remap.length; i++) {
  const key = weldKey(i);
  let target = welded.get(key);
  if (target === undefined) welded.set(key, (target = welded.size));
  remap[i] = target;
}
const weldedCount = welded.size;
const pick = (src, size) => {
  const dst = new Float32Array(weldedCount * size);
  for (let i = 0; i < remap.length; i++) for (let k = 0; k < size; k++) dst[remap[i] * size + k] = src[i * size + k];
  return dst;
};
const wPosition = pick(position, 3);
const wUv = pick(uv, 2);
const wIndices = sourceIndices.map((i) => remap[i]);

// Smooth normals from the full-resolution surface, area weighted and shared
// across texture seams so the seams don't show. Done before simplifying: on
// the simplified mesh's long thin triangles they come out blotchy.
const seamless = new Map();
const positionGroup = new Uint32Array(weldedCount);
for (let i = 0; i < weldedCount; i++) {
  const key = [0, 1, 2].map((k) => Math.round(wPosition[i * 3 + k] * 1e3)).join(",");
  let group = seamless.get(key);
  if (group === undefined) seamless.set(key, (group = seamless.size));
  positionGroup[i] = group;
}
const groupNormal = new Float32Array(seamless.size * 3);
for (let t = 0; t < wIndices.length; t += 3) {
  const [a, b, c] = [wIndices[t], wIndices[t + 1], wIndices[t + 2]];
  const p = (i, k) => wPosition[i * 3 + k];
  const e1 = [0, 1, 2].map((k) => p(b, k) - p(a, k));
  const e2 = [0, 1, 2].map((k) => p(c, k) - p(a, k));
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  for (const v of [a, b, c]) for (let k = 0; k < 3; k++) groupNormal[positionGroup[v] * 3 + k] += n[k];
}
const wNormal = new Float32Array(weldedCount * 3);
for (let i = 0; i < weldedCount; i++) {
  const g = positionGroup[i];
  const length = Math.hypot(groupNormal[g * 3], groupNormal[g * 3 + 1], groupNormal[g * 3 + 2]) || 1;
  for (let k = 0; k < 3; k++) wNormal[i * 3 + k] = groupNormal[g * 3 + k] / length;
}

// Simplify, keeping texture seams and the shading in mind.
const attributes = new Float32Array(weldedCount * 5);
for (let i = 0; i < weldedCount; i++) {
  attributes.set(wUv.subarray(i * 2, i * 2 + 2), i * 5);
  attributes.set(wNormal.subarray(i * 3, i * 3 + 3), i * 5 + 2);
}
const target = Math.floor((wIndices.length * KEEP) / 3) * 3;
const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
  wIndices, wPosition, 3, attributes, 5, [1, 1, 0.5, 0.5, 0.5], null, target, MAX_ERROR
);

// Compact to the vertices still used, in the order meshopt's encoder likes.
const [order, vertexCount] = MeshoptEncoder.reorderMesh(simplified, true, true);
const compact = (src, size) => {
  const dst = new Float32Array(vertexCount * size);
  for (let i = 0; i < order.length; i++) if (order[i] !== 0xffffffff) for (let k = 0; k < size; k++) dst[order[i] * size + k] = src[i * size + k];
  return dst;
};
const outPosition = compact(wPosition, 3);
const outNormal = compact(wNormal, 3);
const outUv = compact(wUv, 2);
const outIndices = vertexCount < 65536 ? Uint16Array.from(simplified) : simplified;

// Assemble the new GLB. Buffer 0 holds the compressed data; buffer 1 is the
// extension's fallback buffer, never actually downloaded.
const chunks = [];
let binLength = 0;
const append = (bytes) => {
  const offset = binLength;
  chunks.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  binLength += bytes.byteLength;
  const pad = (4 - (binLength % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    binLength += pad;
  }
  return offset;
};
let fallbackLength = 0;
const bufferViews = [];
const compressedView = (data, count, stride, mode, target) => {
  const raw = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const encoded = MeshoptEncoder.encodeGltfBuffer(raw, count, stride, mode);
  const byteOffset = append(encoded);
  const view = {
    buffer: 1,
    byteOffset: fallbackLength,
    byteLength: raw.byteLength,
    target,
    extensions: {
      EXT_meshopt_compression: { buffer: 0, byteOffset, byteLength: encoded.byteLength, byteStride: stride, count, mode },
    },
  };
  if (mode === "ATTRIBUTES") view.byteStride = stride;
  fallbackLength += raw.byteLength + ((4 - (raw.byteLength % 4)) % 4);
  bufferViews.push(view);
  return bufferViews.length - 1;
};

const bounds = (values) => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], values[i + k]);
    max[k] = Math.max(max[k], values[i + k]);
  }
  return { min, max };
};

const accessors = [
  { bufferView: compressedView(outPosition, vertexCount, 12, "ATTRIBUTES", 34962), componentType: 5126, count: vertexCount, type: "VEC3", ...bounds(outPosition) },
  { bufferView: compressedView(outNormal, vertexCount, 12, "ATTRIBUTES", 34962), componentType: 5126, count: vertexCount, type: "VEC3" },
  { bufferView: compressedView(outUv, vertexCount, 8, "ATTRIBUTES", 34962), componentType: 5126, count: vertexCount, type: "VEC2" },
  { bufferView: compressedView(outIndices, outIndices.length, outIndices.BYTES_PER_ELEMENT, "TRIANGLES", 34963), componentType: outIndices.BYTES_PER_ELEMENT === 2 ? 5123 : 5125, count: outIndices.length, type: "SCALAR" },
];

// Normal maps keep more quality than colour; WebP at 512px either way.
const normalImage = gltf.textures[gltf.materials[0].normalTexture.index].source;
const images = [];
for (const [index, image] of gltf.images.entries()) {
  const webp = await sharp(view(image.bufferView))
    .resize(TEXTURE_PX, TEXTURE_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: index === normalImage ? 92 : 82 })
    .toBuffer();
  bufferViews.push({ buffer: 0, byteOffset: append(webp), byteLength: webp.byteLength });
  images.push({ bufferView: bufferViews.length - 1, mimeType: "image/webp" });
}

const output = {
  ...gltf,
  extensionsUsed: ["EXT_meshopt_compression", "EXT_texture_webp"],
  extensionsRequired: ["EXT_meshopt_compression", "EXT_texture_webp"],
  meshes: [{ ...gltf.meshes[0], primitives: [{ ...primitive, attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3 }] }],
  accessors,
  bufferViews,
  images,
  textures: gltf.textures.map(({ source, ...texture }) => ({ ...texture, extensions: { EXT_texture_webp: { source } } })),
  buffers: [
    { byteLength: binLength },
    { byteLength: fallbackLength, extensions: { EXT_meshopt_compression: { fallback: true } } },
  ],
};

const json = Buffer.from(JSON.stringify(output));
const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const binChunk = Buffer.concat(chunks);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binChunk.length, 8);
const chunkHeader = (length, type) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(length, 0);
  h.writeUInt32LE(type, 4);
  return h;
};
fs.writeFileSync(out, Buffer.concat([header, chunkHeader(jsonPadded.length, 0x4e4f534a), jsonPadded, chunkHeader(binChunk.length, 0x004e4942), binChunk]));

console.log({
  vertices: `${remap.length} -> welded ${weldedCount} -> ${vertexCount}`,
  triangles: `${sourceIndices.length / 3} -> ${simplified.length / 3}`,
  error: error.toFixed(5),
  size: `${(glb.length / 1e6).toFixed(2)} MB -> ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`,
});

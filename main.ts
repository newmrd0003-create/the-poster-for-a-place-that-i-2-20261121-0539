// VELMARA — "The Poster for a Place That Isn't There"
// main.ts: copies the committed poster asset to the output path and
// verifies the copy byte-for-byte. No network, no randomness, no clock:
// two runs produce byte-identical output.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSET = join(HERE, "poster.png");
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUT = join(OUT_DIR, "entry.png");
const MAX_BYTES = 1_048_576;
// Pinned hash of the committed poster asset: a corrupted or swapped
// poster.png fails fast here instead of shipping a wrong image.
const EXPECTED_ASSET_SHA256 =
  "995e188467cb70e79a4502d3f70d116ffdc9920d5e8fa01b2689dfe351358b32";

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function checkPng(buf: Buffer): void {
  // PNG signature (8 bytes) + IHDR chunk: width/height at fixed offsets.
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(SIG)) {
    throw new Error("poster.png is not a PNG");
  }
  if (buf.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("poster.png has no IHDR chunk");
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    throw new Error(`poster.png is ${width}x${height}, expected 1024x1024`);
  }
  if (buf.length > MAX_BYTES) {
    throw new Error(`poster.png is ${buf.length} bytes, over the 1 MiB gate`);
  }
}

const src = readFileSync(ASSET);
checkPng(src);
if (sha256(src) !== EXPECTED_ASSET_SHA256) {
  throw new Error(
    `poster.png hash mismatch: got ${sha256(src)}, ` +
      `expected ${EXPECTED_ASSET_SHA256}`,
  );
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(ASSET, OUT);

const out = readFileSync(OUT);
if (!out.equals(src)) {
  throw new Error("output copy differs from poster.png");
}
checkPng(out);

console.log(`VELMARA poster -> ${OUT}`);
console.log(`bytes: ${out.length}  sha256: ${sha256(out)}`);
console.log("verified: 1024x1024 PNG, under 1 MiB, byte-identical to poster.png");

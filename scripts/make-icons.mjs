// Draws the app icon (a white plate with a sky-blue rim and a blue olive sprig, on navy) as PNG files.
// No image libraries needed: it writes the pixels itself. Run with: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

// Palette: navy #1B365D, blue #005A9C, sky #60C1E5, pale sky #A0E0EF
const NAVY = [27, 54, 93], BLUE = [0, 90, 156], SKY = [96, 193, 229], WHITE = [245, 250, 252];

const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
}

/** Is (x, y) inside an ellipse centred at (cx, cy) with radii (a, b), rotated by `angle` radians? (0..1 coordinates) */
function inLeaf(x, y, cx, cy, a, b, angle) {
  const dx = x - cx, dy = y - cy;
  const u = dx * Math.cos(angle) + dy * Math.sin(angle);
  const v = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return (u * u) / (a * a) + (v * v) / (b * b) <= 1;
}

function colorAt(x, y) {
  const r = Math.hypot(x - 0.5, y - 0.5);
  if (r > 0.37) return NAVY; // background (full-bleed so it also works as a maskable icon)
  if (r > 0.32) return SKY; // plate rim
  // olive sprig: a stem and five leaves across the plate
  const t = (x - 0.3) / 0.4; // 0..1 along the stem
  const stemY = 0.58 - 0.16 * t;
  if (t >= 0 && t <= 1 && Math.abs(y - stemY) < 0.012) return NAVY;
  const leaves = [
    [0.36, 0.52, -0.9], [0.44, 0.6, 0.7], [0.5, 0.47, -0.9], [0.58, 0.55, 0.7], [0.66, 0.42, -0.6],
  ];
  for (const [cx, cy, ang] of leaves) if (inLeaf(x, y, cx, cy, 0.075, 0.03, ang)) return BLUE;
  if (Math.hypot(x - 0.71, y - 0.47) < 0.035) return SKY; // one olive
  return WHITE;
}

function icon(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      // 2x2 supersampling for smooth edges
      let acc = [0, 0, 0];
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const c = colorAt((x + ox) / size, (y + oy) / size);
        acc = acc.map((v, i) => v + c[i] / 4);
      }
      acc.forEach((v, i) => { raw[y * (size * 3 + 1) + 1 + x * 3 + i] = Math.round(v); });
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192));
writeFileSync('public/icons/icon-512.png', icon(512));
writeFileSync('public/icons/apple-touch-icon.png', icon(180));
console.log('Icons written to public/icons/');

// Draws the tray icon at runtime (a little water drop) so no asset files are needed.
const zlib = require('zlib');
const { nativeImage } = require('electron');

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function dropIcon(size = 32, color = [64, 170, 245]) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2, r = size * 0.3, cy = size * 0.64, tipY = size * 0.08;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // circle body + triangular tip tapering up to (cx, tipY)
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      let a = 0;
      const inCircle = Math.sqrt(dx * dx + dy * dy) <= r;
      const t = (y + 0.5 - tipY) / (cy - tipY);
      const inTip = t >= 0 && t <= 1 && Math.abs(dx) <= t * r * 0.98;
      if (inCircle || inTip) a = 255;
      const hl = Math.hypot(dx + r * 0.35, dy + r * 0.25) < r * 0.28;
      const i = (y * size + x) * 4;
      px[i] = hl ? 255 : color[0]; px[i + 1] = hl ? 255 : color[1]; px[i + 2] = hl ? 255 : color[2]; px[i + 3] = a;
    }
  }
  return nativeImage.createFromBuffer(png(size, px));
}

module.exports = { dropIcon };

// Minimal ID3v2 reader (title, artist, album, cover) + filename fallback.
const fs = require('fs');
const path = require('path');

function decode(buf, enc) {
  if (!buf.length) return '';
  if (enc === 1) {
    if (buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le');
    if (buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.slice(2)); b.swap16(); return b.toString('utf16le'); }
    return buf.toString('utf16le');
  }
  if (enc === 2) { const b = Buffer.from(buf); b.swap16(); return b.toString('utf16le'); }
  if (enc === 3) return buf.toString('utf8');
  return buf.toString('latin1');
}
const clean = (s) => s.replace(/\u0000+$/g, '').replace(/^\u0000+/, '').split('\u0000')[0].trim();
const syncsafe = (b, o) => ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);

function readID3(file) {
  const out = {};
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(10);
    if (fs.readSync(fd, head, 0, 10, 0) < 10 || head.toString('latin1', 0, 3) !== 'ID3') return out;
    const ver = head[3];
    const flags = head[5];
    const size = syncsafe(head, 6);
    const len = Math.min(size, 12 * 1024 * 1024);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 10);
    let off = 0;
    if (flags & 0x40 && ver >= 3) off += ver === 4 ? syncsafe(buf, 0) : buf.readUInt32BE(0) + 4;
    const idLen = ver === 2 ? 3 : 4;
    const hdr = ver === 2 ? 6 : 10;
    while (off + hdr <= len) {
      const id = buf.toString('latin1', off, off + idLen);
      if (!/^[A-Z0-9]+$/.test(id)) break;
      let fsz;
      if (ver === 2) fsz = (buf[off + 3] << 16) | (buf[off + 4] << 8) | buf[off + 5];
      else if (ver === 4) fsz = syncsafe(buf, off + 4);
      else fsz = buf.readUInt32BE(off + 4);
      const start = off + hdr;
      const end = start + fsz;
      if (fsz <= 0 || end > len) break;
      const data = buf.slice(start, end);
      if (['TIT2', 'TT2'].includes(id)) out.title = clean(decode(data.slice(1), data[0]));
      else if (['TPE1', 'TP1'].includes(id)) out.artist = clean(decode(data.slice(1), data[0]));
      else if (['TALB', 'TAL'].includes(id)) out.album = clean(decode(data.slice(1), data[0]));
      else if ((id === 'APIC' || id === 'PIC') && !out.art && data.length < 4 * 1024 * 1024) {
        const enc = data[0];
        let p = 1;
        let mime;
        if (id === 'PIC') { mime = 'image/' + data.toString('latin1', 1, 4).toLowerCase().replace('jpg', 'jpeg'); p = 4; }
        else { const z = data.indexOf(0, 1); mime = data.toString('latin1', 1, z); p = z + 1; }
        p += 1; // picture type
        const wide = enc === 1 || enc === 2;
        if (wide) { while (p + 1 < data.length && !(data[p] === 0 && data[p + 1] === 0)) p += 2; p += 2; }
        else { const z = data.indexOf(0, p); p = z < 0 ? data.length : z + 1; }
        const img = data.slice(p);
        if (img.length > 100) out.art = `data:${mime || 'image/jpeg'};base64,${img.toString('base64')}`;
      }
      off = end;
    }
  } catch { /* unreadable tags => fall back to filename */ }
  finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
  return out;
}

function trackInfo(file) {
  const tags = readID3(file);
  const base = path.basename(file, path.extname(file)).replace(/_/g, ' ');
  let title = tags.title;
  let artist = tags.artist;
  if (!title) {
    const m = base.match(/^(.+?)\s+-\s+(.+)$/);
    if (m) { artist = artist || m[1].trim(); title = m[2].trim(); } else title = base;
  }
  return { path: file, title, artist: artist || 'Unknown Artist', album: tags.album || '', art: tags.art || '' };
}

module.exports = { readID3, trackInfo };

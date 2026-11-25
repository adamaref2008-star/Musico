const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { readID3, trackInfo } = require('../src/media/id3');
const mac = require('../src/media/mac');

function frame(id, data, ver) {
  const sz = Buffer.alloc(4);
  if (ver === 4) { sz[0] = (data.length >> 21) & 0x7f; sz[1] = (data.length >> 14) & 0x7f; sz[2] = (data.length >> 7) & 0x7f; sz[3] = data.length & 0x7f; } else sz.writeUInt32BE(data.length);
  return Buffer.concat([Buffer.from(id, 'latin1'), sz, Buffer.from([0, 0]), data]);
}
function tag(ver, frames) {
  const body = Buffer.concat(frames);
  const s = body.length;
  const head = Buffer.from([0x49, 0x44, 0x33, ver, 0, 0, (s >> 21) & 0x7f, (s >> 14) & 0x7f, (s >> 7) & 0x7f, s & 0x7f]);
  return Buffer.concat([head, body, Buffer.alloc(32)]);
}
const txt = (s, enc = 3) => Buffer.concat([Buffer.from([enc]), Buffer.from(s, enc === 3 ? 'utf8' : 'latin1')]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(200, 7)]);
const apic = Buffer.concat([Buffer.from([0]), Buffer.from('image/png\0', 'latin1'), Buffer.from([3]), Buffer.from('cover\0', 'latin1'), png]);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'musico-'));
for (const ver of [3, 4]) {
  const f = path.join(dir, `t${ver}.mp3`);
  fs.writeFileSync(f, Buffer.concat([tag(ver, [frame('TIT2', txt('Get Lucky', ver === 4 ? 3 : 0), ver), frame('TPE1', txt('Daft Punk', ver === 4 ? 3 : 0), ver), frame('TALB', txt('RAM', 0), ver), frame('APIC', apic, ver)]), Buffer.alloc(500)]));
  const t = readID3(f);
  assert.strictEqual(t.title, 'Get Lucky'); assert.strictEqual(t.artist, 'Daft Punk'); assert.strictEqual(t.album, 'RAM');
  assert(t.art.startsWith('data:image/png;base64,'), 'art v' + ver);
}
// UTF-16 title with BOM
const u16 = Buffer.concat([Buffer.from([1, 0xff, 0xfe]), Buffer.from('Café ♪', 'utf16le')]);
fs.writeFileSync(path.join(dir, 'u.mp3'), Buffer.concat([tag(3, [frame('TIT2', u16, 3)]), Buffer.alloc(100)]));
assert.strictEqual(readID3(path.join(dir, 'u.mp3')).title, 'Café ♪');
// filename fallback
fs.writeFileSync(path.join(dir, 'Daft_Punk - Around The World.flac'), Buffer.alloc(10));
const fi = trackInfo(path.join(dir, 'Daft_Punk - Around The World.flac'));
assert.strictEqual(fi.title, 'Around The World'); assert.strictEqual(fi.artist, 'Daft Punk');
fs.writeFileSync(path.join(dir, 'junk.mp3'), Buffer.from('not an mp3'));
assert.strictEqual(trackInfo(path.join(dir, 'junk.mp3')).title, 'junk');
// mac parser
let p = mac.parse('Spotify|playing|Get Lucky (feat. Pharrell | Nile)|Daft Punk|Random Access Memories|369000|120,5|https://i.scdn.co/image/x');
assert.deepStrictEqual([p.app, p.playing, p.title, p.artist, p.duration, p.position, p.art], ['Spotify', true, 'Get Lucky (feat. Pharrell | Nile)', 'Daft Punk', 369, 120.5, 'https://i.scdn.co/image/x']);
p = mac.parse('Music|paused|Song|Artist|Album|200.5|3.25|');
assert.deepStrictEqual([p.playing, p.duration, p.position, p.art], [false, 200.5, 3.25, '']);
assert.strictEqual(mac.parse('garbage'), null);
// windows PS script: balanced braces/parens, param first
const { SCRIPT } = require('../src/media/win');
const cnt = (c) => SCRIPT.split(c).length - 1;
assert.strictEqual(cnt('{'), cnt('}')); assert.strictEqual(cnt('('), cnt(')'));
assert(SCRIPT.startsWith('param('));
console.log('all unit tests passed');

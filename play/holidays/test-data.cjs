// Checks data.js: every round covers all nine holidays, each card is unique within its round,
// spellings the book settled stay settled, and the Prophet Muhammad is never in a picture round.
// Run: node play/holidays/test-data.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'), ctx);
const D = ctx.window.HoliMatch;
let fails = 0;
const fail = m => { fails++; console.error('FAIL ' + m); };

const ids = D.HOLIDAYS.map(h => h.id);
if (ids.length !== 9) fail(`expected 9 holidays, found ${ids.length}`);
if (new Set(ids).size !== ids.length) fail('duplicate holiday ids');
for (const h of D.HOLIDAYS) {
  if (!Array.isArray(h.icons) || h.icons.length !== 2) fail(`${h.id} needs two icons`);
  if (!/^#[0-9a-f]{6}$/i.test(h.color)) fail(`${h.id} color must be #rrggbb`);
}
if (D.ROUNDS.length !== 5) fail(`expected 5 rounds, found ${D.ROUNDS.length}`);
if (!(D.PER_ROUND >= 2 && D.PER_ROUND <= ids.length)) fail('PER_ROUND must be between 2 and 9');

D.ROUNDS.forEach((R, i) => {
  const keys = Object.keys(R.cards);
  for (const id of ids) if (!R.cards[id] || !R.cards[id].text) fail(`round ${i + 1} missing ${id}`);
  for (const k of keys) if (!ids.includes(k)) fail(`round ${i + 1} has unknown holiday ${k}`);
  const texts = keys.map(k => R.cards[k].text.toLowerCase());
  if (new Set(texts).size !== texts.length) fail(`round ${i + 1} has two cards with the same words`);
  if (!['picture', 'words'].includes(R.kind)) fail(`round ${i + 1} kind must be picture or words`);
  if (R.kind === 'picture' && !/^[a-z]+$/.test(R.prefix || '')) fail(`round ${i + 1} needs a file prefix`);
  if (R.kind === 'picture') {
    for (const k of keys) if (/muhammad|prophet/i.test(R.cards[k].text)) fail(`round ${i + 1}: the Prophet Muhammad must stay text only`);
  }
});
if (D.ROUNDS[2].kind !== 'words' || D.ROUNDS[4].kind !== 'words') fail('rounds 3 and 5 are words only');
if (D.ROUNDS[2].cards.kwanzaa.text !== 'Habari gani?') fail('Habari gani belongs to Kwanzaa');
if (!/maccabees/i.test(D.ROUNDS[4].cards.hanukkah.text)) fail('Hanukkah people should be the Maccabees');

const all = JSON.stringify(D);
for (const [bad, good] of [[/Malwid/i, 'Mawlid'], [/Siddartha/i, 'Siddhartha'], [/Hannukah|Chanukah/i, 'Hanukkah'], [/—/, 'a hyphen, not an em dash']]) {
  if (bad.test(all)) fail(`spelling: use ${good}`);
}
if (!fs.existsSync(path.join(__dirname, '..', '..', D.PRIZE.file.replace(/^\//, '')))) fail(`prize file missing: ${D.PRIZE.file}`);

if (fails) { console.error(`${fails} problem(s)`); process.exit(1); }
console.log(`ok: ${ids.length} holidays, ${D.ROUNDS.length} rounds, ${D.PER_ROUND} per round`);

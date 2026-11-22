// HoliBot Match: screens, matching, pictures and saved progress.
// All words, rounds and file names live in data.js.
(() => {
  'use strict';
  const D = window.HoliMatch;
  const app = document.getElementById('app');
  const soundBtn = document.getElementById('sound-toggle');
  const byId = Object.fromEntries(D.HOLIDAYS.map(h => [h.id, h]));
  const TOTAL = D.ROUNDS.length;

  // ---------- Saved progress (this browser only) ----------
  const SAVE_KEY = 'friendlyrobots.holibotmatch.v1';
  const blank = () => ({next: 0, done: false, muted: false});
  let save = blank();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) save = Object.assign(blank(), JSON.parse(raw) || {});
  } catch (e) { /* storage blocked: play without saving */ }
  save.next = Math.min(TOTAL, Math.max(0, save.next | 0));
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

  // ---------- Sound: tiny synthesized chimes ----------
  let audio = null;
  function tone(freq, dur, delay = 0, vol = 0.09, type = 'triangle') {
    if (save.muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime + delay, o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    pick: () => tone(660, 0.08, 0, 0.05, 'sine'),
    match: () => { tone(784, 0.14); tone(1046, 0.18, 0.09); },
    oops: () => tone(330, 0.18, 0, 0.06, 'sine'),
    round: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, i * 0.11))
  };
  const setSoundLabel = () => {
    soundBtn.textContent = save.muted ? 'Sound off' : 'Sound on';
    soundBtn.setAttribute('aria-pressed', String(!save.muted));
  };
  soundBtn.addEventListener('click', () => { save.muted = !save.muted; persist(); setSoundLabel(); });
  setSoundLabel();

  // ---------- Pictures: shown only if the file exists, otherwise the words stay ----------
  const seen = new Map();
  const imgReady = src => {
    if (!seen.has(src)) seen.set(src, new Promise(ok => {
      const im = new Image();
      im.onload = () => ok(im.naturalWidth > 0);
      im.onerror = () => ok(false);
      im.src = src;
    }));
    return seen.get(src);
  };
  // Put a picture into slot when src loads. The words stay for screen readers either way.
  function fillPicture(slot, src) {
    imgReady(src).then(ok => {
      if (!ok || !slot.isConnected) return;
      const im = document.createElement('img');
      im.src = src; im.alt = ''; im.decoding = 'async';
      slot.textContent = ''; slot.classList.remove('ph'); slot.appendChild(im);
    });
  }
  const iconFile = (id, n) => `${D.IMG_DIR}icon-${id}-${n}.png`;
  const picFile = (prefix, id) => `${D.IMG_DIR}${prefix}-${id}.png`;

  // ---------- Helpers ----------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const shuffle = a => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  };
  const tint = (hex, amt) => { // mix a holiday color toward white
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * amt));
    return `rgb(${c.join(',')})`;
  };
  function dots(current) {
    const ul = el('ul', 'dots');
    ul.setAttribute('aria-label', `Round ${Math.min(current + 1, TOTAL)} of ${TOTAL}`);
    for (let i = 0; i < TOTAL; i++) ul.appendChild(el('li', i < current ? 'done' : i === current ? 'now' : ''));
    return ul;
  }
  function show(node) {
    app.textContent = '';
    app.appendChild(node);
    const h = node.querySelector('h2');
    if (h) { h.tabIndex = -1; h.focus({preventScroll: true}); }
    window.scrollTo({top: 0});
  }
  function bots() {
    const wrap = el('div', 'bots');
    for (const [name, file] of [['Feliz', 'feliz'], ['Festiva', 'festiva']]) {
      const b = el('span', 'bot ph', name);
      b.setAttribute('aria-hidden', 'true');
      fillPicture(b, `${D.IMG_DIR}${file}.png`);
      wrap.appendChild(b);
    }
    return wrap;
  }
  function button(label, cls, onClick) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.type = 'button'; b.addEventListener('click', onClick);
    return b;
  }

  // ---------- Screens ----------
  function startScreen() {
    const p = el('section', 'panel');
    p.appendChild(el('p', 'eyebrow', 'Feliz and Festiva'));
    p.appendChild(el('h2', '', 'HoliBot Match'));
    p.appendChild(bots());
    p.appendChild(el('p', '', 'Help the HoliBots match each holiday to its card. Tap a holiday, then tap the card that goes with it.'));
    p.appendChild(el('p', '', 'Finish all five rounds to win a coloring page!'));
    p.appendChild(dots(save.done ? TOTAL : save.next));
    const act = el('div', 'actions');
    if (save.done) {
      act.appendChild(button('See my coloring page', 'gold', prizeScreen));
      act.appendChild(button('Play again', 'plain', () => { save.next = 0; persist(); playRound(0); }));
    } else if (save.next > 0) {
      act.appendChild(button(`Keep going: round ${save.next + 1}`, 'gold', () => playRound(save.next)));
      act.appendChild(button('Start over', 'plain', () => { save.next = 0; persist(); playRound(0); }));
    } else {
      act.appendChild(button('Start', 'gold', () => playRound(0)));
    }
    p.appendChild(act);
    show(p);
  }

  function playRound(r) {
    const R = D.ROUNDS[r];
    const picks = shuffle(D.HOLIDAYS).slice(0, Math.min(D.PER_ROUND, D.HOLIDAYS.length));
    const root = el('section', 'round');
    const head = el('div', 'round-head');
    head.appendChild(el('h2', '', `Round ${r + 1}: ${R.title}`));
    head.appendChild(dots(r));
    root.appendChild(head);
    root.appendChild(el('p', 'ask', R.ask));
    const status = el('p', 'status', 'Tap a holiday, then tap its match.');
    status.setAttribute('role', 'status');
    root.appendChild(status);

    const board = el('div', 'board' + (R.kind === 'picture' ? ' pics' : ''));
    const left = el('ul', 'col names'), right = el('ul', 'col clues');
    left.appendChild(el('li', 'col-title', 'Holidays'));
    right.appendChild(el('li', 'col-title', R.kind === 'words' ? 'Words' : 'Pictures'));
    board.append(left, right);
    root.appendChild(board);

    let selected = null, matched = 0;

    function makeTile(h, side) {
      const li = el('li');
      const t = el('button', 'tile ' + (side === 'name' ? 'name' : R.kind === 'picture' ? 'picture' : 'words'));
      t.type = 'button';
      t.dataset.id = h.id; t.dataset.side = side;
      t.setAttribute('aria-pressed', 'false');
      t.style.setProperty('--hc', h.color);
      t.style.setProperty('--hb', tint(h.color, 0.88));
      t.style.setProperty('--he', tint(h.color, 0.55));
      const iconN = side === 'name' ? 1 : 2;
      const icon = el('span', 'icon ph', h.icons[iconN - 1]);
      icon.setAttribute('aria-hidden', 'true');
      fillPicture(icon, iconFile(h.id, iconN));
      const text = side === 'name' ? h.name : R.cards[h.id].text;
      if (side === 'clue' && R.kind === 'picture') {
        const pic = el('span', 'pic ph', text);
        pic.setAttribute('aria-hidden', 'true');
        fillPicture(pic, picFile(R.prefix, h.id));
        t.append(pic, icon, el('span', 'label', text));
      } else {
        t.append(icon, el('span', 'label', text));
      }
      const check = el('span', 'check', '✓');
      check.setAttribute('aria-hidden', 'true');
      t.appendChild(check);
      t.addEventListener('click', () => tap(t));
      li.appendChild(t);
      return li;
    }

    function setStatus(msg, kind) {
      status.textContent = msg;
      status.className = 'status' + (kind ? ' ' + kind : '');
    }
    function wiggle(t) { t.classList.remove('wiggle'); void t.offsetWidth; t.classList.add('wiggle'); }

    function tap(t) {
      if (t.classList.contains('matched')) return;
      if (!selected) { select(t); return; }
      if (selected === t) { select(null); return; }
      if (selected.dataset.side === t.dataset.side) { select(t); return; }
      // One card from each side: check the pair.
      if (selected.dataset.id === t.dataset.id) {
        const h = byId[t.dataset.id];
        for (const x of [selected, t]) {
          x.classList.add('matched'); x.setAttribute('aria-pressed', 'false');
          x.setAttribute('aria-disabled', 'true');
          x.setAttribute('aria-label', `${x.querySelector('.label').textContent}, matched with ${x.dataset.side === 'name' ? R.cards[h.id].text : h.name}`);
        }
        selected = null; matched++;
        const note = R.cards[h.id].note;
        setStatus(note ? `Yes! ${note}` : `Yes! That's ${h.name}!`, 'good');
        sfx.match();
        if (matched === picks.length) setTimeout(() => roundDone(r), 1400);
      } else {
        wiggle(t); wiggle(selected);
        setStatus('Not quite. Try another one!', 'oops');
        sfx.oops();
        select(null);
      }
    }
    function select(t) {
      if (selected) selected.setAttribute('aria-pressed', 'false');
      selected = t;
      if (t) {
        t.setAttribute('aria-pressed', 'true');
        sfx.pick();
        const label = t.querySelector('.label').textContent;
        setStatus(t.dataset.side === 'name' ? `${label}! Now tap its match.` : `Now tap the holiday that goes with "${label}".`);
      }
    }

    for (const h of picks) left.appendChild(makeTile(h, 'name'));
    for (const h of shuffle(picks)) right.appendChild(makeTile(h, 'clue'));
    show(root);
  }

  function roundDone(r) {
    sfx.round();
    const last = r === TOTAL - 1;
    save.next = last ? 0 : r + 1;
    if (last) save.done = true;
    persist();
    if (last) { prizeScreen(true); return; }
    const p = el('section', 'panel');
    p.appendChild(el('p', 'eyebrow', `Round ${r + 1} done`));
    p.appendChild(el('h2', '', 'Great matching!'));
    p.appendChild(bots());
    p.appendChild(dots(r + 1));
    const next = D.ROUNDS[r + 1];
    p.appendChild(el('p', '', `Next up, round ${r + 2}: ${next.title}.`));
    const act = el('div', 'actions');
    act.appendChild(button('Next round', 'gold', () => playRound(r + 1)));
    p.appendChild(act);
    show(p);
  }

  function prizeScreen(justWon) {
    const p = el('section', 'panel');
    p.appendChild(el('p', 'eyebrow', justWon ? 'All five rounds!' : 'Your prize'));
    p.appendChild(el('h2', '', D.PRIZE.title));
    p.appendChild(dots(TOTAL));
    p.appendChild(el('p', '', 'You matched every holiday. Print it out and color it in!'));
    const art = el('img', 'prize-art');
    art.src = D.PRIZE.file; art.alt = 'Coloring page of Feliz and Festiva';
    p.appendChild(art);
    const act = el('div', 'actions');
    const dl = el('a', 'btn gold', 'Download my coloring page');
    dl.href = D.PRIZE.file; dl.setAttribute('download', D.PRIZE.download);
    act.appendChild(dl);
    act.appendChild(button('Play again', 'plain', () => { save.next = 0; persist(); playRound(0); }));
    p.appendChild(act);
    show(p);
  }

  startScreen();
})();

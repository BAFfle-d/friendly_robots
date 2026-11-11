// Rex Runs RoboTown: drawing, controls, screens and saved progress.
// The rules live in engine.js. Everything is drawn with canvas shapes, so there are no image files to load.
(() => {
  'use strict';
  const E = window.RexEngine;
  const {GROUND, REX_X} = E;
  const H = 360;
  const STEP = 1 / 120;

  // Coloring pages unlocked after level 5 and level 10.
  // To use real artwork, drop the files into play/prizes/ and change the file names here.
  const PRIZES = {
    5: {file: '/play/prizes/rex-and-billy-coloring-page.svg', name: 'Rex and Billy coloring page', download: 'rex-and-billy-coloring-page.svg'},
    10: {file: '/play/prizes/doggotron-coloring-page.svg', name: 'Rex the Doggotron coloring page', download: 'doggotron-coloring-page.svg'}
  };

  const $ = s => document.querySelector(s);
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const stage = $('#stage');
  const overlay = $('#overlay');
  const hintEl = $('#hint');
  const pauseBtn = $('#pause-toggle');
  const soundBtn = $('#sound-toggle');
  const jumpBtn = $('#jump-button');
  const duckBtn = $('#duck-button');
  const shieldBtn = $('#shield-button');
  const shieldCharge = $('#shield-charge');
  const controls = $('#controls');
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Saved progress (this browser only) ----------
  const SAVE_KEY = 'friendlyrobots.rexruns.v1';
  const blank = () => ({unlocked: 1, best: {}, prizes: {}, muted: false});
  let save = blank();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') save = Object.assign(blank(), data);
    }
  } catch (e) { /* storage blocked: play without saving */ }
  save.unlocked = Math.min(10, Math.max(1, save.unlocked | 0));
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

  // ---------- Sound: tiny synthesized beeps ----------
  let audio = null;
  function tone(freq, to, dur, type = 'sine', vol = 0.12, delay = 0) {
    if (save.muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime + delay;
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    jump: () => tone(420, 700, 0.14, 'square', 0.05),
    bolt: () => { tone(1046, 0, 0.07, 'sine', 0.08); tone(1568, 0, 0.09, 'sine', 0.07, 0.05); },
    bonk: () => { tone(260, 140, 0.28, 'triangle', 0.16); tone(190, 120, 0.3, 'sine', 0.08, 0.08); },
    shield: () => tone(300, 950, 0.35, 'sine', 0.08),
    glide: () => tone(880, 1320, 0.18, 'sine', 0.06),
    duck: () => tone(330, 220, 0.08, 'sine', 0.05),
    finish: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 0.18, 'triangle', 0.09, i * 0.11)),
    late: () => [392, 330, 262].forEach((f, i) => tone(f, 0, 0.22, 'sine', 0.08, i * 0.15)),
    woof: () => { tone(300, 180, 0.12, 'sawtooth', 0.05); tone(320, 190, 0.14, 'sawtooth', 0.05, 0.18); }
  };
  function setSoundLabel() {
    soundBtn.textContent = save.muted ? 'Sound off' : 'Sound on';
    soundBtn.setAttribute('aria-pressed', String(!save.muted));
  }
  soundBtn.addEventListener('click', () => { save.muted = !save.muted; persist(); setSoundLabel(); if (!save.muted) sfx.bolt(); });
  setSoundLabel();

  // ---------- View ----------
  const view = {W: 800, scale: 1, offY: 0, dpr: 1, cw: 800, ch: 320};
  function resize() {
    const r = stage.getBoundingClientRect();
    const cw = Math.max(200, r.width), ch = Math.max(120, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let scale = ch / H;
    let W = cw / scale;
    if (W < 460) { W = 460; scale = cw / W; }
    if (W > 1000) { W = 1000; scale = cw / W; }
    Object.assign(view, {W, scale, dpr, cw, ch, offY: Math.max(0, (ch - H * scale) / 2)});
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    draw();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  // ---------- Game state ----------
  let mode = 'menu';            // menu, intro, play, paused, finish, result
  let run = null;
  let level = Math.min(save.unlocked, 10);
  let anim = 0;                 // seconds, always ticking, for idle motion
  let demoX = 0;
  let fx = [];
  let finish = null;
  let hintShown = {};
  let hintTimer = 0;
  const input = {jump: false, duck: false, shield: false};
  let duckSources = new Set();

  // ---------- Scenery ----------
  const PALETTES = {
    sidewalk: {skyTop: '#86cdfc', skyBot: '#e6f6ff', far: '#b4d2ea', farWin: '#d9ebf8', ground: '#dcd6c8', seam: '#c4bcab', curb: '#a99f8c', street: '#6b7480'},
    laundry: {skyTop: '#ffc98f', skyBot: '#fff1db', far: '#e7b79a', farWin: '#f6dccb', ground: '#d8cfc4', seam: '#bfb2a4', curb: '#a39280', street: '#6f6a72'},
    rooftop: {skyTop: '#ff9a7a', skyBot: '#ffd9a8', far: '#8d7bb3', farWin: '#ffe39a', ground: '#8f96a1', seam: '#7a808b', curb: '#c26a4a', street: '#5d4b5f'},
    park: {skyTop: '#9fe1ff', skyBot: '#eefbe0', far: '#a9cfc0', farWin: '#d3eadf', ground: '#e8d6a6', seam: '#d4c08c', curb: '#6fbe5b', street: '#5aa449'},
    home: {skyTop: '#6c5bc9', skyBot: '#f6b8c4', far: '#5f5397', farWin: '#ffe08a', ground: '#cdc4dc', seam: '#b4a9c6', curb: '#968aae', street: '#4b4569'}
  };
  const sceneCache = {};
  function scenery(key) {
    if (sceneCache[key]) return sceneCache[key];
    const r = E.rng(key.length * 977 + key.charCodeAt(0));
    const far = [];
    let x = 0;
    while (x < 1600) {
      const w = 60 + r() * 90, h = 90 + r() * 120;
      far.push({x, w, h, antenna: r() < 0.45, round: r() < 0.3, face: r() < 0.18});
      x += w + 8 + r() * 30;
    }
    const mid = [];
    x = 0;
    while (x < 1300) {
      const w = 90 + r() * 110;
      mid.push({x, w, h: 50 + r() * 80, c: Math.floor(r() * 5), v: r()});
      x += w + 30 + r() * 80;
    }
    return (sceneCache[key] = {far, farP: 1600, mid, midP: 1300});
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  const fill = (c) => { ctx.fillStyle = c; ctx.fill(); };
  function circle(x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill(c); }
  function ellipse(x, y, rx, ry, c, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); fill(c); }

  const MID_COLORS = {
    sidewalk: ['#f7c59f', '#9ad1d4', '#f4a6a6', '#c3b1e1', '#ffe08a'],
    laundry: ['#d98d6a', '#c97b5b', '#e2a17f', '#b86b52', '#d8956f'],
    rooftop: ['#6d5f8f', '#7c6c9c', '#5d5080', '#8a79a8', '#6a5d8c'],
    park: ['#5cb85c', '#4aa64f', '#6cc46a', '#3f9a48', '#7ccf74'],
    home: ['#f2b5a7', '#a7c7e7', '#f6d38b', '#c4a7e7', '#9fd8c3']
  };

  function drawBackground(key, scroll) {
    const P = PALETTES[key];
    const W = view.W;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, P.skyTop); sky.addColorStop(1, P.skyBot);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND + 2);
    // sun or moon
    if (key === 'home') { circle(W * 0.8, 62, 22, '#fff6d6'); circle(W * 0.8 + 9, 56, 20, P.skyTop); }
    else if (key === 'rooftop') circle(W * 0.78, 120, 34, '#ffe9b0');
    else circle(W * 0.84, 58, 26, '#fff4b8');
    // clouds
    ctx.globalAlpha = key === 'home' ? 0.35 : 0.8;
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 290 - scroll * 0.08) % (W + 300) + W + 300) % (W + 300) - 150;
      const cy = 40 + (i % 2) * 34;
      ellipse(cx, cy, 34, 12, '#ffffff'); ellipse(cx + 22, cy - 8, 22, 12, '#ffffff'); ellipse(cx - 18, cy - 4, 18, 10, '#ffffff');
    }
    ctx.globalAlpha = 1;
    const sc = scenery(key);
    // far skyline: RoboTown towers
    const off1 = (scroll * 0.22) % sc.farP;
    for (const rep of [0, sc.farP]) {
      for (const b of sc.far) {
        const x = b.x - off1 + rep;
        if (x > W || x + b.w < 0) continue;
        const top = GROUND - 10 - b.h;
        ctx.fillStyle = P.far;
        if (b.round) { roundRect(x, top, b.w, b.h + 10, b.w / 2.2); ctx.fill(); }
        else ctx.fillRect(x, top, b.w, b.h + 10);
        if (b.antenna) {
          ctx.fillRect(x + b.w / 2 - 1.5, top - 22, 3, 22);
          circle(x + b.w / 2, top - 24, 4, Math.sin(anim * 3 + b.x) > 0 ? '#ff6b6b' : P.far);
        }
        ctx.fillStyle = P.farWin;
        if (b.face) {
          circle(x + b.w * 0.35, top + 28, 5, P.farWin); circle(x + b.w * 0.65, top + 28, 5, P.farWin);
          ctx.fillRect(x + b.w * 0.35, top + 42, b.w * 0.3, 3);
        } else {
          for (let wy = top + 16; wy < GROUND - 24; wy += 22)
            for (let wx = x + 10; wx < x + b.w - 14; wx += 18) ctx.fillRect(wx, wy, 8, 10);
        }
      }
    }
    // middle layer: the neighborhood for this level
    const off2 = (scroll * 0.5) % sc.midP;
    const cols = MID_COLORS[key];
    for (const rep of [0, sc.midP]) {
      for (const m of sc.mid) {
        const x = m.x - off2 + rep;
        if (x > W + 40 || x + m.w < -40) continue;
        drawMid(key, x, m, cols[m.c], P);
      }
    }
    // ground
    ctx.fillStyle = P.curb; ctx.fillRect(0, GROUND, W, 6);
    ctx.fillStyle = P.ground; ctx.fillRect(0, GROUND + 6, W, 30);
    ctx.fillStyle = P.street; ctx.fillRect(0, GROUND + 36, W, H - GROUND - 36);
    ctx.fillStyle = P.seam;
    const off3 = scroll % 64;
    for (let x = -off3; x < W; x += 64) ctx.fillRect(x, GROUND + 6, 3, 30);
    if (key !== 'park') {
      ctx.fillStyle = '#ffffff55';
      const off4 = scroll % 120;
      for (let x = -off4; x < W; x += 120) ctx.fillRect(x, GROUND + 46, 50, 4);
    }
  }

  function drawMid(key, x, m, c, P) {
    const base = GROUND;
    if (key === 'park') {
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x + m.w / 2 - 5, base - m.h * 0.6, 10, m.h * 0.6);
      circle(x + m.w / 2, base - m.h * 0.75, m.h * 0.42 + 12, c);
      circle(x + m.w / 2 - 22, base - m.h * 0.55, m.h * 0.28 + 8, c);
      circle(x + m.w / 2 + 24, base - m.h * 0.58, m.h * 0.3 + 8, c);
      if (m.v > 0.6) { ellipse(x + 10, base - 6, 26, 9, '#7cc4ff'); ellipse(x + 6, base - 12, 5, 4, '#ffd23f'); }
      return;
    }
    if (key === 'rooftop') {
      ctx.fillStyle = c; ctx.fillRect(x, base - m.h, m.w, m.h);
      ctx.fillStyle = '#00000022'; ctx.fillRect(x, base - m.h, m.w, 6);
      if (m.v > 0.5) { // water tower
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 20, base - m.h - 18, 4, 18); ctx.fillRect(x + 46, base - m.h - 18, 4, 18);
        roundRect(x + 14, base - m.h - 52, 42, 36, 8); fill('#9c6b4a');
        ctx.beginPath(); ctx.moveTo(x + 10, base - m.h - 50); ctx.lineTo(x + 35, base - m.h - 66); ctx.lineTo(x + 60, base - m.h - 50); fill('#7a5038');
      } else {
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x + m.w - 30, base - m.h - 12, 14, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
        ctx.fillStyle = '#ddd'; ctx.fillRect(x + m.w - 31, base - m.h - 12, 2, 12);
      }
      ctx.fillStyle = P.farWin;
      for (let wy = base - m.h + 16; wy < base - 12; wy += 20) for (let wx = x + 10; wx < x + m.w - 12; wx += 20) ctx.fillRect(wx, wy, 9, 9);
      return;
    }
    if (key === 'home') {
      const w = Math.min(m.w, 130), h = 44 + m.h * 0.4;
      ctx.fillStyle = c; ctx.fillRect(x, base - h, w, h);
      ctx.beginPath(); ctx.moveTo(x - 8, base - h); ctx.lineTo(x + w / 2, base - h - 34); ctx.lineTo(x + w + 8, base - h); fill('#5a4a7a');
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 14, base - h + 14, 18, 16); ctx.fillRect(x + w - 32, base - h + 14, 18, 16);
      ctx.fillStyle = '#6b4f3a'; ctx.fillRect(x + w / 2 - 9, base - 30, 18, 30);
      return;
    }
    if (key === 'laundry') {
      const h = m.h + 40;
      ctx.fillStyle = c; ctx.fillRect(x, base - h, m.w, h);
      ctx.fillStyle = '#00000018';
      for (let wy = base - h + 8; wy < base; wy += 10) ctx.fillRect(x, wy, m.w, 1);
      ctx.fillStyle = '#fff3e0';
      for (let wy = base - h + 16; wy < base - 30; wy += 34) for (let wx = x + 12; wx < x + m.w - 20; wx += 30) {
        ctx.fillRect(wx, wy, 14, 18);
        ctx.fillStyle = '#6b5446'; ctx.fillRect(wx - 3, wy + 18, 20, 3); ctx.fillStyle = '#fff3e0';
      }
      return;
    }
    // sidewalk: little shops with awnings and street lamps
    const h = 50 + m.h * 0.5;
    ctx.fillStyle = '#f9f2e3'; ctx.fillRect(x, base - h, m.w, h);
    ctx.fillStyle = c; ctx.fillRect(x - 4, base - h - 6, m.w + 8, 10);
    for (let i = 0; i < m.w; i += 16) { ctx.beginPath(); ctx.moveTo(x + i, base - h + 4); ctx.lineTo(x + i + 16, base - h + 4); ctx.lineTo(x + i + 8, base - h + 14); fill(c); }
    ctx.fillStyle = '#bfe3f2'; ctx.fillRect(x + 10, base - h + 22, m.w - 20, h - 40);
    ctx.fillStyle = '#88a'; ctx.fillRect(x + m.w + 14, base - 70, 3, 70);
    circle(x + m.w + 15.5, base - 72, 6, '#fff6b0');
  }

  // ---------- Characters ----------
  function drawRex(x, y, opts) {
    const {robo, duck, t, dizzy, shield, blink, air, wag, alpha = 1} = opts;
    ctx.save();
    ctx.globalAlpha = alpha * (blink ? 0.45 : 1);
    ctx.translate(x, y);
    if (dizzy) { ctx.translate(26, 0); ctx.rotate(Math.sin(t * 16) * 0.13); ctx.translate(-26, 0); }
    const run = air ? 0 : t * 14;
    const legLen = duck ? 9 : 14;
    const bodyY = duck ? -15 : -26;
    const ry = duck ? 9 : 13;
    const fur = robo ? '#3b82f6' : '#24242c';
    const furDark = robo ? '#2563eb' : '#15151b';
    const legC = robo ? '#94a3b8' : '#1c1c22';
    // tail
    const tw = (wag ? Math.sin(t * 30) : Math.sin(t * 12)) * 0.5;
    ctx.save();
    ctx.translate(8, bodyY - 4);
    ctx.rotate(-0.9 + tw);
    if (robo) { ctx.fillStyle = '#94a3b8'; ctx.fillRect(-2, -18, 4, 18); circle(0, -20, 4.5, '#facc15'); }
    else { ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-6, -12, 0, -20); ctx.quadraticCurveTo(5, -12, 4, 0); fill(fur); }
    ctx.restore();
    // legs (far pair darker)
    const legs = [[14, 0, furDark], [36, Math.PI, furDark], [18, Math.PI, legC], [40, 0, legC]];
    for (const [lx, ph, c] of legs) {
      const swing = air ? 0.5 : Math.sin(run + ph) * 0.6;
      ctx.save(); ctx.translate(lx, bodyY + ry - 4); ctx.rotate(air ? (lx < 25 ? 0.6 : -0.5) : swing);
      ctx.fillStyle = c; roundRect(-3.5, 0, 7, legLen + 2, 3); ctx.fill();
      if (robo) circle(0, 1, 3, '#cbd5e1');
      ctx.restore();
    }
    // body
    if (robo) {
      roundRect(4, bodyY - ry, 44, ry * 2, 10); fill(fur);
      ctx.fillStyle = '#93c5fd'; ctx.fillRect(14, bodyY - ry + 4, 2, ry * 2 - 8); ctx.fillRect(30, bodyY - ry + 4, 2, ry * 2 - 8);
      circle(23, bodyY, 3, '#a5f3fc');
    } else {
      ellipse(26, bodyY, 23, ry, fur);
      // scruffy fur along the back
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const fx0 = 8 + i * 7; ctx.moveTo(fx0, bodyY - ry + 3); ctx.lineTo(fx0 + 3, bodyY - ry - 4); ctx.lineTo(fx0 + 6, bodyY - ry + 3); }
      fill(fur);
    }
    // head
    const hx = duck ? 50 : 46, hy = duck ? -20 : -38;
    if (robo) {
      roundRect(hx - 13, hy - 12, 26, 24, 8); fill(fur);
      roundRect(hx + 4, hy - 2, 14, 11, 5); fill('#60a5fa');
      circle(hx + 17, hy + 1, 3, '#0f172a');
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(hx - 2, hy - 24, 3, 12);
      circle(hx - 0.5, hy - 25, 3.5, Math.sin(t * 6) > 0 ? '#facc15' : '#fde68a');
      roundRect(hx - 12, hy - 14, 9, 16, 4); fill('#1d4ed8');
      circle(hx + 3, hy - 3, 4.2, '#a5f3fc'); circle(hx + 3.8, hy - 3.4, 1.6, '#ffffff');
    } else {
      circle(hx, hy, 13, fur);
      // scruffy cheeks and brow
      ctx.beginPath(); ctx.moveTo(hx - 8, hy + 8); ctx.lineTo(hx - 4, hy + 15); ctx.lineTo(hx, hy + 9); ctx.lineTo(hx + 4, hy + 15); ctx.lineTo(hx + 8, hy + 8); fill(fur);
      ellipse(hx + 11, hy + 4, 9, 6.5, '#33333d');
      circle(hx + 18, hy + 1, 3.2, '#0b0b0f');
      ellipse(hx - 5, hy - 2, 5, 11, furDark, 0.35 + (air ? -0.4 : Math.sin(run) * 0.08));
      circle(hx + 3, hy - 3, 3.6, '#ffffff'); circle(hx + 3.8, hy - 3, 2.4, '#5b3a1e'); circle(hx + 4.4, hy - 3.8, 0.9, '#ffffff');
      ctx.fillStyle = '#e23b3b'; ctx.fillRect(hx - 9, hy + 9, 12, 4);
      circle(hx - 2, hy + 15, 2.6, '#facc15');
    }
    ctx.restore();
    if (dizzy && !reduceMotion) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + i * 2.09;
        star(x + 40 + Math.cos(a) * 16, y + (duck ? -38 : -58) + Math.sin(a) * 5, 5, '#ffd23f');
      }
    }
    if (shield) {
      ctx.save();
      ctx.globalAlpha = 0.28 + Math.sin(t * 20) * 0.06;
      circle(x + 28, y - 26, 44, '#7dd3fc');
      ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(x + 28, y - 26, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.57; star(x + 28 + Math.cos(a) * 40, y - 26 + Math.sin(a) * 40, 3, '#ffffff'); }
      ctx.restore();
    }
  }

  function star(x, y, r, c) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); fill(c);
  }
  function heart(x, y, s, c) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
    ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
    fill(c);
  }

  // Billy: brown hair, red shirt, blue overalls, as on the book cover.
  function drawBilly(x, y, t, hug) {
    ctx.save(); ctx.translate(x, y);
    const bob = Math.sin(t * 4) * 1.5;
    ctx.fillStyle = '#2b4a8a';
    roundRect(-14, -36, 11, 36, 4); ctx.fill(); roundRect(3, -36, 11, 36, 4); ctx.fill();
    ellipse(-9, -1, 9, 4, '#5a3a22'); ellipse(9, -1, 9, 4, '#5a3a22');
    roundRect(-18, -72 + bob, 36, 40, 10); fill('#e0403a');
    ctx.fillStyle = '#2b4a8a'; ctx.fillRect(-14, -52 + bob, 28, 18); ctx.fillRect(-12, -70 + bob, 5, 20); ctx.fillRect(7, -70 + bob, 5, 20);
    circle(-9.5, -54 + bob, 2, '#ffd23f'); circle(9.5, -54 + bob, 2, '#ffd23f');
    // arms
    ctx.fillStyle = '#e0403a';
    if (!hug) {
      ctx.save(); ctx.translate(-16, -66 + bob); ctx.rotate(-2.5 + Math.sin(t * 7) * 0.45);
      roundRect(-4, 0, 9, 22, 4); ctx.fill(); circle(0.5, 24, 5, '#f2c19c'); ctx.restore();
    }
    ctx.save(); ctx.translate(16, -66 + bob); ctx.rotate(0.25); roundRect(-4, 0, 9, 22, 4); ctx.fill(); circle(0.5, 24, 5, '#f2c19c'); ctx.restore();
    // head
    circle(0, -88 + bob, 15, '#f2c19c');
    ctx.beginPath(); ctx.ellipse(1, -98 + bob, 16, 9, 0, Math.PI, 0); fill('#7a4a24');
    ctx.beginPath(); ctx.moveTo(-15, -96 + bob); ctx.lineTo(-20, -86 + bob); ctx.lineTo(-11, -92 + bob); ctx.lineTo(-4, -102 + bob); fill('#7a4a24');
    ctx.beginPath(); ctx.moveTo(4, -104 + bob); ctx.lineTo(18, -100 + bob); ctx.lineTo(10, -96 + bob); fill('#7a4a24');
    circle(-7, -88 + bob, 2.2, '#2a1a10');
    circle(-14, -82 + bob, 3, '#f5a3a3');
    ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-6, -83 + bob, 5, 0.2, 1.4); ctx.stroke();
    ctx.restore();
  }

  // Billy's arm wrapped around Rex, drawn in front of him.
  function drawHugArm(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#e0403a';
    roundRect(-46, -66, 40, 10, 5); ctx.fill();
    circle(-48, -61, 6, '#f2c19c');
    ctx.restore();
  }

  // ---------- Obstacles and bolts ----------
  function drawObstacle(ob, sx, t) {
    const box = E.obBox(ob, t);
    const x = sx + box.dx, by = GROUND - ob.bottom + box.dy;
    ctx.save();
    if (ob.hit) ctx.globalAlpha = 0.5;
    if (ob.glided) ctx.globalAlpha = 0.35;
    switch (ob.kind) {
      case 'puddle':
        ellipse(x + ob.w / 2, GROUND + 3, ob.w / 2 + 4, 8, '#5aa9e6');
        ellipse(x + ob.w / 2 - 6, GROUND + 1, ob.w / 3, 4, '#a7dcff');
        ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x + ob.w / 2 + 8, GROUND + 3, 6 + (t * 10 % 8), 2 + (t * 3 % 2), 0, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'roomba':
        ellipse(x + ob.w / 2, by - 3, ob.w / 2, 5, '#374151');
        roundRect(x, by - ob.h, ob.w, ob.h - 3, 11); fill('#4b5563');
        roundRect(x + 4, by - ob.h, ob.w - 8, 8, 5); fill('#9ca3af');
        circle(x + 15, by - 11, 3.2, '#ffffff'); circle(x + 15.6, by - 11, 1.6, '#111827');
        circle(x + 29, by - 11, 3.2, '#ffffff'); circle(x + 29.6, by - 11, 1.6, '#111827');
        circle(x + ob.w - 8, by - ob.h + 4, 2.2, Math.sin(t * 8) > 0 ? '#34d399' : '#065f46');
        break;
      case 'cone':
        ctx.beginPath(); ctx.moveTo(x + ob.w / 2, by - ob.h); ctx.lineTo(x + ob.w - 3, by - 4); ctx.lineTo(x + 3, by - 4); fill('#fb923c');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 9, by - 24, ob.w - 18, 6);
        roundRect(x - 2, by - 5, ob.w + 4, 5, 2); fill('#ea580c');
        break;
      case 'basket':
        circle(x + 14, by - ob.h + 2, 9, '#f472b6'); circle(x + 32, by - ob.h, 8, '#60a5fa');
        roundRect(x, by - ob.h + 4, ob.w, ob.h - 4, 6); fill('#c08a4b');
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2;
        for (let i = 8; i < ob.w; i += 9) { ctx.beginPath(); ctx.moveTo(x + i, by - ob.h + 8); ctx.lineTo(x + i, by - 2); ctx.stroke(); }
        break;
      case 'vent':
        roundRect(x, by - ob.h, ob.w, ob.h, 4); fill('#9aa3ad');
        ctx.fillStyle = '#6b7280';
        for (let i = 8; i < ob.h - 4; i += 7) ctx.fillRect(x + 5, by - ob.h + i, ob.w - 10, 3);
        ctx.globalAlpha *= 0.5;
        circle(x + ob.w / 2 + Math.sin(t * 2) * 4, by - ob.h - 10 - (t * 20 % 20), 7, '#ffffff');
        break;
      case 'ducky':
        ellipse(x + ob.w / 2, by - 12, ob.w / 2, 12, '#ffd23f');
        circle(x + ob.w - 10, by - 25, 9, '#ffd23f');
        ctx.beginPath(); ctx.moveTo(x + ob.w - 3, by - 26); ctx.lineTo(x + ob.w + 7, by - 23); ctx.lineTo(x + ob.w - 3, by - 20); fill('#fb923c');
        circle(x + ob.w - 8, by - 28, 2, '#111827');
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(x + ob.w - 11, by - 40, 2, 7); circle(x + ob.w - 10, by - 41, 2.5, '#38bdf8');
        ellipse(x + 12, by - 14, 9, 5, '#f5b800', -0.3);
        break;
      case 'pot':
        circle(x + 10, by - ob.h + 2, 6, '#f472b6'); circle(x + 24, by - ob.h - 2, 6, '#a78bfa'); circle(x + 17, by - ob.h - 6, 5, '#facc15');
        ctx.fillStyle = '#16a34a'; ctx.fillRect(x + 9, by - ob.h + 2, 2, 12); ctx.fillRect(x + 23, by - ob.h, 2, 14);
        ctx.beginPath(); ctx.moveTo(x, by - ob.h + 12); ctx.lineTo(x + ob.w, by - ob.h + 12); ctx.lineTo(x + ob.w - 5, by); ctx.lineTo(x + 5, by); fill('#c96b3c');
        ctx.fillStyle = '#a8552d'; ctx.fillRect(x - 1, by - ob.h + 12, ob.w + 2, 6);
        break;
      case 'clothesline': {
        // A line held up by two little helper bots, with laundry hanging down to Rex's nose.
        const top = GROUND - ob.bottom - ob.h + 8, lx = x - 36, rx = x + ob.w + 36;
        for (const hx of [lx, rx]) {
          ellipse(hx, top - 10 + Math.sin(t * 5 + hx) * 2, 12, 7, '#cbd5e1');
          ctx.fillStyle = '#64748b'; ctx.fillRect(hx - 12, top - 20 + Math.sin(t * 5 + hx) * 2, 24, 2);
          circle(hx, top - 10 + Math.sin(t * 5 + hx) * 2, 2, '#0f172a');
        }
        ctx.strokeStyle = '#6b4f3a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, top - 4); ctx.quadraticCurveTo(x + ob.w / 2, top + 10, rx, top - 4); ctx.stroke();
        const low = GROUND - ob.bottom;
        const sway = Math.sin(t * 2 + ob.phase) * 2;
        roundRect(x + 2 + sway, top + 4, 30, low - top - 4, 4); fill('#f472b6');
        ctx.fillStyle = '#ffffff88'; ctx.fillRect(x + 6 + sway, top + 14, 22, 4); ctx.fillRect(x + 6 + sway, low - 14, 22, 4);
        ctx.beginPath(); ctx.moveTo(x + 38, top + 5); ctx.lineTo(x + 66, top + 5); ctx.lineTo(x + 72, top + 24); ctx.lineTo(x + 64, top + 22); ctx.lineTo(x + 64, low - 10); ctx.lineTo(x + 40, low - 10); ctx.lineTo(x + 40, top + 22); ctx.lineTo(x + 32, top + 24); fill('#60a5fa');
        roundRect(x + 76 + sway, top + 4, 16, low - top - 30, 4); fill('#facc15');
        ellipse(x + 84 + sway, low - 26, 11, 6, '#facc15');
        ctx.fillStyle = '#c08a4b'; for (const px of [x + 16, x + 52, x + 84]) ctx.fillRect(px, top + 1, 3, 7);
        break;
      }
      case 'drone': {
        // A pigeon-drone: a round grey bird with a little propeller hat.
        const cy = by - ob.h / 2;
        ellipse(x + ob.w / 2, cy, ob.w / 2 - 2, ob.h / 2 - 2, '#9ca3af');
        ellipse(x + ob.w / 2 + 4, cy + 3, ob.w / 3, ob.h / 4, '#cbd5e1');
        circle(x + 10, cy - 4, 8, '#9ca3af');
        ctx.beginPath(); ctx.moveTo(x + 3, cy - 4); ctx.lineTo(x - 6, cy - 1); ctx.lineTo(x + 3, cy + 1); fill('#f59e0b');
        circle(x + 8, cy - 6, 2.2, '#111827');
        ellipse(x + ob.w / 2 + 6, cy - 2, 12, 6, '#6b7280', -0.4 + Math.sin(t * 20) * 0.3);
        ctx.fillStyle = '#475569'; ctx.fillRect(x + ob.w / 2 - 1, by - ob.h - 6, 2, 8);
        ctx.fillStyle = '#334155'; ctx.fillRect(x + ob.w / 2 - 14 * Math.abs(Math.sin(t * 25)), by - ob.h - 8, 28 * Math.abs(Math.sin(t * 25)), 3);
        break;
      }
    }
    ctx.restore();
    if (ob.glided && !reduceMotion) {
      ctx.globalAlpha = 0.7;
      star(sx + ob.w / 2 + Math.sin(t * 9) * 10, GROUND - ob.bottom - ob.h / 2, 4, '#7dd3fc');
      ctx.globalAlpha = 1;
    }
  }

  function bolt(x, y, s = 1, spin = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.25, Math.abs(Math.cos(spin))) * s, s);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); }
    ctx.closePath(); fill('#fbbf24');
    ctx.lineWidth = 2; ctx.strokeStyle = '#d97706'; ctx.stroke();
    circle(0, 0, 3.5, '#fff7d6');
    ctx.restore();
  }

  function drawFinishLine(sx) {
    // Two posts and a checkered banner with a paw print.
    ctx.fillStyle = '#64748b';
    ctx.fillRect(sx - 4, GROUND - 150, 6, 150); ctx.fillRect(sx + 96, GROUND - 150, 6, 150);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#223f3a' : '#fffbed';
      ctx.fillRect(sx + 2 + c * 9.4, GROUND - 150 + r * 9, 9.4, 9);
    }
    circle(sx + 49, GROUND - 105, 14, '#ffcf00');
    circle(sx + 49, GROUND - 102, 5, '#223f3a');
    for (const [dx, dy] of [[-6, -8], [0, -10], [6, -8]]) circle(sx + 49 + dx, GROUND - 102 + dy, 2.4, '#223f3a');
  }

  // ---------- Effects ----------
  function addFx(f) { if (fx.length < 80) fx.push(Object.assign({t: 0}, f)); }
  function drawFx(dt) {
    for (const f of fx) {
      f.t += dt;
      const k = f.t / f.life;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k);
      const y = f.y - (f.rise || 30) * k;
      if (f.text) {
        ctx.font = `600 ${f.size || 18}px Fredoka, Nunito, sans-serif`;
        ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.strokeText(f.text, f.x, y);
        ctx.fillStyle = f.color || '#223f3a'; ctx.fillText(f.text, f.x, y);
      } else if (f.heart) heart(f.x + Math.sin(f.t * 4 + f.x) * 6, y, f.size || 14, f.color || '#f43f5e');
      else if (f.star) star(f.x, y, f.size || 5, f.color || '#ffd23f');
      ctx.restore();
    }
    fx = fx.filter(f => f.t < f.life);
  }

  // ---------- HUD ----------
  const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };
  function drawHud() {
    const W = view.W, cfg = run.cfg;
    ctx.save();
    ctx.font = '600 15px Fredoka, Nunito, sans-serif';
    ctx.textBaseline = 'middle';
    // level label
    pill(10, 10, ctx.measureText(`Level ${cfg.level}`).width + 22, 28);
    ctx.fillStyle = '#153fd0'; ctx.textAlign = 'left'; ctx.fillText(`Level ${cfg.level}`, 21, 24.5);
    // time
    const left = cfg.limit - run.t;
    const timeText = `${fmt(run.t)} / ${fmt(cfg.limit)}`;
    const tw = ctx.measureText(timeText).width + 22;
    pill(W - tw - 10, 10, tw, 28, left < 8 ? '#fff1c2' : null);
    ctx.fillStyle = left < 8 ? '#b45309' : '#223f3a'; ctx.textAlign = 'right'; ctx.fillText(timeText, W - 21, 24.5);
    // bolts
    const bt = String(run.boltsGot);
    const bw = ctx.measureText(bt).width + 40;
    pill(W - tw - bw - 18, 10, bw, 28);
    bolt(W - tw - bw - 18 + 15, 24, 0.8);
    ctx.fillStyle = '#223f3a'; ctx.textAlign = 'left'; ctx.fillText(bt, W - tw - bw - 18 + 28, 24.5);
    // progress bar
    const px = 10, py = 46, pw = Math.min(W - 20, 520), ph = 8;
    const p = Math.min(1, run.x / cfg.distance);
    roundRect(px, py, pw, ph, 4); fill('#ffffff99');
    roundRect(px, py, Math.max(8, pw * p), ph, 4); fill('#ffcf00');
    circle(px + pw * p, py + 4, 7, cfg.robo ? '#3b82f6' : '#24242c');
    circle(px + pw * p + 2, py + 2.5, 1.6, '#ffffff');
    if (cfg.final) { circle(px + pw, py + 4, 7, '#e0403a'); circle(px + pw, py - 1, 4.5, '#f2c19c'); }
    else { ctx.fillStyle = '#223f3a'; ctx.fillRect(px + pw - 1, py - 6, 2, 18); ctx.fillStyle = '#ffcf00'; ctx.fillRect(px + pw + 1, py - 6, 9, 7); }
    ctx.restore();
  }
  function pill(x, y, w, h, bg) { roundRect(x, y, w, h, h / 2); fill(bg || '#fffbedee'); }

  // ---------- Drawing ----------
  function draw(dt = 0) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#0f2c3a'; ctx.fillRect(0, 0, view.cw, view.ch);
    ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, 0, view.dpr * view.offY);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, view.W, H); ctx.clip();
    drawScene(dt);
    ctx.restore();
  }
  function drawScene(dt) {
    const W = view.W;
    if (!run) {
      const key = E.levelConfig(level).theme.key;
      drawBackground(key, demoX);
      drawRex(REX_X + 40, GROUND, {robo: level > 5, t: anim, wag: true});
      return;
    }
    const cfg = run.cfg;
    const scroll = run.x + (finish ? finish.extra : 0);
    drawBackground(cfg.theme.key, scroll);
    // finish posts or Billy
    const endX = cfg.distance + REX_X;
    if (!cfg.final) { const sx = endX - scroll + 40; if (sx < W + 20) drawFinishLine(sx); }
    const billyX = cfg.distance + REX_X + 300;
    const hugging = finish && finish.hug > 0;
    if (cfg.final) { const sx = billyX - scroll; if (sx < W + 40) drawBilly(sx, GROUND, anim, hugging); }
    // bolts
    for (const b of run.bolts) {
      if (b.got) continue;
      const sx = b.x - scroll;
      if (sx < -20 || sx > W + 20) continue;
      bolt(sx, b.y + Math.sin(anim * 4 + b.x) * 2, 1, anim * 3 + b.x);
    }
    // obstacles
    for (const ob of run.obstacles) {
      const sx = ob.x - scroll;
      if (sx > W + 140) break;
      if (sx + ob.w < -140) continue;
      drawObstacle(ob, sx, run.t);
    }
    // Rex
    const b = run.bonk;
    const dizzy = b && b.t < E.BONK.knock + E.BONK.dizzy;
    const rexX = REX_X + (finish ? finish.rexDx : 0);
    const rexY = hugging ? GROUND - 24 - Math.abs(Math.sin(finish.hug * 7)) * 5 * Math.max(0, 1 - finish.hug) : run.y;
    drawRex(rexX, rexY, {
      robo: cfg.robo, duck: run.duck, t: anim, air: !run.ground, dizzy,
      shield: run.shieldOn > 0, blink: run.safe > 0 && !dizzy && Math.floor(anim * 10) % 2 === 0,
      wag: !!finish
    });
    if (hugging) drawHugArm(billyX - scroll, GROUND);
    drawFx(dt);
    if (mode === 'play' || mode === 'paused' || mode === 'finish') drawHud();
  }

  // ---------- Hints ----------
  function showHint(text, secs = 2.6) {
    hintEl.textContent = text;
    hintEl.classList.add('show');
    hintTimer = secs;
  }
  function checkHints() {
    const cfg = run.cfg;
    const near = run.obstacles.find(o => !o.hit && !o.glided && o.x - run.x - REX_X < 330 && o.x - run.x - REX_X > 0);
    if (!near) return;
    const key = cfg.level + ':' + near.pass;
    if (hintShown[key]) return;
    if (near.pass === 'jump' && cfg.level === 1) showHint('Tap the city or press Jump to hop over!');
    else if (near.pass === 'duck' && (near.kind === 'clothesline' && cfg.level === 2)) showHint('Hold Duck, or swipe down, to go under the laundry!');
    else if (near.pass === 'duck' && near.kind === 'drone' && cfg.level === 3) showHint('Duck under the pigeon-drones!');
    else if (cfg.level === 6) showHint('Tap Shield and Rex glides right through!');
    else return;
    hintShown[key] = true;
  }

  // ---------- Loop ----------
  let last = 0, acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    anim += dt;
    if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) hintEl.classList.remove('show'); }
    if (mode === 'play') {
      acc += dt;
      while (acc >= STEP && mode === 'play') {
        E.step(run, STEP, {jump: input.jump, duck: input.duck, shield: input.shield});
        input.jump = false; input.shield = false;
        acc -= STEP;
        handleEvents();
      }
      checkHints();
      updateShieldButton();
    } else if (mode === 'finish') {
      stepFinish(dt);
    } else if (!run) {
      demoX += 90 * dt;
    }
    draw(dt);
    requestAnimationFrame(frame);
  }

  function handleEvents() {
    for (const e of run.events) {
      const rx = REX_X + 30;
      if (e === 'jump') sfx.jump();
      else if (e === 'duck') sfx.duck();
      else if (e === 'bolt') { sfx.bolt(); addFx({text: '+10', x: rx + 20, y: run.y - 60, life: 0.7, color: '#b45309', size: 16}); }
      else if (e === 'bonk') {
        sfx.bonk();
        addFx({text: 'bonk!', x: rx + 10, y: run.y - 70, life: 1, color: '#7c3aed', size: 22});
        if (navigator.vibrate) try { navigator.vibrate(40); } catch (er) { /* ignore */ }
      }
      else if (e === 'shield') sfx.shield();
      else if (e === 'glide') { sfx.glide(); addFx({text: 'whoosh!', x: rx + 30, y: run.y - 70, life: 0.8, color: '#0284c7'}); }
      else if (e === 'finish') startFinish();
      else if (e === 'late') { sfx.late(); showResult(); }
    }
    run.events.length = 0;
  }

  function startFinish() {
    mode = 'finish';
    finish = {t: 0, extra: 0, rexDx: 0, hug: 0, done: false};
    run.duck = false;
    pauseBtn.hidden = true;
    sfx.finish();
    for (let i = 0; i < 8; i++) addFx({star: true, x: REX_X + 20 + i * 18, y: GROUND - 60 - (i % 3) * 20, life: 1.2, rise: 40, size: 5 + (i % 3)});
  }

  function stepFinish(dt) {
    finish.t += dt;
    const cfg = run.cfg;
    // Rex keeps running; the city keeps scrolling.
    if (!run.ground) { run.vy += E.PHYS.gravity * dt; run.y = Math.min(GROUND, run.y + run.vy * dt); if (run.y >= GROUND) { run.ground = true; run.vy = 0; } }
    if (!cfg.final) {
      finish.extra += cfg.speed * dt;
      if (finish.t > 1.1 && !finish.done) { finish.done = true; showResult(); }
      return;
    }
    const billyScreen = cfg.distance + REX_X + 300 - (run.x + finish.extra);
    if (billyScreen > view.W * 0.62) finish.extra += cfg.speed * dt;
    else if (finish.hug === 0) {
      finish.rexDx += cfg.speed * 0.6 * dt;
      if (REX_X + finish.rexDx + 52 >= billyScreen + 4) { finish.hug = 0.0001; sfx.woof(); }
    } else {
      finish.hug += dt;
      if (Math.random() < 0.12) addFx({heart: true, x: billyScreen - 20 + Math.random() * 30, y: GROUND - 110, life: 1.4, rise: 60, size: 12 + Math.random() * 8});
      if (finish.hug > 2.3 && !finish.done) { finish.done = true; showResult(); }
    }
  }

  // ---------- Screens ----------
  const starSvg = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8Z" fill="${on ? '#ffcf00' : '#e5e7eb'}" stroke="${on ? '#d99900' : '#cbd5e1'}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const starRow = n => `<div class="stars" role="img" aria-label="${n} of 3 stars">${[1, 2, 3].map(i => starSvg(i <= n)).join('')}</div>`;

  function openOverlay(html) {
    overlay.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`;
    overlay.classList.add('show');
    const first = overlay.querySelector('[data-primary]') || overlay.querySelector('button, a');
    if (first) setTimeout(() => first.focus({preventScroll: true}), 30);
  }
  function closeOverlay() { overlay.classList.remove('show'); overlay.innerHTML = ''; }

  function showMenu() {
    mode = 'menu'; run = null; finish = null;
    pauseBtn.hidden = true;
    setControls(level > 5);
    const next = Math.min(save.unlocked, 10);
    openOverlay(`
      <div class="eyebrow">A FRIENDLY ROBOTS! game</div>
      <h2>Rex Runs RoboTown</h2>
      <p>Billy is waiting! Help Rex dash across RoboTown to his best friend. Hop over puddles, duck under laundry, and grab shiny bolts on the way.</p>
      <div class="actions">
        <button class="btn gold" data-act="play" data-level="${next}" data-primary>${next > 1 ? 'Keep going: level ' + next : 'Play'}</button>
        <button class="btn plain" data-act="levels">Choose a level</button>
      </div>`);
  }

  function showLevels() {
    mode = 'menu'; run = null; finish = null;
    pauseBtn.hidden = true;
    const tile = n => {
      const cfg = E.levelConfig(n), best = save.best[n], locked = n > save.unlocked;
      const s = best ? '&#9733;'.repeat(best.stars) + '&#9734;'.repeat(3 - best.stars) : '';
      return `<button class="tile${cfg.robo ? ' robo' : ''}" data-act="play" data-level="${n}" ${locked ? 'disabled aria-label="Level ' + n + ', locked"' : 'aria-label="Level ' + n + ', ' + cfg.theme.name + (best ? ', ' + best.stars + ' stars' : '') + '"'}>${n}<small>${cfg.theme.name}</small><span class="mini">${locked ? 'locked' : s}</span></button>`;
    };
    const prizes = [5, 10].filter(n => save.prizes[n]).map(prizeBlock).join('');
    openOverlay(`
      <h2>Choose a level</h2>
      <div class="levels">
        <h3>Rex the dog</h3>${[1, 2, 3, 4, 5].map(tile).join('')}
        <h3>Rex the Doggotron${save.unlocked < 6 ? ' (reach Billy to unlock)' : ''}</h3>${[6, 7, 8, 9, 10].map(tile).join('')}
      </div>
      ${prizes}
      <div class="actions">
        <button class="btn plain" data-act="menu" data-primary>Back</button>
        <button class="text-button" data-act="reset">Start over</button>
      </div>`);
  }

  function prizeBlock(n) {
    const p = PRIZES[n];
    return `<div class="prize"><img src="${p.file}" alt="${p.name}" width="84" height="108"><div><b>${n === 5 ? 'Your first prize!' : 'Your Doggotron prize!'}</b><br>A ${p.name} to print and color.<br><a class="btn gold" href="${p.file}" download="${p.download}" target="_blank" rel="noopener">Download it</a></div></div>`;
  }

  function showIntro(n) {
    level = n;
    run = E.createRun(n);
    finish = null; fx = [];
    mode = 'intro';
    hintShown = {};
    setControls(run.cfg.robo);
    updateShieldButton();
    pauseBtn.hidden = true;
    const cfg = run.cfg;
    let tip = 'Hop over the puddles and the Roombas. Grab the bolts!';
    if (cfg.theme.key === 'laundry') tip = 'New! Duck under the laundry lines.';
    if (cfg.theme.key === 'rooftop') tip = 'Pigeon-drones fly low up here. Duck under them!';
    if (cfg.theme.key === 'park') tip = 'Hop over the roboduckies and flower pots.';
    if (cfg.final) tip = 'Billy is at the end of this street!';
    if (cfg.level === 6) tip = 'Rex is the Doggotron now! Tap Shield to glide right through one obstacle. It needs a little time to charge again.';
    else if (cfg.robo) tip += ' Your shield can glide through one obstacle at a time.';
    openOverlay(`
      <div class="eyebrow">Level ${n} of 10${cfg.robo ? ' &middot; Doggotron' : ''}</div>
      <h2>${cfg.theme.name}</h2>
      <p>${tip}</p>
      <p><b>Reach ${cfg.final ? 'Billy' : 'the finish'} by ${fmt(cfg.limit)}.</b> Each bump costs a little time.</p>
      <div class="actions"><button class="btn gold" data-act="go" data-primary>Go, Rex!</button><button class="btn plain" data-act="levels">Levels</button></div>`);
  }

  function go() {
    closeOverlay();
    mode = 'play';
    acc = 0;
    input.jump = false; input.shield = false;
    pauseBtn.hidden = false; pauseBtn.textContent = 'Pause';
    stage.focus && stage.focus({preventScroll: true});
  }

  function showResult() {
    mode = 'result';
    pauseBtn.hidden = true;
    const cfg = run.cfg;
    if (run.state === 'late') {
      openOverlay(`
        <div class="eyebrow">Level ${cfg.level}</div>
        <h2>Billy is still waiting!</h2>
        <p>Rex needs to get there by ${fmt(cfg.limit)}. Each bump costs about a second and a half, so try hopping a little earlier.</p>
        <div class="stats"><span><b>${run.bonks}</b>bumps</span><span><b>${run.boltsGot}</b>bolts</span></div>
        <div class="actions"><button class="btn gold" data-act="play" data-level="${cfg.level}" data-primary>Try again</button><button class="btn plain" data-act="levels">Levels</button></div>`);
      return;
    }
    const st = E.stars(run), sc = E.score(run);
    const prev = save.best[cfg.level];
    const newBest = !prev || run.finishTime < prev.time;
    save.best[cfg.level] = {
      stars: Math.max(st, prev ? prev.stars : 0),
      time: prev ? Math.min(prev.time, +run.finishTime.toFixed(2)) : +run.finishTime.toFixed(2),
      score: Math.max(sc, prev ? prev.score : 0)
    };
    if (cfg.level < 10) save.unlocked = Math.max(save.unlocked, cfg.level + 1);
    const prizeLevel = cfg.final ? cfg.level : 0;
    const firstPrize = prizeLevel && !save.prizes[prizeLevel];
    if (prizeLevel) save.prizes[prizeLevel] = true;
    persist();
    const title = cfg.final ? 'Rex found Billy!' : (st === 3 ? 'Super speedy!' : 'You made it!');
    const nextBtn = cfg.level < 10
      ? `<button class="btn gold" data-act="play" data-level="${cfg.level + 1}" data-primary>${cfg.level === 5 ? 'Become the Doggotron' : 'Next level'}</button>`
      : `<button class="btn gold" data-act="levels" data-primary>All levels</button>`;
    openOverlay(`
      <div class="eyebrow">Level ${cfg.level} &middot; ${cfg.theme.name}</div>
      <h2>${title}</h2>
      ${starRow(st)}
      <div class="stats"><span><b>${fmt(run.finishTime)}</b>time${newBest && prev ? ' (best!)' : ''}</span><span><b>${run.boltsGot}</b>bolts</span><span><b>${sc}</b>score</span></div>
      ${st < 3 ? `<p>${st === 2 ? 'Three stars means no bumps at all. Can you do it?' : 'Fewer bumps means more stars.'}</p>` : ''}
      ${prizeLevel ? `<p><b>${cfg.level === 10 ? 'You finished every level of Rex Runs RoboTown!' : 'You finished the first five levels!'}</b>${firstPrize ? ' You won a prize:' : ''}</p>${prizeBlock(prizeLevel)}` : ''}
      <div class="actions">${nextBtn}<button class="btn plain" data-act="play" data-level="${cfg.level}">Play again</button><button class="btn plain" data-act="levels">Levels</button></div>`);
  }

  function pause() {
    if (mode !== 'play') return;
    mode = 'paused';
    duckSources.clear(); input.duck = false;
    pauseBtn.textContent = 'Resume';
    openOverlay(`
      <h2>Paused</h2>
      <div class="actions"><button class="btn gold" data-act="resume" data-primary>Keep running</button><button class="btn plain" data-act="play" data-level="${run.cfg.level}">Restart level</button><button class="btn plain" data-act="levels">Levels</button></div>`);
  }
  function resume() {
    if (mode !== 'paused') return;
    closeOverlay(); mode = 'play'; acc = 0; pauseBtn.textContent = 'Pause';
  }

  let resetArmed = false;
  overlay.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act !== 'reset') resetArmed = false;
    if (act === 'play') showIntro(+b.dataset.level);
    else if (act === 'go') go();
    else if (act === 'levels') showLevels();
    else if (act === 'menu') showMenu();
    else if (act === 'resume') resume();
    else if (act === 'reset') {
      if (!resetArmed) { resetArmed = true; b.textContent = 'Tap again to erase progress'; return; }
      const muted = save.muted;
      save = blank(); save.muted = muted; persist(); level = 1; resetArmed = false; showLevels();
    }
  });
  pauseBtn.addEventListener('click', () => (mode === 'play' ? pause() : resume()));

  // ---------- Controls ----------
  function setControls(robo) {
    shieldBtn.hidden = !robo;
    controls.classList.toggle('two', !robo);
  }
  function updateShieldButton() {
    if (!run || !run.cfg.shield) return;
    const ready = run.shieldCd <= 0;
    const k = ready ? 1 : 1 - run.shieldCd / E.SHIELD.cooldown;
    shieldCharge.style.transform = `scaleX(${k.toFixed(3)})`;
    shieldBtn.classList.toggle('cooling', !ready);
  }
  function press(kind) {
    if (mode === 'intro' && kind === 'jump') { go(); return; }
    if (mode !== 'play') return;
    if (kind === 'jump') input.jump = true;
    if (kind === 'shield') input.shield = true;
  }
  function duckOn(src) { duckSources.add(src); input.duck = true; }
  function duckOff(src) { duckSources.delete(src); input.duck = duckSources.size > 0; }

  function bindButton(btn, down, up) {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.classList.add('pressed');
      try { btn.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      down();
    });
    const release = () => { btn.classList.remove('pressed'); if (up) up(); };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', e => e.preventDefault());
    // keyboard users tabbing to a button and pressing Enter
    btn.addEventListener('click', e => { if (e.detail === 0) { down(); if (up) setTimeout(up, 350); } });
  }
  bindButton(jumpBtn, () => press('jump'));
  bindButton(shieldBtn, () => press('shield'));
  bindButton(duckBtn, () => duckOn('button'), () => duckOff('button'));

  // Tap the city to jump. Swipe down on it to duck.
  let swipe = null;
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    swipe = {id: e.pointerId, y: e.clientY, ducking: false};
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    if (mode === 'intro') { go(); return; }
    press('jump');
  });
  canvas.addEventListener('pointermove', e => {
    if (!swipe || swipe.id !== e.pointerId || mode !== 'play') return;
    if (!swipe.ducking && e.clientY - swipe.y > 22) {
      swipe.ducking = true;
      input.jump = false;
      // undo a hop that only just started, so a swipe down is a duck and not a jump
      if (!run.ground && run.vy < -E.PHYS.jump * 0.7) { run.vy = 0; run.y = GROUND; run.ground = true; }
      duckOn('swipe');
    }
  });
  const endSwipe = e => { if (swipe && swipe.id === e.pointerId) { swipe = null; duckOff('swipe'); } };
  canvas.addEventListener('pointerup', endSwipe);
  canvas.addEventListener('pointercancel', endSwipe);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
  const DUCK_KEYS = ['ArrowDown', 'KeyS'];
  const SHIELD_KEYS = ['KeyE', 'KeyX', 'ShiftLeft', 'ShiftRight'];
  window.addEventListener('keydown', e => {
    const playing = mode === 'play';
    if ((e.code === 'KeyP' || e.code === 'Escape') && (playing || mode === 'paused')) { e.preventDefault(); playing ? pause() : resume(); return; }
    if (!playing) {
      if (mode === 'intro' && (e.code === 'Space' || e.code === 'Enter') && !overlay.contains(document.activeElement)) { e.preventDefault(); go(); }
      return;
    }
    if (JUMP_KEYS.includes(e.code)) { e.preventDefault(); if (!e.repeat) press('jump'); }
    else if (DUCK_KEYS.includes(e.code)) { e.preventDefault(); duckOn('key:' + e.code); }
    else if (SHIELD_KEYS.includes(e.code)) { e.preventDefault(); if (!e.repeat) press('shield'); }
  });
  window.addEventListener('keyup', e => { if (DUCK_KEYS.includes(e.code)) duckOff('key:' + e.code); });

  // Pause when the page is hidden or the window loses focus.
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => { duckSources.clear(); input.duck = false; pause(); });

  // ---------- Start ----------
  resize();
  // Review shortcut for preview links only: /play?level=7 opens level 7 straight away.
  // It does nothing on the live site.
  const reviewLevel = /\.vercel\.app$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) && +new URLSearchParams(location.search).get('level');
  if (reviewLevel >= 1 && reviewLevel <= 10) showIntro(Math.floor(reviewLevel)); else showMenu();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw());
  requestAnimationFrame(frame);
})();

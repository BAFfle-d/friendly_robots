// Checks the game rules in Node: node play/test-engine.cjs
// 1. A careful player can clear every level, on hundreds of random layouts, with no bumps.
// 2. Someone who never presses anything does not reach the finish in time.
// 3. Prints how a sloppy player does (timing off by up to 0.2 s, or JITTER=0.3 node play/test-engine.cjs).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8'), ctx);
const E = ctx.RexEngine;
const DT = 1 / 120;

function solveWindow(height) {
  // Seconds after take-off during which Rex's feet are above `height`.
  const g = E.PHYS.gravity, v = E.PHYS.jump;
  const disc = v * v - 2 * g * height;
  if (disc <= 0) return null;
  return [(v - Math.sqrt(disc)) / g, (v + Math.sqrt(disc)) / g];
}

// skill: 0 = perfect timing. Larger numbers add random timing error, in seconds.
function play(level, seed, opts = {}) {
  const run = E.createRun(level, seed);
  const r = E.rng(seed ^ 0x9e3779b9);
  const errors = new Map();
  let duckUntil = null;
  let guard = 0;
  while (run.state === 'run' && guard++ < 120 * 200) {
    const input = {jump: false, duck: false, shield: false};
    if (!opts.passive) {
      const rb = E.rexBox(run);
      const ob = run.obstacles.find(o => !o.hit && !o.glided && E.obBox(o, run.t).r > rb.l);
      if (ob) {
        const box = E.obBox(ob, run.t);
        const d = box.l - rb.r;
        const sp = run.cfg.speed;
        if (!errors.has(ob)) errors.set(ob, (r() * 2 - 1) * (opts.jitter || 0));
        const err = errors.get(ob) * sp;
        if (ob.pass === 'jump') {
          const w = solveWindow(ob.h + ob.bottom + 2);
          const need = (rb.r - rb.l) + (box.r - box.l);
          const slack = sp * (w[1] - w[0]) - need;
          const lead = sp * w[0] + slack / 2 + err;
          if (run.ground && d <= lead && d > -10 && !run.bonk) input.jump = true;
        } else {
          if (d < sp * 0.3 + err && box.r > rb.l) duckUntil = ob;
        }
      }
      if (duckUntil) {
        if (E.obBox(duckUntil, run.t).r < E.rexBox(run).l || duckUntil.hit) duckUntil = null;
        else input.duck = true;
      }
      if (opts.shield && run.cfg.shield && ob && !run.bonk) {
        const d = E.obBox(ob, run.t).l - E.rexBox(run).r;
        if (d < run.cfg.speed * 0.25 && d > 0 && r() < 0.5) input.shield = true;
      }
    }
    E.step(run, DT, input);
    run.events.length = 0;
  }
  return run;
}

let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.log('FAIL: ' + msg); } };

// Measure what one bump costs at each speed.
for (const level of [1, 10]) {
  const clean = play(level, 7);
  let duckUntil = null;
  // Same careful bot, but it ignores the first obstacle.
  const run = E.createRun(level, 7);
  const first = run.obstacles[0];
  while (run.state === 'run') {
    const rb = E.rexBox(run);
    const ob = run.obstacles.find(o => !o.hit && !o.glided && E.obBox(o, run.t).r > rb.l);
    const input = {jump: false, duck: false, shield: false};
    if (ob && ob !== first) {
      const box = E.obBox(ob, run.t), d = box.l - rb.r, sp = run.cfg.speed;
      if (ob.pass === 'jump') {
        const w = solveWindow(ob.h + ob.bottom + 2);
        const slack = sp * (w[1] - w[0]) - ((rb.r - rb.l) + (box.r - box.l));
        if (run.ground && d <= sp * w[0] + slack / 2 && d > -10 && !run.bonk) input.jump = true;
      } else if (d < sp * 0.3) duckUntil = ob;
    }
    if (duckUntil) { if (E.obBox(duckUntil, run.t).r < E.rexBox(run).l || duckUntil.hit) duckUntil = null; else input.duck = true; }
    E.step(run, DT, input); run.events.length = 0;
  }
  console.log(`Level ${level}: one bump costs ${(run.finishTime - clean.finishTime).toFixed(2)} s (clean ${clean.finishTime.toFixed(2)} s, par ${clean.cfg.par.toFixed(2)} s, limit ${clean.cfg.limit} s)`);
  check(run.bonks === 1, 'forced-bump run should have exactly one bump');
  check(Math.abs(run.finishTime - clean.finishTime - E.BONK_COST) < 0.15, 'BONK_COST in engine.js no longer matches the measured cost of a bump');
  check(Math.abs(clean.finishTime - clean.cfg.par) < 0.1, 'clean run should match par on level ' + level);
}

console.log('\nLevel  theme            speed  obstacles  par    limit  perfect  passive  sloppy finish / avg bumps');
for (let level = 1; level <= 10; level++) {
  const cfg = E.levelConfig(level);
  let perfectBumps = 0, obstacleCount = 0, passiveFinished = 0, sloppyDone = 0, sloppyBumps = 0;
  const N = 300;
  for (let s = 1; s <= N; s++) {
    const p = play(level, s * 7919);
    obstacleCount += p.obstacles.length;
    perfectBumps += p.bonks;
    check(p.state === 'done', `perfect bot did not finish level ${level} seed ${s * 7919}`);
    check(p.bonks === 0, `perfect bot bumped on level ${level} seed ${s * 7919}`);
    check(E.stars(p) === 3, `perfect run should earn 3 stars on level ${level}`);
    if (s <= 60) {
      const q = play(level, s * 7919, {passive: true});
      if (q.state === 'done') passiveFinished++;
    }
    const sl = play(level, s * 7919, {jitter: +(process.env.JITTER||0.2), shield: true});
    if (sl.state === 'done') sloppyDone++;
    sloppyBumps += sl.bonks;
  }
  check(passiveFinished === 0, `a player who never presses anything finished level ${level}`);
  console.log(`${String(level).padEnd(6)} ${cfg.theme.name.padEnd(16)} ${String(cfg.speed).padEnd(6)} ${(obstacleCount / N).toFixed(1).padEnd(10)} ${cfg.par.toFixed(1).padEnd(6)} ${String(cfg.limit).padEnd(6)} ${String(perfectBumps).padEnd(8)} ${String(passiveFinished).padEnd(8)} ${Math.round(100 * sloppyDone / N)}% / ${(sloppyBumps / N).toFixed(1)}`);
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);

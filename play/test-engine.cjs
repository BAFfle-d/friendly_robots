// Checks the game rules in Node: node play/test-engine.cjs
// 1. A careful player can clear every level, on hundreds of random layouts, with no bumps,
//    and catches the power-up capsule when one is offered.
// 2. From board 2 on, someone who never presses anything runs out of time, even with every power-up.
// 3. One bump costs what BONK_COST says, and the allowed bumps on each board just beat the clock.
// 4. Jump presses near the ground never spend the double jump.
// 5. Layer-2 platforms can only be reached from layer 1.
// 6. The rocket boost fires only once caught, once per board, and waits out a dizzy spell.
// It also prints how a sloppy player does (timing off by up to 0.2 s, or JITTER=0.3 node play/test-engine.cjs).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8'), ctx);
const E = ctx.RexEngine;
const DT = 1 / 120;
const GROUND = E.GROUND;

function solveWindow(height) {
  // Seconds after take-off during which Rex's feet are above `height`.
  const g = E.PHYS.gravity, v = E.PHYS.jump;
  const disc = v * v - 2 * g * height;
  if (disc <= 0) return null;
  return [(v - Math.sqrt(disc)) / g, (v + Math.sqrt(disc)) / g];
}

// A bot that hops ground obstacles and ducks under the rest.
// opts.jitter adds random timing error in seconds. opts.skip(ob) makes it ignore an obstacle.
function play(level, seed, opts = {}) {
  const run = E.createRun(level, seed, {powers: opts.powers || [], offer: opts.offer || null});
  const r = E.rng(seed ^ 0x9e3779b9);
  const errors = new Map();
  let duckUntil = null;
  let guard = 0;
  while (run.state === 'run' && guard++ < 120 * 200) {
    const input = {jump: false, duck: false, shield: false};
    if (!opts.passive) {
      const rb = E.rexBox(run);
      const onSidewalk = run.ground && !run.plat;
      const ob = run.obstacles.find(o => !o.hit && !o.glided && E.obBox(o, run.t).r > rb.l);
      if (ob && onSidewalk && !(opts.skip && opts.skip(ob))) {
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
          if (d <= lead && d > -10 && !run.bonk) input.jump = true;
        } else if (d < sp * 0.3 + err && box.r > rb.l) duckUntil = ob;
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
const check = (ok, msg) => { if (!ok) { failures++; if (failures < 40) console.log('FAIL: ' + msg); } };

// 3. What one bump costs, measured with a careful bot that ignores the first obstacle.
for (const level of [1, 5, 10]) {
  const clean = play(level, 7);
  const first = clean.obstacles[0];
  const bumped = play(level, 7, {skip: o => o.x === first.x});
  const cost = bumped.finishTime - clean.finishTime;
  console.log(`Board ${level}: one bump costs ${cost.toFixed(2)} s. No-bump time ${clean.finishTime.toFixed(2)} s, limit ${clean.cfg.limit} s, ${clean.cfg.allowed} bumps allowed.`);
  check(bumped.bonks === 1, 'the skip-one run should have exactly one bump on board ' + level);
  check(Math.abs(cost - E.BONK_COST) < 0.15, `BONK_COST in engine.js (${E.BONK_COST}) no longer matches the measured cost (${cost.toFixed(2)})`);
  check(Math.abs(clean.finishTime - clean.cfg.par) < 0.1, 'clean run should match par on board ' + level);
  const cfg = clean.cfg;
  check(cfg.par + cfg.allowed * E.BONK_COST < cfg.limit, `board ${level}: the allowed bumps should still beat the clock`);
  check(cfg.par + (cfg.allowed + 1) * E.BONK_COST > cfg.limit, `board ${level}: one bump over the allowance should run out the clock`);
}

// 4. Tap then tap: a press near the ground never spends the double jump.
{
  const run = E.createRun(1, 1, {powers: ['doublejump']});
  run.obstacles.length = 0;
  const tick = (input = {}) => { E.step(run, DT, input); run.events.length = 0; };
  for (let i = 0; i < 120; i++) tick();
  tick({jump: true});
  check(!run.ground, 'jump should leave the ground');
  while (!(run.vy > 0 && (GROUND - run.y) / run.vy < 0.06)) tick();
  tick({jump: true});                            // pressed about 60 ms before touchdown
  check(!run.used.has('doublejump'), 'a press just before landing must not spend the double jump');
  for (let i = 0; i < 30 && run.jumps < 2; i++) tick();
  check(run.jumps === 2, 'a press just before landing should turn into a normal jump on landing');
  for (let i = 0; i < 20; i++) tick();
  tick({jump: true});                            // high in the air: this one is the double jump
  check(run.used.has('doublejump') && run.vy < -E.PHYS.jump * 0.95, 'a press high in the air should be the double jump, at full strength');
}

// 6. Rocket boost: does nothing until caught, fires once per board, and a press while dizzy fires when Rex is up again.
{
  const tick = (run, input = {}) => { E.step(run, DT, input); run.events.length = 0; };
  const fresh = owned => { const r = E.createRun(4, 3, {powers: owned}); r.obstacles.length = 0; for (let i = 0; i < 120; i++) tick(r); return r; };
  const none = fresh([]);
  tick(none, {rocket: true});
  for (let i = 0; i < 10; i++) tick(none);
  check(none.rocketLeft <= 0 && none.speed === none.cfg.speed, 'boost must not fire before Rocket boost is caught');
  const has = fresh(['rocket']);
  tick(has, {rocket: true});
  for (let i = 0; i < 10; i++) tick(has);
  check(has.rocketLeft > 0 && has.speed > has.cfg.speed * 1.5, 'boost should fire once Rocket boost is caught');
  for (let i = 0; i < 400; i++) tick(has);
  tick(has, {rocket: true});
  for (let i = 0; i < 10; i++) tick(has);
  check(has.rocketLeft <= 0, 'boost should only work once per board');
  const dizzy = fresh(['rocket']);
  dizzy.bonk = {t: 0.3, kind: 'cone'};
  tick(dizzy, {rocket: true});
  check(dizzy.rocketLeft <= 0, 'boost waits while Rex is dizzy');
  for (let i = 0; i < 120 * 1.3 && dizzy.rocketLeft <= 0; i++) tick(dizzy);
  check(dizzy.rocketLeft <= 0, 'a press more than 0.6 s before Rex recovers should lapse');
  const soon = fresh(['rocket']);
  soon.bonk = {t: E.BONK.knock + E.BONK.dizzy - 0.3, kind: 'cone'};
  tick(soon, {rocket: true});
  for (let i = 0; i < 120 && soon.rocketLeft <= 0; i++) tick(soon);
  check(soon.rocketLeft > 0, 'a boost pressed just before Rex recovers should fire when he is up');
}

// 5. Layer 2 needs layer 1.
{
  let reached2 = 0, wrong = 0;
  for (let s = 1; s <= 200; s++) {
    const run = E.createRun(9, s * 13, {powers: ['doublejump']});
    if (!run.platforms.some(p => p.layer === 2)) continue;
    run.obstacles.length = 0;
    let lastLayer = 0;
    while (run.state === 'run') {
      const input = {jump: false};
      const p1 = run.platforms.find(p => p.layer === 1 && p.x - run.x - E.REX_X < 60 && p.x + p.w > run.x + E.REX_X);
      if (run.ground && p1) input.jump = true;           // hop up whenever a platform is near
      if (!run.ground && run.vy > -50 && run.vy < 50 && !run.used.has('doublejump')) input.jump = true;
      E.step(run, DT, input);
      run.events.length = 0;
      if (run.plat && run.plat.layer === 2) { reached2++; if (lastLayer !== 1) wrong++; }
      if (run.plat) lastLayer = run.plat.layer; else if (run.ground) lastLayer = 0;
    }
  }
  check(reached2 > 0, 'the platform bot should reach layer 2 sometimes');
  check(wrong === 0, 'layer 2 was reached without standing on layer 1 first');
  console.log(`Layer 2 reached ${reached2 ? 'only from layer 1' : 'never'} in the platform check.`);
}

console.log('\nBoard  theme            speed  obstacles  platforms  par    limit  allowed  perfect  capsule  passive  sloppy finish / avg bumps');
const owned = {};
for (let level = 1; level <= 10; level++) {
  const cfg = E.levelConfig(level);
  const offer = E.offerFor(level, owned);
  const powers = Object.keys(owned);
  let perfectBumps = 0, obstacleCount = 0, platCount = 0, passiveFinished = 0, sloppyDone = 0, sloppyBumps = 0, caught = 0;
  const N = 300;
  for (let s = 1; s <= N; s++) {
    const p = play(level, s * 7919, {powers, offer});
    obstacleCount += p.obstacles.length;
    platCount += p.platforms.length;
    perfectBumps += p.bonks;
    if (p.got) caught++;
    check(p.state === 'done', `perfect bot did not finish board ${level} seed ${s * 7919}`);
    check(p.bonks === 0, `perfect bot bumped on board ${level} seed ${s * 7919}`);
    if (s <= 60) {
      // Hands off, even holding every power-up: from board 2 on this must run out the clock.
      const q = play(level, s * 7919, {passive: true, powers: E.POWER_ORDER.slice()});
      if (q.state === 'done') passiveFinished++;
    }
    const sl = play(level, s * 7919, {jitter: +(process.env.JITTER || 0.2), shield: true, powers, offer});
    if (sl.state === 'done') sloppyDone++;
    sloppyBumps += sl.bonks;
  }
  if (level >= 2) check(passiveFinished === 0, `a player who never presses anything finished board ${level}`);
  if (offer) { check(caught >= N * 0.9, `the careful bot caught the ${offer} capsule on only ${caught} of ${N} runs of board ${level}`); owned[offer] = level; }
  console.log(`${String(level).padEnd(6)} ${cfg.theme.name.padEnd(16)} ${String(cfg.speed).padEnd(6)} ${(obstacleCount / N).toFixed(1).padEnd(10)} ${(platCount / N).toFixed(1).padEnd(10)} ${cfg.par.toFixed(1).padEnd(6)} ${String(cfg.limit).padEnd(6)} ${String(cfg.allowed).padEnd(8)} ${String(perfectBumps).padEnd(8)} ${(offer ? offer + ' ' + Math.round(100 * caught / N) + '%' : '-').padEnd(8)} ${String(passiveFinished).padEnd(8)} ${Math.round(100 * sloppyDone / N)}% / ${(sloppyBumps / N).toFixed(1)}`);
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);

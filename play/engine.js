// Rex Runs RoboTown: game rules, level generation and physics.
// No drawing and no DOM here, so play/test-engine.cjs can run every level in Node.
(function (root) {
  'use strict';

  const GROUND = 300;          // y of the sidewalk line, in a 360-unit-tall world
  const REX_X = 96;            // Rex's fixed screen position; the city scrolls past him
  const REX = {w: 52, h: 50, duckH: 28, inset: 7};
  const PHYS = {gravity: 1750, jump: 650, fastFall: 1100, coyote: 0.08, buffer: 0.14, minDuck: 0.42};
  // A bump: Rex skids back a step, sits dizzy, then trots on, blinking and safe for a moment.
  const BONK = {knock: 0.22, knockSpeed: -110, dizzy: 0.85, ramp: 0.5, safe: 1.8};
  const SHIELD = {active: 1.15, cooldown: 6.5};
  const START_RAMP = 0.6;
  // Measured by play/test-engine.cjs: seconds one bump costs.
  const BONK_COST = 1.4;

  // Hit boxes. bottom = how far above the sidewalk the box starts. jump = hop over it. duck = go under it.
  const KINDS = {
    puddle:      {w: 62, h: 10, bottom: 0,  pass: 'jump'},
    roomba:      {w: 46, h: 22, bottom: 0,  pass: 'jump', wiggle: 7},
    cone:        {w: 30, h: 40, bottom: 0,  pass: 'jump'},
    basket:      {w: 48, h: 34, bottom: 0,  pass: 'jump'},
    vent:        {w: 38, h: 42, bottom: 0,  pass: 'jump'},
    ducky:       {w: 40, h: 32, bottom: 0,  pass: 'jump'},
    pot:         {w: 34, h: 38, bottom: 0,  pass: 'jump'},
    clothesline: {w: 96, h: 170, bottom: 38, pass: 'duck'},
    drone:       {w: 50, h: 34, bottom: 38, pass: 'duck', bob: 4}
  };

  const THEMES = [
    {key: 'sidewalk', name: 'Sunny Sidewalk', kinds: ['puddle', 'puddle', 'roomba', 'cone'], teach: 'jump'},
    {key: 'laundry',  name: 'Laundry Lane',   kinds: ['puddle', 'basket', 'roomba', 'clothesline', 'clothesline'], teach: 'duck'},
    {key: 'rooftop',  name: 'Rooftop Run',    kinds: ['vent', 'roomba', 'drone', 'vent', 'drone']},
    {key: 'park',     name: 'Park Path',      kinds: ['ducky', 'pot', 'puddle', 'drone', 'ducky']},
    {key: 'home',     name: 'Home Stretch',   kinds: ['puddle', 'roomba', 'cone', 'basket', 'clothesline', 'drone']}
  ];

  function levelConfig(level) {
    const i = (level - 1) % 5;
    const robo = level > 5;
    const theme = THEMES[i];
    const speed = robo ? 285 + 12 * i : 220 + 11 * i;
    const seconds = 34 + 3 * i;                       // running time with no bumps
    const reaction = robo ? 0.62 - 0.03 * i : 1.0 - 0.06 * i;  // spare seconds between obstacles
    const spread = robo ? 0.75 - 0.04 * i : 1.05 - 0.06 * i;   // random extra space
    const pairs = robo ? 0.16 + 0.03 * i : (i >= 3 ? 0.08 : 0);   // two hops in a row
    const allowed = robo ? [4, 4, 3, 3, 3][i] : [6, 6, 5, 5, 4][i];
    const distance = Math.round(speed * seconds);
    const par = distance / speed + START_RAMP / 2;
    return {
      level, robo, theme, speed, seconds, reaction, spread, pairs, allowed, distance, par,
      final: i === 4,
      shield: robo,
      limit: Math.ceil(par + allowed * BONK_COST + 2),
      threeStar: par + 0.6,
      twoStar: par + 2 * BONK_COST + 0.6
    };
  }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function airTime() { return 2 * PHYS.jump / PHYS.gravity; }

  // Lay out a whole level. Spacing always leaves room to land and react before the next obstacle.
  function generate(cfg, seed) {
    const rand = rng(seed);
    const obstacles = [];
    const bolts = [];
    const sp = cfg.speed;
    const air = airTime();
    const teachFirst = cfg.theme.teach === 'duck' ? 'clothesline' : null;
    let x = 900;                                     // first obstacle: a calm start
    const end = cfg.distance - 420;
    let count = 0;
    while (x < end) {
      let kind = cfg.theme.kinds[Math.floor(rand() * cfg.theme.kinds.length)];
      if (count === 0 && teachFirst) kind = teachFirst;
      if (count === 0 && cfg.robo) kind = cfg.theme.kinds.find(k => KINDS[k].pass === 'jump');
      const k = KINDS[kind];
      obstacles.push({kind, x, w: k.w, h: k.h, bottom: k.bottom, pass: k.pass, phase: rand() * 6.28, hit: false, glided: false});
      addBolts(obstacles[obstacles.length - 1], bolts, rand);
      count++;
      let gap = sp * (air + cfg.reaction + rand() * cfg.spread) + 40;
      // Sometimes a quick pair: two small hops with just enough room to land in between.
      if (k.pass === 'jump' && rand() < cfg.pairs && x + k.w + sp * (air + 0.22) + 80 < end) {
        const next = cfg.theme.kinds.filter(n => KINDS[n].pass === 'jump' && KINDS[n].w <= 48);
        if (next.length) {
          const kind2 = next[Math.floor(rand() * next.length)];
          const k2 = KINDS[kind2];
          const x2 = x + k.w + REX.w + sp * (air + 0.12) + 20;
          obstacles.push({kind: kind2, x: x2, w: k2.w, h: k2.h, bottom: k2.bottom, pass: k2.pass, phase: rand() * 6.28, hit: false, glided: false});
          x = x2;
          count++;
          gap += 60;
        }
      }
      // A clothesline or drone right after a hop gets a little more room.
      x += k.w + gap + (k.pass === 'duck' ? 30 : 0) + (k.wiggle || 0) * 2;
    }
    // Ground bolts in the open stretches.
    for (let i = 0; i < obstacles.length - 1; i++) {
      const a = obstacles[i], b = obstacles[i + 1];
      const room = b.x - (a.x + a.w);
      if (room > 360 && rand() < 0.55) {
        const start = a.x + a.w + room * 0.35;
        for (let j = 0; j < 3; j++) bolts.push({x: start + j * 34, y: GROUND - 26, got: false});
      }
    }
    return {obstacles, bolts};
  }

  function addBolts(ob, bolts, rand) {
    if (rand() < 0.35) return;
    const mid = ob.x + ob.w / 2;
    if (ob.pass === 'jump') {
      // An arc that follows a good hop.
      [-48, 0, 48].forEach((dx, j) => bolts.push({x: mid + dx, y: GROUND - ob.h - ob.bottom - (j === 1 ? 92 : 72), got: false}));
    } else {
      [-30, 10, 50].forEach(dx => bolts.push({x: mid + dx, y: GROUND - 15, got: false}));
    }
  }

  function createRun(level, seed) {
    const cfg = levelConfig(level);
    const s = seed == null ? Math.floor(Math.random() * 2147483647) : seed;
    const world = generate(cfg, s);
    return {
      cfg, seed: s,
      obstacles: world.obstacles, bolts: world.bolts,
      t: 0, x: 0, speed: 0,
      y: GROUND, vy: 0, ground: true, lastGround: 0,
      duck: false, duckLeft: 0, buffer: 0,
      bonk: null, safe: 0,
      shieldOn: 0, shieldCd: 0,
      boltsGot: 0, bonks: 0, glides: 0, jumps: 0,
      state: 'run', finishTime: 0, events: []
    };
  }

  function rexBox(run) {
    const h = run.duck ? REX.duckH : REX.h;
    return {
      l: run.x + REX_X + REX.inset,
      r: run.x + REX_X + REX.w - REX.inset,
      t: run.y - h + REX.inset * 0.6,
      b: run.y - 2
    };
  }

  function obBox(ob, t) {
    const k = KINDS[ob.kind];
    const dx = k.wiggle ? Math.sin(t * 2.2 + ob.phase) * k.wiggle : 0;
    const dy = k.bob ? Math.sin(t * 3 + ob.phase) * k.bob : 0;
    return {l: ob.x + dx + 4, r: ob.x + dx + ob.w - 4, t: GROUND - ob.bottom - ob.h + dy + 2, b: GROUND - ob.bottom + dy, dx, dy};
  }

  const overlap = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

  // input: {jump: true on the frame it is pressed, duck: true while held, shield: true on the frame it is pressed}
  function step(run, dt, input) {
    const ev = run.events;
    if (run.state !== 'run') return run;
    const cfg = run.cfg;
    run.t += dt;

    // Speed: a gentle start, a skid and a dizzy sit after a bump, then back up to speed.
    if (run.bonk) {
      run.bonk.t += dt;
      const b = run.bonk.t;
      if (b < BONK.knock) run.speed = BONK.knockSpeed;
      else if (b < BONK.knock + BONK.dizzy) run.speed = 0;
      else if (b < BONK.knock + BONK.dizzy + BONK.ramp) run.speed = cfg.speed * (b - BONK.knock - BONK.dizzy) / BONK.ramp;
      else { run.bonk = null; run.speed = cfg.speed; }
    } else if (run.t < START_RAMP) {
      run.speed = cfg.speed * run.t / START_RAMP;
    } else {
      run.speed = cfg.speed;
    }
    run.x = Math.max(0, run.x + run.speed * dt);
    if (run.safe > 0) run.safe -= dt;

    const dizzy = run.bonk && run.bonk.t < BONK.knock + BONK.dizzy;

    // Shield (Doggotron only)
    if (run.shieldOn > 0) run.shieldOn -= dt;
    if (run.shieldCd > 0) run.shieldCd -= dt;
    if (cfg.shield && input.shield && run.shieldCd <= 0 && !dizzy) {
      run.shieldOn = SHIELD.active;
      run.shieldCd = SHIELD.cooldown;
      ev.push('shield');
    }

    // Jump, with a short buffer so an early tap still counts
    if (input.jump) run.buffer = PHYS.buffer;
    else if (run.buffer > 0) run.buffer -= dt;
    if (run.ground) run.lastGround = run.t;
    const canJump = !dizzy && (run.ground || run.t - run.lastGround < PHYS.coyote) && run.vy >= 0;
    if (run.buffer > 0 && canJump) {
      run.vy = -PHYS.jump;
      run.ground = false;
      run.buffer = 0;
      run.duck = false;
      run.duckLeft = 0;
      run.jumps++;
      ev.push('jump');
    }

    // Duck: hold to stay low. A quick tap still ducks for a moment. Ducking in the air drops faster.
    if (input.duck && !dizzy) {
      if (run.ground) {
        if (!run.duck) ev.push('duck');
        run.duck = true;
        run.duckLeft = PHYS.minDuck;
      } else if (run.vy < PHYS.fastFall) {
        run.vy = Math.max(run.vy, 0) + PHYS.fastFall * dt * 6;
        run.duckLeft = PHYS.minDuck;
      }
    } else if (run.duck) {
      run.duckLeft -= dt;
      if (run.duckLeft <= 0) run.duck = false;
    }

    if (!run.ground) {
      run.vy += PHYS.gravity * dt;
      run.y += run.vy * dt;
      if (run.y >= GROUND) {
        run.y = GROUND; run.vy = 0; run.ground = true; ev.push('land');
        if (run.duckLeft > 0) run.duck = true;
      }
    }

    // Obstacles
    const rb = rexBox(run);
    for (const ob of run.obstacles) {
      if (ob.hit || ob.glided) continue;
      if (ob.x > rb.r + 20) break;
      if (ob.x + ob.w < rb.l - 40) continue;
      if (!overlap(rb, obBox(ob, run.t))) continue;
      if (run.shieldOn > 0) {
        ob.glided = true; run.glides++; ev.push('glide');
      } else if (run.safe > 0 || run.bonk) {
        ob.hit = true;                          // already bumped and blinking: trot through
      } else {
        ob.hit = true; run.bonks++;
        run.bonk = {t: 0, kind: ob.kind};
        run.safe = BONK.safe;
        run.duck = false;
        if (!run.ground) { run.vy = Math.max(run.vy, 200); }
        ev.push('bonk');
      }
    }

    // Bolts
    for (const b of run.bolts) {
      if (b.got) continue;
      if (b.x > rb.r + 30) continue;
      if (b.x < rb.l - 30) continue;
      if (b.x + 10 > rb.l - 8 && b.x - 10 < rb.r + 8 && b.y + 10 > rb.t - 8 && b.y - 10 < rb.b + 8) {
        b.got = true; run.boltsGot++; ev.push('bolt');
      }
    }

    if (run.x >= cfg.distance) {
      run.state = 'done';
      run.finishTime = run.t;
      ev.push('finish');
    } else if (run.t >= cfg.limit) {
      run.state = 'late';
      ev.push('late');
    }
    return run;
  }

  function stars(run) {
    if (run.state !== 'done') return 0;
    if (run.finishTime <= run.cfg.threeStar) return 3;
    if (run.finishTime <= run.cfg.twoStar) return 2;
    return 1;
  }

  function score(run) {
    // Bolts are the score. A quicker trip to the finish adds a bonus.
    const quick = Math.max(0, Math.round((run.cfg.limit - run.finishTime) * 10));
    return run.boltsGot * 10 + (run.state === 'done' ? quick : 0);
  }

  root.RexEngine = {GROUND, REX_X, REX, PHYS, BONK, SHIELD, KINDS, THEMES, BONK_COST, START_RAMP,
    levelConfig, generate, createRun, step, stars, score, rexBox, obBox, rng, airTime};
})(typeof window !== 'undefined' ? window : globalThis);

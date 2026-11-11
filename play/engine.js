// Rex Runs RoboTown: game rules, level generation and physics.
// No drawing and no DOM here, so play/test-engine.cjs can run every level in Node.
(function (root) {
  'use strict';

  const GROUND = 300;          // y of the sidewalk line, in a 360-unit-tall world
  const REX_X = 96;            // Rex's fixed screen position; the city scrolls past him
  const REX = {w: 52, h: 50, duckH: 28, inset: 10};
  // A floaty jump: about 0.9 s in the air and 134 units high.
  const PHYS = {gravity: 1300, jump: 590, coyote: 0.09, buffer: 0.15, minDuck: 0.5, landWindow: 0.1, dropSpeed: 80};
  // A bump: Rex skids back a step, sits dizzy, then trots on, blinking and safe for a moment.
  const BONK = {knock: 0.22, knockSpeed: -110, dizzy: 1.25, ramp: 0.5, safe: 2.1};
  // Measured by play/test-engine.cjs: seconds one bump costs.
  const BONK_COST = 1.8;
  const SHIELD = {active: 1.15, cooldown: 6.5};
  const START_RAMP = 0.6;

  // Bumps you can take on each board and still beat the clock. One more runs it out.
  // Board 1 is the warm-up. From board 2 on, bumping into everything runs out the clock.
  const ALLOWED_BUMPS = [12, 6, 6, 5, 5, 4, 4, 3, 3, 3];

  // Platforms: layer 1 is reachable with one jump from the sidewalk.
  // Layer 2 (boards 6 to 10) is reachable only by jumping from layer 1.
  const PLATFORM = {top1: GROUND - 92, top2: GROUND - 184, thick: 14};

  // Power-ups are earned in this order, one per board, starting on board 2. Each one works once per board.
  const POWERS = {
    doublejump: {name: 'Double jump', how: 'Press Jump again while Rex is in the air.'},
    slide: {name: 'Slide', how: 'Duck, then press Duck again while Rex is still down, for a speedy slide.'},
    rocket: {name: 'Rocket boost', how: 'Press Boost (or R) for a burst of speed.'},
    brace: {name: 'Brace yourself', how: 'Rex pushes right through one cone, pot, basket, vent or laundry line.'},
    swim: {name: 'Swimming', how: 'Rex paddles right through one puddle.'},
    buddy: {name: 'RoboPet buddy', how: 'One Roomba, roboducky or pigeon-drone lets Rex pass like a friend.'}
  };
  const POWER_ORDER = ['doublejump', 'slide', 'rocket', 'brace', 'swim', 'buddy'];
  const SLIDE = {time: 1.3, boost: 1.55};
  const ROCKET = {time: 2.0, boost: 1.7};

  // Hit boxes. bottom = how far above the sidewalk the box starts. jump = hop over it. duck = go under it.
  // group says which passive power-up lets Rex through it.
  const KINDS = {
    puddle:      {w: 62, h: 10, bottom: 0,  pass: 'jump', group: 'swim'},
    roomba:      {w: 46, h: 22, bottom: 0,  pass: 'jump', group: 'buddy', wiggle: 7},
    cone:        {w: 30, h: 40, bottom: 0,  pass: 'jump', group: 'brace'},
    basket:      {w: 48, h: 34, bottom: 0,  pass: 'jump', group: 'brace'},
    vent:        {w: 38, h: 42, bottom: 0,  pass: 'jump', group: 'brace'},
    ducky:       {w: 40, h: 32, bottom: 0,  pass: 'jump', group: 'buddy'},
    pot:         {w: 34, h: 38, bottom: 0,  pass: 'jump', group: 'brace'},
    clothesline: {w: 96, h: 170, bottom: 38, pass: 'duck', group: 'brace'},
    drone:       {w: 50, h: 34, bottom: 38, pass: 'duck', group: 'buddy', bob: 4}
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
    const reaction = robo ? 0.6 - 0.03 * i : 0.95 - 0.06 * i;  // spare seconds between obstacles
    const spread = robo ? 0.75 - 0.04 * i : 1.0 - 0.06 * i;    // random extra space
    const pairs = robo ? 0.16 + 0.03 * i : (i >= 3 ? 0.08 : 0);   // two hops in a row
    const platforms = robo ? 0.3 : [0.1, 0.17, 0.24, 0.3, 0.3][i];  // sparse at first, more by board 4
    const layer2 = robo ? 0.35 + 0.08 * i : 0;
    const allowed = ALLOWED_BUMPS[level - 1];
    const distance = Math.round(speed * seconds);
    const par = distance / speed + START_RAMP / 2;
    return {
      level, robo, theme, speed, seconds, reaction, spread, pairs, platforms, layer2, allowed, distance, par,
      final: i === 4,
      shield: robo,
      // Taking `allowed` bumps leaves a little over a second to spare; one more runs out the clock.
      limit: Math.round(par + (allowed + 0.6) * BONK_COST),
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

  function makeOb(kind, x, rand) {
    const k = KINDS[kind];
    return {kind, x, w: k.w, h: k.h, bottom: k.bottom, pass: k.pass, group: k.group, phase: rand() * 6.28, hit: false, glided: false, hitAt: 0, hitBy: null};
  }

  // Lay out a whole level. Spacing always leaves room to land and react before the next obstacle.
  function generate(cfg, seed, offer) {
    const rand = rng(seed);
    const obstacles = [], bolts = [], platforms = [];
    const sp = cfg.speed;
    const air = airTime();
    const teachFirst = cfg.theme.teach === 'duck' ? 'clothesline' : null;
    const jumpKinds = cfg.theme.kinds.filter(k => KINDS[k].pass === 'jump');
    let x = 900;                                     // first obstacle: a calm start
    const end = cfg.distance - 420;
    let count = 0;
    while (x < end) {
      // A floating platform with one obstacle under it: hop up and ride over it, or jump the obstacle below.
      if (count > 1 && rand() < cfg.platforms) {
        const len = 330 + rand() * 150 + (cfg.robo ? 60 : 0);
        const clear = sp * 0.65 + 130;            // room to drop back to the sidewalk after the platform
        if (x + len + clear < end) {
          const p1 = {x, w: len, layer: 1, top: PLATFORM.top1};
          platforms.push(p1);
          for (let j = 0; j < 4; j++) bolts.push({x: x + 60 + j * (len - 120) / 3, y: p1.top - 24, got: false});
          const under = makeOb(jumpKinds[Math.floor(rand() * jumpKinds.length)], x + len * 0.42, rand);
          obstacles.push(under);
          if (rand() < cfg.layer2 && len > 360) {
            const p2 = {x: x + 150, w: Math.max(170, len - 190), layer: 2, top: PLATFORM.top2};
            platforms.push(p2);
            for (let j = 0; j < 4; j++) bolts.push({x: p2.x + 30 + j * (p2.w - 60) / 3, y: p2.top - 24, got: false});
          }
          count++;
          x += len + clear + rand() * sp * cfg.spread * 0.5;
          continue;
        }
      }
      let kind = cfg.theme.kinds[Math.floor(rand() * cfg.theme.kinds.length)];
      if (count === 0 && teachFirst) kind = teachFirst;
      if (count === 0 && cfg.robo) kind = jumpKinds[0];
      const ob = makeOb(kind, x, rand);
      obstacles.push(ob);
      addBolts(ob, bolts, rand);
      count++;
      let gap = sp * (air + cfg.reaction + rand() * cfg.spread) + 40;
      // Sometimes a quick pair: two small hops with just enough room to land in between.
      if (ob.pass === 'jump' && rand() < cfg.pairs && x + ob.w + sp * (air + 0.3) + 80 < end) {
        const next = jumpKinds.filter(n => KINDS[n].w <= 48);
        if (next.length) {
          const x2 = x + ob.w + REX.w + sp * (air + 0.12) + 20;
          obstacles.push(makeOb(next[Math.floor(rand() * next.length)], x2, rand));
          x = x2;
          count++;
          gap += 60;
        }
      }
      x += ob.w + gap + (ob.pass === 'duck' ? 30 : 0) + (KINDS[kind].wiggle || 0) * 2;
    }
    obstacles.sort((a, b) => a.x - b.x);
    // Ground bolts in the open stretches.
    for (let i = 0; i < obstacles.length - 1; i++) {
      const a = obstacles[i], b = obstacles[i + 1];
      const room = b.x - (a.x + a.w);
      if (room > 360 && rand() < 0.55 && !platforms.some(p => p.x < b.x && p.x + p.w > a.x)) {
        const start = a.x + a.w + room * 0.35;
        for (let j = 0; j < 3; j++) bolts.push({x: start + j * 34, y: GROUND - 26, got: false});
      }
    }
    // The power-up capsule floats above a jump obstacle near the middle, where a good hop catches it.
    let capsule = null;
    if (offer) {
      const target = cfg.distance * 0.45;
      const choices = obstacles.filter(o => o.pass === 'jump' && !platforms.some(p => o.x + o.w > p.x - 60 && o.x < p.x + p.w + 60));
      choices.sort((a, b) => Math.abs(a.x - target) - Math.abs(b.x - target));
      const host = choices[0];
      if (host) {
        const cx = host.x + host.w / 2;
        for (let i = bolts.length - 1; i >= 0; i--) if (Math.abs(bolts[i].x - cx) < 70 && bolts[i].y < GROUND - 40) bolts.splice(i, 1);
        capsule = {id: offer, x: cx, y: GROUND - 152, got: false};
      }
    }
    return {obstacles, bolts, platforms, capsule};
  }

  function addBolts(ob, bolts, rand) {
    if (rand() < 0.35) return;
    const mid = ob.x + ob.w / 2;
    if (ob.pass === 'jump') {
      // An arc that follows a good hop.
      [-56, 0, 56].forEach((dx, j) => bolts.push({x: mid + dx, y: GROUND - ob.h - ob.bottom - (j === 1 ? 96 : 76), got: false}));
    } else {
      [-30, 10, 50].forEach(dx => bolts.push({x: mid + dx, y: GROUND - 15, got: false}));
    }
  }

  // opts: {powers: ['doublejump', ...] owned, offer: id of the power-up capsule on this board or null}
  function createRun(level, seed, opts = {}) {
    const cfg = levelConfig(level);
    const s = seed == null ? Math.floor(Math.random() * 2147483647) : seed;
    const world = generate(cfg, s, opts.offer || null);
    return {
      cfg, seed: s,
      obstacles: world.obstacles, bolts: world.bolts, platforms: world.platforms, capsule: world.capsule,
      t: 0, x: 0, speed: 0,
      y: GROUND, vy: 0, ground: true, lastGround: 0, plat: null, jumpFrom: 0, dropping: null,
      duck: false, duckLeft: 0, duckWas: false, buffer: 0,
      bonk: null, safe: 0,
      shieldOn: 0, shieldCd: 0,
      owned: new Set(opts.powers || []), used: new Set(), got: null,
      slideLeft: 0, rocketLeft: 0, airJumps: 0,
      boltsGot: 0, bonks: 0, glides: 0, jumps: 0,
      state: 'run', finishTime: 0, events: []
    };
  }

  function rexBox(run) {
    const low = run.duck || run.slideLeft > 0;
    const h = low ? REX.duckH : REX.h;
    return {
      l: run.x + REX_X + REX.inset,
      r: run.x + REX_X + REX.w - REX.inset,
      t: run.y - h + 6,
      b: run.y - 2
    };
  }

  // Obstacle hit boxes are a little smaller than the drawings, with soft edges.
  function obBox(ob, t) {
    const k = KINDS[ob.kind];
    const dx = k.wiggle ? Math.sin(t * 2.2 + ob.phase) * k.wiggle : 0;
    const dy = k.bob ? Math.sin(t * 3 + ob.phase) * k.bob : 0;
    const side = Math.round(ob.w * 0.18) + 3;
    const top = ob.pass === 'jump' ? 5 : 2;
    return {l: ob.x + dx + side, r: ob.x + dx + ob.w - side, t: GROUND - ob.bottom - ob.h + dy + top, b: GROUND - ob.bottom + dy - (ob.pass === 'duck' ? 3 : 0), dx, dy};
  }

  const overlap = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

  function feetOver(run, p) {
    const l = run.x + REX_X + 14, r = run.x + REX_X + REX.w - 12;
    return l < p.x + p.w && r > p.x;
  }

  // Time until Rex lands, if he is falling toward a surface soon.
  function surfaceBelow(run) {
    let best = GROUND;
    for (const p of run.platforms) {
      if (p === run.dropping) continue;
      if (p.layer === 2 && run.jumpFrom !== 1) continue;
      if (p.top >= run.y - 0.5 && p.top < best && feetOver(run, p)) best = p.top;
    }
    return best;
  }

  function speedNow(run) {
    let m = 1;
    if (run.slideLeft > 0) m = Math.max(m, SLIDE.boost);
    if (run.rocketLeft > 0) m = Math.max(m, ROCKET.boost);
    return run.cfg.speed * m;
  }

  function startJump(run, ev, air) {
    run.vy = -PHYS.jump;
    run.ground = false;
    run.buffer = 0;
    run.duck = false;
    run.duckLeft = 0;
    run.slideLeft = 0;
    if (!air) run.jumpFrom = run.plat ? run.plat.layer : 0;
    run.plat = null;
    run.jumps++;
    ev.push(air ? 'doublejump' : 'jump');
  }

  // input: {jump: true on the frame it is pressed, duck: true while held,
  //         shield / rocket: true on the frame pressed}
  function step(run, dt, input) {
    const ev = run.events;
    if (run.state !== 'run') return run;
    const cfg = run.cfg;
    run.t += dt;

    // Speed: a gentle start, a skid and a dizzy sit after a bump, then back up to speed.
    if (run.slideLeft > 0) run.slideLeft -= dt;
    if (run.rocketLeft > 0) run.rocketLeft -= dt;
    if (run.bonk) {
      run.bonk.t += dt;
      const b = run.bonk.t;
      if (b < BONK.knock) run.speed = BONK.knockSpeed;
      else if (b < BONK.knock + BONK.dizzy) run.speed = 0;
      else if (b < BONK.knock + BONK.dizzy + BONK.ramp) run.speed = cfg.speed * (b - BONK.knock - BONK.dizzy) / BONK.ramp;
      else { run.bonk = null; run.speed = speedNow(run); }
    } else if (run.t < START_RAMP) {
      run.speed = cfg.speed * run.t / START_RAMP;
    } else {
      run.speed = speedNow(run);
    }
    run.x = Math.max(0, run.x + run.speed * dt);
    if (run.safe > 0) run.safe -= dt;

    const dizzy = run.bonk && run.bonk.t < BONK.knock + BONK.dizzy;

    // Shield (Doggotron only) and rocket boost (a power-up)
    if (run.shieldOn > 0) run.shieldOn -= dt;
    if (run.shieldCd > 0) run.shieldCd -= dt;
    if (cfg.shield && input.shield && run.shieldCd <= 0 && !dizzy) {
      run.shieldOn = SHIELD.active;
      run.shieldCd = SHIELD.cooldown;
      ev.push('shield');
    }
    if (input.rocket && run.owned.has('rocket') && !run.used.has('rocket') && !dizzy) {
      run.used.add('rocket'); run.rocketLeft = ROCKET.time; ev.push('rocket');
    }

    // Walking off the end of a platform
    if (run.ground && run.plat && !feetOver(run, run.plat)) {
      run.ground = false; run.vy = 0; run.plat = null;
    }

    // Jump. An early tap still counts, and a tap just before landing waits for the landing
    // instead of using up the double jump.
    if (input.jump) {
      if (!run.ground && !dizzy && run.t - run.lastGround >= PHYS.coyote) {
        const below = surfaceBelow(run);
        const soon = run.vy > 0 && (below - run.y) / run.vy < PHYS.landWindow;
        if (!soon && run.owned.has('doublejump') && !run.used.has('doublejump')) {
          run.used.add('doublejump');
          startJump(run, ev, true);
        } else run.buffer = PHYS.buffer;
      } else run.buffer = PHYS.buffer;
    } else if (run.buffer > 0) run.buffer -= dt;
    if (run.ground) run.lastGround = run.t;
    const canJump = !dizzy && (run.ground || run.t - run.lastGround < PHYS.coyote) && run.vy >= 0;
    if (run.buffer > 0 && canJump) startJump(run, ev, false);

    // Duck: hold to stay low; a tap ducks for a moment. On a platform, Duck drops Rex down.
    // Pressing Duck again while Rex is still down starts a slide, if he has it.
    const duckPress = input.duckPress !== undefined ? !!input.duckPress : (input.duck && !run.duckWas);
    run.duckWas = !!input.duck;
    if (input.duck && !dizzy) {
      if (run.ground && run.plat) {
        if (duckPress) {
          run.dropping = run.plat; run.plat = null; run.ground = false; run.vy = PHYS.dropSpeed; ev.push('drop');
        }
      } else if (run.ground) {
        if (duckPress && run.duck && run.owned.has('slide') && !run.used.has('slide')) {
          run.used.add('slide'); run.slideLeft = SLIDE.time; ev.push('slide');
        } else if (!run.duck) ev.push('duck');
        run.duck = true;
        run.duckLeft = PHYS.minDuck;
      } else if (run.vy < 900) {
        run.vy = Math.max(run.vy, 0) + 1100 * dt * 6;     // ducking in the air drops faster
        run.duckLeft = PHYS.minDuck;
      }
    } else if (run.duck) {
      run.duckLeft -= dt;
      if (run.duckLeft <= 0) run.duck = false;
    }

    if (!run.ground) {
      const prevY = run.y;
      run.vy += PHYS.gravity * dt;
      run.y += run.vy * dt;
      if (run.dropping && run.y > run.dropping.top + 4) run.dropping = null;
      let landed = null;
      if (run.vy > 0) {
        for (const p of run.platforms) {
          if (p.x > run.x + REX_X + 200) break;
          if (p === run.dropping) continue;
          if (p.layer === 2 && run.jumpFrom !== 1) continue;
          if (prevY <= p.top && run.y >= p.top && feetOver(run, p)) { landed = p; break; }
        }
      }
      if (landed) {
        run.y = landed.top; run.vy = 0; run.ground = true; run.plat = landed; run.jumpFrom = landed.layer; ev.push('land');
      } else if (run.y >= GROUND) {
        run.y = GROUND; run.vy = 0; run.ground = true; run.plat = null; run.jumpFrom = 0; ev.push('land');
        if (run.duckLeft > 0) run.duck = true;
      }
      if (run.ground) run.airJumps = 0;
    }

    // Obstacles
    const rb = rexBox(run);
    for (const ob of run.obstacles) {
      if (ob.hit || ob.glided) continue;
      if (ob.x > rb.r + 40) break;
      if (ob.x + ob.w < rb.l - 40) continue;
      if (!overlap(rb, obBox(ob, run.t))) continue;
      ob.hitAt = run.t;
      if (run.shieldOn > 0) {
        ob.glided = true; ob.hitBy = 'shield'; run.glides++; ev.push('glide');
      } else if (run.safe > 0 || run.bonk) {
        ob.hit = true; ob.hitBy = 'safe';               // already bumped and blinking: trot through
      } else if (run.owned.has(ob.group) && !run.used.has(ob.group)) {
        run.used.add(ob.group); ob.glided = true; ob.hitBy = ob.group; ev.push(ob.group);
      } else {
        ob.hit = true; ob.hitBy = 'bonk'; run.bonks++;
        run.bonk = {t: 0, kind: ob.kind};
        run.safe = BONK.safe;
        run.duck = false; run.slideLeft = 0; run.rocketLeft = 0;
        if (!run.ground) run.vy = Math.max(run.vy, 200);
        ev.push('bonk');
      }
    }

    // Bolts and the power-up capsule
    const near = (x, y, r) => x + r > rb.l - 6 && x - r < rb.r + 6 && y + r > rb.t - 6 && y - r < rb.b + 6;
    for (const b of run.bolts) {
      if (b.got || b.x > rb.r + 30 || b.x < rb.l - 30) continue;
      if (near(b.x, b.y, 10)) { b.got = true; run.boltsGot++; ev.push('bolt'); }
    }
    const c = run.capsule;
    if (c && !c.got && Math.abs(c.x - (rb.l + rb.r) / 2) < 60 && near(c.x, c.y, 18)) {
      c.got = true; run.got = c.id; run.owned.add(c.id); ev.push('power');
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

  // Which power-up waits on a board. The first appears from board 2; each later one from the board
  // after the previous one was caught. owned: {id: board it was caught on}.
  function offerFor(level, owned) {
    let from = 2;
    for (const id of POWER_ORDER) {
      if (owned[id]) { from = owned[id] + 1; continue; }
      return level >= from ? id : null;
    }
    return null;
  }

  root.RexEngine = {GROUND, REX_X, REX, PHYS, BONK, SHIELD, KINDS, THEMES, BONK_COST, START_RAMP, ALLOWED_BUMPS,
    PLATFORM, POWERS, POWER_ORDER, SLIDE, ROCKET,
    levelConfig, generate, createRun, step, stars, score, rexBox, obBox, rng, airTime, offerFor, surfaceBelow};
})(typeof window !== 'undefined' ? window : globalThis);

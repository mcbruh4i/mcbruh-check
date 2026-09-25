(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  $('#year').textContent = new Date().getFullYear();

  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =========================================================
   * HERO — wavy titanium strips, deep blue floods the strip from the pointer
   * ========================================================= */
  (function hero() {
    /* Hero is split into wavy diagonal titanium strips (like the reference sketch),
     * on the light "day" theme. Deep blue spreads from the pointer/finger through the whole strip,
     * then slowly fades back to titanium. */
    const section = $('.hero');
    const canvas = $('#hero-canvas');
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, lines = [], heat = [], pts = [];
    const pointer = { x: -9999, y: -9999, active: false, touch: false, lastMove: 0 };
    const STEP_Y = 6;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    // one seam line: x as a function of height (u = 0 bottom, 1 top)
    function seamX(L, u, t) {
      const drift = reduce ? 0 : Math.sin(t * 0.25 + L.p1) * 3;
      return L.x0 + L.slant * u
        + L.a1 * Math.sin(u * Math.PI * 2 * L.f1 + L.p1)
        + L.a2 * Math.sin(u * Math.PI * 2 * L.f2 + L.p2)
        + drift * Math.sin(u * Math.PI);
    }

    function build() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = section.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = W < 560 ? 6 : W < 1000 ? 8 : 10;       // visible strips
      const spacing = W / n;
      const slant = Math.min(spacing * 1.35, H * 0.3); // lean to the right going up
      const old = heat;
      lines = []; heat = [];
      // extra seams on both sides so the whole area is covered
      for (let i = -3; i <= n + 1; i++) {
        let s = i * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        lines.push({
          x0: i * spacing + (rnd() - 0.5) * spacing * 0.15,
          slant,
          a1: spacing * (0.16 + rnd() * 0.08), f1: 1.25 + rnd() * 0.35, p1: rnd() * Math.PI * 2,
          a2: spacing * 0.05, f2: 3 + rnd(), p2: rnd() * Math.PI * 2
        });
      }
      for (let i = 0; i < lines.length - 1; i++) heat.push(old[i] || 0);
      pts = lines.map(() => []);
    }

    function sample(t) {
      const rows = Math.ceil(H / STEP_Y);
      lines.forEach((L, i) => {
        const arr = pts[i]; arr.length = 0;
        for (let k = 0; k <= rows; k++) {
          const y = H - k * STEP_Y;
          arr.push(seamX(L, 1 - y / H, t), Math.max(0, y));
        }
      });
    }

    function stripPath(i) {
      const a = pts[i], b = pts[i + 1];
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      for (let k = 2; k < a.length; k += 2) ctx.lineTo(a[k], a[k + 1]);
      for (let k = b.length - 2; k >= 0; k -= 2) ctx.lineTo(b[k], b[k + 1]);
      ctx.closePath();
    }

    function stripAt(px, py, t) {
      const u = 1 - py / H;
      for (let i = 0; i < lines.length - 1; i++) {
        if (px >= seamX(lines[i], u, t) && px < seamX(lines[i + 1], u, t)) return i;
      }
      return -1;
    }

    let last = performance.now();
    // Flood model: blue starts exactly where the pointer enters a strip
    // and spreads up & down until it fills the whole strip, then slowly fades.
    const flood = [];                       // per strip: { oy, reach, a }
    const SPREAD = () => H * 1.9;           // px per second (whole strip in ~0.5s)
    const EDGE = () => (W < 560 ? 60 : 90); // soft front of the spreading blue

    function feed(dt, t) {
      const hit = pointer.active ? stripAt(pointer.x, pointer.y, t) : -1;
      for (let i = 0; i < pts.length - 1; i++) {
        const f = flood[i] || (flood[i] = { oy: 0, reach: 0, a: 0 });
        if (i === hit) {
          if (f.a < 0.08) { f.oy = pointer.y; f.reach = 0; }   // new origin = pointer
          f.a = Math.min(1, f.a + dt * 5);
          f.hold = 0.35;                                       // short hold after leaving
        } else if (f.hold > 0) {
          f.hold -= dt;
        } else {
          f.a = Math.max(0, f.a - dt * 0.35);                  // slow return to titanium
        }
        if (f.a > 0) f.reach = clamp(f.reach + dt * SPREAD(), 0, H * 1.3);
      }
    }

    function frame(now) {
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      const t = now / 1000;
      sample(t);
      ctx.clearRect(0, 0, W, H);

      if (pointer.active && pointer.touch && now - pointer.lastMove > 900) pointer.active = false;
      feed(dt, t);

      for (let i = 0; i < pts.length - 1; i++) {
        ctx.save();
        stripPath(i);
        ctx.clip();

        // titanium panel — bottom → top gradient, each strip a slightly different tone
        const tone = (i % 3) * 7 - 7;
        const g = ctx.createLinearGradient(0, H, 0, 0);
        g.addColorStop(0, `rgb(${150 + tone},${157 + tone},${166 + tone})`);
        g.addColorStop(0.5, `rgb(${196 + tone},${201 + tone},${207 + tone})`);
        g.addColorStop(1, `rgb(${236 + tone / 2},${238 + tone / 2},${241 + tone / 2})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // brushed sheen near the strip's left edge
        const mid = Math.floor(pts[i].length / 4) * 2;
        const x1 = pts[i][mid], x2 = pts[i + 1][mid];
        const sh = ctx.createLinearGradient(x1, 0, x2, 0);
        sh.addColorStop(0, 'rgba(255,255,255,.55)');
        sh.addColorStop(0.25, 'rgba(255,255,255,.12)');
        sh.addColorStop(0.7, 'rgba(0,0,0,0)');
        sh.addColorStop(1, 'rgba(40,48,60,.12)');
        ctx.fillStyle = sh;
        ctx.fillRect(0, 0, W, H);

        // deep blue spreading from the pointer's entry point through the strip
        const f = flood[i];
        if (f && f.a > 0.002) {
          const e = f.a * f.a * (3 - 2 * f.a);
          const edge = EDGE();
          const top = f.oy - f.reach, bot = f.oy + f.reach;
          const y0 = top - edge, y1 = bot + edge;
          const span = y1 - y0;
          const bg = ctx.createLinearGradient(0, y0, 0, y1);
          const s0 = clamp(edge / span, 0, 0.5), s1 = 1 - s0;
          const core = clamp((f.oy - y0) / span, s0, s1);
          bg.addColorStop(0, 'rgba(12,48,175,0)');
          bg.addColorStop(s0, `rgba(12,44,165,${0.86 * e})`);
          bg.addColorStop(core, `rgba(5,22,105,${0.95 * e})`);
          bg.addColorStop(s1, `rgba(12,44,165,${0.86 * e})`);
          bg.addColorStop(1, 'rgba(12,48,175,0)');
          ctx.fillStyle = bg;
          ctx.fillRect(0, Math.max(0, y0), W, Math.min(H, y1) - Math.max(0, y0));
          // keep a bit of metallic sheen visible on top of the blue
          ctx.fillStyle = sh;
          ctx.globalAlpha = 0.28 * e;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }

      // seams: a crisp dark groove + light bevel, like cut metal
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        for (let k = 2; k < a.length; k += 2) ctx.lineTo(a[k], a[k + 1]);
        ctx.strokeStyle = 'rgba(55,63,74,.55)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.save();
        ctx.translate(1.4, 0);
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      if (visible) requestAnimationFrame(frame);
      else running = false;
    }

    function setPointer(x, y, isTouch) {
      const r = canvas.getBoundingClientRect();
      pointer.x = x - r.left;
      pointer.y = y - r.top;
      pointer.active = true;
      pointer.touch = isTouch;
      pointer.lastMove = performance.now();
    }
    section.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') setPointer(e.clientX, e.clientY, false); }, { passive: true });
    section.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') pointer.active = false; });
    const onTouch = e => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY, true); };
    section.addEventListener('touchstart', onTouch, { passive: true });
    section.addEventListener('touchmove', onTouch, { passive: true });

    let visible = true, running = false;
    const start = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }).observe(section);

    let rt, lastW = 0;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (Math.abs(section.clientWidth - lastW) > 1 || Math.abs(section.clientHeight - H) > 120) { lastW = section.clientWidth; build(); } }, 150);
    });
    lastW = section.clientWidth;
    build();
    start();
  })();

  /* =========================================================
   * SKILLS — real rigid-body physics with Matter.js
   * ========================================================= */
  function initSkills() {
    const box = $('#skills-box');
    const items = $$('#skills-list li');
    if (!window.Matter || !box) return; // falls back to static wrapped list

    const { Engine, Bodies, Body, Composite, Constraint, Vector } = Matter;
    box.classList.add('is-physics');

    const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    engine.gravity.y = 1.1;
    const world = engine.world;

    let W = 0, H = 0, walls = [], entries = [], started = false;
    const WALL = 200;

    function buildWalls() {
      walls.forEach(w => Composite.remove(world, w));
      const r = box.getBoundingClientRect();
      W = r.width; H = r.height;
      const opts = { isStatic: true, friction: 0.6, restitution: 0.2 };
      walls = [
        Bodies.rectangle(W / 2, H + WALL / 2, W + WALL * 2, WALL, opts),            // floor
        Bodies.rectangle(-WALL / 2, H / 2 - H, WALL, H * 4, opts),                  // left
        Bodies.rectangle(W + WALL / 2, H / 2 - H, WALL, H * 4, opts),               // right
        Bodies.rectangle(W / 2, -H * 1.5 - WALL / 2, W + WALL * 2, WALL, opts)      // high ceiling
      ];
      Composite.add(world, walls);
    }

    function createBodies() {
      entries.forEach(en => Composite.remove(world, en.body));
      entries = [];
      items.forEach((el, i) => {
        el.classList.remove('is-live');
        el.style.transform = 'translate(-9999px,0)';
        const w = el.offsetWidth, h = el.offsetHeight;
        const body = Bodies.rectangle(0, 0, w, h, {
          chamfer: { radius: h / 2 - 0.5 },
          restitution: 0.32,
          friction: 0.35,
          frictionStatic: 0.6,
          frictionAir: 0.012,
          density: el.dataset.size === 'l' ? 0.0022 : el.dataset.size === 's' ? 0.0012 : 0.0016,
          slop: 0.02
        });
        entries.push({ el, body, w, h, dropped: false, delay: i * 110 });
      });
    }

    // Pour everything in from the top-left corner, sliding toward one side
    function pour() {
      const t0 = performance.now();
      entries.forEach(en => {
        en.dropped = false;
        en.t0 = t0 + en.delay;
      });
    }
    function releaseDue(now) {
      for (const en of entries) {
        if (en.dropped || now < en.t0) continue;
        en.dropped = true;
        const x = Math.min(W - en.w / 2 - 4, en.w / 2 + 12 + Math.random() * Math.min(120, W * 0.2));
        Body.setPosition(en.body, { x, y: -en.h - Math.random() * 40 });
        Body.setAngle(en.body, (Math.random() - 0.5) * 0.8);
        Body.setVelocity(en.body, { x: 2 + Math.random() * 3, y: 0 });
        Body.setAngularVelocity(en.body, (Math.random() - 0.5) * 0.08);
        Composite.add(world, en.body);
        en.el.classList.add('is-live');
      }
    }

    /* ---------- drag with mouse / finger ---------- */
    let drag = null;
    const local = e => {
      const r = box.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    items.forEach(el => {
      el.addEventListener('pointerdown', e => {
        const en = entries.find(x => x.el === el);
        if (!en || !en.dropped) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const p = local(e);
        const b = en.body;
        // attach point in body-local coordinates (so it rotates naturally)
        const off = Vector.rotate(Vector.sub(p, b.position), -b.angle);
        const c = Constraint.create({
          pointA: { x: p.x, y: p.y },
          bodyB: b,
          pointB: Vector.rotate(off, b.angle),
          stiffness: 0.18,
          damping: 0.12,
          length: 0
        });
        Composite.add(world, c);
        drag = { en, c, id: e.pointerId };
        el.classList.add('is-dragging');
      });
      const move = e => {
        if (!drag || drag.id !== e.pointerId) return;
        const p = local(e);
        drag.c.pointA.x = Math.max(-20, Math.min(W + 20, p.x));
        drag.c.pointA.y = Math.max(-H, Math.min(H + 20, p.y));
      };
      const up = e => {
        if (!drag || drag.id !== e.pointerId) return;
        Composite.remove(world, drag.c);
        drag.en.el.classList.remove('is-dragging');
        drag = null;
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    });

    /* ---------- loop ---------- */
    const MAX_V = 38;
    let visible = false, running = false, last = 0, acc = 0;
    const STEP = 1000 / 120; // fixed sub-step for stable stacking

    function loop(now) {
      if (!visible) { running = false; return; }
      releaseDue(now);
      acc += Math.min(50, now - last);
      last = now;
      while (acc >= STEP) {
        Engine.update(engine, STEP);
        acc -= STEP;
      }
      for (const en of entries) {
        if (!en.dropped) continue;
        const b = en.body;
        // keep things sane: clamp crazy speeds and rescue escapees
        const v = b.velocity;
        const sp = Math.hypot(v.x, v.y);
        if (sp > MAX_V) Body.setVelocity(b, { x: (v.x / sp) * MAX_V, y: (v.y / sp) * MAX_V });
        if (b.position.y > H + 150 || b.position.x < -150 || b.position.x > W + 150) {
          Body.setPosition(b, { x: W / 2, y: -en.h });
          Body.setVelocity(b, { x: 0, y: 0 });
        }
        en.el.style.transform =
          `translate(${b.position.x - en.w / 2}px,${b.position.y - en.h / 2}px) rotate(${b.angle}rad)`;
      }
      requestAnimationFrame(loop);
    }
    function run() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }

    function reset() {
      buildWalls();
      createBodies();
      pour();
    }

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) {
        if (!started) { started = true; reset(); }
        run();
      }
    }, { threshold: 0.25 }).observe(box);

    $('#skills-reset').addEventListener('click', reset);

    // rebuild on real width changes (ignore mobile URL-bar height jitter)
    let lastW = box.clientWidth, rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (Math.abs(box.clientWidth - lastW) < 2) return;
        lastW = box.clientWidth;
        if (started) reset();
      }, 180);
    });
  }

  if (window.Matter) initSkills();
  else addEventListener('load', initSkills);
})();

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
   * HERO — wavy titanium strips that fill with deep blue
   * ========================================================= */
  (function hero() {
    /* Hero is split into wavy diagonal strips (like the reference sketch).
     * Resting state = the site's default dark background with faint seams.
     * Pointer/finger over a strip -> it fills with titanium (bottom->top gradient),
     * then a deep blue rises inside it, and everything slowly fades back. */
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
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      sample(t);
      ctx.clearRect(0, 0, W, H);

      if (pointer.active && pointer.touch && now - pointer.lastMove > 900) pointer.active = false;
      const hit = pointer.active ? stripAt(pointer.x, pointer.y, t) : -1;

      for (let i = 0; i < heat.length; i++) {
        // continuous rise while the pointer stays over the strip, slow return afterwards
        if (i === hit) heat[i] = Math.min(1, heat[i] + dt * 0.75);
        else heat[i] = Math.max(0, heat[i] - dt * 0.16);
        const h = heat[i];
        if (h <= 0.001) continue;

        const ti = smooth(0, 0.35, h);    // stage 1: titanium appears
        const bl = smooth(0.25, 1, h);    // stage 2: deep blue grows inside it

        ctx.save();
        stripPath(i);
        ctx.clip();

        // titanium — bottom to top gradient
        const g = ctx.createLinearGradient(0, H, 0, 0);
        g.addColorStop(0, `rgba(38,43,50,${ti})`);
        g.addColorStop(0.45, `rgba(118,126,136,${ti})`);
        g.addColorStop(0.8, `rgba(186,193,201,${ti})`);
        g.addColorStop(1, `rgba(226,230,234,${ti})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // brushed-metal streaks along the strip direction
        const mid = Math.floor(pts[i].length / 4) * 2;
        const cx = (pts[i][mid] + pts[i + 1][mid]) / 2;
        const sheen = ctx.createLinearGradient(cx - W / 12, 0, cx + W / 12, 0);
        sheen.addColorStop(0, 'rgba(0,0,0,0)');
        sheen.addColorStop(0.45, `rgba(255,255,255,${0.16 * ti})`);
        sheen.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, W, H);

        // deep blue rising from the bottom
        if (bl > 0.001) {
          const front = H - H * (0.15 + bl * 1.05);   // top edge of the blue
          const b = ctx.createLinearGradient(0, H, 0, front);
          b.addColorStop(0, `rgba(4,14,58,${0.96 * bl})`);
          b.addColorStop(0.55, `rgba(10,38,140,${0.9 * bl})`);
          b.addColorStop(0.85, `rgba(24,70,215,${0.55 * bl})`);
          b.addColorStop(1, 'rgba(24,70,215,0)');
          ctx.fillStyle = b;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
      }

      // seams — always visible faintly, brighter next to lit strips
      ctx.lineWidth = 1.2;
      for (let i = 0; i < pts.length; i++) {
        const lit = Math.max(heat[i - 1] || 0, heat[i] || 0);
        const a = pts[i];
        ctx.strokeStyle = `rgba(${Math.round(200 - lit * 60)},${Math.round(208 - lit * 30)},${Math.round(220 + lit * 35)},${0.1 + lit * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        for (let k = 2; k < a.length; k += 2) ctx.lineTo(a[k], a[k + 1]);
        ctx.stroke();
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

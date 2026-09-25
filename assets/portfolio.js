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
   * HERO — titanium arched columns that heat up to deep blue
   * ========================================================= */
  (function hero() {
    const section = $('.hero');
    const canvas = $('#hero-canvas');
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, cols = [];
    const pointer = { x: -9999, y: -9999, active: false, lastMove: 0 };

    // color stops (bottom -> top) for titanium and deep blue
    const TI = [[16, 18, 22], [58, 64, 72], [128, 136, 146], [196, 202, 208], [236, 239, 242]];
    const BL = [[2, 6, 30], [6, 26, 110], [18, 62, 220], [60, 120, 255], [150, 190, 255]];
    const STOPS = [0, 0.35, 0.68, 0.9, 1];
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    function build() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = section.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = W < 560 ? 44 : W < 1000 ? 56 : 68; // column width target
      const n = Math.max(7, Math.round(W / target));
      const gap = W < 560 ? 4 : 6;
      const cw = (W - gap * (n + 1)) / n;
      const old = cols;
      cols = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        // heights sweep up to the right and form a gentle arch overall
        const arch = Math.sin(Math.PI * (0.18 + t * 0.82));
        const base = W < 860 ? 0.42 : 0.34;
        const h = H * (base + 0.5 * (0.35 + 0.65 * t) * (0.55 + 0.45 * arch));
        cols.push({
          x: gap + i * (cw + gap),
          w: cw,
          h: Math.min(H - 40, h),
          heat: old[i] ? old[i].heat : 0,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function columnPath(c, top) {
      const r = c.w / 2;
      ctx.beginPath();
      ctx.moveTo(c.x, H);
      ctx.lineTo(c.x, top + r);
      ctx.arc(c.x + r, top + r, r, Math.PI, 0, false);
      ctx.lineTo(c.x + c.w, H);
      ctx.closePath();
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);

      // backdrop glow following average heat
      let avgHeat = 0;
      cols.forEach(c => (avgHeat += c.heat));
      avgHeat /= cols.length || 1;

      const t = now / 1000;
      for (const c of cols) {
        // ---- heat update (continuous rise while pointer passes, slow return) ----
        const cx = c.x + c.w / 2;
        const top = H - c.h;
        let influence = 0;
        if (pointer.active) {
          const dx = Math.abs(pointer.x - cx) / (c.w * 1.1);
          const overY = pointer.y > top - c.w * 0.6 ? 1 : 0.35;
          influence = Math.max(0, 1 - dx * dx) * overY;
        }
        if (influence > 0) {
          c.heat = Math.min(1, c.heat + influence * dt * 2.4); // ramps up continuously
        } else {
          c.heat = Math.max(0, c.heat - dt * 0.28); // slowly drifts back
        }
        const e = c.heat * c.heat * (3 - 2 * c.heat); // smoothstep for nicer color curve

        // ---- vertical gradient: bottom -> top ----
        const breathe = Math.sin(t * 0.6 + c.phase) * 4;
        const colTop = top + breathe;
        const g = ctx.createLinearGradient(0, H, 0, colTop);
        STOPS.forEach((s, i) => g.addColorStop(s, rgb(mix(TI[i], BL[i], e))));
        columnPath(c, colTop);
        ctx.fillStyle = g;
        if (e > 0.02) {
          ctx.shadowColor = `rgba(47,107,255,${0.55 * e})`;
          ctx.shadowBlur = 34 * e;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // ---- metallic cylinder shading (left-right) ----
        ctx.save();
        columnPath(c, colTop);
        ctx.clip();
        const s = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
        s.addColorStop(0, 'rgba(0,0,0,.55)');
        s.addColorStop(0.22, 'rgba(255,255,255,.10)');
        s.addColorStop(0.36, `rgba(255,255,255,${0.30 - e * 0.1})`);
        s.addColorStop(0.5, 'rgba(255,255,255,.04)');
        s.addColorStop(0.82, 'rgba(0,0,0,.28)');
        s.addColorStop(1, 'rgba(0,0,0,.6)');
        ctx.fillStyle = s;
        ctx.fillRect(c.x, colTop, c.w, c.h + 10);

        // soft blue light where the pointer is
        if (e > 0.01 && pointer.active) {
          const rg = ctx.createRadialGradient(cx, pointer.y, 0, cx, pointer.y, c.w * 2.2);
          rg.addColorStop(0, `rgba(120,170,255,${0.35 * e * (influence > 0 ? 1 : 0.4)})`);
          rg.addColorStop(1, 'rgba(120,170,255,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(c.x, colTop, c.w, c.h + 10);
        }
        // arch rim highlight
        ctx.strokeStyle = `rgba(255,255,255,${0.22 + e * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, colTop + c.w / 2, c.w / 2 - 0.5, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
        ctx.restore();

      }

      // floor reflection line
      const fl = ctx.createLinearGradient(0, 0, W, 0);
      fl.addColorStop(0, 'rgba(255,255,255,0)');
      fl.addColorStop(0.5, `rgba(${Math.round(150 - avgHeat * 90)},${Math.round(170 - avgHeat * 40)},255,.25)`);
      fl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fl;
      ctx.fillRect(0, H - 1, W, 1);

      // on touch, pointer "lifts" shortly after the finger stops moving
      if (pointer.active && pointer.touch && now - pointer.lastMove > 600) pointer.active = false;

      if (visible) requestAnimationFrame(frame);
      else running = false;
    }

    function setPointer(e) {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
      pointer.touch = e.pointerType === 'touch';
      pointer.lastMove = performance.now();
    }
    section.addEventListener('pointermove', setPointer, { passive: true });
    section.addEventListener('pointerdown', setPointer, { passive: true });
    // touch: keep tracking the finger even while the page scrolls
    const touch = e => {
      const t = e.touches[0];
      if (t) setPointer({ clientX: t.clientX, clientY: t.clientY, pointerType: 'touch' });
    };
    section.addEventListener('touchstart', touch, { passive: true });
    section.addEventListener('touchmove', touch, { passive: true });
    section.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') pointer.active = false; });


    let visible = true, running = false;
    const start = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }).observe(section);

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 120); });
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

/* Hero background */

(function () {
  if (!window.riipusReady || !window.gsap || !window.ScrollTrigger) return;

  const CONFIG = {
    rings: 5,
    ringGap: 0.17,
    ringScale: 0.62,
    spacing: 13,
    dust: 40,
    starDrift: 0.012,
    twist: 0.5,
    travel: 2.4,
    chillSpeed: 0.35,
    chillDrift: 0.015,
    mouseRadius: 140,
    mouseForce: 0.9,
    linkRadius: 170,
    glow: 0.08,
    color: '255, 250, 240'
  };

  const INTRO_VH = 250;
  const STAGES = {
    assemble: [0.0, 0.34],
    shock: [0.3, 0.5],
    tunnel: [0.42, 0.72],
    chill: [0.8, 1.4]
  };

  const canvas = document.querySelector('.hero-canvas');
  const logo = document.querySelector('.logo');
  const hero = document.querySelector('.hero');
  if (!canvas || !logo || !hero) return;
  const ctx = canvas.getContext('2d');

  const TAU = Math.PI * 2;
  const isSmall = () => window.innerWidth < 600;
  const lite = window.matchMedia('(pointer: coarse)').matches || isSmall();
  let W = 0, H = 0, dpr = 1;
  let parts = [], dust = [];
  let ringMean = 0, rings = CONFIG.rings;
  const pointer = { x: -9999, y: -9999, active: false };
  const intro = { p: 0 };
  let running = true;
  let progress = 0;
  let drift = 0, lastTime = 0;

  const clamp01 = x => Math.min(1, Math.max(0, x));
  const smooth = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const frac = x => ((x % 1) + 1) % 1;

  function hexPoint(u, r) {
    u = ((u % 6) + 6) % 6;
    const s = Math.floor(u);
    const f = u - s;
    const a1 = -Math.PI / 2 + s * Math.PI / 3;
    const a2 = a1 + Math.PI / 3;
    return {
      x: r * (Math.cos(a1) + (Math.cos(a2) - Math.cos(a1)) * f),
      y: r * (Math.sin(a1) + (Math.sin(a2) - Math.sin(a1)) * f)
    };
  }

  function build() {
    const size = logo.offsetWidth;
    rings = isSmall() ? CONFIG.rings - 1 : CONFIG.rings;
    ringMean = size * (CONFIG.ringScale + (rings - 1) / 2 * CONFIG.ringGap);
    const spread = Math.max(W, H);
    parts = [];
    for (let k = 0; k < rings; k++) {
      const radius = size * (CONFIG.ringScale + k * CONFIG.ringGap);
      const count = Math.max(24, Math.round(radius * 6 / (CONFIG.spacing + k * 3)));
      for (let i = 0; i < count; i++) {
        parts.push({
          ring: k,
          u: (i / count) * 6,
          radius,
          slot: (k + (i % 2) * 0.5 + Math.random() * 0.03) / rings,
          sx: (Math.random() * 2 - 1) * spread * 0.8,
          sy: (Math.random() * 2 - 1) * spread * 0.8,
          sz: Math.random(),
          delay: Math.random() * 0.55 + (k / rings) * 0.15,
          size: Math.random() * 1.2 + 0.6,
          twinkle: Math.random() * TAU,
          ox: 0, oy: 0, vx: 0, vy: 0,
          px: 0, py: 0, seen: false
        });
      }
    }
    dust = Array.from({ length: isSmall() ? CONFIG.dust / 2 : CONFIG.dust }, () => ({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 0.9 + 0.3,
      alpha: Math.random() * 0.15 + 0.04,
      twinkle: Math.random() * TAU
    }));
  }

  let glowCanvas = null, glowR = 0;
  function buildGlow() {
    glowR = logo.offsetWidth * 1.4;
    const px = Math.ceil(glowR * 2 * dpr);
    glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = px;
    const g = glowCanvas.getContext('2d');
    const img = g.createImageData(px, px);
    const data = img.data;
    const [r, gr, b] = CONFIG.color.split(',').map(Number);
    const half = px / 2;
    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const d = Math.hypot(x - half, y - half) / half;
        if (d >= 1) continue;
        const a = CONFIG.glow * Math.pow(1 - d * d, 2.2) * 255 + Math.random();
        const i = (y * px + x) * 4;
        data[i] = r; data[i + 1] = gr; data[i + 2] = b;
        data[i + 3] = Math.min(255, Math.floor(a));
      }
    }
    g.putImageData(img, 0, 0);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const d = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
    if (w === W && h === H && d === dpr && parts.length) return;
    const widthChanged = w !== W;
    W = w; H = h; dpr = d;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (widthChanged || !parts.length) {
      build();
      buildGlow();
    }
  }

  function hexPath(cx, cy, r, rot) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + rot + i * Math.PI / 3;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
  }

  function draw(time) {
    const t = time / 1000;
    const c = CONFIG.color;
    const cr = canvas.getBoundingClientRect();
    const lr = logo.getBoundingClientRect();
    const cx = lr.left + lr.width / 2 - cr.left;
    const cy = lr.top + lr.height / 2 - cr.top;
    const zoom = lr.width / (logo.offsetWidth || 1);
    const mx = pointer.x - cr.left;
    const my = pointer.y - cr.top;

    const P = progress;
    const tunnel = smooth(STAGES.tunnel[0], STAGES.tunnel[1], P);
    const shock = clamp01((P - STAGES.shock[0]) / (STAGES.shock[1] - STAGES.shock[0]));
    const flare = Math.sin(Math.PI * shock);
    const chill = smooth(STAGES.chill[0], STAGES.chill[1], P);
    const fadeOut = 1;
    const dt = Math.min(0.1, lastTime ? t - lastTime : 0);
    lastTime = t;
    drift += dt * CONFIG.chillDrift * chill;
    const fly = CONFIG.travel * (Math.min(P, 1) + Math.max(0, P - 1) * CONFIG.chillSpeed) + drift;
    const spinScroll = P * 1.4 + drift * 3;
    const twistAmt = CONFIG.twist * (1 + chill * 0.8);
    const round = chill;

    ctx.clearRect(0, 0, W, H);
    if (fadeOut <= 0) { parts.forEach(p => { p.seen = false; }); return; }

    if (glowCanvas) {
      const gr = glowR * zoom * (1 + flare * 0.25);
      ctx.globalAlpha = Math.min(1, fadeOut * intro.p * (0.6 + flare * 0.9) * (1 - tunnel * 0.7) * (1 - chill));
      ctx.drawImage(glowCanvas, cx - gr, cy - gr, gr * 2, gr * 2);
    }

    ctx.fillStyle = `rgb(${c})`;
    for (const d of dust) {
      ctx.globalAlpha = fadeOut * intro.p * d.alpha * (0.6 + Math.sin(t + d.twinkle) * 0.4);
      ctx.fillRect(d.x * W, d.y * H, d.size, d.size);
    }

    if (shock > 0 && shock < 1) {
      const r = ringMean * (0.9 + easeInOut(shock) * 1.8);
      ctx.strokeStyle = `rgb(${c})`;
      hexPath(cx, cy, r, spinScroll * 0.3);
      ctx.globalAlpha = fadeOut * flare * 0.18;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.globalAlpha = fadeOut * flare * 0.5;
      ctx.lineWidth = 1.5 + flare * 1.5;
      ctx.stroke();
    }

    if (tunnel > 0.01) {
      const frameCount = rings * 2;
      const frames = [];
      for (let j = 0; j < frameCount; j++) {
        const zT = 0.25 + frac(j / frameCount - fly) * 2.8;
        const s = 1 / (1 + (zT - 1) * tunnel);
        const near = clamp01((zT - 0.25) / 0.35);
        const far = clamp01((3.05 - zT) / 0.7);
        frames.push({
          zT, s,
          r: ringMean * s * (1 + flare * 0.06),
          rot: zT * twistAmt * tunnel + spinScroll,
          fade: Math.min(near, far)
        });
      }
      frames.sort((f1, f2) => f2.zT - f1.zT);
      ctx.strokeStyle = `rgb(${c})`;

      ctx.lineWidth = 0.7;
      ctx.globalAlpha = fadeOut * tunnel * 0.14 * (1 - chill);
      for (let k = 0; k < 6 && chill < 0.99; k++) {
        ctx.beginPath();
        frames.forEach((f, i) => {
          const ang = -Math.PI / 2 + f.rot + k * Math.PI / 3;
          const x = cx + Math.cos(ang) * f.r, y = cy + Math.sin(ang) * f.r;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
        ctx.stroke();
      }

      for (const f of frames) {
        if (f.fade <= 0.01) continue;
        const a = fadeOut * tunnel * f.fade * 0.32 * (1 - chill * 0.55);
        ctx.lineWidth = Math.min(2.5, 0.6 * Math.pow(f.s, 0.9));
        if (round < 0.99) {
          ctx.globalAlpha = a * (1 - round);
          hexPath(cx, cy, f.r, f.rot);
          ctx.stroke();
        }
        if (round > 0.01) {
          ctx.globalAlpha = a * round * 0.8;
          ctx.beginPath();
          ctx.arc(cx, cy, f.r * 0.93, 0, TAU);
          ctx.stroke();
        }
      }
    }

    const linkR2 = CONFIG.linkRadius * CONFIG.linkRadius;
    const pushR = CONFIG.mouseRadius;
    const [a0, a1] = STAGES.assemble;
    ctx.lineCap = 'round';

    for (const p of parts) {
      /* 1. Starfield position */
      const zz = 0.35 + frac(p.sz - t * CONFIG.starDrift - P * 0.5) * 2.65;
      const starX = cx + p.sx / zz;
      const starY = cy + p.sy / zz;
      const starNear = clamp01((zz - 0.35) / 0.35);
      const starS = Math.min(2.2, Math.pow(1 / zz, 0.8));

      /* 2. Ring / tunnel position */
      const dir = p.ring % 2 === 0 ? 1 : -1;
      const zT = 0.25 + frac(p.slot - fly) * 2.8;
      const z = 1 + (zT - 1) * tunnel;
      const s = 1 / z;
      const twist = zT * twistAmt * tunnel;
      const spin = (t * 0.04 * (1 + p.ring * 0.15) + spinScroll) * dir * (1 - tunnel)
                 + (twist + spinScroll) * tunnel;
      const u = p.u + spin * 6 / TAU;
      const breathe = 1 + Math.sin(t * 0.8 + p.ring) * 0.012;
      const baseR = p.radius + (ringMean - p.radius) * tunnel;
      const ringR = baseR * breathe * (1 + flare * 0.06);
      const hpHex = hexPoint(u, ringR);
      const ang = Math.atan2(hpHex.y, hpHex.x);
      const hp = {
        x: hpHex.x + (Math.cos(ang) * ringR * 0.93 - hpHex.x) * round,
        y: hpHex.y + (Math.sin(ang) * ringR * 0.93 - hpHex.y) * round
      };
      const ringX = cx + hp.x * s;
      const ringY = cy + hp.y * s;

      /* Star to ring */
      const start = a0 + p.delay * (a1 - a0) * 0.6;
      const a = easeInOut(clamp01((P - start) / ((a1 - a0) * 0.4)));
      const hx = starX + (ringX - starX) * a;
      const hy = starY + (ringY - starY) * a;

      const dx = hx + p.ox - mx;
      const dy = hy + p.oy - my;
      const dist = Math.hypot(dx, dy);
      if (pointer.active && dist < pushR && dist > 0.01) {
        const f = (1 - dist / pushR) * CONFIG.mouseForce;
        p.vx += (dx / dist) * f * 4;
        p.vy += (dy / dist) * f * 4;
      }
      p.vx = (p.vx - p.ox * 0.04) * 0.86;
      p.vy = (p.vy - p.oy * 0.04) * 0.86;
      p.ox += p.vx;
      p.oy += p.vy;
      const x = hx + p.ox;
      const y = hy + p.oy;

      /* Brightness and size */
      const twinkle = 0.65 + Math.sin(t * 2 + p.twinkle) * 0.35;
      const starAlpha = 0.75 * starNear;
      const ringFade = 1 - (p.ring / (rings + 0.5)) * (1 - tunnel);
      const near = clamp01((zT - 0.25) / 0.35);
      const far = clamp01((3.05 - zT) / 0.7);
      const depthFade = 1 + (Math.min(near, far) - 1) * tunnel;
      const ringAlpha = ringFade * depthFade * (1 + flare * 0.6) * (1 - chill * 0.35);
      const alpha = Math.min(1, fadeOut * intro.p * twinkle * (starAlpha + (ringAlpha - starAlpha) * a));
      const size = p.size * (starS + (Math.min(3, Math.pow(s, 0.7)) - starS) * a);

      const prevX = p.px, prevY = p.py, hadPrev = p.seen;
      p.px = x; p.py = y; p.seen = true;

      if (alpha <= 0.01 || x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;

      if (pointer.active && linkR2 > 0) {
        const lx = x - mx, ly = y - my;
        const d2 = lx * lx + ly * ly;
        if (d2 < linkR2) {
          ctx.globalAlpha = (1 - d2 / linkR2) * 0.25 * fadeOut;
          ctx.strokeStyle = `rgb(${c})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = alpha;
      const moved = hadPrev ? Math.hypot(x - prevX, y - prevY) : 0;
      if (moved > 2 && moved < 160) {
        const tail = lite ? 0.9 : 1.8;
        const tx = x - (x - prevX) * tail, ty = y - (y - prevY) * tail;
        if (lite) {
          ctx.globalAlpha = alpha * 0.45;
          ctx.strokeStyle = `rgb(${c})`;
        } else {
          const grad = ctx.createLinearGradient(tx, ty, x, y);
          grad.addColorStop(0, `rgba(${c}, 0)`);
          grad.addColorStop(1, `rgba(${c}, 1)`);
          ctx.strokeStyle = grad;
        }
        ctx.lineWidth = Math.max(0.6, size * 0.9);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgb(${c})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    if (running) draw(time);
    requestAnimationFrame(loop);
  }

  /* Pointer */
  window.addEventListener('mousemove', e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  });
  document.addEventListener('mouseleave', () => { pointer.active = false; });

  const onTouch = e => {
    const tch = e.touches[0];
    if (!tch) return;
    pointer.x = tch.clientX;
    pointer.y = tch.clientY;
    pointer.active = true;
  };
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('touchend', () => { pointer.active = false; }, { passive: true });
  window.addEventListener('touchcancel', () => { pointer.active = false; }, { passive: true });

  /* Scroll progress */
  const totalVh = (window.riipusJourney && window.riipusJourney.total) || 700;
  const toProgress = self => self.progress * totalVh / INTRO_VH;
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: self => { progress = toProgress(self); },
    onRefresh: self => { progress = toProgress(self); }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      running = entries[0].isIntersecting;
      if (!running) parts.forEach(p => { p.seen = false; });
    }).observe(hero);
  }

  gsap.to(intro, { p: 1, duration: 2.2, delay: 0.2, ease: 'power2.out' });

  window.addEventListener('resize', resize);
  if (!logo.complete) logo.addEventListener('load', () => { W = 0; resize(); });
  resize();
  requestAnimationFrame(loop);
})();

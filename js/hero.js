/* =========================================================
   Riipus – phase 2: animated hero background
   ---------------------------------------------------------
   - Hexagon rings of particles around the logo (echoing its shape),
     slowly rotating and breathing.
   - Particles fly in from scattered positions on load.
   - The mouse pushes particles away; they spring back.
     Faint lines link the cursor to nearby particles.
   - Drifting dust in the background.
   - Fades out as you scroll past the hero and stops drawing
     when it's not visible.
   Settings are in CONFIG below.
   ========================================================= */

(function () {
  if (!window.riipusReady || !window.gsap) return;

  const CONFIG = {
    rings: 4,            // number of hexagon rings
    ringGap: 0.2,        // space between rings (relative to logo size)
    ringScale: 0.62,     // size of the innermost ring (relative to logo width)
    spacing: 13,         // px between particles along a ring
    dust: 70,            // background dust particles
    mouseRadius: 140,    // px around the cursor that pushes particles
    mouseForce: 0.9,
    linkRadius: 170,     // px: lines from cursor to particles within this
    glow: 0.08,          // strength of the glow behind the logo (0 = off)
    color: '255, 250, 240' // floralwhite as r, g, b
  };

  const canvas = document.querySelector('.hero-canvas');
  const logo = document.querySelector('.logo');
  if (!canvas || !logo) return;
  const ctx = canvas.getContext('2d');

  const isSmall = () => window.innerWidth < 600;
  let W = 0, H = 0, dpr = 1;
  let halo = [], dust = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const intro = { p: 0 };
  let running = true;

  /* Point on a pointy-top hexagon; u runs 0..6 around the perimeter */
  function hexPoint(u, r) {
    const s = Math.floor(u) % 6;
    const f = u - Math.floor(u);
    const a1 = -Math.PI / 2 + s * Math.PI / 3;
    const a2 = a1 + Math.PI / 3;
    return {
      x: r * (Math.cos(a1) + (Math.cos(a2) - Math.cos(a1)) * f),
      y: r * (Math.sin(a1) + (Math.sin(a2) - Math.sin(a1)) * f)
    };
  }

  function logoBox() {
    const r = logo.getBoundingClientRect();
    // offsetWidth ignores the intro's scale animation, so ring sizes stay stable
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: logo.offsetWidth };
  }

  function build() {
    const { size } = logoBox();
    const rings = isSmall() ? CONFIG.rings - 1 : CONFIG.rings;
    halo = [];
    for (let k = 0; k < rings; k++) {
      const radius = size * (CONFIG.ringScale + k * CONFIG.ringGap);
      const perimeter = radius * 6;
      const count = Math.max(24, Math.round(perimeter / (CONFIG.spacing + k * 3)));
      for (let i = 0; i < count; i++) {
        halo.push({
          ring: k,
          u: (i / count) * 6,
          radius,
          ox: 0, oy: 0, vx: 0, vy: 0,          // mouse offset + velocity
          sx: (Math.random() - 0.5) * W * 1.4, // intro start offset
          sy: (Math.random() - 0.5) * H * 1.4,
          size: Math.random() * 1.2 + 0.6,
          twinkle: Math.random() * Math.PI * 2,
          x: 0, y: 0
        });
      }
    }
    const dustCount = isSmall() ? Math.round(CONFIG.dust / 2) : CONFIG.dust;
    dust = Array.from({ length: dustCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vy: -(Math.random() * 0.25 + 0.05),
      vx: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 1.1 + 0.3,
      alpha: Math.random() * 0.35 + 0.08
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = document.documentElement.clientWidth; // excludes the scrollbar
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    buildGlow();
  }

  /* Glow behind the logo, pre-rendered once with dithering.
     A plain gradient this faint shows visible rings ("banding")
     because the screen only has a few shades between the background
     and the glow. Adding a tiny random offset to each pixel hides them. */
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
        const d = Math.hypot(x - half, y - half) / half; // 0 centre .. 1 edge
        if (d >= 1) continue;
        const fall = Math.pow(1 - d * d, 2.2);           // smooth, soft edge
        const a = CONFIG.glow * fall * 255 + Math.random(); // dithered
        const i = (y * px + x) * 4;
        data[i] = r;
        data[i + 1] = gr;
        data[i + 2] = b;
        data[i + 3] = Math.min(255, Math.floor(a));
      }
    }
    g.putImageData(img, 0, 0);
  }

  function draw(time) {
    const t = time / 1000;
    const { cx, cy, size } = logoBox();
    const c = CONFIG.color;
    ctx.clearRect(0, 0, W, H);

    // Soft glow behind the logo
    if (glowCanvas) {
      ctx.globalAlpha = intro.p;
      ctx.drawImage(glowCanvas, cx - glowR, cy - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 1;
    }

    // Dust
    for (const d of dust) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
      if (d.x < -5) d.x = W + 5;
      if (d.x > W + 5) d.x = -5;
      ctx.fillStyle = `rgba(${c}, ${d.alpha})`;
      ctx.fillRect(d.x, d.y, d.size, d.size);
    }

    // Halo particles
    const ease = intro.p;
    const linkR2 = CONFIG.linkRadius * CONFIG.linkRadius;
    const pushR = CONFIG.mouseRadius;
    ctx.lineWidth = 0.6;

    for (const p of halo) {
      const dir = p.ring % 2 === 0 ? 1 : -1;
      const spin = t * 0.04 * dir * (1 + p.ring * 0.15);
      const breathe = 1 + Math.sin(t * 0.8 + p.ring) * 0.015;
      const u = ((p.u + spin * 6 / (Math.PI * 2)) % 6 + 6) % 6;
      const hp = hexPoint(u, p.radius * breathe);

      // Home position, blended in from scattered start during the intro
      const hx = cx + hp.x + p.sx * (1 - ease);
      const hy = cy + hp.y + p.sy * (1 - ease);

      // Mouse push with spring back
      const dx = hx + p.ox - mouse.x;
      const dy = hy + p.oy - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (mouse.active && dist < pushR && dist > 0.01) {
        const f = (1 - dist / pushR) * CONFIG.mouseForce;
        p.vx += (dx / dist) * f * 4;
        p.vy += (dy / dist) * f * 4;
      }
      p.vx += -p.ox * 0.04;
      p.vy += -p.oy * 0.04;
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.ox += p.vx;
      p.oy += p.vy;

      p.x = hx + p.ox;
      p.y = hy + p.oy;

      const ringFade = 1 - p.ring / (CONFIG.rings + 0.5);
      const twinkle = 0.65 + Math.sin(t * 2 + p.twinkle) * 0.35;
      const alpha = ringFade * twinkle * (0.25 + 0.75 * ease);

      // Line to cursor
      if (mouse.active) {
        const mx = p.x - mouse.x, my = p.y - mouse.y;
        const d2 = mx * mx + my * my;
        if (d2 < linkR2) {
          ctx.strokeStyle = `rgba(${c}, ${(1 - d2 / linkR2) * 0.25})`;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = `rgba(${c}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(time) {
    if (running) draw(time);
    requestAnimationFrame(loop);
  }

  /* ---------- Events ---------- */
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  document.addEventListener('mouseleave', () => {
    mouse.active = false;
    mouse.x = mouse.y = -9999;
  });

  // Fly-in, timed with the logo intro
  gsap.to(intro, { p: 1, duration: 2.4, delay: 0.3, ease: 'power3.out' });

  // Fade out while scrolling past the hero; stop drawing once hidden
  gsap.to(canvas, {
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.container1',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onLeave: () => { running = false; },
      onEnterBack: () => { running = true; }
    }
  });

  // Rebuild once the logo image has its final size
  if (logo.complete) resize();
  else logo.addEventListener('load', resize);
  resize();
  requestAnimationFrame(loop);
})();

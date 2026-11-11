/* Main */

(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    root.classList.remove('js');
    return;
  }
  window.riipusReady = true;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Journey timing */
  const TOTAL = 860;
  const SCENES = [
    { el: '.scene-title#games',  in: 150, out: 200, title: true },
    { el: '.scene-game', nth: 0, in: 225, out: 300 },
    { el: '.scene-game', nth: 1, in: 325, out: 400 },
    { el: '.scene-title#team',   in: 430, out: 480, title: true },
    { el: '.scene-team',         in: 505, out: 580 },
    { el: '.scene-title#social', in: 610, out: 660, title: true },
    { el: '.scene-social',       in: 685, out: 760 },
    { el: '.scene-footer',       in: 790 }
  ];
  const LOGO_GONE = 155;
  const STOPS = { top: 0, games: 262, team: 542, social: 722 };
  const SECTION_START = { games: 150, team: 430, social: 610 };
  window.riipusJourney = { total: TOTAL };

  const hero = document.querySelector('.hero');

  /* Smooth scrolling (Lenis) */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* Scroll progress bar */
  gsap.to('.scroll-progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
  });

  /* Load intro */
  const logoText = document.querySelector('.logo-text');
  let chars = [];
  let uline = null;
  if (logoText) {
    const text = logoText.textContent;
    logoText.setAttribute('aria-label', text);
    logoText.textContent = '';
    const rnd = (a, b) => a + Math.random() * (b - a);
    chars = [...text].map(ch => {
      const glyph = ch === ' ' ? ' ' : ch;
      const span = document.createElement('span');
      span.className = 'char';
      span.setAttribute('aria-hidden', 'true');
      const sizer = document.createElement('span');
      sizer.className = 'char-sizer';
      sizer.textContent = glyph;
      span.appendChild(sizer);
      if (ch !== ' ') {
        const l1 = rnd(28, 45), r1 = rnd(28, 45), l2 = rnd(55, 72), r2 = rnd(55, 72);
        [
          `polygon(-30% -30%, 130% -30%, 130% ${r1}%, -30% ${l1}%)`,
          `polygon(-30% ${l1}%, 130% ${r1}%, 130% ${r2}%, -30% ${l2}%)`,
          `polygon(-30% ${l2}%, 130% ${r2}%, 130% 130%, -30% 130%)`
        ].forEach(clip => {
          const shard = document.createElement('span');
          shard.className = 'char-shard';
          shard.textContent = glyph;
          shard.style.clipPath = clip;
          span.appendChild(shard);
        });
      }
      logoText.appendChild(span);
      return span;
    });
    uline = document.createElement('span');
    uline.className = 'logo-uline';
    uline.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 14; i++) uline.appendChild(document.createElement('span'));
    logoText.appendChild(uline);
  }

  gsap.timeline({ delay: 0.2 })
    .from('.logo', {
      opacity: 0,
      scale: 0.85,
      filter: 'blur(14px)',
      duration: 1.4,
      ease: 'power3.out'
    })
    .from(chars, {
      yPercent: 110,
      opacity: 0,
      duration: 0.9,
      stagger: 0.035,
      ease: 'power4.out'
    }, '-=0.8')
    .set(logoText, { overflow: 'visible' })
    .fromTo(uline, { scaleX: 0, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 1.6, ease: 'power2.out' }, '-=0.3');

  /* Fit scenes to short screens */
  const fitScenes = () => {
    const availH = window.innerHeight - 120;
    const availW = document.documentElement.clientWidth * 0.94;
    document.querySelectorAll('.scene-inner').forEach(el => {
      const fit = Math.min(1, availH / el.offsetHeight, availW / el.offsetWidth);
      el.style.setProperty('--fit', fit.toFixed(3));
    });
  };
  fitScenes();
  window.addEventListener('resize', fitScenes);
  window.addEventListener('load', fitScenes);

  /* Journey */
  const nav = document.querySelector('.site-nav');
  const navLinks = nav ? [...nav.querySelectorAll('.nav-links a')] : [];
  const sceneEls = SCENES.map(sc => ({ ...sc, node: document.querySelectorAll(sc.el)[sc.nth || 0] }))
    .filter(sc => sc.node);

  /* Title scramble */
  const GLYPHS_FIRST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const GLYPHS_REST = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const setGlyph = (c, g) => { if (c.glyph !== g) { c.glyph = g; c.nodes.forEach(n => { n.textContent = g; }); } };
  const scramblers = sceneEls.filter(sc => sc.title).map(sc => {
    const el = sc.node.querySelector('.title-text');
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const rnd = (a, b) => a + Math.random() * (b - a);
    const chars = [...text].map(ch => {
      const span = document.createElement('span');
      span.className = 'char';
      span.setAttribute('aria-hidden', 'true');
      const sizer = document.createElement('span');
      sizer.className = 'char-sizer';
      span.appendChild(sizer);
      const rows = [[-30, -30], [rnd(26, 42), rnd(26, 42)], [rnd(58, 74), rnd(58, 74)], [130, 130]];
      const xc = rnd(35, 65);
      const yAt = (row, x) => row[0] + (row[1] - row[0]) * (x + 30) / 160;
      const shards = [];
      for (let r = 0; r < 3; r++) {
        const top = rows[r], bot = rows[r + 1];
        [[-30, xc], [xc, 130]].forEach(([x0, x1]) => {
          const shard = document.createElement('span');
          shard.className = 'char-shard';
          shard.style.clipPath = `polygon(${x0}% ${yAt(top, x0)}%, ${x1}% ${yAt(top, x1)}%, ` +
            `${x1}% ${yAt(bot, x1)}%, ${x0}% ${yAt(bot, x0)}%)`;
          span.appendChild(shard);
          shards.push(shard);
        });
      }
      el.appendChild(span);
      const c = { span, nodes: [sizer, ...shards], shards, final: ch, resolved: true };
      setGlyph(c, ch);
      return c;
    });
    return { sc, el, chars, active: false };
  });

  const lockWidths = () => scramblers.forEach(s => s.chars.forEach(c => {
    const shown = c.glyph;
    c.span.style.width = '';
    setGlyph(c, c.final);
    c.finalW = c.span.offsetWidth;
    c.span.style.width = c.finalW + 'px';
    setGlyph(c, shown);
  }));
  const measureCtx = document.createElement('canvas').getContext('2d');
  const centreTitles = () => scramblers.forEach(s => {
    const el = s.sc.node.querySelector('.title-text');
    const cs = getComputedStyle(el);
    measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const word = s.chars.map(c => c.final).join('');
    const m = measureCtx.measureText(word);
    if (!m.fontBoundingBoxAscent) return;
    const lineH = el.offsetHeight;
    const baseline = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    const inkMidY = baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    const inkMidX = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - m.width / 2;
    el.style.translate = `${(-inkMidX).toFixed(2)}px ${(lineH / 2 - inkMidY).toFixed(2)}px`;
  });

  const buildPools = () => scramblers.forEach(s => {
    const el = s.sc.node.querySelector('.title-text');
    const cs = getComputedStyle(el);
    measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    s.chars.forEach((c, i) => {
      c.pool = [...(i === 0 ? GLYPHS_FIRST : GLYPHS_REST)];
      c.widths = {};
      c.pool.forEach(g => { c.widths[g] = measureCtx.measureText(g).width; });
    });
  });

  const setupTitles = () => { lockWidths(); centreTitles(); buildPools(); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(setupTitles);
  window.addEventListener('resize', setupTitles);

  const updateScramble = S => scramblers.forEach(s => {
    const n = s.chars.length;
    const inP = clamp01((S - s.sc.in) / 40);
    s.active = inP > 0 && S < s.sc.out;
    s.chars.forEach((c, i) => {
      const f = n > 1 ? i / (n - 1) : 0;
      const locked = inP >= 0.25 + 0.6 * f;
      c.resolved = locked;
      if (locked && c.glyph !== c.final) {
        setGlyph(c, c.final);
        if (c.finalW) c.span.style.width = c.finalW + 'px';
      }
    });
  });

  let lastSwap = 0;
  gsap.ticker.add(time => {
    if (time - lastSwap < 0.06) return;
    lastSwap = time;
    scramblers.forEach(s => {
      if (!s.active) return;
      s.chars.forEach(c => {
        if (c.resolved || !c.pool) return;
        const g = c.pool[Math.floor(Math.random() * c.pool.length)];
        setGlyph(c, g);
        c.span.style.width = c.widths[g] + 'px';
      });
    });
  });

  const onJourney = self => {
    const S = self.progress * TOTAL;
    updateScramble(S);

    if (nav) {
      nav.classList.toggle('is-scrolled', S > LOGO_GONE - 15);
      let active = null;
      Object.keys(SECTION_START).forEach(k => { if (S >= SECTION_START[k]) active = k; });
      navLinks.forEach(a => a.classList.toggle('is-active', a.hash === '#' + active));
    }
  };

  const layoutKey = () => `${window.innerWidth}x${window.innerHeight}x${document.documentElement.scrollHeight}`;
  let savedLayout = '', stableProgress = 0;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: self => {
        if (layoutKey() === savedLayout) stableProgress = self.progress;
        onJourney(self);
      },
      onRefresh: onJourney,
      invalidateOnRefresh: true
    }
  });
  const journeyST = tl.scrollTrigger;

  let firstRefresh = true;
  ScrollTrigger.addEventListener('refresh', () => {
    const p = firstRefresh ? journeyST.progress : stableProgress;
    firstRefresh = false;
    savedLayout = layoutKey();
    stableProgress = p;
    const y = journeyST.start + (journeyST.end - journeyST.start) * p;
    if (Math.abs(window.scrollY - y) > 1) {
      if (lenis) lenis.resize();
      window.scrollTo(0, y);
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    }
    tl.progress(0, true).progress(p, true);
  });

  const logoGroup = document.querySelector('.logo-group');
  const logoImg = document.querySelector('.logo');
  const sceneEl = document.querySelector('.scene');
  const logoCentreInGroup = () => logoImg.offsetTop + logoImg.offsetHeight / 2;
  const setLogoOrigin = () => { logoGroup.style.transformOrigin = `50% ${logoCentreInGroup()}px`; };
  const logoShift = () => {
    const stageH = logoGroup.offsetParent ? logoGroup.offsetParent.clientHeight : window.innerHeight;
    const cs = sceneEl ? getComputedStyle(sceneEl) : null;
    const padT = cs ? parseFloat(cs.paddingTop) : 0;
    const padB = cs ? parseFloat(cs.paddingBottom) : 0;
    const sceneCentre = (stageH + padT - padB) / 2;
    return sceneCentre - (logoGroup.offsetTop + logoCentreInGroup());
  };
  setLogoOrigin();
  ScrollTrigger.addEventListener('refreshInit', setLogoOrigin);
  if ('ResizeObserver' in window) {
    let lastSize = '';
    let refreshTimer = null;
    new ResizeObserver(() => {
      const size = logoGroup.offsetWidth + 'x' + logoGroup.offsetHeight;
      if (size === lastSize) return;
      lastSize = size;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 100);
    }).observe(logoGroup);
  }
  if (!logoImg.complete) logoImg.addEventListener('load', () => ScrollTrigger.refresh());

  tl.to('.down-wrapper-top', { opacity: 0, duration: 12 }, 0)
    .to('.logo-group', { y: () => logoShift(), duration: 110, ease: 'power1.inOut' }, 0)
    .to('.logo-group', { scale: 1.15, duration: 85, ease: 'power1.inOut' }, 0)
    .to('.logo-group', { scale: 1.25, duration: 25, ease: 'power2.out' }, 85)
    .to('.logo-group', { scale: 3, autoAlpha: 0, duration: 45, ease: 'power2.in' }, 110);

  /* Title shatter */
  const pieces = logoText ? [...logoText.querySelectorAll('.char-shard, .logo-uline span')] : [];
  const posInGroup = el => {
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el;
    while (n && n !== logoGroup) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y };
  };
  const logoCentre = () => ({ x: logoImg.offsetLeft + logoImg.offsetWidth / 2, y: logoCentreInGroup() });
  const SHATTER = { from: 4, spread: 50, dur: 45 };
  const flying = pieces.map(el => {
    const start = SHATTER.from + Math.random() * SHATTER.spread;
    const dur = SHATTER.dur * (0.8 + Math.random() * 0.4);
    const spin = (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 400);
    const side = Math.random() < 0.5 ? -1 : 1;
    const toCentre = () => {
      const p = posInGroup(el), c = logoCentre();
      return { dx: c.x - p.x, dy: c.y - p.y };
    };
    tl.to(el, {
      keyframes: [
        {
          x: () => { const v = toCentre(); return -v.dx * 0.12 - v.dy * 0.3 * side; },
          y: () => { const v = toCentre(); return -v.dy * 0.12 + v.dx * 0.3 * side - 12; },
          rotation: spin * 0.3, scale: 1.08, duration: dur * 0.35, ease: 'power1.out'
        },
        {
          x: () => toCentre().dx, y: () => toCentre().dy,
          rotation: spin, scale: 0.05, opacity: 0, duration: dur * 0.65, ease: 'power2.in'
        }
      ]
    }, start);
    const ang = Math.random() * Math.PI * 2;
    return { el, start, dur, vx: Math.cos(ang), vy: Math.sin(ang), phase: Math.random() * 10 };
  });

  const TITLE_SHATTER = { spread: 18, dur: 30 };
  const titleFlying = [];
  const posIn = (el, ancestor) => {
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el;
    while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y };
  };

  sceneEls.forEach(sc => {
    tl.fromTo(sc.node,
      { autoAlpha: 0, scale: 0.5 },
      { autoAlpha: 1, scale: 1, duration: 40, ease: 'power2.out', immediateRender: false }, sc.in);
    if (sc.out === undefined) return;

    const scr = sc.title && scramblers.find(s => s.sc === sc);
    if (!scr) {
      tl.to(sc.node, { autoAlpha: 0, scale: 1.8, duration: 35, ease: 'power2.in' }, sc.out);
      return;
    }

    const { spread, dur } = TITLE_SHATTER;
    const word = scr.el;
    scr.chars.forEach(c => c.shards.forEach(el => {
      const start = sc.out + Math.random() * spread;
      const d = dur * (0.75 + Math.random() * 0.5);
      const spin = (Math.random() < 0.5 ? -1 : 1) * (250 + Math.random() * 400);
      const side = Math.random() < 0.5 ? -1 : 1;
      const jx = (Math.random() - 0.5) * 60, jy = (Math.random() - 0.5) * 60;
      const toCentre = () => {
        const pp = posIn(el, word);
        return { dx: word.offsetWidth / 2 - pp.x, dy: word.offsetHeight / 2 - pp.y };
      };
      tl.to(el, {
        keyframes: [
          {
            x: () => { const v = toCentre(); return -v.dx * 0.25 - v.dy * 0.6 * side + jx; },
            y: () => { const v = toCentre(); return -v.dy * 0.25 + v.dx * 0.6 * side + jy; },
            rotation: spin * 0.3, scale: 1.1, duration: d * 0.35, ease: 'power1.out'
          },
          {
            x: () => toCentre().dx, y: () => toCentre().dy,
            rotation: spin, scale: 0.05, opacity: 0, duration: d * 0.65, ease: 'power2.in'
          }
        ]
      }, start);
      const ang = Math.random() * Math.PI * 2;
      titleFlying.push({ el, start, dur: d, vx: Math.cos(ang), vy: Math.sin(ang), phase: Math.random() * 10 });
    }));
    tl.to(sc.node, { scale: 1.15, duration: spread + dur * 1.25, ease: 'none' }, sc.out)
      .set(sc.node, { autoAlpha: 0 }, sc.out + spread + dur * 1.25);
  });

  tl.set({}, {}, TOTAL);

  const allFlying = flying.concat(titleFlying);
  let smoothVel = 0, shaking = false;
  gsap.ticker.add(time => {
    const S = journeyST.progress * TOTAL;
    smoothVel += (journeyST.getVelocity() - smoothVel) * 0.15;
    const amount = Math.min(1, Math.abs(smoothVel) / 2500);
    if (amount < 0.01) {
      if (shaking) { allFlying.forEach(p => { p.el.style.translate = ''; }); shaking = false; }
      return;
    }
    shaking = true;
    allFlying.forEach(p => {
      const pp = (S - p.start) / p.dur;
      if (pp <= 0 || pp >= 1) { if (p.el.style.translate) p.el.style.translate = ''; return; }
      const a = amount * 28 * Math.min(1, pp * 4) * (1 - pp);
      const j = Math.sin(time * 30 + p.phase) * 0.35;
      p.el.style.translate = `${((p.vx + j) * a).toFixed(1)}px ${((p.vy - j) * a).toFixed(1)}px`;
    });
  });

  /* Scroll to */
  const scrollToStop = (S, duration = 1.6) => {
    const y = journeyST.start + (journeyST.end - journeyST.start) * (S / TOTAL);
    if (lenis) lenis.scrollTo(y, { duration });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    const key = a.getAttribute('href').slice(1);
    if (!(key in STOPS)) return;
    a.addEventListener('click', e => {
      e.preventDefault();
      const current = journeyST.progress * TOTAL;
      const duration = Math.min(4, 1.2 + Math.abs(STOPS[key] - current) / 200);
      scrollToStop(STOPS[key], duration);
    });
  });

  const heroArrow = document.querySelector('.down-wrapper-top .down-arrow');
  if (heroArrow) {
    const go = () => scrollToStop(STOPS.games, 3);
    heroArrow.setAttribute('role', 'button');
    heroArrow.setAttribute('tabindex', '0');
    heroArrow.setAttribute('aria-label', 'Scroll to games');
    heroArrow.addEventListener('click', go);
    heroArrow.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  }

  /* Nav */
  if (nav) gsap.from(nav, { opacity: 0, y: -15, duration: 1, delay: 1.4, ease: 'power3.out' });

  /* Game covers */
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('.gamecover').forEach(img => {
    const tilt = document.createElement('div');
    tilt.className = 'tilt';
    img.parentNode.insertBefore(tilt, img);
    tilt.appendChild(img);

    if (!canHover) return;
    const opts = { duration: 0.6, ease: 'power3.out' };
    const rotX = gsap.quickTo(tilt, 'rotationX', opts);
    const rotY = gsap.quickTo(tilt, 'rotationY', opts);
    const scale = gsap.quickTo(tilt, 'scale', opts);

    tilt.addEventListener('pointermove', e => {
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rotY((px - 0.5) * 14);
      rotX((0.5 - py) * 10);
      scale(1.03);
    });
    tilt.addEventListener('pointerleave', () => {
      rotX(0);
      rotY(0);
      scale(1);
    });
  });

  /* Reveals */
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    const type = el.dataset.reveal;
    const trigger = {
      trigger: el,
      start: 'top 88%',
      end: 'bottom 8%',
      toggleActions: 'restart reset restart reset'
    };
    if (type === 'stagger') {
      gsap.timeline({ scrollTrigger: trigger })
        .fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
        .from(el.children, { opacity: 0, y: 20, scale: 0.6, duration: 0.6, stagger: 0.07, ease: 'back.out(2)' }, '-=0.4');
      return;
    }
    if (type === 'clip') {
      const img = el.querySelector('img');
      const t = gsap.timeline({ scrollTrigger: trigger })
        .set(el, { opacity: 1 })
        .fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.inOut' });
      if (img) t.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
      return;
    }
    const froms = {
      scale: { opacity: 0, y: 70, scale: 0.92 },
      left: { opacity: 0, x: -80 },
      right: { opacity: 0, x: 80 }
    };
    gsap.fromTo(el, froms[type] || { opacity: 0, y: 40 }, {
      opacity: 1, x: 0, y: 0, scale: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: trigger
    });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

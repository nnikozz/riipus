/* =========================================================
   Riipus – phase 1: smooth scroll, intro and scroll reveals
   ---------------------------------------------------------
   Tags you can put on any element in index.html:
     data-reveal            fade + slide up when scrolled into view
     data-reveal="scale"    fade + slide up + grow slightly (images)
     data-reveal="stagger"  element fades in, then its children pop in one by one
     data-reveal="clip"     wipes open from the bottom, image inside zooms out
     data-reveal="left"     slides in from the left (or "right")
   Section titles (.title-text) play their typing + underline effect
   when they scroll into view.
   ========================================================= */

(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Libraries missing or user prefers less motion → show the plain site.
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    root.classList.remove('js');
    return;
  }
  window.riipusReady = true;

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scrolling (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // target: an element, or 0 for the very top. Offset leaves room for the nav.
  const scrollToEl = el => {
    if (el === null || el === undefined) return;
    const offset = el === 0 ? 0 : -90;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
    else if (el === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });
  };

  /* ---------- Scroll progress bar ---------- */
  gsap.to('.scroll-progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
  });

  /* ---------- Hero intro ---------- */
  const logoText = document.querySelector('.logo-text');
  let chars = [];
  if (logoText) {
    const text = logoText.textContent;
    logoText.setAttribute('aria-label', text);
    logoText.textContent = '';
    chars = [...text].map(ch => {
      const span = document.createElement('span');
      span.className = 'char';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch === ' ' ? ' ' : ch;
      logoText.appendChild(span);
      return span;
    });
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
    .add(() => logoText && logoText.classList.add('is-in'), '-=0.3');

  // Hero drifts up and fades as you scroll away from it
  gsap.to('.logo-group', {
    y: -120,
    opacity: 0.1,
    ease: 'none',
    scrollTrigger: {
      trigger: '.container1',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });

  gsap.to('.down-wrapper-top', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.container1',
      start: 'top top',
      end: '30% top',
      scrub: true
    }
  });

  /* ---------- Section titles: typing + underline on scroll ---------- */
  gsap.utils.toArray('.title-text').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => el.classList.add('is-in')
    });
  });

  /* ---------- Generic reveals ---------- */
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    const type = el.dataset.reveal;
    const trigger = { trigger: el, start: 'top 88%', once: true };

    if (type === 'stagger') {
      gsap.timeline({ scrollTrigger: trigger })
        .fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
        .from(el.children, {
          opacity: 0,
          y: 20,
          scale: 0.6,
          duration: 0.6,
          stagger: 0.07,
          ease: 'back.out(2)'
        }, '-=0.4');
      return;
    }

    if (type === 'clip') {
      const img = el.querySelector('img');
      const tl = gsap.timeline({ scrollTrigger: trigger })
        .set(el, { opacity: 1 })
        .fromTo(el,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.inOut' });
      if (img) tl.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
      return;
    }

    const froms = {
      scale: { opacity: 0, y: 70, scale: 0.92 },
      left: { opacity: 0, x: -80 },
      right: { opacity: 0, x: 80 }
    };
    const from = froms[type] || { opacity: 0, y: 40 };

    gsap.fromTo(el, from, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: trigger
    });
  });

  /* ---------- Down arrows scroll to the next section ---------- */
  document.querySelectorAll('.down-arrow').forEach(arrow => {
    const wrapper = arrow.parentElement;
    const target = wrapper.classList.contains('down-wrapper-top')
      ? wrapper.parentElement.nextElementSibling
      : wrapper.nextElementSibling;

    arrow.setAttribute('role', 'button');
    arrow.setAttribute('tabindex', '0');
    arrow.setAttribute('aria-label', 'Scroll to next section');
    arrow.addEventListener('click', () => scrollToEl(target));
    arrow.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToEl(target);
      }
    });
  });

  /* =========================================================
     Phase 3 – section effects and sticky nav
     ========================================================= */

  /* ---------- Game covers: 3D tilt on hover, parallax on scroll ---------- */
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.querySelectorAll('.gamecover').forEach(img => {
    // Wrap the image so the tilt doesn't fight the reveal animation on the wrapper
    const tilt = document.createElement('div');
    tilt.className = 'tilt';
    img.parentNode.insertBefore(tilt, img);
    tilt.appendChild(img);

    // Cover drifts slightly slower than the page
    gsap.fromTo(tilt, { y: 40 }, {
      y: -40,
      ease: 'none',
      scrollTrigger: { trigger: tilt.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
    });

    if (!canHover) return;
    const opts = { duration: 0.6, ease: 'power3.out' };
    const rotX = gsap.quickTo(tilt, 'rotationX', opts);
    const rotY = gsap.quickTo(tilt, 'rotationY', opts);
    const scale = gsap.quickTo(tilt, 'scale', opts);

    tilt.addEventListener('pointermove', e => {
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1 across
      const py = (e.clientY - r.top) / r.height;   // 0..1 down
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

  /* ---------- Nav: always there, bar appears on scroll ---------- */
  const nav = document.querySelector('.site-nav');
  if (nav) {
    // Nav fades in with the intro; its background bar appears after the hero title
    gsap.from(nav, { opacity: 0, y: -15, duration: 1, delay: 1.4, ease: 'power3.out' });
    ScrollTrigger.create({
      trigger: '.text-wrapper',
      start: 'top 80px', // as the title reaches the nav
      onEnter: () => nav.classList.add('is-scrolled'),
      onLeaveBack: () => nav.classList.remove('is-scrolled')
    });

    // Highlight the link for the section you're in: the last section whose
    // top has passed the middle of the screen. At the very bottom of the page
    // the last link wins, so Social lights up even though it's close to Team.
    const navItems = [...nav.querySelectorAll('.nav-links a')]
      .map(link => ({ link, el: document.querySelector(`[data-section="${link.hash.slice(1)}"]`) }))
      .filter(item => item.el);

    const updateActive = () => {
      const line = window.innerHeight * 0.55;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let current = null;
      navItems.forEach(item => {
        if (item.el.getBoundingClientRect().top <= line) current = item;
      });
      if (atBottom && navItems.length) current = navItems[navItems.length - 1];
      navItems.forEach(item => item.link.classList.toggle('is-active', item === current));
    };

    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: updateActive, onRefresh: updateActive });
  }

  // Any in-page link (#games, #top…) scrolls smoothly
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      const target = hash === '#top' ? 0 : document.querySelector(hash);
      if (target === null) return;
      e.preventDefault();
      scrollToEl(target);
    });
  });

  // Recalculate positions once images have loaded
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

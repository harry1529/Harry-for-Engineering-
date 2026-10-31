/* =====================================================
   js/animations.js — your smooth-scroll design
   (GSAP + ScrollTrigger + Lenis), adapted for the site.

   It exposes window.MHAnim so app.js can ask for
   scrolling, page transitions and scroll-locking without
   knowing which library is running underneath.
   If the libraries fail to load, or the visitor prefers
   reduced motion, the site still works with plain scrolling.
   ===================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasLibs = window.gsap && window.ScrollTrigger && window.Lenis;

  // Safe fallbacks (used when animation is off)
  var api = {
    refresh: function () {},
    toTop: function () { window.scrollTo(0, 0); },
    scrollTo: function (sel) {
      var el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    },
    pageIn: function () {},
    lock: function (on) { document.body.style.overflow = on ? 'hidden' : ''; }
  };
  window.MHAnim = api;

  if (reduce || !hasLibs) return;

  gsap.registerPlugin(ScrollTrigger);

  // 1. LENIS SMOOTH SCROLL
  var lenis = new Lenis({
    duration: 1.2,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // 2. HERO ENTRANCE (on inner wrappers so it never fights the scroll effect)
  gsap.from('.hero-inner', { opacity: 0, y: 100, scale: 0.9, duration: 1.5, ease: 'power4.out' });
  gsap.from('.orb', { opacity: 0, scale: 0.3, duration: 2, ease: 'power3.out' });

  // 3. FLOATING ORB
  gsap.to('.orb', {
    y: -50, x: 35, rotation: 25, duration: 4,
    repeat: -1, yoyo: true, ease: 'sine.inOut'
  });

  // 4. HERO PARALLAX ON SCROLL
  gsap.to('.hero-content', {
    y: -180, opacity: 0, scale: 0.8,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
  });
  gsap.to('.orb-wrap', {
    y: 250, scale: 1.7, opacity: 0,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
  });

  // 5. REVEAL ON SCROLL
  gsap.utils.toArray('#home-view .reveal').forEach(function (el) {
    gsap.from(el, {
      y: 70, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
  });

  // 6. CARD STAGGER
  gsap.from('#home-view .card', {
    y: 100, opacity: 0, stagger: 0.2, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '.cards', start: 'top 80%' }
  });

  // 7. ZOOM TEXT ON SCROLL
  gsap.fromTo('.zoom-text',
    { scale: 0.5, opacity: 0 },
    {
      scale: 1, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '.immersive', start: 'top 80%', end: 'center center', scrub: 1 }
    }
  );

  // ---------- helpers for app.js ----------
  api.refresh = function () { ScrollTrigger.refresh(); };
  api.toTop = function () { lenis.scrollTo(0, { immediate: true }); };
  api.scrollTo = function (sel) { lenis.scrollTo(sel, { offset: -10, duration: 1.4 }); };
  api.lock = function (on) { if (on) lenis.stop(); else lenis.start(); };
  api.pageIn = function (el) {
    gsap.fromTo(el, { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'opacity,transform' });
  };
})();

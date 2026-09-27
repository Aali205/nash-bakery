// NASH — interactions & scroll choreography
import { AR, EN, MENU, CAT_LABEL, ICONS } from './i18n.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Language — applied before anything is split or measured            */
/* ------------------------------------------------------------------ */
let lang = 'en';
try { lang = localStorage.getItem('nash-lang') || 'en'; } catch {}
const isAR = lang === 'ar';
if (isAR) {
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
  $$('[data-i18n]').forEach((el) => {
    const v = AR[el.dataset.i18n];
    if (v) el.innerHTML = v;
  });
  $('[data-lang-toggle]').textContent = 'EN';
}
$('[data-lang-toggle]').addEventListener('click', () => {
  try { localStorage.setItem('nash-lang', isAR ? 'en' : 'ar'); } catch {}
  window.scrollTo(0, 0);
  location.reload();
});
const t = (key) => (isAR ? AR[key] : EN[key]);

/* ------------------------------------------------------------------ */
/* Open / closed — Damascus time                                      */
/* ------------------------------------------------------------------ */
function updateStatus() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Damascus' }).format(new Date()));
  const open = h >= 10 && h < 24;
  $$('[data-status]').forEach((s) => {
    s.classList.toggle('is-closed', !open);
    $('[data-status-text]', s).textContent = t(open ? 'open' : 'closed');
  });
}
updateStatus();
setInterval(updateStatus, 60_000);
$('[data-year]').textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Menu cards                                                          */
/* ------------------------------------------------------------------ */
const grid = $('[data-menu-grid]');
function renderMenu(cat) {
  const items = MENU.filter((m) => cat === 'all' || m.cat === cat);
  grid.innerHTML = items.map((m) => {
    const [name, desc] = isAR ? m.ar : m.en;
    const tag = m.tag ? `<span class="mcard__tag">${isAR ? m.tag[1] : m.tag[0]}</span>` : '';
    return `<article class="mcard${m.feat ? ' mcard--feat' : ''}">
      <span class="mcard__icon">${ICONS[m.cat]}</span>
      <span class="mcard__cat">${CAT_LABEL[m.cat][isAR ? 1 : 0]}</span>
      <div><h4>${name}</h4><p>${desc}</p>${tag}</div>
    </article>`;
  }).join('');
  $$('.mcard', grid).forEach(tilt);
}
renderMenu('all');

function tilt(card) {
  if (matchMedia('(hover: none)').matches) return;
  const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 16);
    rx(-((e.clientY - r.top) / r.height - 0.5) * 16);
  });
  card.addEventListener('pointerleave', () => { rx(0); ry(0); });
}

const pill = $('.tabs__pill');
function movePill(tab, instant) {
  gsap.to(pill, {
    x: tab.offsetLeft, y: tab.offsetTop, width: tab.offsetWidth, height: tab.offsetHeight,
    duration: instant ? 0 : 0.6, ease: 'expo.out',
  });
}
$$('.tab').forEach((tab) => tab.addEventListener('click', () => {
  if (tab.classList.contains('is-active')) return;
  $$('.tab').forEach((x) => x.classList.toggle('is-active', x === tab));
  movePill(tab);
  gsap.to('.mcard', {
    y: 30, opacity: 0, duration: 0.3, stagger: 0.02, ease: 'power2.in',
    onComplete: () => {
      renderMenu(tab.dataset.tab);
      gsap.from('.mcard', { y: 60, opacity: 0, rotationX: -25, duration: 0.8, stagger: 0.06, ease: 'expo.out' });
      ScrollTrigger.refresh();
    },
  });
}));
addEventListener('resize', () => movePill($('.tab.is-active'), true));

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
let lenis = null;
if (!reduced && Lenis) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4) });
  else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  e.preventDefault();
  document.body.classList.remove('menu-open');
  scrollToTarget(id === '#top' ? 0 : id);
}));
$('[data-to-top]').addEventListener('click', () => scrollToTarget(0));
$('[data-burger]').addEventListener('click', () => document.body.classList.toggle('menu-open'));

/* ------------------------------------------------------------------ */
/* Nav                                                                  */
/* ------------------------------------------------------------------ */
const nav = $('.nav');
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate(self) {
    const y = self.scroll();
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
    lastY = y;
  },
});
const cursor = $('.cursor');
['.damascene', '.bake', '.midnight'].forEach((sel) => ScrollTrigger.create({
  trigger: sel, start: 'top 60px', end: 'bottom 60px',
  onToggle: (s) => { nav.classList.toggle('is-dark', s.isActive); cursor.classList.toggle('is-light', s.isActive); },
}));

/* ------------------------------------------------------------------ */
/* Cursor + magnetic buttons                                           */
/* ------------------------------------------------------------------ */
if (matchMedia('(hover: hover)').matches) {
  const dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const hov = e.target.closest('a, button, .mcard');
    cursor.classList.toggle('is-label', !!lab);
    cursor.classList.toggle('is-hover', !lab && !!hov);
    if (lab) label.textContent = lab.dataset.cursor;
  });

  $$('.magnetic').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, .4)' });
    const my = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, .4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.35);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* ------------------------------------------------------------------ */
/* 3D espresso scene                                                    */
/* ------------------------------------------------------------------ */
let scene = null;
const sceneReady = import('./scene.js')
  .then(({ createScene }) => { scene = createScene($('.webgl')); })
  .catch((err) => { console.warn('WebGL scene disabled:', err); $('.webgl').remove(); });

/* ------------------------------------------------------------------ */
/* Preloader                                                            */
/* ------------------------------------------------------------------ */
function waitForAssets(onProgress) {
  const imgs = $$('img').filter((i) => !i.complete);
  const total = imgs.length + 2;
  let done = 0;
  const tick = () => onProgress(++done / total);
  imgs.forEach((i) => { i.loading = 'eager'; i.addEventListener('load', tick, { once: true }); i.addEventListener('error', tick, { once: true }); });
  return Promise.all([
    ...imgs.map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })),
    document.fonts.ready.then(tick),
    sceneReady.then(tick),
  ]);
}

// Act I — an espresso machine powers up, the portafilter locks in and a shot
//         pours into a NASH cup while assets load (display + gauge = progress).
// Act II — shot done: steam rises, the machine drops away, N·A·S·H crash in,
//          text decodes, beans explode.
// Act III — an iris opens from the centre and the 3D cup drops into the hero.
const loader = $('.loader');
const loaderState = { p: 0, real: 0 };
const lcd = $('.machine__lcd'), needle = $('.machine__needle'), liquid = $('.machine__liquid');
const drawLoader = () => {
  const p = loaderState.p;
  lcd.textContent = String(Math.round(p * 100)).padStart(3, '0');
  gsap.set(needle, { rotation: -120 + p * 215 + (p > 0 && p < 1 ? Math.sin(performance.now() / 90) * 2 : 0), svgOrigin: '98 78' });
  liquid.setAttribute('rx', (28 * Math.min(1, p * 1.15)).toFixed(2));
  liquid.setAttribute('ry', (5.5 * Math.min(1, p * 1.15)).toFixed(2));
  liquid.setAttribute('cy', (240 - p * 8).toFixed(2));
};

// Gauge ticks
const tickGroup = $('.machine__ticks');
for (let i = 0; i <= 10; i++) {
  const a = (-120 + i * 24) * Math.PI / 180;
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const r1 = i % 5 ? 19 : 17;
  l.setAttribute('x1', 98 + Math.sin(a) * r1); l.setAttribute('y1', 78 - Math.cos(a) * r1);
  l.setAttribute('x2', 98 + Math.sin(a) * 22); l.setAttribute('y2', 78 - Math.cos(a) * 22);
  tickGroup.appendChild(l);
}

gsap.set('.slice', { yPercent: -160, opacity: 0 });
gsap.set('.loader__note', { opacity: 0 });
gsap.set('.machine', { y: 120, opacity: 0, scale: 0.85 });
gsap.set('.machine__pf', { x: 70, y: 18, rotation: 28, opacity: 0, svgOrigin: '150 168' });
gsap.set('.machine__stream', { scaleY: 0, transformOrigin: '50% 0%' });

let pouring = false;
const actOne = gsap.timeline()
  .to('.loader__grid', { opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out', startAt: { opacity: 0, scale: 1.3 } })
  .to('.machine', { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'back.out(1.6)' }, 0.1)
  .add(() => $('.machine__led').classList.add('is-on'), 0.8)
  // portafilter slides in, then twists to lock
  .to('.machine__pf', { x: 0, y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 0.9)
  .to('.machine__pf', { rotation: 0, duration: 0.35, ease: 'back.out(3)' }, 1.4)
  .to('.machine', { keyframes: [{ x: -3 }, { x: 3 }, { x: -1 }, { x: 0 }], duration: 0.2 }, 1.7)
  .to('.loader__note', { opacity: 0.6, duration: 0.6 }, 1.5)
  // the pour begins
  .to('.machine__stream', { scaleY: 1, duration: 0.6, ease: 'power2.in', stagger: 0.08 }, 1.9)
  .add(() => { pouring = true; }, 2.1);

// Display progress glides towards real progress while the shot pulls
const progressTick = () => {
  if (!pouring) return drawLoader();
  const goal = Math.min(0.92, 0.2 + loaderState.real * 0.72);
  loaderState.p += (goal - loaderState.p) * 0.03;
  drawLoader();
};
gsap.ticker.add(progressTick);

function scramble(el, delay = 0) {
  const final = el.dataset.scramble;
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+';
  const o = { t: 0 };
  return gsap.to(o, {
    t: 1, duration: 1.1, delay, ease: 'power1.inOut',
    onUpdate: () => {
      const n = Math.floor(o.t * final.length);
      el.textContent = final.slice(0, n) + [...final.slice(n)].map((c) => (c === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0])).join('');
    },
  });
}

function beanBurst(count) {
  const wrap = $('.loader__beans');
  const beans = Array.from({ length: count }, () => {
    const b = document.createElement('i');
    b.className = 'bean';
    wrap.appendChild(b);
    return b;
  });
  const R = Math.max(innerWidth, innerHeight);
  return gsap.fromTo(beans, { x: 0, y: 0, scale: 0, rotation: 0 }, {
    x: () => Math.cos(Math.random() * 6.28) * R * (0.25 + Math.random() * 0.6),
    y: () => Math.sin(Math.random() * 6.28) * R * (0.25 + Math.random() * 0.5),
    rotation: () => gsap.utils.random(-540, 540),
    scale: () => gsap.utils.random(0.5, 1.6),
    duration: 1.8, ease: 'expo.out', stagger: 0.004,
  });
}

$('[data-skip]').addEventListener('click', () => gsap.globalTimeline.timeScale(6));

Promise.all([
  waitForAssets((p) => { loaderState.real = Math.max(loaderState.real, p); }),
  new Promise((r) => setTimeout(r, 3400)),
]).then(() => {
  gsap.ticker.remove(progressTick);
  actOne.progress(1);
  pouring = true;
  const iris = { r: 0 };
  const R = Math.hypot(innerWidth, innerHeight) / 2 + 40;
  const tl = gsap.timeline({ onComplete: startSite });

  // Finish the shot
  tl.to(loaderState, { p: 1, duration: 0.8, ease: 'power3.inOut', onUpdate: drawLoader })
    .to('.machine__stream', { scaleY: 0, transformOrigin: '50% 100%', duration: 0.45, ease: 'expo.in', stagger: 0.06 }, '-=0.15')
    .add(() => $('.machine__led').classList.remove('is-on'))
    .to(needle, { rotation: -120, svgOrigin: '98 78', duration: 0.6, ease: 'bounce.out' }, '<')
    // steam curls up from the cup
    .to('.machine__steam path', { strokeDashoffset: 0, opacity: 0.8, duration: 0.8, ease: 'power2.out', stagger: 0.15 }, '<')
    .to('.machine__steam path', { y: -14, opacity: 0, duration: 0.8, ease: 'power1.in', stagger: 0.15 }, '>-0.1')
    // machine jumps, then drops away
    .to('.machine', { y: -18, scale: 1.04, duration: 0.25, ease: 'power2.out' }, '-=0.7')
    .to('.machine', { y: innerHeight, rotation: -8, scale: 0.8, duration: 0.7, ease: 'back.in(1.8)' }, '>')
    .to('.loader__note', { y: 40, opacity: 0, duration: 0.4, ease: 'power2.in' }, '<')
    .to('.loader__grid', { scale: 0.85, opacity: 0.4, duration: 1.2, ease: 'expo.out' }, '<')
    // N · A · S · H crash in
    .addLabel('word', '-=0.75')
    .to('.slice', {
      yPercent: 0, opacity: 1, duration: 1.05, ease: 'bounce.out',
      rotation: 0, stagger: { each: 0.11, from: isAR ? 'end' : 'start' },
      startAt: { rotation: (i) => [-18, 12, -10, 16][i] },
    }, 'word')
    .add(() => beanBurst(innerWidth < 760 ? 40 : 80), 'word+=0.55')
    .fromTo('.loader__stage', { x: 0 }, { keyframes: [{ x: -8, y: 5 }, { x: 7, y: -4 }, { x: -4, y: 2 }, { x: 0, y: 0 }], duration: 0.3, ease: 'none' }, 'word+=0.55')
    .add(() => { $$('[data-scramble]').forEach((el, i) => scramble(el, i * 0.25)); }, 'word+=0.6')
    // Hold… then iris open
    .to({}, { duration: 1.1 })
    .addLabel('out')
    .to('.slice', { yPercent: -120, rotation: (i) => [-8, 6, -6, 9][i], opacity: 0, duration: 0.8, ease: 'expo.in', stagger: 0.06 }, 'out')
    .to(['.loader__est', '.loader__sub'], { opacity: 0, letterSpacing: '1em', duration: 0.7, ease: 'expo.in' }, 'out')
    .add(() => gsap.to('.loader__beans .bean', { scale: 0, rotation: '+=180', duration: 0.9, ease: 'power3.in', stagger: 0.004 }), 'out')
    .to(iris, {
      r: R, duration: 1.5, ease: 'expo.inOut',
      onUpdate: () => loader.style.setProperty('--r', iris.r + 'px'),
    }, 'out+=0.5')
    .add(() => { gsap.globalTimeline.timeScale(1); intro(); }, 'out+=0.75');
});

function startSite() {
  loader.remove();
  gsap.globalTimeline.timeScale(1);
  document.body.classList.remove('is-loading');
  lenis?.start();
  ScrollTrigger.refresh();
}

/* ------------------------------------------------------------------ */
/* Hero intro                                                           */
/* ------------------------------------------------------------------ */
const heroSplit = SplitText.create('.hero__title', { type: 'lines', mask: 'lines', linesClass: 'line' });
gsap.set(heroSplit.lines, { yPercent: 110 });
gsap.set('.hero__word', { yPercent: 40, opacity: 0, scale: 0.94 });
gsap.set(['.hero__meta .mono', '.hero__lead', '.hero__btns .btn', '.hero__scroll', '.nav > *'], { opacity: 0, y: 20 });

function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('.hero__word', { yPercent: 0, opacity: 1, scale: 1, duration: 1.8 })
    .to(heroSplit.lines, { yPercent: 0, duration: 1.4, stagger: 0.12 }, 0.3)
    .to(['.nav > *', '.hero__meta .mono'], { opacity: 1, y: 0, duration: 1.2, stagger: 0.06 }, 0.4)
    .to(['.hero__lead', '.hero__btns .btn', '.hero__scroll'], { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.7);
  if (scene) {
    const s = scene.state;
    Object.assign(s, { y: 2.6, rotY: -4, rotZ: 0.5, scale: 0.6, spread: 0 });
    tl.to(s, { y: -0.2, rotY: 0.5, rotZ: 0, scale: 1, duration: 2.2, ease: 'expo.out' }, 0.1)
      .to(s, { spread: 1, duration: 2.6, ease: 'expo.out' }, 0.35);
  }
  setupScroll();
}

/* ------------------------------------------------------------------ */
/* Scroll choreography                                                  */
/* ------------------------------------------------------------------ */
function setupScroll() {
  const mm = gsap.matchMedia();

  // Hero wordmark drifts back as you leave
  gsap.to('.hero__word', {
    yPercent: -35, scale: 0.85, opacity: 0.25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  if (scene) {
    const s = scene.state;
    // Hero → Espresso: the cup turns to face you and the camera lowers
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 } })
      .to(s, { rotY: Math.PI * 2, camY: 1.35, scale: 1.2, y: -0.05, spread: 1.5, beanY: 0.4, ease: 'none' });

    mm.add('(min-width: 861px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.espresso', start: 'top top', end: '+=140%', pin: true, scrub: 1 },
      });
      tl.from('.espresso__copy > *', { opacity: 0, y: 60, stagger: 0.1, duration: 0.3 })
        .from('.callout', { opacity: 0, x: isAR ? -80 : 80, stagger: 0.25, duration: 0.4 }, 0.15)
        .to(s, { rotY: Math.PI * 2 + 0.6, rotX: 0.22, camY: 1.9, scale: 1.3, steam: 1.4, duration: 1, ease: 'none' }, 0)
        .to({}, { duration: 0.3 });
    });
    mm.add('(max-width: 860px)', () => {
      gsap.from('.espresso__copy > *, .callout', {
        opacity: 0, y: 40, stagger: 0.1, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: '.espresso', start: 'top 70%' },
      });
    });

    // Cup lifts away as the page covers it; pause rendering once hidden
    gsap.timeline({
      scrollTrigger: {
        trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: 1,
        onLeave: () => scene.pause(), onEnterBack: () => scene.play(),
      },
    }).to(s, { y: 2.2, spread: 2.6, rotZ: -0.3, ease: 'none' });
  }

  // Generic line-reveal headings
  $$('.split').forEach((el) => {
    if (el.classList.contains('hero__title')) return;
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 110, duration: 1.3, stagger: 0.1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      }),
    });
  });

  // Eyebrows
  $$('.eyebrow').forEach((el) => gsap.from(el, {
    opacity: 0, x: isAR ? 30 : -30, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' },
  }));

  // Marquee, reacting to scroll velocity
  const track = $('.marquee__track');
  track.innerHTML += track.innerHTML;
  const loop = gsap.to(track, { xPercent: isAR ? 50 : -50, duration: 30, ease: 'none', repeat: -1 });
  if (lenis) {
    lenis.on('scroll', ({ velocity }) => {
      const v = gsap.utils.clamp(-6, 6, velocity * 0.12);
      gsap.to(loop, { timeScale: v === 0 ? 1 : v + Math.sign(v), duration: 0.2, overwrite: true });
      gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.25 });
    });
  }

  // Story image
  gsap.to('.reveal-img', {
    clipPath: 'inset(0% 0 0 0 round 24px)', duration: 1.6, ease: 'expo.inOut',
    scrollTrigger: { trigger: '.story', start: 'top 70%' },
  });
  gsap.fromTo('.reveal-img img', { scale: 1.3, yPercent: -10 }, {
    scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Word-by-word highlight
  const words = SplitText.create('.scrub-words', { type: 'words', wordsClass: 'w' });
  gsap.to(words.words, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.scrub-words', start: 'top 80%', end: 'bottom 45%', scrub: true },
  });

  // Counters
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count), suffix = el.dataset.suffix || '';
    const o = { v: el.hasAttribute('data-plain') ? end - 60 : 0 };
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'expo.out',
      onUpdate: () => { el.textContent = Math.round(o.v) + suffix; },
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // Damascene — the frame opens to full bleed
  mm.add({ desk: '(min-width: 861px)', mob: '(max-width: 860px)' }, (ctx) => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.damascene', start: 'top top', end: '+=180%', pin: '.damascene__pin', scrub: 1 },
    });
    tl.to('.damascene__frame', { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power2.inOut' })
      .to('.damascene__frame img', { scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
      .to('.damascene__shade', { opacity: 1, duration: 0.5 }, 0.5)
      .to('.damascene__text', { opacity: 1, y: 0, duration: 0.5 }, 0.9)
      .fromTo('.ingredients li', { opacity: 0, x: ctx.conditions.desk ? (isAR ? -60 : 60) : 0, y: ctx.conditions.mob ? 30 : 0 }, { opacity: 1, x: 0, y: 0, stagger: 0.15, duration: 0.4 }, 1)
      .to({}, { duration: 0.4 });
  });
  petals();

  // Signatures — horizontal scroll on desktop
  mm.add('(min-width: 861px)', () => {
    const trk = $('.signatures__track');
    const dist = () => trk.scrollWidth - innerWidth;
    const move = gsap.to(trk, {
      x: () => (isAR ? dist() : -dist()), ease: 'none',
      scrollTrigger: { trigger: '.signatures', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    $$('.sig__img img').forEach((img) => gsap.fromTo(img, { xPercent: isAR ? 12 : -12 }, {
      xPercent: isAR ? -12 : 12, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
    }));
    gsap.from('.matcha-stack figure', {
      rotation: 0, x: (i) => (1 - i) * 120, y: 40, stagger: 0.08, ease: 'expo.out', duration: 1.4,
      scrollTrigger: { trigger: '.sig--matcha', containerAnimation: move, start: 'left 80%' },
    });
  });
  mm.add('(max-width: 860px)', () => {
    $$('.sig').forEach((el) => gsap.from(el, { opacity: 0, y: 60, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }));
  });

  cakeScene();

  // Menu
  movePill($('.tab.is-active'), true);
  gsap.from('.tabs', { opacity: 0, y: 30, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.tabs', start: 'top 90%' } });
  ScrollTrigger.batch('.mcard', {
    start: 'top 92%', once: true,
    onEnter: (els) => gsap.from(els, { y: 80, opacity: 0, rotationX: -30, duration: 1.1, stagger: 0.07, ease: 'expo.out' }),
  });

  // Midnight — stars and a clock that ticks to 12
  const stars = $('.stars');
  for (let i = 0; i < 90; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${Math.random() * 3}s;opacity:${0.3 + Math.random() * 0.7};transform:scale(${0.5 + Math.random() * 1.2})`;
    stars.appendChild(s);
  }
  const ticks = $('.clock__ticks');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 100 + Math.sin(a) * 78); l.setAttribute('y1', 100 - Math.cos(a) * 78);
    l.setAttribute('x2', 100 + Math.sin(a) * (i % 3 ? 84 : 88)); l.setAttribute('y2', 100 - Math.cos(a) * (i % 3 ? 84 : 88));
    ticks.appendChild(l);
  }
  const clockTl = gsap.timeline({ scrollTrigger: { trigger: '.midnight', start: 'top bottom', end: 'center center', scrub: 1 } });
  clockTl.fromTo('.clock__h', { rotation: 270 }, { rotation: 360, ease: 'none' }, 0)
    .fromTo('.clock__m', { rotation: 0 }, { rotation: 1080, ease: 'none' }, 0)
    .fromTo('.stars', { yPercent: 20 }, { yPercent: 0, ease: 'none' }, 0);
  gsap.from('.midnight .body', { opacity: 0, y: 30, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.midnight .body', start: 'top 90%' } });

  // Order + visit cards
  gsap.from('.order__card', { y: 80, opacity: 0, stagger: 0.12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.order__btns', start: 'top 90%' } });
  gsap.from('.vcard', { y: 80, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.visit__grid', start: 'top 88%' } });

  // Footer wordmark rises
  gsap.fromTo('.footer__word img', { yPercent: 100 }, {
    yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });

  ScrollTrigger.refresh();
}

/* ------------------------------------------------------------------ */
/* Falling Damascene rose petals (2D canvas)                            */
/* ------------------------------------------------------------------ */
function petals() {
  const c = $('.petals');
  const ctx = c.getContext('2d');
  const colors = ['#b64a6d', '#c95f82', '#8f3553', '#d98aa4', '#9fb068'];
  let w, h, dpr, active = false;
  const list = [];
  function size() {
    dpr = Math.min(devicePixelRatio, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener('resize', size);
  const count = innerWidth < 760 ? 26 : 55;
  for (let i = 0; i < count; i++) {
    list.push({
      x: Math.random() * w, y: Math.random() * h, r: 4 + Math.random() * 8,
      vx: -0.3 + Math.random() * 0.6, vy: 0.4 + Math.random() * 1.1,
      rot: Math.random() * 6.28, vr: -0.03 + Math.random() * 0.06,
      flip: Math.random() * 6.28, vf: 0.02 + Math.random() * 0.05,
      c: colors[(Math.random() * colors.length) | 0],
    });
  }
  function draw() {
    if (!active) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of list) {
      p.x += p.vx + Math.sin(p.flip) * 0.6; p.y += p.vy; p.rot += p.vr; p.flip += p.vf;
      if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(Math.cos(p.flip), 1);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r, -p.r, p.r * 0.9, p.r * 0.6, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.9, p.r * 0.6, -p.r, -p.r, 0, -p.r);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  ScrollTrigger.create({
    trigger: '.damascene', start: 'top bottom', end: 'bottom top',
    onToggle: (s) => { active = s.isActive && !reduced; if (active) { size(); draw(); } },
  });
}

/* ------------------------------------------------------------------ */
/* English cake — scroll-scrubbed oven scene                           */
/* preheat → rise & crack → DING → door opens → out onto the board →   */
/* unmold → chocolate pour + drips → pistachio & rose on top           */
/* ------------------------------------------------------------------ */
function cakeScene() {
  const root = $('.bake');
  if (!root) return;
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    parent.appendChild(n);
    return n;
  };

  // Final cake placement on the board (root SVG units)
  const OUT = { x: 300, y: 356, s: 1.7 };
  const glazeTopY = OUT.y - 50 * OUT.s;

  // Chocolate drips down the front of the loaf
  const drips = [[-86, 30], [-58, 18], [-30, 44], [-2, 24], [26, 38], [54, 16], [82, 34]].map(([x, len]) => ({
    rect: el('rect', { x: x - 4, y: -14, width: 8, height: 0, rx: 4, fill: '#3a1d10' }, q('.drips')),
    drop: el('circle', { cx: x, cy: -14, r: 0, fill: '#3a1d10' }, q('.drips')),
    len,
  }));

  // Pistachio & rose petal toppings resting on the glaze
  const toppingInner = [];
  for (let i = 0; i < 18; i++) {
    const x = -84 + (168 / 17) * i + gsap.utils.random(-4, 4);
    const y = -52 + 34 * (x / 98) ** 2 + gsap.utils.random(-3, 2);
    const g = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, q('.toppings'));
    const inner = el('g', {}, g);
    if (i % 3 === 2) el('ellipse', { rx: 5.5, ry: 2.8, fill: i % 2 ? '#b64a6d' : '#d06a8c', transform: `rotate(${gsap.utils.random(-50, 50) | 0})` }, inner);
    else el('polygon', { points: '-4,-2 3,-4 5,1 -1,4', fill: i % 2 ? '#9fb068' : '#7d9a45', transform: `rotate(${gsap.utils.random(0, 360) | 0})` }, inner);
    toppingInner.push(inner);
  }

  const steps = qa('.bake__step'), dots = qa('.bake__dots i');
  const temp = q('.oven-temp'), time = q('.oven-time');
  const stream = q('.choc-stream'), clip = q('.glaze-clip');

  gsap.set(steps, { opacity: 0, y: 20 });
  gsap.set(steps[0], { opacity: 1, y: 0 });
  gsap.set(dots[0], { backgroundColor: '#c68b4e', width: 44 });
  gsap.set('.cake-pos', { x: 300, y: 300 });
  gsap.set('.cake-scale', { scale: 0.85, svgOrigin: '0 0' });
  gsap.set('.cake-rise', { scaleY: 0.6, svgOrigin: '0 58' });
  gsap.set('.board', { opacity: 0, y: 30 });
  gsap.set('.jug-pos', { x: 130, y: -150 });
  gsap.set('.jug', { rotation: 0, svgOrigin: '0 0' });
  gsap.set(toppingInner, { y: -260, opacity: 0 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: root, start: 'top top', end: '+=460%', pin: '.bake__pin', scrub: 1 },
  });

  const toStep = (i, t) => {
    tl.to(steps[i - 1], { opacity: 0, y: -20, duration: 0.3 }, t)
      .to(steps[i], { opacity: 1, y: 0, duration: 0.3 }, t + 0.15)
      .to(dots[i - 1], { backgroundColor: 'rgba(243,236,221,.18)', width: 28, duration: 0.2 }, t)
      .to(dots[i], { backgroundColor: '#c68b4e', width: 44, duration: 0.2 }, t);
  };

  // 1 — preheat
  const tp = { v: 0 };
  tl.to('.knob--l', { rotation: 140, svgOrigin: '160 84', duration: 1 }, 0)
    .to('.knob--r', { rotation: 200, svgOrigin: '440 84', duration: 1 }, 0.1)
    .to(tp, { v: 180, duration: 1.1, onUpdate: () => { temp.textContent = String(Math.round(tp.v)).padStart(3, '0') + '°'; } }, 0)
    .to('.oven-led', { attr: { fill: '#3fbf6a' }, duration: 0.1 }, 0.2)
    .to('.heat', { stroke: '#ff6a1f', duration: 1 }, 0.1)
    .to('.oven-glow', { opacity: 0.6, duration: 1 }, 0.2);

  // 2 — bake: rise, brown, crack, countdown
  toStep(1, 1.2);
  const clock = { s: 45 * 60 };
  tl.to(clock, {
    s: 0, duration: 3.8,
    onUpdate: () => {
      const s = Math.round(clock.s);
      time.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    },
  }, 1.2)
    .to('.cake-rise', { scaleY: 1, svgOrigin: '0 58', duration: 3.2, ease: 'power1.inOut' }, 1.3)
    .to('.cake-baked', { opacity: 1, duration: 2.6 }, 2)
    .to('.cake-crack', { strokeDashoffset: 0, duration: 1.1, stagger: 0.2 }, 3.6)
    .to('.heatwaves', { opacity: 1, duration: 0.4 }, 1.4)
    .to('.oven-glow', { opacity: 0.95, duration: 1.8 }, 1.3)
    .to('.oven-glow', { opacity: 0.7, duration: 1.8 }, 3.1)
    .to('.heatwaves', { opacity: 0, duration: 0.4 }, 4.8);

  // DING
  tl.fromTo('.oven-ding', { opacity: 0, scale: 0.4, svgOrigin: '300 20' }, { opacity: 1, scale: 1.15, svgOrigin: '300 20', duration: 0.25, ease: 'back.out(3)' }, 5)
    .to('.oven-ding', { opacity: 0, y: -10, duration: 0.3 }, 5.5)
    .to('.oven-led', { attr: { fill: '#3a3a30' }, duration: 0.1 }, 5)
    .to('.heat', { stroke: '#3a2a20', duration: 0.5 }, 5)
    .to('.oven-glow', { opacity: 0.3, duration: 0.5 }, 5);

  // 3 — door drops open, cake comes out onto the board, pan slides away
  tl.to('.oven-door', { scaleY: 0.07, svgOrigin: '300 380', duration: 0.8, ease: 'power2.in' }, 5.4);
  toStep(2, 6.1);
  tl.to('.cake-pos', { x: OUT.x, y: OUT.y, duration: 1.2, ease: 'power2.inOut' }, 6.2)
    .to('.cake-scale', { scale: OUT.s, svgOrigin: '0 0', duration: 1.2, ease: 'power2.inOut' }, 6.2)
    .to(['.oven-back', '.oven-door'], { opacity: 0.18, y: -30, duration: 1.2 }, 6.2)
    .to('.board', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 6.5)
    .to('.cake-steam', { opacity: 1, duration: 0.4 }, 7.1)
    .to('.cake-pan', { y: 110, opacity: 0, duration: 0.6, ease: 'power2.in' }, 7.5);

  // 4 — chocolate: jug tilts in, stream falls, glaze sweeps across, drips run
  toStep(3, 8);
  const pour = { g: 0 };
  const setPour = () => {
    const lx = -100 + 200 * pour.g;
    const x = OUT.x + lx * OUT.s;
    clip.setAttribute('width', lx + 112 + 8);
    stream.setAttribute('x1', x);
    stream.setAttribute('x2', x);
    gsap.set('.jug-pos', { x });
  };
  tl.add(setPour, 7.95)
    .to('.jug-pos', { y: 92, duration: 0.5, ease: 'power2.out' }, 8)
    .to('.jug', { rotation: -38, svgOrigin: '0 0', duration: 0.4 }, 8.2)
    .to('.cake-steam', { opacity: 0, duration: 0.5 }, 8.4)
    .fromTo(stream, { attr: { y1: 92, y2: 92 } }, { attr: { y1: 92, y2: glazeTopY + 4 }, duration: 0.35, ease: 'power2.in' }, 8.5)
    .to(pour, { g: 1, duration: 1.7, ease: 'sine.inOut', onUpdate: setPour }, 8.8);
  drips.forEach((d, i) => {
    const t0 = 9 + i * 0.22;
    tl.to(d.rect, { attr: { height: d.len }, duration: 0.8, ease: 'power1.in' }, t0)
      .to(d.drop, { attr: { cy: -14 + d.len, r: 5.5 }, duration: 0.8, ease: 'power1.in' }, t0);
  });
  tl.to(stream, { attr: { y1: glazeTopY + 4 }, duration: 0.3, ease: 'power2.in' }, 10.5)
    .to('.jug', { rotation: 0, svgOrigin: '0 0', duration: 0.3 }, 10.5)
    .to('.jug-pos', { y: -160, duration: 0.5, ease: 'power2.in' }, 10.7);

  // 5 — toppings rain down, glaze shines
  toStep(4, 10.9);
  tl.to(toppingInner, { y: 0, opacity: 1, duration: 0.7, ease: 'bounce.out', stagger: { each: 0.05, from: 'random' } }, 11)
    .to('.glaze-shine', { strokeDashoffset: 0, duration: 0.6 }, 11.6)
    .to({}, { duration: 0.6 });
}

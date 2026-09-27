// NASH — shared script for the inner pages (no intro, no WebGL)
import { AR, EN, MENU, CAT_LABEL, ICONS } from './i18n.js?v=5';
import { PAGES_AR } from './pages-i18n.js?v=7';
import './nocopy.js?v=1';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DICT_AR = { ...AR, ...PAGES_AR };

/* ------------------------------------------------------------------ */
/* Language — swapped in place, no reload                              */
/* ------------------------------------------------------------------ */
let lang = 'en';
try { lang = localStorage.getItem('nash-lang') || 'en'; } catch {}
const isAR = () => lang === 'ar';
const t = (key) => (isAR() ? AR[key] : EN[key]);
const originals = new Map();

function applyLang() {
  const ar = isAR();
  document.documentElement.lang = ar ? 'ar' : 'en';
  document.documentElement.dir = ar ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach((el) => {
    if (!originals.has(el)) originals.set(el, el.innerHTML);
    el.innerHTML = (ar && DICT_AR[el.dataset.i18n]) || originals.get(el);
  });
  $('[data-lang-toggle]').textContent = ar ? 'EN' : 'عربي';
  renderMenus();
  updateStatus();
}
$('[data-lang-toggle]').addEventListener('click', () => {
  lang = isAR() ? 'en' : 'ar';
  try { localStorage.setItem('nash-lang', lang); } catch {}
  applyLang();
});

/* ------------------------------------------------------------------ */
/* Open / closed + today's hours — Damascus time                       */
/* ------------------------------------------------------------------ */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function updateStatus() {
  const now = new Date();
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Damascus' }).format(now));
  const day = DAYS.indexOf(new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Damascus' }).format(now));
  const open = h >= 10 && h < 24;
  $$('[data-status]').forEach((s) => {
    s.classList.toggle('is-closed', !open);
    $('[data-status-text]', s).textContent = t(open ? 'open' : 'closed');
  });
  $$('[data-day]').forEach((li) => li.classList.toggle('is-today', Number(li.dataset.day) === day));
}
setInterval(updateStatus, 60_000);
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ------------------------------------------------------------------ */
/* Menu cards                                                          */
/* ------------------------------------------------------------------ */
function card(m) {
  const ar = isAR();
  const [name, desc] = ar ? m.ar : m.en;
  const tag = m.tag ? `<span class="mcard__tag">${ar ? m.tag[1] : m.tag[0]}</span>` : '';
  const media = m.img
    ? `<div class="mcard__img"><img src="${m.img}" alt="${name}" loading="lazy" /></div>`
    : `<span class="mcard__icon">${ICONS[m.cat]}</span>`;
  return `<article class="mcard rv${m.feat ? ' mcard--feat' : ''}${m.img ? ' mcard--img' : ''}">
    ${media}
    <span class="mcard__cat">${CAT_LABEL[m.cat][ar ? 1 : 0]}</span>
    <div><h3>${name}</h3><p>${desc}</p>${tag}</div>
  </article>`;
}

function renderMenus() {
  const i = isAR() ? 1 : 0;
  // Single-category grids, e.g. <div data-menu="coffee">
  $$('[data-menu]').forEach((grid) => {
    grid.innerHTML = MENU.filter((m) => m.cat === grid.dataset.menu).map(card).join('');
  });
  // Full menu, grouped by category, with jump chips
  const full = $('[data-menu-full]');
  if (full) {
    const cats = Object.keys(CAT_LABEL);
    const count = (c) => MENU.filter((m) => m.cat === c).length;
    $('[data-menu-chips]').innerHTML = cats
      .map((c) => `<a class="chip" href="#cat-${c}">${CAT_LABEL[c][i]} <small>${String(count(c)).padStart(2, '0')}</small></a>`)
      .join('');
    full.innerHTML = cats.map((c) => `
      <section class="mcat" id="cat-${c}">
        <header class="mcat__head rv">
          <span class="mcat__icon">${ICONS[c]}</span>
          <h2 class="mcat__title">${CAT_LABEL[c][i]}</h2>
          <span class="mono">${String(count(c)).padStart(2, '0')}</span>
        </header>
        <div class="menu__grid">${MENU.filter((m) => m.cat === c).map(card).join('')}</div>
      </section>`).join('');
    watchChips();
  }
  observe();
}

// Highlight the chip for the category currently on screen
let chipObserver;
function watchChips() {
  chipObserver?.disconnect();
  if (!('IntersectionObserver' in window)) return;
  chipObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      $$('.chip').forEach((c) => c.classList.toggle('is-active', c.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('.mcat').forEach((s) => chipObserver.observe(s));
}

/* ------------------------------------------------------------------ */
/* Scroll reveal                                                        */
/* ------------------------------------------------------------------ */
const io = !reduced && 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' })
  : null;
function observe() {
  $$('.rv:not(.is-in)').forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));
}

/* ------------------------------------------------------------------ */
/* Looping page video (espresso page) — section removed if the file is missing */
/* ------------------------------------------------------------------ */
const vbox = $('[data-video]');
if (vbox) {
  const video = $('video', vbox);
  fetch($('source', video).getAttribute('src'), { method: 'HEAD' })
    .then((r) => r.ok)
    .catch(() => false)
    .then((ok) => {
      if (!ok) return vbox.remove();
      vbox.hidden = false;
      observe();
      if (reduced) { video.controls = true; return; }
      // Only play while on screen — saves data and battery on phones
      if (!('IntersectionObserver' in window)) return video.play().catch(() => {});
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0.25 }).observe(video);
    });
}

/* ------------------------------------------------------------------ */
/* Nav                                                                  */
/* ------------------------------------------------------------------ */
const file = location.pathname.split('/').pop() || 'index.html';
$$('.nav__links a, .mobile-menu a, .footer__nav a').forEach((a) => {
  if (a.getAttribute('href') === file) a.setAttribute('aria-current', 'page');
});

const nav = $('.nav');
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('is-scrolled', y > 40);
  nav.classList.toggle('is-hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
  lastY = y;
}, { passive: true });

const burger = $('[data-burger]');
burger.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', open);
});
$('[data-to-top]')?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

applyLang();

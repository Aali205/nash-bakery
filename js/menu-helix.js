// NASH — helix menu (menu.html)
// Adapted from the scroll-helix demo, itself a remix of Valentin Descombes'
// "Scroll-Driven Dual-Wave Text Animation" (Codrops, 2026). Each menu item is a
// rung of a double helix: its name in the current language on one strand, in
// the other language on the opposite strand (phase + PI). The rows scroll past
// a sticky "plate" that shows whichever item is closest to the screen centre.
import { MENU, CAT_LABEL, ICONS } from './i18n.js?v=5';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const section = $('[data-helix]');
const rowsEl = $('[data-helix-rows]');
const plate = $('[data-plate]');
const capCat = $('[data-cap-cat]'), capDesc = $('[data-cap-desc]'), capTag = $('[data-cap-tag]');
const chipsEl = $('[data-helix-chips]');

const WAVE_NUMBER = 0.42; // radians of twist between neighbouring rows
const WAVE_SPEED = 1.6;   // full helix turns across the whole section
const TAU_MS = 140;       // easing time constant for the strands

const isAR = () => document.documentElement.lang === 'ar';
let items = [];
let focused = -1;

/* ---------- build ---------- */
// One plate layer per item (photo, or the category icon), cross-faded on focus
MENU.forEach((m) => {
  const layer = document.createElement('div');
  layer.className = 'plate__layer' + (m.img ? '' : ' plate__layer--icon');
  layer.innerHTML = m.img ? `<img src="${m.img}" alt="" loading="lazy" />` : ICONS[m.cat];
  plate.append(layer);
});
const layers = $$('.plate__layer', plate);

function build() {
  const ar = isAR();
  rowsEl.innerHTML = '';
  items = MENU.map((m, i) => {
    const row = document.createElement('div');
    row.className = 'hrow';
    row.dataset.cat = m.cat;
    const a = document.createElement('div');
    a.className = 'hw hw--a';
    a.lang = ar ? 'ar' : 'en';
    a.dir = ar ? 'rtl' : 'ltr';
    a.textContent = (ar ? m.ar : m.en)[0];
    const b = document.createElement('div');
    b.className = 'hw hw--b';
    b.lang = ar ? 'en' : 'ar';
    b.dir = ar ? 'ltr' : 'rtl';
    b.textContent = (ar ? m.en : m.ar)[0];
    const r = document.createElement('div');
    r.className = 'hrung';
    row.append(r, a, b);
    rowsEl.append(row);
    return { m, i, row, a, b, r, cur: null };
  });
  // Category chips jump to the first item of each category
  const cats = Object.keys(CAT_LABEL);
  chipsEl.innerHTML = cats
    .map((c) => `<button class="chip" type="button" data-cat="${c}">${CAT_LABEL[c][ar ? 1 : 0]} <small>${String(MENU.filter((m) => m.cat === c).length).padStart(2, '0')}</small></button>`)
    .join('');
  focused = -1;
}

chipsEl.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-cat]');
  if (!chip) return;
  const row = items.find((it) => it.m.cat === chip.dataset.cat)?.row;
  row?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
});

/* ---------- geometry ---------- */
let R = 300;
function measure() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--R)';
  section.append(probe);
  R = probe.offsetWidth;
  probe.remove();
}

function progress() {
  const rect = rowsEl.getBoundingClientRect();
  const total = rect.height + innerHeight;
  return Math.min(1, Math.max(0, (innerHeight - rect.top) / total));
}

function closestIndex() {
  const c = innerHeight / 2;
  let best = 0, bestD = Infinity;
  items.forEach((it, i) => {
    const r = it.row.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - c);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// depth -> scale, opacity and stacking: front half passes over the plate, back half under
function place(el, x, z) {
  const t = (z + 1) / 2;
  el.style.setProperty('--x', x.toFixed(1) + 'px');
  el.style.setProperty('--s', (0.62 + 0.38 * t).toFixed(3));
  el.style.setProperty('--o', (0.25 + 0.75 * t).toFixed(3));
  el.classList.toggle('is-front', z >= 0);
}

function focus(i) {
  if (i === focused) return;
  focused = i;
  const ar = isAR();
  const m = MENU[i];
  items.forEach((it, j) => it.row.classList.toggle('is-focused', j === i));
  layers.forEach((l, j) => l.classList.toggle('is-on', j === i));
  capCat.textContent = CAT_LABEL[m.cat][ar ? 1 : 0];
  capDesc.textContent = (ar ? m.ar : m.en)[1];
  capTag.hidden = !m.tag;
  if (m.tag) capTag.textContent = m.tag[ar ? 1 : 0];
  $$('.chip', chipsEl).forEach((c) => c.classList.toggle('is-active', c.dataset.cat === m.cat));
}

/* ---------- loop (runs only while the section is on screen) ---------- */
let running = false, last = 0;
function frame(now) {
  if (!running) return;
  const dt = Math.min(64, now - last);
  last = now;
  const k = reduced ? 1 : 1 - Math.exp(-dt / TAU_MS);
  const prog = reduced ? 0 : progress();
  items.forEach((it) => {
    const target = WAVE_NUMBER * it.i + WAVE_SPEED * prog * Math.PI * 2;
    it.cur = it.cur === null ? target : it.cur + (target - it.cur) * k;
    const xa = Math.sin(it.cur) * R, za = Math.cos(it.cur);
    place(it.a, xa, za);
    place(it.b, -xa, -za);
    // the rung joins the pair; it fades when the strands line up edge-on
    it.r.style.transform = `translateX(${Math.min(xa, -xa).toFixed(1)}px) scaleX(${Math.abs(2 * xa).toFixed(1)})`;
    it.r.style.opacity = (0.12 + 0.5 * Math.abs(Math.sin(it.cur))).toFixed(3);
  });
  focus(closestIndex());
  requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

build();
measure();
focus(0);
addEventListener('resize', measure);
// page.js swaps the language in place; rebuild the strands in the new language
document.addEventListener('nash:lang', () => { build(); measure(); focus(closestIndex()); });

if ('IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else running = false; }).observe(section);
} else {
  start();
}

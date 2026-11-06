/* Golden Sense — interface : écrans, fenêtres et actions. */
'use strict';

/* ====================================================================== */
/* Langue et formats                                                      */
/* ====================================================================== */

const LOCALES = { ar: 'ar-DZ-u-nu-latn', fr: 'fr-DZ', en: 'en-GB' };

function detectLang() {
  const l = (navigator.language || 'fr').toLowerCase();
  if (l.startsWith('ar')) return 'ar';
  if (l.startsWith('en')) return 'en';
  return 'fr';
}
let lang = STR[store.get('gs.lang')] ? store.get('gs.lang') : detectLang();

function t(key, ...args) {
  const s = (STR[lang] && STR[lang][key]) ?? STR.fr[key] ?? key;
  return s.replace(/\{(\d)\}/g, (_, i) => (args[+i] ?? ''));
}

const sep = () => (lang === 'ar' ? '، ' : ', ');
const fmtDate = opts => new Intl.DateTimeFormat(LOCALES[lang], opts);
function money(cents) { return (cents < 0 ? LRM : '') + formatAmount(cents) + NBSP + t('currency'); }
const LRM = '\u200E';
const signed = (sign, txt) => `${LRM}${sign}${txt}`;
function fmtNum(x) { const s = String(q2(x)); return lang === 'fr' ? s.replace('.', ',') : s; }
function fmtQty(x, unit) { return `${fmtNum(x)}${NBSP}${t(unit === 'g' ? 'g' : 'ml')}`; }
function lineLabel(kind, size, unit) { return kind === 'BOTTLE' ? t('bottle_of', fmtQty(size, 'ml')) : fmtQty(size, unit); }
function stockText(p) {
  if (p.mode === 'BULK') return fmtQty(p.loose, p.unit);
  const b = t('bottles_n', p.stock);
  return p.loose > 0 ? `${b} + ${fmtQty(p.loose, 'ml')}` : b;
}
function methodLabel(m) { return t({ CASH: 'pay_cash', CREDIT: 'pay_credit', CCP: 'CCP', BARIDIMOB: 'BARIDIMOB' }[m] || m); }
const dayStart = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ====================================================================== */
/* État                                                                   */
/* ====================================================================== */

const state = {
  ready: false,
  perfumes: [],
  sales: [],
  clients: [],
  ledger: [],
  debts: new Map(),
  settings: { emptyBottles: [], suppliers: [] },
  tab: 'sales',
  cart: new Map(),            // `${id}|${kind}|${size}` → { perfumeId, kind, size, qty, price|null }
  discountMode: 'NONE',
  discountText: '',
  pay: { method: 'CASH', other: 'CCP', receivedText: '', paidText: '', clientId: null },
  gender: null,
  type: null,
  lowOnly: false,
  topScope: 'today',
  historyLimit: HISTORY_PAGE,
  processing: false,
  cartOpen: false,
};

async function reload() {
  const [perfumes, sales, clients, ledger, meta] = await Promise.all(['perfumes', 'sales', 'clients', 'ledger', 'meta'].map(getAll));
  state.perfumes = perfumes.map(normPerfume)
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name) || a.volumeMl - b.volumeMl);
  state.sales = sales.map(normSale).sort((a, b) => b.createdAt - a.createdAt);
  state.clients = clients.sort((a, b) => a.name.localeCompare(b.name));
  state.ledger = ledger;
  state.debts = new Map();
  for (const e of ledger) state.debts.set(e.clientId, (state.debts.get(e.clientId) || 0) + e.amount);
  const m = Object.fromEntries(meta.map(x => [x.key, x.value]));
  state.settings = { emptyBottles: m.emptyBottles || [], suppliers: m.suppliers || [] };
  state.ready = true;
  for (const [key, l] of [...state.cart]) if (!perfumeById(l.perfumeId)) state.cart.delete(key);
  if (state.pay.clientId && !clientById(state.pay.clientId)) state.pay.clientId = null;
}

const perfumeById = id => state.perfumes.find(p => p.id === id);
const clientById = id => state.clients.find(c => c.id === id);
const debtOf = id => state.debts.get(id) || 0;

/* ====================================================================== */
/* Icônes                                                                 */
/* ====================================================================== */

const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M18 7l-.9 12.1a1.5 1.5 0 0 1-1.5 1.4H8.4a1.5 1.5 0 0 1-1.5-1.4L6 7"/>',
  warn: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  bag: '<path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  bottle: '<rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M10.5 6v2.5M13.5 6v2.5"/><rect x="5" y="8.5" width="14" height="13" rx="3.5"/><path d="M5 14.5h14"/>',
  drop: '<path d="M12 3.5c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 2.5-6.3 6-10.5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  tag: '<path d="M3 12.5V4h8.5L21 13.5 13.5 21z"/><circle cx="7.5" cy="8" r="1.4"/>',
  export: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  import: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  back: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
const $ = sel => document.querySelector(sel);

/* ====================================================================== */
/* Rendu général                                                          */
/* ====================================================================== */

const TAB_TITLES = { sales: 'tab_sales', stock: 'tab_stock', clients: 'tab_clients', reports: 'tab_reports' };

function applyLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $('#settingsBtn').setAttribute('aria-label', t('settings'));
  document.querySelectorAll('.close-cart').forEach(el => el.setAttribute('aria-label', t('close')));
  document.querySelectorAll('.search .clear').forEach(el => el.setAttribute('aria-label', t('clear')));
}

function applyTheme() {
  const mode = store.get('gs.theme') || 'system';
  if (mode === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#themeColor').setAttribute('content', dark ? '#15100C' : '#F3F0EE');
}

function renderAll() {
  renderNav();
  renderSales();
  renderStock();
  renderClients();
  renderReports();
}

function renderNav() {
  document.querySelectorAll('.tab').forEach(b => {
    if (b.dataset.tab === state.tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  Object.keys(TAB_TITLES).forEach(v => { $(`#view-${v}`).hidden = v !== state.tab; });
  $('#tabTitle').textContent = t(TAB_TITLES[state.tab]);
  const low = state.perfumes.filter(isLow).length;
  $('#lowBadge').hidden = low === 0;
  $('#lowBadge').textContent = low;
}

function emptyBlock(glyph, title, message, actions = '') {
  return `<div class="empty"><div class="glyph">${icon(glyph)}</div><h3>${esc(title)}</h3><p>${esc(message)}</p>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
}

function stockPill(p) {
  if (isOut(p)) return `<span class="pill out">${icon('warn', 'sm')}${esc(t('out'))}</span>`;
  if (isLow(p)) return `<span class="pill low">${icon('warn', 'sm')}${esc(t('low_n', stockText(p)))}</span>`;
  return `<span class="pill">${esc(stockText(p))}</span>`;
}

function metaLine(p) {
  const what = p.mode === 'BULK' ? esc(t(p.type)) : `${esc(t(p.type))}${sep()}<span class="num">${p.volumeMl}</span>${NBSP}${esc(t('ml'))}`;
  const tags = [`<span class="tag">${esc(t(p.gender))}</span>`];
  if (p.mode === 'BULK') tags.push(`<span class="tag">${esc(t('bulk'))}</span>`);
  else if (sellsPortions(p)) tags.push(`<span class="tag">${esc(t('decants'))}</span>`);
  return `<span>${what}</span>${tags.join('')}`;
}

function catalogPrice(p) {
  if (p.mode === 'BOTTLE' && (p.stock > 0 || !sellsPortions(p))) return money(p.salePrice);
  if (p.unitPrice > 0) return `${money(p.unitPrice)}<small>/${esc(t(p.unit))}</small>`;
  return p.decants.length ? esc(t('from_price', money(p.decants[0].price))) : '—';
}

/* ====================================================================== */
/* Caisse                                                                 */
/* ====================================================================== */

function renderSales() {
  renderChips();
  renderCatalog();
  renderCart();
}

function renderChips() {
  const chip = (kind, value, label) =>
    `<button class="chip" data-action="filter" data-kind="${kind}" data-value="${value}" aria-pressed="${state[kind] === value}">${esc(label)}</button>`;
  $('#posChips').innerHTML =
    GENDERS.map(g => chip('gender', g, t(g))).join('') + '<span class="sep"></span>' +
    TYPES.map(ty => chip('type', ty, t(`${ty}_short`))).join('');
}

function cartCountFor(id) {
  let n = 0;
  for (const l of state.cart.values()) if (l.perfumeId === id) n += l.qty;
  return n;
}

function renderCatalog() {
  const box = $('#catalogList');
  if (!state.ready) { box.innerHTML = ''; return; }
  if (!state.perfumes.length) {
    box.innerHTML = emptyBlock('bottle', t('catalog_empty_t'), t('catalog_empty_m'),
      `<button class="btn primary" data-action="go-stock">${esc(t('go_stock'))}</button>`);
    return;
  }
  const tokens = searchTokens($('#posSearch').value);
  const items = state.perfumes.filter(p =>
    (!state.gender || p.gender === state.gender) && (!state.type || p.type === state.type) && matches(p, tokens));
  if (!items.length) { box.innerHTML = emptyBlock('search', t('no_results_t'), t('no_results_m')); return; }
  box.innerHTML = items.map(p => {
    const n = cartCountFor(p.id);
    return `<button class="row" data-action="pick" data-id="${p.id}" ${isOut(p) ? 'disabled' : ''}>
      <span><span class="brand">${esc(p.brand)}</span><span class="name">${esc(p.name)}</span><span class="meta">${metaLine(p)}</span></span>
      <span class="side"><span class="price num">${catalogPrice(p)}</span>${n ? `<span class="in-cart">×${n}</span>` : stockPill(p)}</span>
    </button>`;
  }).join('');
}

/** Besoin total d'un parfum dans le panier, avec la ligne `key` fixée à `qty`. */
function needFor(perfumeId, key, qty) {
  let bottles = 0, ml = 0;
  const seen = new Set();
  for (const [k, l] of state.cart) {
    if (l.perfumeId !== perfumeId) continue;
    const n = k === key ? qty : l.qty;
    seen.add(k);
    if (l.kind === 'BOTTLE') bottles += n; else ml = q2(ml + l.size * n);
  }
  if (key && !seen.has(key)) {
    const [, kind, size] = key.split('|');
    if (kind === 'BOTTLE') bottles += qty; else ml = q2(ml + Number(size) * qty);
  }
  return { bottles, ml };
}

function addLine(p, kind, size) {
  const key = `${p.id}|${kind}|${size}`;
  const cur = state.cart.get(key);
  const qty = (cur ? cur.qty : 0) + 1;
  const need = needFor(p.id, key, qty);
  if (!fits(p, need.bottles, need.ml)) { toast(t('stock_limit', p.name, stockText(p))); return false; }
  state.cart.set(key, { perfumeId: p.id, kind, size, qty, price: cur ? cur.price : null });
  if (navigator.vibrate) navigator.vibrate(8);
  renderCatalog();
  renderCart();
  return true;
}

function changeQty(key, delta) {
  const l = state.cart.get(key);
  const p = l && perfumeById(l.perfumeId);
  if (!p) return;
  const next = l.qty + delta;
  if (next <= 0) state.cart.delete(key);
  else {
    const need = needFor(p.id, key, next);
    if (delta > 0 && !fits(p, need.bottles, need.ml)) { toast(t('stock_limit', p.name, stockText(p))); return; }
    l.qty = next;
  }
  renderCatalog();
  renderCart();
}

function pickProduct(id) {
  const p = perfumeById(id);
  if (!p || isOut(p)) return;
  if (p.mode === 'BOTTLE' && !sellsPortions(p)) { addLine(p, 'BOTTLE', p.volumeMl); return; }
  openPicker(p);
}

function cashSuggestions(total) {
  const out = new Set();
  for (const step of [50000, 100000, 200000, 500000, 1000000]) {
    const v = Math.ceil(total / step) * step;
    if (v > total) out.add(v);
  }
  return [...out].sort((a, b) => a - b).slice(0, 3);
}

function cartView() {
  const table = state.settings.emptyBottles;
  const lines = [];
  for (const [key, l] of state.cart) {
    const p = perfumeById(l.perfumeId);
    if (!p) continue;
    const list = listPrice(p, l.kind, l.size);
    lines.push({ key, ...l, p, list, price: l.price != null ? l.price : (list ?? 0), cost: lineCost(p, l.kind, l.size, table) });
  }
  const byP = new Map();
  for (const l of lines) {
    const n = byP.get(l.p.id) || { bottles: 0, ml: 0 };
    if (l.kind === 'BOTTLE') n.bottles += l.qty; else n.ml = q2(n.ml + l.size * l.qty);
    byP.set(l.p.id, n);
  }
  const issues = new Set();
  for (const [id, n] of byP) if (!fits(perfumeById(id), n.bottles, n.ml)) issues.add(id);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const input = state.discountText.trim();
  let percent = 0, fixed = 0, error = null;
  if (state.discountMode === 'PERCENT' && input) {
    const norm = normalizeDigits(input).replace(',', '.');
    const v = Number(norm);
    if (!/^\d+(\.\d*)?$/.test(norm) || v < 0 || v > 100) error = 'err_pct';
    else percent = v;
  } else if (state.discountMode === 'FIXED' && input) {
    const v = parseMoney(input);
    if (v === null) error = 'err_amount';
    else if (v > subtotal) { error = 'err_exceeds'; fixed = v; }
    else fixed = v;
  }
  const totals = computeTotals(lines.map(l => ({ price: l.price, cost: l.cost, qty: l.qty })), state.discountMode, percent, fixed);

  const pay = state.pay;
  const client = pay.clientId ? clientById(pay.clientId) : null;
  let payError = null, received = 0, change = 0, paid = 0, credit = 0;
  if (pay.method === 'CASH') {
    if (pay.receivedText.trim()) {
      const v = parseMoney(pay.receivedText);
      if (v === null) payError = 'err_amount';
      else if (v < totals.total) payError = 'err_received_low';
      else { received = v; change = v - totals.total; }
    }
  } else if (pay.method === 'CREDIT') {
    const v = pay.paidText.trim() ? parseMoney(pay.paidText) : 0;
    if (!client) payError = 'err_need_client';
    else if (v === null) payError = 'err_amount';
    else if (v > totals.total) payError = 'err_paid_high';
    else { paid = v; credit = totals.total - v; }
  }
  return {
    lines, totals, percent, fixed, error, issues, client, payError, received, change, paid, credit,
    canCheckout: lines.length > 0 && !error && issues.size === 0 && !payError,
  };
}

function renderCart() {
  const cv = cartView();
  const empty = cv.lines.length === 0;
  $('#clearCartBtn').hidden = empty;

  $('#cartLines').innerHTML = empty
    ? emptyBlock('bag', t('cart_empty_t'), t('cart_empty_m'))
    : cv.lines.map(l => `
      <div class="line">
        <div class="what"><div class="name">${esc(l.p.name)}</div><div class="meta">${esc(l.p.brand)}${sep()}${esc(lineLabel(l.kind, l.kind === 'BOTTLE' ? l.p.volumeMl : l.size, l.p.unit))}</div></div>
        <div class="ctrl">
          <button class="step" data-action="qty" data-key="${esc(l.key)}" data-delta="-1" aria-label="${esc(t('decrease'))}">${icon('minus', 'sm')}</button>
          <span class="qty num">${l.qty}</span>
          <button class="step" data-action="qty" data-key="${esc(l.key)}" data-delta="1" aria-label="${esc(t('increase'))}">${icon('plus', 'sm')}</button>
          <button class="remove" data-action="remove" data-key="${esc(l.key)}" aria-label="${esc(t('remove'))}">${icon('trash')}</button>
        </div>
        <button class="amount-btn" data-action="line-price" data-key="${esc(l.key)}" aria-label="${esc(t('edit_price'))}">
          <span class="num">${money(l.price * l.qty)}</span>
          ${l.qty > 1 ? `<small class="num">${l.qty} × ${money(l.price)}</small>` : ''}
          ${l.list != null && l.price !== l.list ? `<s class="num">${money(l.list * l.qty)}</s>` : ''}
          ${icon('pencil', 'sm')}
        </button>
        ${cv.issues.has(l.p.id) ? `<div class="warn">${esc(t('only_n', stockText(l.p)))}</div>` : ''}
      </div>`).join('');

  renderDiscount(empty);
  renderPay(cv, empty);
  renderCartLive(cv);

  const bar = $('#cartBar');
  bar.hidden = empty;
  if (!empty) {
    bar.innerHTML = `<span class="what"><small>${esc(t('items_n', cv.totals.count))}</small><span class="num">${money(cv.totals.total)}</span></span>
      <span class="go">${icon('bag')}${esc(t('view_cart'))}</span>`;
  }
  if (empty && state.cartOpen) setCartOpen(false);
}

function renderDiscount(empty) {
  const box = $('#cartDiscount');
  if (empty) { box.innerHTML = ''; return; }
  const modes = [['NONE', 'd_none'], ['PERCENT', 'd_pct'], ['FIXED', 'd_amount']];
  const field = state.discountMode === 'NONE' ? '' : `
    <div class="field" id="discountField">
      <div class="input">
        <input id="discountInput" inputmode="decimal" autocomplete="off" value="${esc(state.discountText)}"
          placeholder="${esc(t(state.discountMode === 'PERCENT' ? 'd_pct_hint' : 'd_amount_hint'))}">
        <span class="unit">${state.discountMode === 'PERCENT' ? '%' : esc(t('currency'))}</span>
      </div>
      <div class="err" id="discountError" hidden></div>
    </div>`;
  box.innerHTML = `<div class="cart-block"><span class="label">${esc(t('discount'))}</span>
    <div class="seg" role="group">${modes.map(([m, k]) =>
      `<button data-action="discount-mode" data-mode="${m}" aria-pressed="${state.discountMode === m}">${esc(t(k))}</button>`).join('')}</div>
    ${field}</div>`;
}

function renderPay(cv, empty) {
  const box = $('#cartPay');
  if (empty) { box.innerHTML = ''; return; }
  const pay = state.pay;
  const group = pay.method === 'CASH' || pay.method === 'CREDIT' ? pay.method : 'OTHER';
  const c = cv.client;
  const clientHtml = c
    ? `<div class="client-chip">
        <button data-action="pick-client">${icon('user')}<span><span class="name">${esc(c.name)}</span>${debtOf(c.id) > 0 ? `<small>${esc(t('owes', money(debtOf(c.id))))}</small>` : ''}</span></button>
        <button class="icon-btn" data-action="unset-client" aria-label="${esc(t('remove'))}">${icon('x')}</button>
      </div>`
    : `<button class="btn ghost block" data-action="pick-client">${icon('user')}${esc(t('choose_client'))}</button>`;
  let field = '';
  if (group === 'CASH') {
    field = `<div class="field"><label class="label" for="receivedInput">${esc(t('received'))}</label>
      <div class="input"><input id="receivedInput" inputmode="decimal" autocomplete="off" value="${esc(pay.receivedText)}" placeholder="${esc(t('received_hint'))}"><span class="unit">${esc(t('currency'))}</span></div></div>`;
  } else if (group === 'CREDIT') {
    field = `<div class="field"><label class="label" for="paidInput">${esc(t('paid_now'))}</label>
      <div class="input"><input id="paidInput" inputmode="decimal" autocomplete="off" value="${esc(pay.paidText)}" placeholder="0"><span class="unit">${esc(t('currency'))}</span></div></div>`;
  } else {
    field = `<div class="options">${OTHER_METHODS.map(m =>
      `<button class="chip" data-action="pay-other" data-method="${m}" aria-pressed="${pay.method === m}">${esc(t(m))}</button>`).join('')}</div>`;
  }
  box.innerHTML = `<div class="cart-block">
    <span class="label">${esc(t('client'))}</span>${clientHtml}
    <span class="label">${esc(t('payment'))}</span>
    <div class="seg" role="group">${[['CASH', 'pay_cash'], ['CREDIT', 'pay_credit'], ['OTHER', 'pay_other']].map(([m, k]) =>
      `<button data-action="pay-method" data-method="${m}" aria-pressed="${group === m}">${esc(t(k))}</button>`).join('')}</div>
    ${field}
    <div id="payInfo"></div>
  </div>`;
}

/** Mise à jour sans redessiner les champs (le curseur reste en place pendant la saisie). */
function renderCartLive(cv = cartView()) {
  const empty = cv.lines.length === 0;
  const tot = cv.totals;
  const errBox = $('#discountError');
  if (errBox) {
    errBox.hidden = !cv.error;
    errBox.textContent = cv.error ? t(cv.error) : '';
    $('#discountField').classList.toggle('invalid', !!cv.error);
  }
  $('#cartTotals').innerHTML = empty ? '' : `
    <div class="totals">
      <div class="trow"><span>${esc(t('subtotal'))}</span><span class="num">${money(tot.subtotal)}</span></div>
      ${tot.discount > 0 ? `<div class="trow discount-row"><span>${esc(state.discountMode === 'PERCENT' ? t('discount_pct', formatPercent(cv.percent)) : t('discount'))}</span><span class="num">${signed('−' + NBSP, money(tot.discount))}</span></div>` : ''}
      <div class="trow profit ${tot.profit < 0 ? 'neg' : ''}"><span>${esc(t('profit'))}</span><span class="num">${money(tot.profit)}</span></div>
    </div>`;

  const info = $('#payInfo');
  if (info) {
    let html = '';
    if (state.pay.method === 'CASH') {
      html += `<div class="money-chips">${cashSuggestions(tot.total).map(v =>
        `<button class="chip" data-action="received-set" data-value="${v}">${money(v)}</button>`).join('')}</div>`;
      if (cv.change > 0) html += `<div class="change"><span>${esc(t('change'))}</span><span class="num">${money(cv.change)}</span></div>`;
    } else if (state.pay.method === 'CREDIT' && cv.client && !cv.payError) {
      html += `<div class="change credit"><span>${esc(t('on_credit'))}</span><span class="num">${money(cv.credit)}</span></div>`;
    }
    if (cv.payError) html += `<div class="err">${esc(t(cv.payError))}</div>`;
    info.innerHTML = html;
  }

  const foot = $('#cartFoot');
  foot.hidden = empty;
  foot.innerHTML = empty ? '' : `
    <button class="validate" data-action="checkout" ${cv.canCheckout && !state.processing ? '' : 'disabled'}>
      <span>${esc(t(state.pay.method === 'CREDIT' ? 'validate_credit' : 'validate'))}</span><span class="num">${money(tot.total)}</span>
    </button>
    ${cv.issues.size ? `<p class="err foot-note">${esc(t('stock_issue'))}</p>` : ''}`;
}

function setCartOpen(open) {
  state.cartOpen = open;
  $('#cart').classList.toggle('open', open);
  $('#cartScrim').classList.toggle('on', open);
}

function resetSale() {
  state.discountMode = 'NONE';
  state.discountText = '';
  state.pay = { method: 'CASH', other: state.pay.other, receivedText: '', paidText: '', clientId: null };
}

async function checkout() {
  const cv = cartView();
  if (!cv.canCheckout || state.processing) return;
  state.processing = true;
  renderCartLive(cv);
  const sold = cv.lines.map(l => ({ key: l.key, perfumeId: l.perfumeId, kind: l.kind, size: l.size, qty: l.qty, price: l.price }));
  try {
    const res = await repo.checkout({
      lines: sold.map(({ key, ...rest }) => rest),
      mode: state.discountMode, percent: cv.percent, fixed: cv.fixed,
      payment: { method: state.pay.method, received: cv.received, paid: cv.paid },
      clientId: state.pay.clientId,
    });
    if (res.type === 'ok') {
      for (const s of sold) {
        const l = state.cart.get(s.key);
        if (!l) continue;
        if (l.qty - s.qty > 0) l.qty -= s.qty; else state.cart.delete(s.key);
      }
      resetSale();
      requestPersistence();
      state.processing = false;
      await refresh();
      let msg = t('sale_done', money(res.total));
      if (res.payment.change > 0) msg += '\n' + t('give_change', money(res.payment.change));
      if (res.payment.credit > 0) msg += '\n' + t('credit_done', money(res.payment.credit), res.clientName);
      if (res.low.length) msg += '\n⚠ ' + t('low_after', res.low.map(p => `${p.name} (${stockText(p)})`).join(', '));
      toast(msg, { action: t('undo'), duration: 9000, onAction: () => cancelSale(res.saleId) });
    } else if (res.type === 'stock') {
      toast(t('stock_limit', res.name, stockText(res.product)));
      await refresh();
    } else if (res.type === 'client') {
      toast(t('err_need_client'));
    } else {
      toast(t('missing'));
      await refresh();
    }
  } catch (e) {
    console.error(e);
    toast(t('error'));
  } finally {
    state.processing = false;
    renderCartLive();
  }
}

/* ---------- Choix flacon / décant ---------- */

function openPicker(p) {
  const opts = [];
  if (p.mode === 'BOTTLE' && p.stock > 0) {
    opts.push({ kind: 'BOTTLE', size: p.volumeMl, label: t('bottle_of', fmtQty(p.volumeMl, 'ml')), price: p.salePrice });
  }
  for (const d of p.decants) opts.push({ kind: 'DECANT', size: d.size, label: fmtQty(d.size, p.unit), price: d.price });
  const can = o => {
    const need = needFor(p.id, `${p.id}|${o.kind}|${o.size}`, (state.cart.get(`${p.id}|${o.kind}|${o.size}`)?.qty || 0) + 1);
    return fits(p, need.bottles, need.ml);
  };
  const modal = openModal(`
    <header><div class="grow"><small class="brand">${esc(p.brand)}</small><h2>${esc(p.name)}</h2><p>${esc(t('available', stockText(p)))}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <div class="opt-grid">${opts.map((o, i) => `
        <button class="opt" data-opt="${i}" ${can(o) ? '' : 'disabled'}>
          <span class="opt-label">${o.kind === 'BOTTLE' ? icon('bottle') : icon('drop')}${esc(o.label)}</span>
          <span class="num">${money(o.price)}</span>
        </button>`).join('')}</div>
      ${p.unitPrice > 0 ? `
        <div class="field custom-qty">
          <label class="label" for="customQty">${esc(t('other_qty'))} <span class="muted">(${esc(money(p.unitPrice))}/${esc(t(p.unit))})</span></label>
          <div class="row-inline">
            <div class="input"><input id="customQty" inputmode="decimal" autocomplete="off" placeholder="0"><span class="unit">${esc(t(p.unit))}</span></div>
            <button class="btn primary" data-custom disabled>${esc(t('add'))}</button>
          </div>
          <div class="hint" id="customInfo"></div>
        </div>` : ''}
    </div>`);
  modal.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => {
    const o = opts[Number(b.dataset.opt)];
    if (addLine(p, o.kind, o.size)) closeModal();
  }));
  const input = modal.querySelector('#customQty');
  if (input) {
    const btn = modal.querySelector('[data-custom]');
    const info = modal.querySelector('#customInfo');
    const read = () => {
      const v = parseQty(input.value);
      const ok = v !== null && v > 0;
      const price = ok ? portionPrice(p, v) : null;
      const need = ok ? needFor(p.id, `${p.id}|DECANT|${v}`, (state.cart.get(`${p.id}|DECANT|${v}`)?.qty || 0) + 1) : null;
      const room = ok && fits(p, need.bottles, need.ml);
      btn.disabled = !(ok && room && price != null);
      info.textContent = !ok ? '' : !room ? t('only_n', stockText(p)) : money(price);
      info.className = ok && !room ? 'err' : 'hint';
      return ok && room ? v : null;
    };
    input.addEventListener('input', () => { input.value = cleanDecimal(input.value); read(); });
    const add = () => { const v = read(); if (v !== null && addLine(p, 'DECANT', v)) closeModal(); };
    btn.addEventListener('click', add);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  }
}

/* ---------- Prix d'une ligne ---------- */

function openLinePrice(key) {
  const l = state.cart.get(key);
  const p = l && perfumeById(l.perfumeId);
  if (!p) return;
  const list = listPrice(p, l.kind, l.size);
  const cost = lineCost(p, l.kind, l.size, state.settings.emptyBottles);
  const current = l.price != null ? l.price : list;
  const modal = openModal(`
    <header><div class="grow"><h2>${esc(t('edit_price'))}</h2><p>${esc(p.name)}${sep()}${esc(lineLabel(l.kind, l.kind === 'BOTTLE' ? p.volumeMl : l.size, p.unit))}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <form class="body" novalidate>
      <div class="field"><label class="label" for="linePrice">${esc(t('unit_price'))}</label>
        <div class="input"><input id="linePrice" inputmode="decimal" autocomplete="off" value="${esc(moneyInput(current ?? 0))}"><span class="unit">${esc(t('currency'))}</span></div>
        <div class="hint">${esc(t('catalog_price', money(list ?? 0)))}</div>
        <div class="err" id="linePriceInfo" hidden></div>
      </div>
      <button type="submit" hidden></button>
    </form>
    <div class="foot">
      ${l.price != null ? `<button class="btn text" data-reset>${esc(t('reset_price'))}</button>` : ''}
      <span class="grow"></span>
      <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
      <button class="btn primary" data-save>${esc(t('save'))}</button>
    </div>`, { center: true });
  const input = modal.querySelector('#linePrice');
  const info = modal.querySelector('#linePriceInfo');
  const read = () => {
    const v = parseMoney(input.value);
    info.hidden = !(v !== null && v < cost);
    info.textContent = v !== null && v < cost ? t('warn_below_cost', money(cost)) : '';
    return v;
  };
  input.addEventListener('input', () => { input.value = cleanDecimal(input.value); read(); });
  const save = () => {
    const v = read();
    if (v === null) { input.focus(); return; }
    l.price = v === list ? null : v;
    closeModal();
    renderCart();
  };
  modal.querySelector('form').addEventListener('submit', e => { e.preventDefault(); save(); });
  modal.querySelector('[data-save]').addEventListener('click', save);
  modal.querySelector('[data-reset]')?.addEventListener('click', () => { l.price = null; closeModal(); renderCart(); });
  read();
  setTimeout(() => { input.focus(); input.select(); }, 60);
}

/* ====================================================================== */
/* Stock                                                                  */
/* ====================================================================== */

function stockValues() {
  let cost = 0, sale = 0, bottles = 0;
  for (const p of state.perfumes) {
    if (p.mode === 'BOTTLE') {
      bottles += p.stock;
      cost += p.stock * p.purchasePrice + Math.max(0, p.loose) * costPerUnit(p);
      sale += p.stock * p.salePrice + Math.max(0, p.loose) * (p.unitPrice || (p.volumeMl ? p.salePrice / p.volumeMl : 0));
    } else {
      cost += Math.max(0, p.loose) * p.purchasePrice;
      sale += Math.max(0, p.loose) * p.unitPrice;
    }
  }
  return { cost: Math.round(cost), sale: Math.round(sale), bottles };
}

function renderStock() {
  const box = $('#stockBody');
  if (!state.ready) { box.innerHTML = ''; return; }
  const all = state.perfumes;
  $('#fab').hidden = all.length === 0;
  if (!all.length) {
    box.innerHTML = emptyBlock('bottle', t('inv_empty_t'), t('inv_empty_m'),
      `<button class="btn primary" data-action="new-perfume">${icon('plus')}${esc(t('add_perfume'))}</button>
       <button class="btn ghost" data-action="load-sample">${esc(t('load_sample'))}</button>`);
    return;
  }
  const low = all.filter(isLow);
  const lowOnly = state.lowOnly && low.length > 0;
  const tokens = searchTokens($('#stockSearch').value);
  const items = all.filter(p => (!lowOnly || isLow(p)) && matches(p, tokens));
  const v = stockValues();

  box.innerHTML = `
    <div class="figures">
      <div class="figure"><small>${esc(t('refs'))}</small><span class="num">${all.length}</span></div>
      <div class="figure"><small>${esc(t('bottles_closed'))}</small><span class="num">${v.bottles}</span></div>
      <div class="figure"><small>${esc(t('value_cost'))}</small><span class="num">${money(v.cost)}</span></div>
      <div class="figure"><small>${esc(t('value_sale'))}</small><span class="num">${money(v.sale)}</span></div>
    </div>
    <div class="actions-row"><button class="btn ghost" data-action="reception">${icon('truck')}${esc(t('reception'))}</button></div>
    ${low.length ? `<div class="alert" role="status">${icon('warn')}
      <span class="txt"><strong>${esc(t('low_alert_t', low.length))}</strong><small>${esc(t('low_alert_m', LOW_STOCK))}</small></span>
      <button class="btn text" data-action="toggle-low">${esc(t(lowOnly ? 'show_all' : 'show'))}</button></div>` : ''}
    <div class="list">
      ${items.length ? items.map(p => {
        const bottle = p.mode === 'BOTTLE';
        const cost = bottle ? p.purchasePrice : p.purchasePrice;
        const price = bottle ? p.salePrice : p.unitPrice;
        const margin = price - cost;
        const per = bottle ? '' : `<small>/${esc(t(p.unit))}</small>`;
        return `<button class="row" data-action="fiche" data-id="${p.id}">
          <span><span class="brand">${esc(p.brand)}</span><span class="name">${esc(p.name)}</span><span class="meta">${metaLine(p)}</span></span>
          <span class="side">${stockPill(p)}</span>
          <span class="prices">
            <span><small>${esc(t('cost'))}</small><span class="num">${money(cost)}${per}</span></span>
            <span><small>${esc(t('price'))}</small><span class="num">${price ? money(price) + per : '—'}</span></span>
            <span><small>${esc(t('margin'))}</small><span class="num ${margin < 0 ? 'loss' : 'gain'}">${price ? money(margin) + per : '—'}</span></span>
          </span>
        </button>`;
      }).join('') : emptyBlock('search', t('no_results_t'), t('no_results_m'))}
    </div>`;
}

const MOVE_LABEL = { INIT: 'mv_init', IN: 'mv_in', SALE: 'mv_sale', RETURN: 'mv_return', OPEN: 'mv_open', ADJUST: 'mv_adjust' };

function moveDelta(m, p) {
  const parts = [];
  const sg = (n, txt) => signed(n > 0 ? '+' : '−', txt);
  if (m.bottles) parts.push(sg(m.bottles, t('bottles_n', Math.abs(m.bottles))));
  if (m.qty) parts.push(sg(m.qty, fmtQty(Math.abs(m.qty), p.unit)));
  return parts.join(' ');
}

async function openPerfumeFiche(id) {
  const p = perfumeById(id);
  if (!p) return;
  let moves = [];
  try { moves = (await getByIndex('moves', 'perfumeId', id)).sort((a, b) => b.at - a.at).slice(0, 150); } catch (e) { moves = []; }
  const when = fmtDate({ day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const table = state.settings.emptyBottles;
  const bottle = p.mode === 'BOTTLE';
  const kv = (k, v, cls = '') => `<div class="kv"><span>${esc(k)}</span><span class="num ${cls}">${v}</span></div>`;
  const portions = p.decants.map(d => {
    const c = lineCost(p, 'DECANT', d.size, table);
    return `<div class="kv"><span>${esc(fmtQty(d.size, p.unit))}</span><span><span class="num">${money(d.price)}</span> <small class="${d.price - c < 0 ? 'loss' : 'gain'}">${esc(t('margin'))} ${money(d.price - c)}</small></span></div>`;
  }).join('');
  const modal = openModal(`
    <header><div class="grow"><small class="brand">${esc(p.brand)}</small><h2>${esc(p.name)}</h2><p>${metaLine(p)}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <section class="sheet-sec">
        ${bottle ? kv(t('bottles_closed'), p.stock, p.stock < LOW_STOCK ? 'loss' : '') + kv(t('open_bottle'), esc(fmtQty(p.loose, 'ml')))
                 : kv(t('in_stock'), esc(fmtQty(p.loose, p.unit)), isLow(p) ? 'loss' : '') + kv(t('alert_below'), esc(fmtQty(p.lowAt, p.unit)))}
      </section>
      <section class="sheet-sec">
        ${bottle ? kv(t('f_cost'), money(p.purchasePrice)) + kv(t('f_price'), money(p.salePrice)) + kv(t('margin'), money(p.salePrice - p.purchasePrice), p.salePrice - p.purchasePrice < 0 ? 'loss' : 'gain')
                 : kv(t('cost_per', t(p.unit)), money(p.purchasePrice))}
        ${p.unitPrice > 0 ? kv(t('price_per', t(p.unit)), money(p.unitPrice)) : ''}
      </section>
      ${portions ? `<section class="sheet-sec"><h3>${esc(t('sizes_prices'))}</h3>${portions}</section>` : ''}
      <section class="sheet-sec"><h3>${esc(t('movements'))}</h3>
        ${moves.length ? moves.map(m => `
          <div class="move"><span class="when num">${when.format(m.at)}</span>
            <span class="what">${esc(t(MOVE_LABEL[m.type] || m.type, m.saleId || ''))}${m.supplier ? `<small>${esc(m.supplier)}</small>` : ''}${m.note ? `<small>${esc(m.note)}</small>` : ''}</span>
            <span class="delta num ${(m.bottles || m.qty) < 0 ? 'loss' : 'gain'}">${esc(moveDelta(m, p))}</span></div>`).join('')
          : `<p class="muted">${esc(t('no_moves'))}</p>`}
      </section>
    </div>
    <div class="foot">
      <button class="btn ghost" data-edit>${icon('pencil')}${esc(t('edit'))}</button>
      <span class="grow"></span>
      <button class="btn primary" data-receive>${icon('truck')}${esc(t('reception'))}</button>
    </div>`);
  modal.querySelector('[data-edit]').addEventListener('click', () => openEditor(p));
  modal.querySelector('[data-receive]').addEventListener('click', () => openReception(p.id));
}

/* ---------- Formulaire parfum ---------- */

function openEditor(perfume) {
  const isNew = !perfume;
  const p = perfume || normPerfume({ name: '', brand: '', gender: 'UNISEX', type: 'EDP', mode: 'BOTTLE' });
  const brands = [...new Map(state.perfumes.map(x => [x.brand.trim().toLowerCase(), x.brand.trim()])).values()]
    .filter(Boolean).sort((a, b) => a.localeCompare(b));
  const choice = { gender: p.gender, type: p.type, mode: p.mode, unit: p.unit };
  let decants = p.decants.map(d => ({ size: fmtNum(d.size).replace(',', '.'), price: moneyInput(d.price) }));
  let showErrors = false;
  let saving = false;

  const opt = (name, value, label) =>
    `<button type="button" class="chip" data-opt="${name}" data-value="${value}" aria-pressed="${choice[name] === value}">${esc(label)}</button>`;
  const fieldHtml = (id, label, value, { mode = 'text', unit = '', max = 80, ph = '' } = {}) => `
    <div class="field" data-field="${id}">
      <label class="label" for="f_${id}">${esc(label)}</label>
      <div class="input"><input id="f_${id}" inputmode="${mode}" maxlength="${max}" autocomplete="off" value="${esc(value)}" placeholder="${esc(ph)}">${unit ? `<span class="unit" data-unit-of="${id}">${esc(unit)}</span>` : ''}</div>
      <div class="err" hidden></div>
    </div>`;
  const isBottle = p.mode === 'BOTTLE';

  const modal = openModal(`
    <header><h2 class="grow">${esc(t(isNew ? 'add_perfume' : 'edit_perfume'))}</h2>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <form class="body" id="perfumeForm" novalidate>
      ${fieldHtml('name', t('f_name'), p.name)}
      ${fieldHtml('brand', t('f_brand'), p.brand, { max: 60 })}
      <div class="suggest" id="brandSuggest"></div>
      <div class="field"><span class="label">${esc(t('f_gender'))}</span><div class="options">${GENDERS.map(g => opt('gender', g, t(g))).join('')}</div></div>
      <div class="field"><span class="label">${esc(t('f_type'))}</span><div class="options">${TYPES.map(ty => opt('type', ty, t(ty))).join('')}</div></div>
      <div class="field"><span class="label">${esc(t('f_mode'))}</span><div class="options">${opt('mode', 'BOTTLE', t('mode_bottle'))}${opt('mode', 'BULK', t('mode_bulk'))}</div>
        <div class="hint" id="modeHint"></div></div>

      <div class="mode-block" data-mode="BOTTLE" ${isBottle ? '' : 'hidden'}>
        <div class="two">
          ${fieldHtml('volume', t('f_volume'), isBottle && p.volumeMl ? p.volumeMl : '', { mode: 'numeric', unit: t('ml'), max: 5 })}
          ${fieldHtml('stock', t('f_bottles'), isBottle && !isNew ? p.stock : '', { mode: 'numeric', max: 6 })}
        </div>
        <div class="two">
          ${fieldHtml('cost', t('f_cost'), isBottle && !isNew ? moneyInput(p.purchasePrice) : '', { mode: 'decimal', unit: t('currency'), max: 12 })}
          ${fieldHtml('price', t('f_price'), isBottle && !isNew ? moneyInput(p.salePrice) : '', { mode: 'decimal', unit: t('currency'), max: 12 })}
        </div>
        ${fieldHtml('loose', t('f_open_ml'), isBottle && p.loose ? fmtNum(p.loose).replace(',', '.') : '', { mode: 'decimal', unit: t('ml'), max: 8, ph: '0' })}
      </div>

      <div class="mode-block" data-mode="BULK" ${isBottle ? 'hidden' : ''}>
        <div class="field"><span class="label">${esc(t('f_unit'))}</span><div class="options">${opt('unit', 'ml', t('unit_ml'))}${opt('unit', 'g', t('unit_g'))}</div></div>
        <div class="two">
          ${fieldHtml('qty', t('f_qty'), !isBottle && !isNew ? fmtNum(p.loose).replace(',', '.') : '', { mode: 'decimal', unit: t(p.unit), max: 9 })}
          ${fieldHtml('ucost', t('cost_per', t(p.unit)), !isBottle && !isNew ? moneyInput(p.purchasePrice) : '', { mode: 'decimal', unit: t('currency'), max: 12 })}
        </div>
        ${fieldHtml('low', t('alert_below'), !isBottle ? fmtNum(p.lowAt).replace(',', '.') : String(DEFAULT_BULK_ALERT), { mode: 'decimal', unit: t(p.unit), max: 8 })}
      </div>

      <div class="field">
        <span class="label">${esc(t('sizes_prices'))}</span>
        <div id="decantRows"></div>
        <div class="suggest" id="sizeChips"></div>
      </div>
      ${fieldHtml('uprice', t('price_per', t(p.unit)) + ' — ' + t('other_qty'), p.unitPrice ? moneyInput(p.unitPrice) : '', { mode: 'decimal', unit: t('currency'), max: 12, ph: t('optional') })}
      <div class="margin-line" id="marginLine"></div>
      <div class="err" id="formError" hidden></div>
      <button type="submit" hidden></button>
    </form>
    <div class="foot">
      ${isNew ? '' : `<button class="btn danger" data-del aria-label="${esc(t('delete'))}">${icon('trash')}<span class="lbl">${esc(t('delete'))}</span></button>`}
      <span class="grow"></span>
      <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
      <button class="btn primary" data-save>${esc(t('save'))}</button>
    </div>`);

  const form = modal.querySelector('#perfumeForm');
  const val = id => form.querySelector(`#f_${id}`).value;
  const unitNow = () => (choice.mode === 'BULK' ? choice.unit : 'ml');

  const setErr = (id, msg, warnOnly = false) => {
    const f = form.querySelector(`[data-field="${id}"]`);
    const e = f.querySelector('.err');
    e.hidden = !msg;
    e.textContent = msg || '';
    e.classList.toggle('muted', warnOnly);
    f.classList.toggle('invalid', !!msg && !warnOnly);
  };

  function renderDecants() {
    const u = t(unitNow());
    form.querySelector('#decantRows').innerHTML = decants.map((d, i) => `
      <div class="decant-row" data-row="${i}">
        <div class="input"><input data-k="size" inputmode="decimal" autocomplete="off" value="${esc(d.size)}" placeholder="10"><span class="unit">${esc(u)}</span></div>
        <div class="input"><input data-k="price" inputmode="decimal" autocomplete="off" value="${esc(d.price)}" placeholder="${esc(t('price'))}"><span class="unit">${esc(t('currency'))}</span></div>
        <button type="button" class="remove" data-del-row="${i}" aria-label="${esc(t('remove'))}">${icon('trash')}</button>
        <small class="row-info" data-info="${i}"></small>
      </div>`).join('');
    const used = new Set(decants.map(d => Number(d.size)));
    const sizes = (choice.mode === 'BULK' && choice.unit === 'g' ? [1, 2, 3, 5, 10] : [3, 5, 10, 20, 30, 50]).filter(s => !used.has(s));
    form.querySelector('#sizeChips').innerHTML = sizes.map(s => `<button type="button" data-add-size="${s}">+ ${esc(fmtQty(s, unitNow()))}</button>`).join('') +
      `<button type="button" data-add-size="">+ ${esc(t('other_size'))}</button>`;
    validate();
  }

  function read() {
    const v = { name: val('name').trim(), brand: val('brand').trim(), mode: choice.mode, unit: choice.unit, errors: {} };
    if (v.mode === 'BOTTLE') {
      v.volume = parseIntStrict(val('volume'));
      v.stock = parseIntStrict(val('stock'));
      v.loose = val('loose').trim() ? parseQty(val('loose')) : 0;
      v.cost = parseMoney(val('cost'));
      v.price = parseMoney(val('price'));
      if (!(v.volume > 0)) v.errors.volume = t('err_volume');
      if (v.stock === null) v.errors.stock = t('err_qty');
      if (v.loose === null) v.errors.loose = t('err_qty');
      if (v.cost === null) v.errors.cost = t('err_amount');
      if (v.price === null) v.errors.price = t('err_amount');
    } else {
      v.qty = parseQty(val('qty'));
      v.ucost = parseMoney(val('ucost'));
      v.low = val('low').trim() ? parseQty(val('low')) : DEFAULT_BULK_ALERT;
      if (v.qty === null) v.errors.qty = t('err_qty');
      if (v.ucost === null) v.errors.ucost = t('err_amount');
      if (v.low === null) v.errors.low = t('err_qty');
    }
    v.uprice = val('uprice').trim() ? parseMoney(val('uprice')) : 0;
    if (v.uprice === null) v.errors.uprice = t('err_amount');
    if (!v.name) v.errors.name = t('err_required');
    if (!v.brand) v.errors.brand = t('err_required');
    v.decants = [];
    v.rowErrors = decants.map(d => {
      const size = parseQty(d.size);
      const price = parseMoney(d.price);
      if (!(size > 0) || price === null) return true;
      v.decants.push({ size, price });
      return false;
    });
    v.dup = new Set(v.decants.map(d => d.size)).size !== v.decants.length;
    v.noWay = v.mode === 'BULK' && !v.decants.length && !(v.uprice > 0);
    v.valid = !Object.keys(v.errors).length && !v.rowErrors.some(Boolean) && !v.dup && !v.noWay;
    return v;
  }

  function validate() {
    const v = read();
    const fields = choice.mode === 'BOTTLE' ? ['volume', 'stock', 'loose', 'cost', 'price'] : ['qty', 'ucost', 'low'];
    ['name', 'brand', 'uprice', ...fields].forEach(id => setErr(id, showErrors ? v.errors[id] : ''));
    if (choice.mode === 'BOTTLE' && !v.errors.cost && !v.errors.price && v.price < v.cost) setErr('price', t('warn_below'), true);
    // Coût et marge de chaque taille
    const cpu = choice.mode === 'BOTTLE' ? (v.volume > 0 && v.cost !== null ? v.cost / v.volume : null) : v.ucost;
    decants.forEach((d, i) => {
      const info = form.querySelector(`[data-info="${i}"]`);
      const row = form.querySelector(`[data-row="${i}"]`);
      if (!info) return;
      const size = parseQty(d.size), price = parseMoney(d.price);
      row.classList.toggle('invalid', showErrors && v.rowErrors[i]);
      if (cpu != null && size > 0 && price !== null) {
        const c = Math.round(cpu * size + emptyBottleCost(size, state.settings.emptyBottles));
        info.textContent = `${t('cost')} ${money(c)} · ${t('margin')} ${money(price - c)}`;
        info.className = 'row-info ' + (price - c < 0 ? 'loss' : 'gain');
      } else if (cpu != null && size > 0 && choice.mode === 'BOTTLE' && v.price) {
        info.textContent = t('suggested', money(Math.round((v.price / v.volume) * size / 100) * 100));
        info.className = 'row-info muted';
      } else info.textContent = '';
    });
    const line = form.querySelector('#marginLine');
    if (choice.mode === 'BOTTLE' && v.cost !== null && v.price !== null && !v.errors.cost && !v.errors.price) {
      line.textContent = t('margin_unit', money(v.price - v.cost));
      line.className = 'margin-line ' + (v.price - v.cost < 0 ? 'err' : 'ok');
    } else line.textContent = '';
    const fe = form.querySelector('#formError');
    const msg = v.dup ? t('err_dup_size') : v.noWay ? t('err_bulk_way') : '';
    fe.hidden = !(showErrors && msg);
    fe.textContent = msg;
    form.querySelector('#modeHint').textContent = t(choice.mode === 'BOTTLE' ? 'mode_bottle_hint' : 'mode_bulk_hint');
    return v;
  }

  function renderSuggestions() {
    const typed = val('brand').trim().toLowerCase();
    const list = brands.filter(b => !typed || (b.toLowerCase().includes(typed) && b.toLowerCase() !== typed)).slice(0, 8);
    form.querySelector('#brandSuggest').innerHTML = list.map(b => `<button type="button" data-brand="${esc(b)}">${esc(b)}</button>`).join('');
  }

  function refreshUnits() {
    const u = t(unitNow());
    form.querySelectorAll('[data-unit-of="qty"], [data-unit-of="low"]').forEach(el => { el.textContent = t(choice.unit); });
    form.querySelector('[data-field="ucost"] .label').textContent = t('cost_per', t(choice.unit));
    form.querySelector('[data-field="uprice"] .label').textContent = `${t('price_per', u)} — ${t('other_qty')}`;
    renderDecants();
  }

  form.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'f_volume' || el.id === 'f_stock') el.value = cleanInteger(el.value, el.id === 'f_volume' ? 5 : 6);
    else if (['f_cost', 'f_price', 'f_ucost', 'f_uprice', 'f_loose', 'f_qty', 'f_low'].includes(el.id)) el.value = cleanDecimal(el.value);
    if (el.dataset.k) {
      el.value = cleanDecimal(el.value);
      decants[Number(el.closest('[data-row]').dataset.row)][el.dataset.k] = el.value;
    }
    if (el.id === 'f_brand') renderSuggestions();
    validate();
  });
  form.addEventListener('click', e => {
    const b = e.target.closest('[data-brand]');
    if (b) { form.querySelector('#f_brand').value = b.dataset.brand; renderSuggestions(); validate(); return; }
    const o = e.target.closest('[data-opt]');
    if (o) {
      choice[o.dataset.opt] = o.dataset.value;
      form.querySelectorAll(`[data-opt="${o.dataset.opt}"]`).forEach(x => x.setAttribute('aria-pressed', x === o));
      if (o.dataset.opt === 'mode') form.querySelectorAll('.mode-block').forEach(bl => { bl.hidden = bl.dataset.mode !== choice.mode; });
      if (o.dataset.opt === 'mode' || o.dataset.opt === 'unit') refreshUnits();
      validate();
      return;
    }
    const add = e.target.closest('[data-add-size]');
    if (add) {
      decants.push({ size: add.dataset.addSize, price: '' });
      renderDecants();
      const rows = form.querySelectorAll('.decant-row');
      rows[rows.length - 1].querySelector(add.dataset.addSize ? '[data-k="price"]' : '[data-k="size"]').focus();
      return;
    }
    const del = e.target.closest('[data-del-row]');
    if (del) { decants.splice(Number(del.dataset.delRow), 1); renderDecants(); }
  });

  async function save() {
    if (saving) return;
    showErrors = true;
    const v = validate();
    if (!v.valid) { form.querySelector('.invalid input, .field.invalid input')?.focus(); return; }
    saving = true;
    const bottle = v.mode === 'BOTTLE';
    const record = {
      ...(isNew ? {} : { id: perfume.id, createdAt: perfume.createdAt }),
      name: v.name, brand: v.brand, gender: choice.gender, type: choice.type, mode: v.mode, unit: bottle ? 'ml' : choice.unit,
      volumeMl: bottle ? v.volume : 0, stock: bottle ? v.stock : 0, loose: bottle ? v.loose : v.qty,
      purchasePrice: bottle ? v.cost : v.ucost, salePrice: bottle ? v.price : 0,
      unitPrice: v.uprice || 0, decants: v.decants, lowAt: bottle ? 0 : v.low,
    };
    closeModal();
    await guard(async () => {
      const id = await repo.savePerfume(record);
      requestPersistence();
      await refresh();
      toast(t('saved', record.name));
      if (!isNew) openPerfumeFiche(id);
    });
  }

  form.addEventListener('submit', e => { e.preventDefault(); save(); });
  modal.querySelector('[data-save]').addEventListener('click', save);
  modal.querySelector('[data-del]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: t('del_t'), message: t('del_m', perfume.name), confirm: t('delete'), danger: true });
    if (!ok) return;
    await guard(async () => {
      await repo.deletePerfume(perfume.id);
      for (const [k, l] of [...state.cart]) if (l.perfumeId === perfume.id) state.cart.delete(k);
      await refresh();
      toast(t('deleted', perfume.name));
    });
  });

  renderSuggestions();
  renderDecants();
  if (isNew) setTimeout(() => form.querySelector('#f_name').focus(), 60);
}

/* ---------- Entrée de stock ---------- */

function openReception(preId) {
  if (!preId) {
    const modal = openModal(`
      <header><h2 class="grow">${esc(t('reception'))}</h2><button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
      <div class="body">
        <label class="search">${icon('search')}<input id="rcSearch" type="search" autocomplete="off" placeholder="${esc(t('choose_product'))}"></label>
        <div id="rcList" class="pick-list"></div>
      </div>`);
    const list = modal.querySelector('#rcList');
    const draw = () => {
      const tokens = searchTokens(modal.querySelector('#rcSearch').value);
      list.innerHTML = state.perfumes.filter(p => matches(p, tokens)).slice(0, 60).map(p =>
        `<button class="pick-row" data-pid="${p.id}"><span><small class="brand">${esc(p.brand)}</small><span class="name">${esc(p.name)}</span></span><span class="muted">${esc(stockText(p))}</span></button>`).join('')
        || `<p class="muted">${esc(t('no_results_t'))}</p>`;
    };
    modal.querySelector('#rcSearch').addEventListener('input', draw);
    list.addEventListener('click', e => { const b = e.target.closest('[data-pid]'); if (b) openReception(Number(b.dataset.pid)); });
    draw();
    setTimeout(() => modal.querySelector('#rcSearch').focus(), 60);
    return;
  }
  const p = perfumeById(preId);
  if (!p) return;
  const bottle = p.mode === 'BOTTLE';
  const modal = openModal(`
    <header><div class="grow"><h2>${esc(t('reception'))}</h2><p>${esc(p.brand)} — ${esc(p.name)}${bottle ? ` ${esc(fmtQty(p.volumeMl, 'ml'))}` : ''}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <form class="body" novalidate>
      <div class="two">
        <div class="field" data-field="n"><label class="label" for="rc_n">${esc(t(bottle ? 'rc_bottles' : 'rc_qty'))}</label>
          <div class="input"><input id="rc_n" inputmode="${bottle ? 'numeric' : 'decimal'}" autocomplete="off"><span class="unit">${esc(bottle ? '' : t(p.unit))}</span></div></div>
        <div class="field" data-field="c"><label class="label" for="rc_c">${esc(t(bottle ? 'rc_unit_cost' : 'rc_total_cost'))}</label>
          <div class="input"><input id="rc_c" inputmode="decimal" autocomplete="off" value="${bottle ? esc(moneyInput(p.purchasePrice)) : ''}"><span class="unit">${esc(t('currency'))}</span></div></div>
      </div>
      <div class="field"><label class="label" for="rc_s">${esc(t('supplier'))}</label>
        <div class="input"><input id="rc_s" autocomplete="off" maxlength="60" placeholder="${esc(t('optional'))}"></div>
        <div class="suggest" id="rcSup"></div></div>
      <div class="field"><label class="label" for="rc_note">${esc(t('note'))}</label>
        <div class="input"><input id="rc_note" autocomplete="off" maxlength="120" placeholder="${esc(t('optional'))}"></div></div>
      <div class="hint" id="rcInfo"></div>
      <button type="submit" hidden></button>
    </form>
    <div class="foot"><span class="grow"></span>
      <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
      <button class="btn primary" data-save>${esc(t('save'))}</button></div>`);
  const $m = s => modal.querySelector(s);
  let showErrors = false, saving = false;
  const read = () => {
    const n = bottle ? parseIntStrict($m('#rc_n').value) : parseQty($m('#rc_n').value);
    const c = parseMoney($m('#rc_c').value);
    const ok = n > 0 && c !== null;
    $m('[data-field="n"]').classList.toggle('invalid', showErrors && !(n > 0));
    $m('[data-field="c"]').classList.toggle('invalid', showErrors && c === null);
    const info = $m('#rcInfo');
    if (ok) {
      if (bottle) {
        const have = Math.max(0, p.stock + (p.volumeMl ? p.loose / p.volumeMl : 0));
        const avg = have > 0 ? Math.round((p.purchasePrice * have + c * n) / (have + n) / 100) * 100 : c;
        info.textContent = t('rc_preview', t('bottles_n', p.stock + n), money(avg));
      } else {
        const have = Math.max(0, p.loose);
        const avg = have > 0 ? (p.purchasePrice * have + c) / (have + n) : c / n;
        info.textContent = t('rc_preview', fmtQty(p.loose + n, p.unit), `${money(Math.round(avg))}/${t(p.unit)}`);
      }
    } else info.textContent = '';
    return ok ? { n, c } : null;
  };
  const drawSup = () => {
    const typed = $m('#rc_s').value.trim().toLowerCase();
    $m('#rcSup').innerHTML = state.settings.suppliers
      .filter(s => !typed || (s.toLowerCase().includes(typed) && s.toLowerCase() !== typed)).slice(0, 8)
      .map(s => `<button type="button" data-sup="${esc(s)}">${esc(s)}</button>`).join('');
  };
  modal.addEventListener('input', e => {
    if (e.target.id === 'rc_n') e.target.value = bottle ? cleanInteger(e.target.value) : cleanDecimal(e.target.value);
    if (e.target.id === 'rc_c') e.target.value = cleanDecimal(e.target.value);
    if (e.target.id === 'rc_s') drawSup();
    read();
  });
  modal.addEventListener('click', e => {
    const s = e.target.closest('[data-sup]');
    if (s) { $m('#rc_s').value = s.dataset.sup; drawSup(); }
  });
  const save = async () => {
    if (saving) return;
    showErrors = true;
    const v = read();
    if (!v) return;
    saving = true;
    const supplier = $m('#rc_s').value.trim();
    const note = $m('#rc_note').value.trim();
    closeModal();
    await guard(async () => {
      const res = await repo.receive(bottle
        ? { perfumeId: p.id, bottles: v.n, unitCost: v.c, supplier, note }
        : { perfumeId: p.id, qty: v.n, totalCost: v.c, supplier, note });
      await refresh();
      if (res.type === 'ok') {
        toast(t('received_done', bottle ? t('bottles_n', v.n) : fmtQty(v.n, p.unit), p.name));
        openPerfumeFiche(p.id);
      } else toast(t('missing'));
    });
  };
  $m('form').addEventListener('submit', e => { e.preventDefault(); save(); });
  $m('[data-save]').addEventListener('click', save);
  drawSup();
  setTimeout(() => $m('#rc_n').focus(), 60);
}

/* ====================================================================== */
/* Clients                                                                */
/* ====================================================================== */

function renderClients() {
  const box = $('#clientsBody');
  if (!state.ready) { box.innerHTML = ''; return; }
  $('#fabClient').hidden = state.clients.length === 0;
  if (!state.clients.length) {
    box.innerHTML = emptyBlock('user', t('clients_empty_t'), t('clients_empty_m'),
      `<button class="btn primary" data-action="new-client">${icon('plus')}${esc(t('new_client'))}</button>`);
    return;
  }
  const tokens = searchTokens($('#clientSearch').value);
  const owing = state.clients.filter(c => debtOf(c.id) > 0);
  const total = owing.reduce((s, c) => s + debtOf(c.id), 0);
  const items = state.clients
    .filter(c => !tokens.length || tokens.every(tk => searchKey(`${c.name} ${c.phone || ''}`).includes(tk)))
    .sort((a, b) => debtOf(b.id) - debtOf(a.id) || a.name.localeCompare(b.name));
  box.innerHTML = `
    <div class="figures">
      <div class="figure"><small>${esc(t('debts_total'))}</small><span class="num ${total > 0 ? 'loss' : ''}">${money(total)}</span></div>
      <div class="figure"><small>${esc(t('debtors'))}</small><span class="num">${owing.length}</span></div>
      <div class="figure"><small>${esc(t('clients_count'))}</small><span class="num">${state.clients.length}</span></div>
    </div>
    <div class="list">
      ${items.length ? items.map(c => {
        const d = debtOf(c.id);
        return `<button class="row" data-action="client" data-id="${c.id}">
          <span><span class="name">${esc(c.name)}</span><span class="meta">${c.phone ? `<span class="num" dir="ltr">${esc(c.phone)}</span>` : ''}</span></span>
          <span class="side">${d > 0 ? `<span class="pill low">${esc(t('owes', money(d)))}</span>` : `<span class="pill">${esc(t('up_to_date'))}</span>`}</span>
        </button>`;
      }).join('') : emptyBlock('search', t('no_results_t'), t('no_results_m'))}
    </div>`;
}

function openClientPicker() {
  const modal = openModal(`
    <header><h2 class="grow">${esc(t('choose_client'))}</h2><button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <label class="search">${icon('search')}<input id="cpSearch" type="search" autocomplete="off" placeholder="${esc(t('search_client'))}"></label>
      <button class="btn ghost block" data-new>${icon('plus')}${esc(t('new_client'))}</button>
      <div id="cpList" class="pick-list"></div>
    </div>`);
  const list = modal.querySelector('#cpList');
  const draw = () => {
    const tokens = searchTokens(modal.querySelector('#cpSearch').value);
    list.innerHTML = state.clients
      .filter(c => !tokens.length || tokens.every(tk => searchKey(`${c.name} ${c.phone || ''}`).includes(tk)))
      .slice(0, 80).map(c => `<button class="pick-row" data-cid="${c.id}"><span><span class="name">${esc(c.name)}</span><small class="num" dir="ltr">${esc(c.phone || '')}</small></span>
        ${debtOf(c.id) > 0 ? `<span class="pill low">${esc(t('owes', money(debtOf(c.id))))}</span>` : ''}</button>`).join('');
  };
  modal.querySelector('#cpSearch').addEventListener('input', draw);
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-cid]');
    if (!b) return;
    state.pay.clientId = Number(b.dataset.cid);
    closeModal();
    renderCart();
  });
  modal.querySelector('[data-new]').addEventListener('click', () => openClientForm(null, id => { state.pay.clientId = id; renderCart(); }));
  draw();
}

function openClientForm(client, onSaved) {
  const isNew = !client;
  const c = client || { name: '', phone: '', note: '' };
  const modal = openModal(`
    <header><h2 class="grow">${esc(t(isNew ? 'new_client' : 'edit_client'))}</h2><button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <form class="body" novalidate>
      <div class="field" data-field="name"><label class="label" for="c_name">${esc(t('f_name'))}</label>
        <div class="input"><input id="c_name" autocomplete="off" maxlength="60" value="${esc(c.name)}"></div><div class="err" hidden>${esc(t('err_required'))}</div></div>
      <div class="field"><label class="label" for="c_phone">${esc(t('phone'))}</label>
        <div class="input"><input id="c_phone" inputmode="tel" autocomplete="off" maxlength="20" value="${esc(c.phone || '')}" placeholder="${esc(t('optional'))}"></div></div>
      <div class="field"><label class="label" for="c_note">${esc(t('note'))}</label>
        <div class="input"><input id="c_note" autocomplete="off" maxlength="120" value="${esc(c.note || '')}" placeholder="${esc(t('optional'))}"></div></div>
      ${isNew ? `<div class="field" data-field="debt"><label class="label" for="c_debt">${esc(t('opening_debt'))}</label>
        <div class="input"><input id="c_debt" inputmode="decimal" autocomplete="off" placeholder="0"><span class="unit">${esc(t('currency'))}</span></div>
        <div class="hint">${esc(t('opening_debt_hint'))}</div><div class="err" hidden>${esc(t('err_amount'))}</div></div>` : ''}
      <button type="submit" hidden></button>
    </form>
    <div class="foot"><span class="grow"></span>
      <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
      <button class="btn primary" data-save>${esc(t('save'))}</button></div>`);
  const $m = s => modal.querySelector(s);
  let saving = false;
  modal.addEventListener('input', e => { if (e.target.id === 'c_debt') e.target.value = cleanDecimal(e.target.value); });
  const save = async () => {
    if (saving) return;
    const name = $m('#c_name').value.trim();
    const debtText = isNew ? $m('#c_debt').value.trim() : '';
    const opening = debtText ? parseMoney(debtText) : 0;
    $m('[data-field="name"]').classList.toggle('invalid', !name);
    $m('[data-field="name"] .err').hidden = !!name;
    if (isNew) {
      $m('[data-field="debt"]').classList.toggle('invalid', opening === null);
      $m('[data-field="debt"] .err').hidden = opening !== null;
    }
    if (!name || opening === null) return;
    saving = true;
    const rec = { ...(isNew ? {} : { id: client.id, createdAt: client.createdAt }), name, phone: $m('#c_phone').value.trim(), note: $m('#c_note').value.trim() };
    closeModal();
    await guard(async () => {
      const id = await repo.saveClient(rec, opening || 0);
      await refresh();
      toast(t('saved', name));
      if (onSaved) onSaved(id); else openClientFiche(id);
    });
  };
  $m('form').addEventListener('submit', e => { e.preventDefault(); save(); });
  $m('[data-save]').addEventListener('click', save);
  setTimeout(() => $m('#c_name').focus(), 60);
}

function openClientFiche(id) {
  const c = clientById(id);
  if (!c) return;
  const debt = debtOf(id);
  const when = fmtDate({ day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const events = [
    ...state.sales.filter(s => s.clientId === id).map(s => ({ at: s.createdAt, s })),
    ...state.ledger.filter(e => e.clientId === id && e.type !== 'SALE').map(e => ({ at: e.at, e })),
  ].sort((a, b) => b.at - a.at);
  const row = ev => {
    if (ev.s) {
      const s = ev.s;
      return `<button class="move link" data-sale="${s.id}"><span class="when num">${when.format(s.createdAt)}</span>
        <span class="what">${esc(t('sale_no', s.id))}<small>${s.payment.credit > 0 ? esc(t('of_which_credit', money(s.payment.credit))) : esc(methodLabel(s.payment.method))}</small></span>
        <span class="delta num">${money(netTotal(s))}</span></button>`;
    }
    const e = ev.e;
    const label = { OPENING: t('opening_debt'), PAYMENT: t('payment_received'), RETURN: t('mv_return', e.saleId || '') }[e.type] || e.type;
    return `<div class="move"><span class="when num">${when.format(e.at)}</span>
      <span class="what">${esc(label)}${e.method && e.type === 'PAYMENT' ? `<small>${esc(methodLabel(e.method))}${e.note ? sep() + esc(e.note) : ''}</small>` : ''}</span>
      <span class="delta num ${e.amount < 0 ? 'gain' : 'loss'}">${signed(e.amount > 0 ? '+' : '−', money(Math.abs(e.amount)))}</span></div>`;
  };
  const modal = openModal(`
    <header><div class="grow"><h2>${esc(c.name)}</h2>${c.phone ? `<p><a class="tel" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${icon('phone', 'sm')}<span class="num" dir="ltr">${esc(c.phone)}</span></a></p>` : ''}${c.note ? `<p>${esc(c.note)}</p>` : ''}</div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <div class="debt-box ${debt > 0 ? 'owing' : ''}"><small>${esc(t(debt > 0 ? 'debt' : 'no_debt'))}</small>${debt > 0 ? `<span class="num">${money(debt)}</span>` : ''}</div>
      ${debt > 0 ? `<button class="btn primary block" data-pay>${icon('coins')}${esc(t('take_payment'))}</button>` : ''}
      <section class="sheet-sec"><h3>${esc(t('history'))}</h3>
        ${events.length ? events.map(row).join('') : `<p class="muted">${esc(t('no_history'))}</p>`}</section>
    </div>
    <div class="foot">
      ${debt === 0 ? `<button class="btn danger" data-del aria-label="${esc(t('delete'))}">${icon('trash')}<span class="lbl">${esc(t('delete'))}</span></button>` : ''}
      <span class="grow"></span>
      <button class="btn ghost" data-edit>${icon('pencil')}${esc(t('edit'))}</button>
    </div>`);
  modal.querySelector('[data-pay]')?.addEventListener('click', () => openPayment(id));
  modal.querySelector('[data-edit]').addEventListener('click', () => openClientForm(c));
  modal.querySelectorAll('[data-sale]').forEach(b => b.addEventListener('click', () => openSaleDetail(Number(b.dataset.sale))));
  modal.querySelector('[data-del]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: t('del_client_t'), message: t('del_client_m', c.name), confirm: t('delete'), danger: true });
    if (!ok) return;
    await guard(async () => {
      const res = await repo.deleteClient(id);
      if (state.pay.clientId === id) state.pay.clientId = null;
      await refresh();
      toast(res && res.type === 'has_debt' ? t('err_has_debt') : t('deleted', c.name));
    });
  });
}

function openPayment(clientId) {
  const c = clientById(clientId);
  const debt = debtOf(clientId);
  if (!c || debt <= 0) return;
  let method = 'CASH';
  const modal = openModal(`
    <header><div class="grow"><h2>${esc(t('take_payment'))}</h2><p>${esc(c.name)} — ${esc(t('owes', money(debt)))}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <form class="body" novalidate>
      <div class="field" data-field="a"><label class="label" for="pm_a">${esc(t('amount'))}</label>
        <div class="input"><input id="pm_a" inputmode="decimal" autocomplete="off" value="${esc(moneyInput(debt))}"><span class="unit">${esc(t('currency'))}</span></div>
        <div class="err" hidden></div></div>
      <div class="field"><span class="label">${esc(t('payment'))}</span>
        <div class="options">${['CASH', ...OTHER_METHODS].map(m => `<button type="button" class="chip" data-m="${m}" aria-pressed="${m === method}">${esc(methodLabel(m))}</button>`).join('')}</div></div>
      <div class="field"><label class="label" for="pm_n">${esc(t('note'))}</label>
        <div class="input"><input id="pm_n" autocomplete="off" maxlength="120" placeholder="${esc(t('optional'))}"></div></div>
      <div class="hint" id="pmInfo"></div>
      <button type="submit" hidden></button>
    </form>
    <div class="foot"><span class="grow"></span>
      <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
      <button class="btn primary" data-save>${esc(t('save'))}</button></div>`, { center: true });
  const $m = s => modal.querySelector(s);
  let saving = false;
  const read = () => {
    const v = parseMoney($m('#pm_a').value);
    const bad = v === null || v <= 0 || v > debt;
    const err = $m('[data-field="a"] .err');
    err.hidden = !bad;
    err.textContent = v !== null && v > debt ? t('err_more_than_debt', money(debt)) : t('err_amount');
    $m('[data-field="a"]').classList.toggle('invalid', bad);
    $m('#pmInfo').textContent = bad ? '' : t('left_after', money(debt - v));
    return bad ? null : v;
  };
  modal.addEventListener('input', e => { if (e.target.id === 'pm_a') { e.target.value = cleanDecimal(e.target.value); read(); } });
  modal.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    method = b.dataset.m;
    modal.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', x === b));
  });
  const save = async () => {
    if (saving) return;
    const v = read();
    if (v === null) return;
    saving = true;
    const note = $m('#pm_n').value.trim();
    closeModal();
    await guard(async () => {
      const res = await repo.addPayment({ clientId, amount: v, method, note });
      await refresh();
      if (res.type === 'ok') toast(t('payment_done', money(v), money(res.left)));
      else toast(t('err_more_than_debt', money(res.debt || 0)));
      openClientFiche(clientId);
    });
  };
  $m('form').addEventListener('submit', e => { e.preventDefault(); save(); });
  $m('[data-save]').addEventListener('click', save);
  read();
  setTimeout(() => { $m('#pm_a').focus(); $m('#pm_a').select(); }, 60);
}

/* ====================================================================== */
/* Rapports                                                               */
/* ====================================================================== */

function dayLabel(ts) {
  const today = dayStart();
  const d = dayStart(ts);
  if (d === today) return t('today');
  if (d === dayStart(today - 12 * 3600 * 1000)) return t('yesterday');
  const s = fmtDate({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function topSellers(sales, limit = 3) {
  const map = new Map();
  for (const sale of sales) {
    const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 0;
    for (const l of sale.lines) {
      const n = l.qty - (l.returned || 0);
      if (n <= 0) continue;
      const e = map.get(l.perfumeId) || { name: l.name, brand: l.brand, bottles: 0, qty: 0, unit: l.unit, revenue: 0 };
      e.revenue += n * l.unitPrice * ratio;
      if (l.kind === 'BOTTLE') e.bottles += n; else { e.qty = q2(e.qty + l.size * n); e.unit = l.unit; }
      map.set(l.perfumeId, e);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

function dayCash(start) {
  let cash = 0, creditGiven = 0, collected = 0;
  for (const s of state.sales) {
    if (s.createdAt >= start) { cash += cashOfSale(s); creditGiven += s.payment.credit || 0; }
    for (const r of s.returns) if (r.at >= start && r.refund === 'CASH') cash -= r.amount;
  }
  for (const e of state.ledger) {
    if (e.type === 'PAYMENT' && e.at >= start) {
      collected -= e.amount;
      if ((e.method || 'CASH') === 'CASH') cash -= e.amount;
    }
  }
  return { cash, creditGiven, collected };
}

function renderReports() {
  const box = $('#reportBody');
  if (!state.ready) { box.innerHTML = ''; return; }
  const start = dayStart();
  const todaySales = state.sales.filter(s => s.createdAt >= start);
  const revenue = todaySales.reduce((s, x) => s + netTotal(x), 0);
  const profit = todaySales.reduce((s, x) => s + netProfit(x), 0);
  const day = dayCash(start);
  const top = topSellers(state.topScope === 'all' ? state.sales : todaySales);
  const todayText = fmtDate({ weekday: 'long', day: 'numeric', month: 'long' }).format(Date.now());
  const since = Math.max(Number(store.get('gs.lastBackup') || 0), Number(store.get('gs.since') || Date.now()));
  const backupDue = state.sales.length > 0 && Date.now() - since > BACKUP_REMINDER_DAYS * 86400000;

  const shown = state.sales.slice(0, state.historyLimit);
  const groups = [];
  for (const s of shown) {
    const key = dayStart(s.createdAt);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, sales: [] }; groups.push(g); }
    g.sales.push(s);
  }
  const dayTotals = new Map();
  for (const s of state.sales) {
    const k = dayStart(s.createdAt);
    const e = dayTotals.get(k) || { n: 0, sum: 0 };
    e.n += 1;
    e.sum += netTotal(s);
    dayTotals.set(k, e);
  }
  const time = fmtDate({ hour: '2-digit', minute: '2-digit', hour12: false });
  const detail = e => [e.bottles ? t('bottles_n', e.bottles) : '', e.qty ? fmtQty(e.qty, e.unit) : ''].filter(Boolean).join(' + ');

  box.innerHTML = `
    ${backupDue ? `<div class="reminder">${icon('export')}<p>${esc(t('backup_due', BACKUP_REMINDER_DAYS))}</p>
      <button class="btn text" data-action="export">${esc(t('backup_now'))}</button></div>` : ''}
    <section class="takings">
      <span class="day">${esc(todayText.charAt(0).toUpperCase() + todayText.slice(1))}</span>
      <span class="caption">${esc(t('revenue_today'))}</span>
      <span class="big num">${formatAmount(revenue)}<span class="cur">${esc(t('currency'))}</span></span>
      <div class="kpis">
        <div class="kpi"><small>${esc(t('net_profit'))}</small><span class="num ${profit < 0 ? 'loss' : 'gain'}">${money(profit)}</span></div>
        <div class="kpi"><small>${esc(t('sales'))}</small><span class="num">${todaySales.length}</span></div>
        <div class="kpi"><small>${esc(t('cash_today'))}</small><span class="num">${money(day.cash)}</span></div>
      </div>
      ${day.creditGiven || day.collected ? `<p class="sub-kpi">${esc(t('credit_given'))} <span class="num">${money(day.creditGiven)}</span>${sep()}${esc(t('collected'))} <span class="num">${money(day.collected)}</span></p>` : ''}
    </section>
    <section>
      <div class="section-head stack"><h2>${esc(t('top3'))}</h2>
        <div class="seg" role="group">
          <button data-action="top-scope" data-scope="today" aria-pressed="${state.topScope === 'today'}">${esc(t('today'))}</button>
          <button data-action="top-scope" data-scope="all" aria-pressed="${state.topScope === 'all'}">${esc(t('all_time'))}</button>
        </div>
      </div>
      ${top.length ? top.map((e, i) => `
        <div class="rank"><span class="pos ${i === 0 ? 'first' : ''}">${i + 1}</span>
          <span class="who"><span class="name">${esc(e.name)}</span><small>${esc(e.brand)}</small></span>
          <span class="how"><strong class="num">${money(Math.round(e.revenue))}</strong><small>${esc(detail(e))}</small></span>
        </div>`).join('') : `<p class="muted">${esc(t('no_sales_period'))}</p>`}
    </section>
    <section class="col-history">
      <div class="section-head"><h2>${esc(t('history'))}</h2></div>
      ${groups.length ? groups.map(g => {
        const tot = dayTotals.get(g.key);
        return `<div class="dayhead"><span><strong>${esc(dayLabel(g.key))}</strong><small>${esc(t('sales_n', tot.n))}</small></span><span class="num">${money(tot.sum)}</span></div>
          ${g.sales.map(s => `<button class="sale" data-action="open-sale" data-id="${s.id}">
            <span class="time">${time.format(s.createdAt)}</span>
            <span class="what">${esc(t('sale_no', s.id))}${s.clientName ? ` · ${esc(s.clientName)}` : ''}
              <small>${esc(t('items_n', s.itemCount))}
                ${s.payment.credit > 0 ? ` <span class="badge-credit">${esc(t('pay_credit'))}</span>` : ''}
                ${s.returns.length ? ` <span class="badge-return">${esc(t('returned'))}</span>` : ''}
                ${s.discountAmount > 0 ? ` <span class="disc">${icon('tag', 'sm')}</span>` : ''}</small></span>
            <span class="amt"><span class="num">${money(netTotal(s))}</span><small class="${netProfit(s) < 0 ? 'loss' : ''}">${esc(t('profit_v', money(netProfit(s))))}</small></span>
          </button>`).join('')}`;
      }).join('') + (state.sales.length > shown.length ? `<button class="btn ghost block more" data-action="more-history">${esc(t('show_more'))}</button>` : '')
      : emptyBlock('receipt', t('history_empty_t'), t('history_empty_m'))}
    </section>`;
}

/* ---------- Détail d'une vente, retour ---------- */

function paymentSummary(s) {
  const p = s.payment;
  if (p.method === 'CREDIT') return t('paid_credit_line', money(p.paid), money(p.credit));
  if (p.method === 'CASH' && p.received) return `${t('pay_cash')} — ${t('received_change', money(p.received), money(p.change))}`;
  return methodLabel(p.method);
}

function openSaleDetail(saleId) {
  const s = state.sales.find(x => x.id === saleId);
  if (!s) return;
  const when = fmtDate({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const returnable = s.lines.some(l => l.qty - (l.returned || 0) > 0);
  const client = s.clientId ? clientById(s.clientId) : null;
  const modal = openModal(`
    <header><div class="grow"><h2>${esc(t('sale_no', s.id))}</h2><p>${esc(when.format(s.createdAt))}${s.clientName ? ` · ${esc(s.clientName)}` : ''}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <div>${s.lines.map(l => `
        <div class="detail-line"><strong>${esc(l.name)}</strong><span class="num">${money(l.qty * l.unitPrice)}</span>
          <small>${esc(l.brand)}${sep()}${esc(lineLabel(l.kind, l.size, l.unit))} — <span class="num">${l.qty}</span> × ${money(l.unitPrice)}${l.unitPrice !== l.listPrice ? ` <s>${money(l.listPrice)}</s>` : ''}</small>
          ${l.returned ? `<small class="loss">${esc(t('returned_n', l.returned))}</small>` : ''}</div>`).join('')}</div>
      <div class="totals">
        <div class="trow"><span>${esc(t('subtotal'))}</span><span class="num">${money(s.subtotal)}</span></div>
        ${s.discountAmount > 0 ? `<div class="trow discount-row"><span>${esc(s.discountMode === 'PERCENT' ? t('discount_pct', formatPercent(s.discountPercent)) : t('discount'))}</span><span class="num">${signed('−' + NBSP, money(s.discountAmount))}</span></div>` : ''}
        <div class="trow"><span><strong>${esc(t('total'))}</strong></span><span class="num grand">${money(s.total)}</span></div>
        ${s.returnedAmount ? `<div class="trow discount-row"><span>${esc(t('returns'))}</span><span class="num">${signed('−' + NBSP, money(s.returnedAmount))}</span></div>` : ''}
        <div class="trow"><span>${esc(t('purchase_cost'))}</span><span class="num">${money(netCost(s))}</span></div>
        <div class="trow profit ${netProfit(s) < 0 ? 'neg' : ''}"><span>${esc(t('profit'))}</span><span class="num">${money(netProfit(s))}</span></div>
      </div>
      <div class="kv"><span>${esc(t('payment'))}</span><span>${esc(paymentSummary(s))}</span></div>
      ${s.returns.map(r => `<div class="kv"><span>${esc(t('return_on', when.format(r.at)))}</span><span><span class="num">${signed('−', money(r.amount))}</span> <small>${esc(t(r.refund === 'DEBT' ? 'refund_debt' : 'refund_cash'))}${r.restock ? '' : ' · ' + esc(t('not_restocked'))}</small></span></div>`).join('')}
    </div>
    <div class="foot">
      ${s.returns.length ? '' : `<button class="btn danger" data-cancel-sale aria-label="${esc(t('cancel_sale'))}">${icon('trash')}<span class="lbl">${esc(t('cancel_sale'))}</span></button>`}
      <span class="grow"></span>
      ${client ? `<button class="btn ghost" data-client>${icon('user')}${esc(client.name)}</button>` : ''}
      ${returnable ? `<button class="btn primary" data-return>${icon('back')}${esc(t('do_return'))}</button>` : ''}
    </div>`);
  modal.querySelector('[data-cancel-sale]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: t('cancel_sale_t'), message: t('cancel_sale_m'), confirm: t('cancel_sale'), danger: true });
    if (ok) cancelSale(saleId);
  });
  modal.querySelector('[data-return]')?.addEventListener('click', () => openReturn(saleId));
  modal.querySelector('[data-client]')?.addEventListener('click', () => openClientFiche(client.id));
}

function openReturn(saleId) {
  const s = state.sales.find(x => x.id === saleId);
  if (!s) return;
  const ratio = s.subtotal > 0 ? s.total / s.subtotal : 0;
  const qtys = s.lines.map(() => 0);
  const hasClient = s.clientId && clientById(s.clientId);
  let restock = true;
  let refund = hasClient && debtOf(s.clientId) > 0 ? 'DEBT' : 'CASH';
  let saving = false;
  const modal = openModal(`
    <header><div class="grow"><h2>${esc(t('do_return'))}</h2><p>${esc(t('sale_no', s.id))}${s.clientName ? ` · ${esc(s.clientName)}` : ''}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body" id="rtBody"></div>
    <div class="foot"><span class="grow"></span>
      <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
      <button class="btn primary" data-save disabled>${esc(t('confirm_return'))}</button></div>`);
  const body = modal.querySelector('#rtBody');
  const amountNow = () => Math.min(Math.round(s.lines.reduce((sum, l, i) => sum + l.unitPrice * qtys[i] * ratio, 0)), netTotal(s));
  const draw = () => {
    const amount = amountNow();
    const debt = hasClient ? debtOf(s.clientId) : 0;
    if (refund === 'DEBT' && debt < amount) refund = 'CASH';
    body.innerHTML = `
      ${s.lines.map((l, i) => {
        const max = l.qty - (l.returned || 0);
        if (max <= 0) return '';
        return `<div class="line"><div class="what"><div class="name">${esc(l.name)}</div><div class="meta">${esc(lineLabel(l.kind, l.size, l.unit))} — ${money(l.unitPrice)}</div></div>
          <div class="ctrl"><button class="step" data-i="${i}" data-d="-1" aria-label="${esc(t('decrease'))}">${icon('minus', 'sm')}</button>
            <span class="qty num">${qtys[i]}</span><span class="muted num">/${max}</span>
            <button class="step" data-i="${i}" data-d="1" aria-label="${esc(t('increase'))}">${icon('plus', 'sm')}</button></div></div>`;
      }).join('')}
      <label class="check"><input type="checkbox" data-restock ${restock ? 'checked' : ''}> ${esc(t('restock'))}</label>
      ${hasClient ? `<div class="field"><span class="label">${esc(t('refund'))}</span><div class="seg" role="group">
        <button data-refund="CASH" aria-pressed="${refund === 'CASH'}">${esc(t('refund_cash'))}</button>
        <button data-refund="DEBT" aria-pressed="${refund === 'DEBT'}" ${debt >= amount && amount > 0 ? '' : 'disabled'}>${esc(t('refund_debt'))}</button></div>
        ${debt > 0 ? `<div class="hint">${esc(t('owes', money(debt)))}</div>` : ''}</div>` : ''}
      <div class="change"><span>${esc(t(refund === 'DEBT' ? 'to_deduct' : 'to_refund'))}</span><span class="num">${money(amount)}</span></div>`;
    modal.querySelector('[data-save]').disabled = !qtys.some(q => q > 0);
  };
  body.addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (b) {
      const i = Number(b.dataset.i);
      const max = s.lines[i].qty - (s.lines[i].returned || 0);
      qtys[i] = Math.min(max, Math.max(0, qtys[i] + Number(b.dataset.d)));
      draw();
      return;
    }
    const r = e.target.closest('[data-refund]');
    if (r && !r.disabled) { refund = r.dataset.refund; draw(); }
  });
  body.addEventListener('change', e => { if (e.target.matches('[data-restock]')) restock = e.target.checked; });
  modal.querySelector('[data-save]').addEventListener('click', async () => {
    if (saving) return;
    const items = qtys.map((q, index) => ({ index, qty: q })).filter(x => x.qty > 0);
    if (!items.length) return;
    saving = true;
    closeModal();
    await guard(async () => {
      const res = await repo.returnItems({ saleId, items, restock, refund });
      await refresh();
      if (res.type === 'ok') {
        toast(t(res.refund === 'DEBT' ? 'return_done_debt' : 'return_done_cash', money(res.amount)));
        openSaleDetail(saleId);
      } else toast(t('error'));
    });
  });
  draw();
}

/* ====================================================================== */
/* Fenêtres génériques                                                    */
/* ====================================================================== */

let closeCurrentModal = null;

function openModal(html, { center = false, onClose } = {}) {
  closeModal();
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal ${center ? 'center' : ''}" role="dialog" aria-modal="true">
    <div class="backdrop" data-close></div><div class="panel">${html}</div></div>`;
  const modal = root.firstElementChild;
  const onKey = e => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', onKey);
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  closeCurrentModal = () => {
    document.removeEventListener('keydown', onKey);
    root.innerHTML = '';
    closeCurrentModal = null;
    if (onClose) onClose();
  };
  return modal;
}
function closeModal() { if (closeCurrentModal) closeCurrentModal(); }

function confirmDialog({ title, message, confirm, danger = false }) {
  return new Promise(resolve => {
    let answered = false;
    const modal = openModal(`
      <header><h2 class="grow">${esc(title)}</h2></header>
      <div class="body"><p>${esc(message)}</p></div>
      <div class="foot"><span class="grow"></span>
        <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(confirm)}</button>
      </div>`, { center: true, onClose: () => { if (!answered) resolve(false); } });
    modal.querySelector('[data-ok]').addEventListener('click', () => { answered = true; closeModal(); resolve(true); });
  });
}

/* ---------- Réglages ---------- */

function openSettings() {
  const theme = store.get('gs.theme') || 'system';
  const last = Number(store.get('gs.lastBackup') || 0);
  const lastText = last ? fmtDate({ day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(last) : t('never');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let bottles = state.settings.emptyBottles.map(e => ({ size: fmtNum(e.size).replace(',', '.'), cost: moneyInput(e.cost) }));
  const seg = (action, items, current) => `<div class="seg" role="group">${items.map(([v, label]) =>
    `<button data-set="${action}" data-value="${v}" aria-pressed="${current === v}">${esc(label)}</button>`).join('')}</div>`;

  const modal = openModal(`
    <header><h2 class="grow">${esc(t('settings'))}</h2><button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <div class="setting-group"><h3>${esc(t('language'))}</h3>${seg('lang', [['ar', 'العربية'], ['fr', 'Français'], ['en', 'English']], lang)}</div>
      <div class="setting-group"><h3>${esc(t('theme'))}</h3>${seg('theme', [['system', t('th_system')], ['light', t('th_light')], ['dark', t('th_dark')]], theme)}</div>
      <div class="setting-group"><h3>${esc(t('empty_bottles'))}</h3>
        <p class="hint">${esc(t('empty_bottles_hint'))}</p>
        <div id="ebRows"></div>
        <div class="row-inline"><button class="btn ghost" data-eb-add>${icon('plus')}${esc(t('add_size'))}</button>
          <span class="grow"></span><button class="btn primary" data-eb-save>${esc(t('save'))}</button></div>
        <div class="err" id="ebErr" hidden>${esc(t('err_amount'))}</div>
      </div>
      <div class="setting-group"><h3>${esc(t('backup'))}</h3>
        <p class="hint">${esc(t('backup_hint'))}</p>
        <p class="hint">${esc(t('last_backup', lastText))}</p>
        <button class="btn primary block" data-run="export">${icon('export')}${esc(t('backup_export'))}</button>
        <button class="btn ghost block" data-run="import">${icon('import')}${esc(t('backup_import'))}</button></div>
      ${ios && !standalone ? `<div class="setting-group"><h3>${esc(t('install_t'))}</h3><p class="hint">${esc(t('install_m'))}</p></div>` : ''}
      <p class="version">Golden Sense — ${esc(t('version', APP_VERSION))}</p>
    </div>`);
  const rows = modal.querySelector('#ebRows');
  const drawRows = () => {
    rows.innerHTML = bottles.map((b, i) => `<div class="decant-row" data-eb="${i}">
      <div class="input"><input data-k="size" inputmode="decimal" autocomplete="off" value="${esc(b.size)}" placeholder="10"><span class="unit">${esc(t('ml'))}</span></div>
      <div class="input"><input data-k="cost" inputmode="decimal" autocomplete="off" value="${esc(b.cost)}" placeholder="${esc(t('cost'))}"><span class="unit">${esc(t('currency'))}</span></div>
      <button type="button" class="remove" data-eb-del="${i}" aria-label="${esc(t('remove'))}">${icon('trash')}</button></div>`).join('');
  };
  rows.addEventListener('input', e => {
    const r = e.target.closest('[data-eb]');
    if (!r) return;
    e.target.value = cleanDecimal(e.target.value);
    bottles[Number(r.dataset.eb)][e.target.dataset.k] = e.target.value;
  });
  modal.addEventListener('click', async e => {
    const s = e.target.closest('[data-set]');
    if (s) {
      if (s.dataset.set === 'lang') setLanguage(s.dataset.value);
      if (s.dataset.set === 'theme') { store.set('gs.theme', s.dataset.value); applyTheme(); }
      openSettings();
      return;
    }
    if (e.target.closest('[data-eb-add]')) { bottles.push({ size: '', cost: '' }); drawRows(); rows.querySelector('[data-eb]:last-child input')?.focus(); return; }
    const del = e.target.closest('[data-eb-del]');
    if (del) { bottles.splice(Number(del.dataset.ebDel), 1); drawRows(); return; }
    if (e.target.closest('[data-eb-save]')) {
      const parsed = bottles.filter(b => b.size || b.cost).map(b => ({ size: parseQty(b.size), cost: parseMoney(b.cost) }));
      const bad = parsed.some(b => !(b.size > 0) || b.cost === null);
      modal.querySelector('#ebErr').hidden = !bad;
      if (bad) return;
      await guard(async () => {
        await repo.setMeta('emptyBottles', parsed.sort((a, b) => a.size - b.size));
        await refresh();
        toast(t('saved', t('empty_bottles')));
      });
      return;
    }
    const r = e.target.closest('[data-run]');
    if (r && r.dataset.run === 'export') exportBackup();
    if (r && r.dataset.run === 'import') $('#restoreInput').click();
  });
  drawRows();
}

/* ====================================================================== */
/* Actions générales                                                      */
/* ====================================================================== */

async function refresh() {
  await reload();
  renderAll();
}

async function guard(fn) {
  try { await fn(); } catch (e) { console.error(e); toast(t('error')); }
}

function requestPersistence() {
  try { navigator.storage?.persist?.(); } catch (e) { /* non disponible */ }
}

async function cancelSale(saleId) {
  closeModal();
  await guard(async () => {
    const res = await repo.cancelSale(saleId);
    await refresh();
    toast(res && res.type === 'has_returns' ? t('err_has_returns') : t('sale_cancelled'));
  });
}

async function loadSample(button) {
  if (button) button.disabled = true;
  await guard(async () => {
    const added = await repo.insertSample();
    await refresh();
    if (added) toast(t('sample_loaded'));
  });
}

function setLanguage(next) {
  if (!STR[next]) return;
  lang = next;
  store.set('gs.lang', next);
  applyLanguage();
  renderAll();
}

async function exportBackup() {
  const data = await buildBackup();
  const d = new Date();
  const name = `golden-sense-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const markDone = () => { store.set('gs.lastBackup', String(Date.now())); toast(t('exported')); renderReports(); };
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      markDone();
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  markDone();
}

async function restoreFromFile(file) {
  let raw;
  try { raw = JSON.parse(await file.text()); } catch (e) { raw = null; }
  const data = readBackup(raw);
  if (!data) { toast(t('restore_bad')); return; }
  const ok = await confirmDialog({
    title: t('restore_t'),
    message: t('restore_m', state.perfumes.length, state.sales.length, data.perfumes.length, data.sales.length),
    confirm: t('restore'), danger: true,
  });
  if (!ok) return;
  await guard(async () => {
    await repo.replaceAll(data);
    state.cart.clear();
    resetSale();
    await refresh();
    toast(t('restored'));
  });
}

let toastTimer = null;
function toast(message, { action, onAction, duration = 3500 } = {}) {
  const root = $('#toastRoot');
  clearTimeout(toastTimer);
  const top = !!closeCurrentModal || state.cartOpen;
  const fab = !top && ((state.tab === 'stock' && !$('#fab').hidden) || (state.tab === 'clients' && !$('#fabClient').hidden));
  root.innerHTML = `<div class="toast ${top ? 'top' : ''} ${fab ? 'above-fab' : ''}" role="status"><span class="msg">${esc(message)}</span>${action ? `<button>${esc(action)}</button>` : ''}</div>`;
  root.querySelector('.msg').addEventListener('click', () => { root.innerHTML = ''; });
  if (action) root.querySelector('button').addEventListener('click', () => { root.innerHTML = ''; onAction(); });
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, duration);
}

/* ====================================================================== */
/* Événements                                                             */
/* ====================================================================== */

document.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) {
    state.tab = tab.dataset.tab;
    setCartOpen(false);
    renderNav();
    if (state.tab === 'reports') renderReports();
    window.scrollTo(0, 0);
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('#modalRoot')) return;
  const id = el.dataset.id ? Number(el.dataset.id) : null;
  const key = el.dataset.key;
  switch (el.dataset.action) {
    case 'pick': pickProduct(id); break;
    case 'qty': changeQty(key, Number(el.dataset.delta)); break;
    case 'remove': state.cart.delete(key); renderCatalog(); renderCart(); break;
    case 'line-price': openLinePrice(key); break;
    case 'clear-cart': state.cart.clear(); resetSale(); renderCatalog(); renderCart(); break;
    case 'open-cart': setCartOpen(true); break;
    case 'close-cart': setCartOpen(false); break;
    case 'checkout': checkout(); break;
    case 'discount-mode':
      if (state.discountMode !== el.dataset.mode) {
        state.discountMode = el.dataset.mode;
        state.discountText = '';
        renderCart();
        $('#discountInput')?.focus();
      }
      break;
    case 'pay-method': {
      const m = el.dataset.method === 'OTHER' ? state.pay.other : el.dataset.method;
      if (state.pay.method !== m) {
        state.pay.method = m;
        state.pay.receivedText = '';
        state.pay.paidText = '';
        renderCart();
        if (m === 'CREDIT' && !state.pay.clientId) openClientPicker();
      }
      break;
    }
    case 'pay-other': state.pay.method = el.dataset.method; state.pay.other = el.dataset.method; renderCart(); break;
    case 'received-set': {
      state.pay.receivedText = moneyInput(Number(el.dataset.value));
      const inp = $('#receivedInput');
      if (inp) inp.value = state.pay.receivedText;
      renderCartLive();
      break;
    }
    case 'pick-client': openClientPicker(); break;
    case 'unset-client': state.pay.clientId = null; renderCart(); break;
    case 'filter': {
      const kind = el.dataset.kind;
      state[kind] = state[kind] === el.dataset.value ? null : el.dataset.value;
      renderChips();
      renderCatalog();
      break;
    }
    case 'clear-search': {
      const input = $('#' + el.dataset.target);
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      break;
    }
    case 'go-stock': state.tab = 'stock'; renderNav(); break;
    case 'new-perfume': openEditor(null); break;
    case 'fiche': openPerfumeFiche(id); break;
    case 'reception': openReception(null); break;
    case 'load-sample': loadSample(el); break;
    case 'toggle-low': state.lowOnly = !state.lowOnly; renderStock(); break;
    case 'new-client': openClientForm(null); break;
    case 'client': openClientFiche(id); break;
    case 'top-scope': state.topScope = el.dataset.scope; renderReports(); break;
    case 'more-history': state.historyLimit += HISTORY_PAGE; renderReports(); break;
    case 'open-sale': openSaleDetail(id); break;
    case 'export': exportBackup(); break;
    case 'settings': openSettings(); break;
  }
});

document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'posSearch' || id === 'stockSearch' || id === 'clientSearch') {
    e.target.parentElement.querySelector('.clear').hidden = !e.target.value;
    if (id === 'posSearch') renderCatalog(); else if (id === 'stockSearch') renderStock(); else renderClients();
  } else if (id === 'discountInput' || id === 'receivedInput' || id === 'paidInput') {
    const cleaned = cleanDecimal(e.target.value);
    if (cleaned !== e.target.value) e.target.value = cleaned;
    if (id === 'discountInput') state.discountText = cleaned;
    if (id === 'receivedInput') state.pay.receivedText = cleaned;
    if (id === 'paidInput') state.pay.paidText = cleaned;
    renderCartLive();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ['posSearch', 'stockSearch', 'clientSearch'].includes(e.target.id)) e.target.blur();
});

$('#restoreInput').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  closeModal();
  if (file) restoreFromFile(file);
});

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

let lastDay = dayStart();
setInterval(() => {
  if (dayStart() !== lastDay) { lastDay = dayStart(); renderReports(); }
}, 30000);

/* ====================================================================== */
/* Démarrage                                                              */
/* ====================================================================== */

async function start() {
  if (!store.get('gs.since')) store.set('gs.since', String(Date.now()));
  applyTheme();
  applyLanguage();
  renderNav();
  try {
    db = await openDb();
    db.onversionchange = () => { db.close(); location.reload(); };
    await refresh();
  } catch (e) {
    console.error(e);
    $('#catalogList').innerHTML = emptyBlock('warn', t('error'), t('storage_error'));
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) toast(t('update_ready'), { action: t('reload'), duration: 12000, onAction: () => location.reload() });
    });
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker', err));
  }
}

start();

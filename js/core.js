/* Golden Sense — noyau : montants, règles de stock, calculs et base de données (IndexedDB).
 * Montants en centimes de dinar. Quantités de vrac/décants en ml ou en g (2 décimales max). */
'use strict';

const APP_VERSION = '1.1.0';
const LOW_STOCK = 3;               // flacons : « stock bas » strictement en dessous
const DEFAULT_BULK_ALERT = 100;    // vrac : seuil d'alerte par défaut (ml ou g)
const HISTORY_PAGE = 100;
const BACKUP_REMINDER_DAYS = 7;
const NBSP = ' ';
const OTHER_METHODS = ['CCP', 'BARIDIMOB'];
const GENDERS = ['MEN', 'WOMEN', 'UNISEX'];
const TYPES = ['EDP', 'EDT', 'OIL'];

const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* stockage indisponible */ } },
};

/* ====================================================================== */
/* Nombres et saisie                                                      */
/* ====================================================================== */

const q2 = x => Math.round(x * 100) / 100;

function normalizeDigits(s) {
  return String(s ?? '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/٫/g, '.');
}

/** "4500", "4 500", "4500,50", "٤٥٠٠" → centimes ; null si invalide. */
function parseMoney(input) {
  const c = normalizeDigits(input).replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(c)) return null;
  const [units, frac = ''] = c.split('.');
  const cents = Number(units) * 100 + Number((frac + '00').slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

function parseIntStrict(input) {
  const c = normalizeDigits(input).trim();
  return /^\d{1,7}$/.test(c) ? Number(c) : null;
}

/** Quantité en ml/g : "10", "2,5", "٣" → nombre ; null si invalide. */
function parseQty(input) {
  const c = normalizeDigits(input).trim().replace(',', '.');
  return /^\d{1,6}(\.\d{1,2})?$/.test(c) ? Number(c) : null;
}

function formatAmount(cents) {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const units = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const frac = abs % 100;
  return (negative ? '-' : '') + units + (frac ? ',' + String(frac).padStart(2, '0') : '');
}

function moneyInput(cents) {
  const c = Math.round(cents);
  const frac = c % 100;
  return frac ? `${Math.floor(c / 100)}.${String(frac).padStart(2, '0')}` : String(c / 100);
}

function formatPercent(p) { return String(Math.round(p * 100) / 100); }
function cleanDecimal(s) { return normalizeDigits(s).replace(/[^0-9.,]/g, '').slice(0, 12); }
function cleanInteger(s, max = 6) { return normalizeDigits(s).replace(/[^0-9]/g, '').slice(0, max); }

function searchKey(s) { return String(s).toLowerCase().normalize('NFD').replace(/\p{Mn}+/gu, ''); }
function searchTokens(q) { return searchKey(q).split(/\s+/).filter(Boolean); }
function matches(p, tokens) {
  if (!tokens.length) return true;
  const hay = searchKey(`${p.name} ${p.brand} ${p.volumeMl ? `${p.volumeMl}ml ${p.volumeMl}` : ''}`);
  return tokens.every(tk => hay.includes(tk));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ====================================================================== */
/* Produits : flacons, flacon ouvert, décants, vrac                       */
/* ====================================================================== */

/**
 * mode BOTTLE : vendu au flacon (stock = flacons fermés) ; `loose` = ml restants du flacon ouvert pour les décants.
 *   purchasePrice / salePrice = prix d'un flacon.
 * mode BULK : vrac (huiles), `loose` = quantité en ml ou g ; purchasePrice = coût d'1 ml/g.
 * decants : tailles proposées [{ size, price }] ; unitPrice = prix de vente d'1 ml/g pour « autre quantité » (0 = non proposé).
 */
function normPerfume(p) {
  const mode = p.mode === 'BULK' ? 'BULK' : 'BOTTLE';
  const out = {
    ...p,
    name: String(p.name || ''),
    brand: String(p.brand || ''),
    gender: GENDERS.includes(p.gender) ? p.gender : 'UNISEX',
    type: TYPES.includes(p.type) ? p.type : 'EDP',
    mode,
    unit: mode === 'BULK' && p.unit === 'g' ? 'g' : 'ml',
    volumeMl: mode === 'BOTTLE' ? (Number(p.volumeMl) || 0) : 0,
    stock: mode === 'BOTTLE' ? (Number(p.stock) || 0) : 0,
    loose: q2(Number(p.loose) || 0),
    purchasePrice: Number(p.purchasePrice) || 0,
    salePrice: mode === 'BOTTLE' ? (Number(p.salePrice) || 0) : 0,
    unitPrice: Number(p.unitPrice) || 0,
    decants: (Array.isArray(p.decants) ? p.decants : [])
      .filter(d => d && Number(d.size) > 0 && Number(d.price) >= 0)
      .map(d => ({ size: q2(Number(d.size)), price: Math.round(Number(d.price)) }))
      .sort((a, b) => a.size - b.size),
    lowAt: mode === 'BULK' ? (Number(p.lowAt) > 0 ? Number(p.lowAt) : DEFAULT_BULK_ALERT) : 0,
    createdAt: p.createdAt || Date.now(),
  };
  return out;
}

const costPerUnit = p => (p.mode === 'BULK' ? p.purchasePrice : (p.volumeMl > 0 ? p.purchasePrice / p.volumeMl : 0));
const isOut = p => (p.mode === 'BULK' ? p.loose <= 0 : p.stock <= 0 && p.loose <= 0);
const isLow = p => (p.mode === 'BULK' ? p.loose < p.lowAt : p.stock < LOW_STOCK);
const sellsPortions = p => p.mode === 'BULK' || p.decants.length > 0 || p.unitPrice > 0;

/** Nombre de flacons fermés à ouvrir pour servir `qty` ml en décants. */
function bottlesToOpen(p, qty) {
  if (p.mode !== 'BOTTLE' || qty <= p.loose + 1e-9 || p.volumeMl <= 0) return 0;
  return Math.ceil(q2(qty - p.loose) / p.volumeMl - 1e-9);
}

/** Le stock permet-il de vendre `bottles` flacons et `qty` ml/g en décants ? */
function fits(p, bottles, qty) {
  if (p.mode === 'BULK') return bottles === 0 && qty <= p.loose + 1e-9;
  if (p.volumeMl <= 0) return bottles <= p.stock && qty <= p.loose + 1e-9;
  return bottles + bottlesToOpen(p, qty) <= p.stock;
}

/** Prix d'une portion : taille définie, sinon prix au ml/g arrondi au dinar ; null si non vendable. */
function portionPrice(p, size) {
  const f = p.decants.find(d => Math.abs(d.size - size) < 1e-9);
  if (f) return f.price;
  if (p.unitPrice > 0) return Math.round((p.unitPrice * size) / 100) * 100;
  return null;
}

/** Coût du flacon vide : le plus petit flacon du tableau qui contient la portion. */
function emptyBottleCost(size, table) {
  const fit = (table || []).filter(e => e.size >= size - 1e-9).sort((a, b) => a.size - b.size)[0];
  return fit ? fit.cost : 0;
}

function lineCost(p, kind, size, table) {
  if (kind === 'BOTTLE') return Math.round(p.purchasePrice);
  return Math.round((costPerUnit(p) * size + emptyBottleCost(size, table)) / 100) * 100;   // arrondi au dinar
}

function listPrice(p, kind, size) {
  return kind === 'BOTTLE' ? p.salePrice : portionPrice(p, size);
}

/* ====================================================================== */
/* Totaux et ventes                                                       */
/* ====================================================================== */

function discountAmount(subtotal, mode, percent, fixed) {
  if (mode === 'PERCENT') {
    const p = Math.min(Math.max(percent, 0), 100);
    return Math.min(Math.max(Math.round((subtotal * p) / 10000) * 100, 0), subtotal);   // arrondi au dinar
  }
  if (mode === 'FIXED') return Math.min(Math.max(fixed, 0), subtotal);
  return 0;
}

/** lines : [{ price, cost, qty }] — calcul unique pour l'écran et l'enregistrement. */
function computeTotals(lines, mode, percent, fixed) {
  let subtotal = 0, cost = 0, count = 0;
  for (const l of lines) {
    subtotal += l.price * l.qty;
    cost += l.cost * l.qty;
    count += l.qty;
  }
  const discount = discountAmount(subtotal, mode, percent, fixed);
  const total = subtotal - discount;
  return { count, subtotal, discount, total, cost, profit: total - cost };
}

const netTotal = s => s.total - (s.returnedAmount || 0);
const netCost = s => s.totalCost - (s.returnedCost || 0);
const netProfit = s => netTotal(s) - netCost(s);
const cashOfSale = s => (s.payment.method === 'CASH' ? s.total : s.payment.method === 'CREDIT' ? s.payment.paid : 0);

/** Normalise une vente (et convertit le format de la version 1.0). */
function normSale(s) {
  if (Array.isArray(s.lines)) {
    return {
      ...s,
      clientId: s.clientId ?? null,
      clientName: s.clientName || '',
      payment: s.payment || { method: 'CASH', paid: s.total, credit: 0, received: 0, change: 0 },
      returns: s.returns || [],
      returnedAmount: s.returnedAmount || 0,
      returnedCost: s.returnedCost || 0,
    };
  }
  return {
    id: s.id,
    createdAt: s.createdAt,
    clientId: null,
    clientName: '',
    lines: (s.items || []).map(it => ({
      perfumeId: it.perfumeId, name: it.name, brand: it.brand, kind: 'BOTTLE', size: it.volumeMl, unit: 'ml',
      qty: it.quantity, listPrice: it.unitPrice, unitPrice: it.unitPrice, unitCost: it.unitCost, returned: 0,
    })),
    itemCount: s.itemCount,
    subtotal: s.subtotal,
    discountMode: s.discountMode || 'NONE',
    discountPercent: s.discountPercent || 0,
    discountAmount: s.discountAmount || 0,
    total: s.total,
    totalCost: s.totalCost,
    profit: s.profit,
    payment: { method: 'CASH', paid: s.total, credit: 0, received: 0, change: 0 },
    returns: [],
    returnedAmount: 0,
    returnedCost: 0,
  };
}

/* ====================================================================== */
/* Base de données                                                        */
/* ====================================================================== */

const DB_NAME = 'golden-sense';
const DB_VERSION = 2;
const STORES = ['perfumes', 'sales', 'clients', 'ledger', 'moves', 'meta'];
let db = null;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = event => {
      const d = req.result;
      const tx = req.transaction;
      if (!d.objectStoreNames.contains('perfumes')) d.createObjectStore('perfumes', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('sales')) {
        d.createObjectStore('sales', { keyPath: 'id', autoIncrement: true }).createIndex('createdAt', 'createdAt');
      }
      if (!d.objectStoreNames.contains('clients')) d.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('ledger')) {
        const l = d.createObjectStore('ledger', { keyPath: 'id', autoIncrement: true });
        l.createIndex('clientId', 'clientId');
        l.createIndex('saleId', 'saleId');
      }
      if (!d.objectStoreNames.contains('moves')) {
        const m = d.createObjectStore('moves', { keyPath: 'id', autoIncrement: true });
        m.createIndex('perfumeId', 'perfumeId');
        m.createIndex('saleId', 'saleId');
      }
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });

      // Version 1.0 → 1.1 : les données existantes sont converties sur place.
      if (event.oldVersion >= 1 && event.oldVersion < 2) {
        tx.objectStore('perfumes').openCursor().onsuccess = e => {
          const c = e.target.result;
          if (c) { c.update(normPerfume(c.value)); c.continue(); }
        };
        tx.objectStore('sales').openCursor().onsuccess = e => {
          const c = e.target.result;
          if (c) { c.update(normSale(c.value)); c.continue(); }
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('blocked'));
  });
}

function getAll(name) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(name, 'readonly').objectStore(name).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function getByIndex(name, index, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(name, 'readonly').objectStore(name).index(index).getAll(key);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Transaction en écriture. `work(stores, done, fail)` ; `fail(raison)` annule tout et retourne la raison. */
function writeTx(names, work) {
  return new Promise((resolve, reject) => {
    const tr = db.transaction(names, 'readwrite');
    const stores = Object.fromEntries(names.map(n => [n, tr.objectStore(n)]));
    let value, failure = null;
    const done = v => { value = v; };
    const fail = f => {
      if (!failure) { failure = f || { type: 'error' }; try { tr.abort(); } catch (e) { /* déjà terminée */ } }
    };
    stores.failed = () => failure !== null;
    tr.oncomplete = () => resolve(value);
    tr.onabort = () => (failure ? resolve(failure) : reject(tr.error || new Error('aborted')));
    try { work(stores, done, fail); } catch (e) { fail({ type: 'error' }); }
  });
}

function deleteByIndex(objectStore, index, key) {
  objectStore.index(index).openCursor(IDBKeyRange.only(key)).onsuccess = e => {
    const c = e.target.result;
    if (c) { c.delete(); c.continue(); }
  };
}

function sumDebt(ledgerStore, clientId, cb) {
  const req = ledgerStore.index('clientId').getAll(clientId);
  req.onsuccess = () => cb((req.result || []).reduce((s, e) => s + e.amount, 0));
}

const repo = {
  /** Création ou modification ; une différence de stock est enregistrée comme correction. */
  savePerfume(record) {
    return writeTx(['perfumes', 'moves'], ({ perfumes, moves }, done) => {
      const rec = normPerfume(record);
      if (!rec.id) delete rec.id;
      const write = prev => {
        const put = perfumes.put(rec);
        put.onsuccess = () => {
          const id = put.result;
          const db_ = rec.stock - (prev ? prev.stock : 0);
          const dq = q2(rec.loose - (prev ? prev.loose : 0));
          if (db_ || dq) moves.add({ perfumeId: id, at: Date.now(), type: prev ? 'ADJUST' : 'INIT', bottles: db_, qty: dq });
          done(id);
        };
      };
      if (rec.id) {
        const g = perfumes.get(rec.id);
        g.onsuccess = () => write(g.result ? normPerfume(g.result) : null);
      } else write(null);
    });
  },

  deletePerfume(id) {
    return writeTx(['perfumes', 'moves'], ({ perfumes, moves }) => {
      perfumes.delete(id);
      deleteByIndex(moves, 'perfumeId', id);
    });
  },

  insertSample() {
    return writeTx(['perfumes'], ({ perfumes }, done) => {
      const req = perfumes.count();
      req.onsuccess = () => {
        if (req.result > 0) { done(false); return; }
        sampleCatalog().forEach(p => perfumes.add(normPerfume(p)));
        done(true);
      };
    });
  },

  /** Entrée de stock : quantité, coût moyen pondéré, mouvement et fournisseur. */
  receive(r) {
    return writeTx(['perfumes', 'moves', 'meta'], ({ perfumes, moves, meta }, done, fail) => {
      const g = perfumes.get(r.perfumeId);
      g.onsuccess = () => {
        if (!g.result) return fail({ type: 'missing' });
        const p = normPerfume(g.result);
        let next;
        if (p.mode === 'BOTTLE') {
          const have = Math.max(0, p.stock + (p.volumeMl ? p.loose / p.volumeMl : 0));
          const cost = have > 0 ? Math.round((p.purchasePrice * have + r.unitCost * r.bottles) / (have + r.bottles) / 100) * 100 : r.unitCost;
          next = { ...p, stock: p.stock + r.bottles, purchasePrice: cost };
        } else {
          const have = Math.max(0, p.loose);
          const cost = have > 0 ? (p.purchasePrice * have + r.totalCost) / (have + r.qty) : r.totalCost / r.qty;
          next = { ...p, loose: q2(p.loose + r.qty), purchasePrice: q2(cost) };
        }
        perfumes.put(next);
        moves.add({
          perfumeId: p.id, at: Date.now(), type: 'IN',
          bottles: p.mode === 'BOTTLE' ? r.bottles : 0, qty: p.mode === 'BULK' ? r.qty : 0,
          cost: p.mode === 'BOTTLE' ? r.unitCost * r.bottles : r.totalCost,
          supplier: r.supplier || '', note: r.note || '',
        });
        if (r.supplier) {
          const m = meta.get('suppliers');
          m.onsuccess = () => {
            const list = (m.result && m.result.value) || [];
            if (!list.some(s => s.toLowerCase() === r.supplier.toLowerCase())) meta.put({ key: 'suppliers', value: [...list, r.supplier].slice(-50) });
          };
        }
        done({ type: 'ok', product: next });
      };
    });
  },

  /**
   * Vente en une seule transaction : relit les produits, vérifie le stock (ouverture automatique d'un flacon
   * pour les décants), enregistre la vente, le crédit éventuel et les mouvements. Rien n'est écrit en cas d'échec.
   * order : { lines:[{perfumeId, kind, size, qty, price|null}], mode, percent, fixed, payment:{method, received, paid}, clientId }
   */
  checkout(order) {
    return writeTx(['perfumes', 'sales', 'ledger', 'moves', 'clients', 'meta'], (st, done, fail) => {
      const ids = [...new Set(order.lines.map(l => l.perfumeId))];
      const found = new Map();
      let client = null, table = [];
      let pending = ids.length + 2;
      const next = () => { if (--pending === 0 && !st.failed()) finish(); };
      ids.forEach(id => {
        const g = st.perfumes.get(id);
        g.onsuccess = () => {
          if (!g.result) return fail({ type: 'missing' });
          found.set(id, normPerfume(g.result));
          next();
        };
      });
      if (order.clientId) {
        const g = st.clients.get(order.clientId);
        g.onsuccess = () => { client = g.result || null; next(); };
      } else next();
      const m = st.meta.get('emptyBottles');
      m.onsuccess = () => { table = (m.result && m.result.value) || []; next(); };

      function finish() {
        const need = new Map();
        for (const l of order.lines) {
          const n = need.get(l.perfumeId) || { bottles: 0, qty: 0 };
          if (l.kind === 'BOTTLE') n.bottles += l.qty; else n.qty = q2(n.qty + l.size * l.qty);
          need.set(l.perfumeId, n);
        }
        for (const [id, n] of need) {
          const p = found.get(id);
          if (!fits(p, n.bottles, n.qty)) return fail({ type: 'stock', name: p.name, product: p });
        }
        const lines = [];
        for (const l of order.lines) {
          const p = found.get(l.perfumeId);
          const list = listPrice(p, l.kind, l.size);
          const price = l.price != null ? l.price : list;
          if (price == null || price < 0) return fail({ type: 'missing' });
          lines.push({
            perfumeId: p.id, name: p.name, brand: p.brand, kind: l.kind,
            size: l.kind === 'BOTTLE' ? p.volumeMl : l.size, unit: l.kind === 'BOTTLE' ? 'ml' : p.unit,
            qty: l.qty, listPrice: list ?? price, unitPrice: price, unitCost: lineCost(p, l.kind, l.size, table), returned: 0,
          });
        }
        const tot = computeTotals(lines.map(x => ({ price: x.unitPrice, cost: x.unitCost, qty: x.qty })), order.mode, order.percent, order.fixed);
        const pay = order.payment || { method: 'CASH' };
        let payment;
        if (pay.method === 'CREDIT') {
          if (!client) return fail({ type: 'client' });
          const paid = Math.min(Math.max(pay.paid || 0, 0), tot.total);
          payment = { method: paid >= tot.total ? 'CASH' : 'CREDIT', paid, credit: tot.total - paid, received: 0, change: 0 };
        } else if (OTHER_METHODS.includes(pay.method)) {
          payment = { method: pay.method, paid: tot.total, credit: 0, received: 0, change: 0 };
        } else {
          const received = pay.received && pay.received >= tot.total ? pay.received : 0;
          payment = { method: 'CASH', paid: tot.total, credit: 0, received, change: received ? received - tot.total : 0 };
        }
        const applied = tot.discount > 0 ? order.mode : 'NONE';
        const sale = {
          createdAt: Date.now(),
          clientId: client ? client.id : null,
          clientName: client ? client.name : '',
          lines,
          itemCount: tot.count,
          subtotal: tot.subtotal,
          discountMode: applied,
          discountPercent: applied === 'PERCENT' ? order.percent : 0,
          discountAmount: tot.discount,
          total: tot.total,
          totalCost: tot.cost,
          profit: tot.profit,
          payment,
          returns: [],
          returnedAmount: 0,
          returnedCost: 0,
        };
        const add = st.sales.add(sale);
        add.onsuccess = () => {
          const saleId = add.result;
          const now = sale.createdAt;
          const low = [];
          for (const [id, n] of need) {
            const p = found.get(id);
            const upd = { ...p };
            if (p.mode === 'BOTTLE') {
              const open = bottlesToOpen(p, n.qty);
              if (open > 0) st.moves.add({ perfumeId: id, at: now, type: 'OPEN', bottles: -open, qty: open * p.volumeMl });
              upd.stock = p.stock - n.bottles - open;
              upd.loose = q2(p.loose + open * p.volumeMl - n.qty);
            } else {
              upd.loose = q2(p.loose - n.qty);
            }
            st.perfumes.put(upd);
            st.moves.add({ perfumeId: id, at: now, type: 'SALE', saleId, bottles: -n.bottles, qty: -n.qty });
            if (isLow(upd)) low.push(upd);
          }
          if (payment.credit > 0) st.ledger.add({ clientId: client.id, at: now, type: 'SALE', saleId, amount: payment.credit });
          done({ type: 'ok', saleId, total: tot.total, payment, clientName: sale.clientName, low });
        };
      }
    });
  },

  /** Annulation complète (erreur de caisse) : quantités remises en stock, crédit et mouvements supprimés. */
  cancelSale(saleId) {
    return writeTx(['perfumes', 'sales', 'ledger', 'moves'], (st, done, fail) => {
      const g = st.sales.get(saleId);
      g.onsuccess = () => {
        const sale = g.result;
        if (!sale) { done({ type: 'ok' }); return; }
        if ((sale.returns || []).length) return fail({ type: 'has_returns' });
        const back = new Map();
        for (const l of normSale(sale).lines) {
          const b = back.get(l.perfumeId) || { bottles: 0, qty: 0 };
          if (l.kind === 'BOTTLE') b.bottles += l.qty; else b.qty = q2(b.qty + l.size * l.qty);
          back.set(l.perfumeId, b);
        }
        for (const [id, b] of back) {
          const r = st.perfumes.get(id);
          r.onsuccess = () => {
            if (!r.result) return;
            const p = normPerfume(r.result);
            st.perfumes.put({ ...p, stock: p.stock + b.bottles, loose: q2(p.loose + b.qty) });
          };
        }
        deleteByIndex(st.ledger, 'saleId', saleId);
        deleteByIndex(st.moves, 'saleId', saleId);
        st.sales.delete(saleId);
        done({ type: 'ok' });
      };
    });
  },

  /** Retour partiel : remboursement en espèces ou déduit de la dette ; remise en stock au choix. */
  returnItems({ saleId, items, restock, refund }) {
    return writeTx(['perfumes', 'sales', 'ledger', 'moves'], (st, done, fail) => {
      const g = st.sales.get(saleId);
      g.onsuccess = () => {
        if (!g.result) return fail({ type: 'missing' });
        const sale = normSale(g.result);
        const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 0;
        const lines = sale.lines.map(l => ({ ...l }));
        const back = new Map();
        let amount = 0, cost = 0;
        for (const it of items) {
          const l = lines[it.index];
          if (!l || !(it.qty > 0) || it.qty > l.qty - (l.returned || 0)) return fail({ type: 'invalid' });
          l.returned = (l.returned || 0) + it.qty;
          amount += l.unitPrice * it.qty * ratio;
          cost += l.unitCost * it.qty;
          const b = back.get(l.perfumeId) || { bottles: 0, qty: 0 };
          if (l.kind === 'BOTTLE') b.bottles += it.qty; else b.qty = q2(b.qty + l.size * it.qty);
          back.set(l.perfumeId, b);
        }
        if (!items.length) return fail({ type: 'invalid' });
        amount = Math.min(Math.round(amount), netTotal(sale));
        const write = () => {
          const now = Date.now();
          const recovered = restock ? cost : 0;
          st.sales.put({
            ...sale, lines,
            returns: [...sale.returns, { at: now, items, amount, cost: recovered, restock: !!restock, refund }],
            returnedAmount: sale.returnedAmount + amount,
            returnedCost: sale.returnedCost + recovered,
          });
          if (refund === 'DEBT') st.ledger.add({ clientId: sale.clientId, at: now, type: 'RETURN', saleId, amount: -amount });
          if (restock) {
            for (const [id, b] of back) {
              const r = st.perfumes.get(id);
              r.onsuccess = () => {
                if (!r.result) return;
                const p = normPerfume(r.result);
                st.perfumes.put({ ...p, stock: p.stock + b.bottles, loose: q2(p.loose + b.qty) });
                st.moves.add({ perfumeId: id, at: now, type: 'RETURN', saleId, bottles: b.bottles, qty: b.qty });
              };
            }
          }
          done({ type: 'ok', amount, refund });
        };
        if (refund === 'DEBT') {
          if (!sale.clientId) return fail({ type: 'invalid' });
          sumDebt(st.ledger, sale.clientId, debt => (debt >= amount ? write() : fail({ type: 'debt_low', debt })));
        } else write();
      };
    });
  },

  saveClient(c, opening = 0) {
    return writeTx(['clients', 'ledger'], ({ clients, ledger }, done) => {
      const rec = { ...c, createdAt: c.createdAt || Date.now() };
      if (!rec.id) delete rec.id;
      const put = clients.put(rec);
      put.onsuccess = () => {
        if (!c.id && opening > 0) ledger.add({ clientId: put.result, at: Date.now(), type: 'OPENING', amount: opening });
        done(put.result);
      };
    });
  },

  deleteClient(id) {
    return writeTx(['clients', 'ledger'], ({ clients, ledger }, done, fail) => {
      sumDebt(ledger, id, debt => {
        if (debt !== 0) return fail({ type: 'has_debt' });
        clients.delete(id);
        deleteByIndex(ledger, 'clientId', id);
        done({ type: 'ok' });
      });
    });
  },

  addPayment({ clientId, amount, method, note }) {
    return writeTx(['ledger'], ({ ledger }, done, fail) => {
      sumDebt(ledger, clientId, debt => {
        if (amount <= 0 || amount > debt) return fail({ type: 'too_much', debt });
        ledger.add({ clientId, at: Date.now(), type: 'PAYMENT', amount: -amount, method: method || 'CASH', note: note || '' });
        done({ type: 'ok', left: debt - amount });
      });
    });
  },

  setMeta(key, value) {
    return writeTx(['meta'], ({ meta }) => { meta.put({ key, value }); });
  },

  replaceAll(data) {
    return writeTx(STORES, st => {
      STORES.forEach(n => st[n].clear());
      data.perfumes.forEach(p => st.perfumes.put(normPerfume(p)));
      data.sales.forEach(s => st.sales.put(normSale(s)));
      data.clients.forEach(c => st.clients.put(c));
      data.ledger.forEach(e => st.ledger.put(e));
      data.moves.forEach(m => st.moves.put(m));
      data.meta.forEach(m => st.meta.put(m));
    });
  },
};

/* ====================================================================== */
/* Sauvegarde                                                             */
/* ====================================================================== */

async function buildBackup() {
  const [perfumes, sales, clients, ledger, moves, meta] = await Promise.all(STORES.map(getAll));
  return { app: 'golden-sense', format: 2, exportedAt: new Date().toISOString(), perfumes, sales, clients, ledger, moves, meta };
}

/** Accepte les sauvegardes 1.0 (format 1) et 1.1 (format 2). Retourne les données normalisées ou null. */
function readBackup(data) {
  if (!data || data.app !== 'golden-sense' || !Array.isArray(data.perfumes) || !Array.isArray(data.sales)) return null;
  const okPerfume = p => p && Number.isInteger(p.id) && typeof p.name === 'string' && typeof p.brand === 'string';
  const okSale = s => s && Number.isInteger(s.id) && Number.isFinite(s.createdAt) && Number.isFinite(s.total) &&
    (Array.isArray(s.items) || Array.isArray(s.lines));
  if (!data.perfumes.every(okPerfume) || !data.sales.every(okSale)) return null;
  const arr = k => (Array.isArray(data[k]) ? data[k] : []);
  const okId = x => x && Number.isInteger(x.id);
  if (!arr('clients').every(okId) || !arr('ledger').every(e => okId(e) && Number.isFinite(e.amount)) || !arr('moves').every(okId)) return null;
  return {
    perfumes: data.perfumes.map(normPerfume),
    sales: data.sales.map(normSale),
    clients: arr('clients'),
    ledger: arr('ledger'),
    moves: arr('moves'),
    meta: arr('meta').filter(m => m && typeof m.key === 'string'),
  };
}

/* ====================================================================== */
/* Catalogue d'exemple                                                    */
/* ====================================================================== */

function sampleCatalog() {
  const now = Date.now();
  const b = (name, brand, gender, type, volumeMl, costDa, priceDa, stock, decants = []) => ({
    name, brand, gender, type, mode: 'BOTTLE', volumeMl, purchasePrice: costDa * 100, salePrice: priceDa * 100, stock, loose: 0,
    decants: decants.map(([size, da]) => ({ size, price: da * 100 })), createdAt: now,
  });
  const v = (name, brand, gender, unit, qty, costDa, unitDa, lowAt, decants = []) => ({
    name, brand, gender, type: 'OIL', mode: 'BULK', unit, loose: qty, purchasePrice: costDa * 100, unitPrice: unitDa * 100, lowAt,
    decants: decants.map(([size, da]) => ({ size, price: da * 100 })), createdAt: now,
  });
  return [
    b('Sauvage', 'Dior', 'MEN', 'EDT', 100, 17000, 23500, 6, [[5, 1500], [10, 2800]]),
    b('Bleu de Chanel', 'Chanel', 'MEN', 'EDP', 100, 21000, 28000, 2, [[10, 3200]]),
    b('N°5', 'Chanel', 'WOMEN', 'EDP', 100, 24000, 32000, 4),
    b('J’adore', 'Dior', 'WOMEN', 'EDP', 50, 15500, 21000, 1),
    b('Miss Dior', 'Dior', 'WOMEN', 'EDP', 100, 20000, 27000, 5, [[10, 3000]]),
    b('Aventus', 'Creed', 'MEN', 'EDP', 100, 48000, 62000, 2, [[5, 3500], [10, 6800]]),
    b('Black Opium', 'Yves Saint Laurent', 'WOMEN', 'EDP', 90, 17500, 24000, 7),
    b('Oud Wood', 'Tom Ford', 'UNISEX', 'EDP', 50, 33000, 43000, 3),
    b('Baccarat Rouge 540', 'Maison Francis Kurkdjian', 'UNISEX', 'EDP', 70, 38000, 52000, 0),
    b('Acqua di Giò', 'Giorgio Armani', 'MEN', 'EDT', 100, 13500, 19000, 8),
    b('La Vie est Belle', 'Lancôme', 'WOMEN', 'EDP', 75, 14500, 20000, 5),
    v('Musc Tahara', 'Vrac', 'UNISEX', 'ml', 500, 15, 40, 100, [[3, 150], [6, 250], [12, 450]]),
    v('Dehn El Oud', 'Vrac', 'UNISEX', 'g', 60, 300, 600, 20),
  ];
}

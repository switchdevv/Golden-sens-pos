/* Golden Sense — caisse et stock de parfumerie, 100 % hors ligne.
 * Données : IndexedDB sur l'appareil. Montants : entiers en centimes de dinar. */
'use strict';

const APP_VERSION = '1.0.0';
const LOW_STOCK = 3;            // « stock bas » strictement en dessous de ce seuil
const HISTORY_PAGE = 100;       // ventes affichées par page dans l'historique
const BACKUP_REMINDER_DAYS = 7;

/* ====================================================================== */
/* Textes (arabe, français, anglais)                                      */
/* ====================================================================== */

const STR = {
  fr: {
    tab_sales: 'Caisse', tab_stock: 'Stock', tab_reports: 'Rapports', settings: 'Réglages',
    currency: 'DA', ml: 'ml',
    MEN: 'Homme', WOMEN: 'Femme', UNISEX: 'Unisexe',
    EDP: 'Eau de Parfum', EDT: 'Eau de Toilette', OIL: 'Huile parfumée', OIL_short: 'Huile',
    search_perfume: 'Rechercher un nom ou une marque', search_stock: 'Rechercher dans le stock',
    out: 'Rupture', low_n: 'Stock bas : {0}', stock_n: 'Stock : {0}',
    catalog_empty_t: 'Aucun parfum à vendre', catalog_empty_m: 'Ajoutez vos parfums dans l’onglet Stock pour commencer à vendre.',
    go_stock: 'Aller au stock', no_results_t: 'Aucun résultat', no_results_m: 'Essayez un autre nom, une autre marque ou un autre filtre.',
    cart: 'Panier', clear_cart: 'Vider', view_cart: 'Panier', items_n: 'Articles : {0}',
    cart_empty_t: 'Panier vide', cart_empty_m: 'Touchez un parfum pour l’ajouter.',
    subtotal: 'Sous-total', discount: 'Remise', discount_pct: 'Remise ({0} %)', total: 'Total', profit: 'Bénéfice',
    validate: 'Valider la vente', only_n: 'Seulement {0} en stock', stock_issue: 'Certaines quantités dépassent le stock disponible.',
    d_none: 'Aucune', d_pct: '%', d_amount: 'Montant', d_pct_hint: 'Pourcentage de remise', d_amount_hint: 'Montant de la remise',
    err_pct: 'Entrez un pourcentage entre 0 et 100.', err_amount: 'Montant invalide', err_exceeds: 'La remise dépasse le sous-total.',
    remove: 'Retirer', decrease: 'Diminuer', increase: 'Augmenter', close: 'Fermer', clear: 'Effacer',
    inv_empty_t: 'Aucun parfum pour l’instant', inv_empty_m: 'Ajoutez votre premier parfum, ou chargez un catalogue d’exemple pour essayer l’application.',
    add_perfume: 'Ajouter un parfum', load_sample: 'Charger un catalogue d’exemple',
    refs: 'Références', units: 'Unités en stock', value_cost: 'Valeur à l’achat', value_sale: 'Valeur à la vente',
    low_alert_t: '{0} parfum(s) en stock bas', low_alert_m: 'Moins de {0} unités restantes.', show: 'Afficher', show_all: 'Tout afficher',
    cost: 'Achat', price: 'Vente', margin: 'Marge',
    edit_perfume: 'Modifier le parfum', f_name: 'Nom', f_brand: 'Marque', f_gender: 'Genre', f_type: 'Type',
    f_volume: 'Contenance', f_stock: 'Quantité en stock', f_cost: 'Prix d’achat', f_price: 'Prix de vente',
    err_required: 'Obligatoire', err_volume: 'Contenance invalide', err_qty: 'Quantité invalide',
    warn_below: 'Inférieur au prix d’achat', margin_unit: 'Marge par unité : {0}',
    delete: 'Supprimer', cancel: 'Annuler', save: 'Enregistrer',
    del_t: 'Supprimer ce parfum ?', del_m: '« {0} » sera retiré du stock. L’historique des ventes est conservé.',
    today: 'Aujourd’hui', yesterday: 'Hier', revenue_today: 'Chiffre d’affaires du jour', net_profit: 'Bénéfice net', sales: 'Ventes', items_sold: 'Articles vendus',
    top3: 'Top 3 des parfums', all_time: 'Depuis le début', no_sales_period: 'Aucune vente sur cette période.', sold_n: '{0} vendu(s)',
    history: 'Historique des ventes', history_empty_t: 'Aucune vente', history_empty_m: 'Les ventes validées apparaîtront ici.',
    sales_n: '{0} vente(s)', sale_no: 'Vente n° {0}', profit_v: 'Bénéfice {0}', purchase_cost: 'Coût d’achat', show_more: 'Afficher plus',
    cancel_sale: 'Annuler la vente', cancel_sale_t: 'Annuler cette vente ?', cancel_sale_m: 'La vente sera supprimée et les quantités remises en stock.', keep: 'Garder',
    language: 'Langue', theme: 'Apparence', th_system: 'Auto', th_light: 'Clair', th_dark: 'Sombre',
    backup: 'Sauvegarde', backup_export: 'Exporter une sauvegarde', backup_import: 'Restaurer une sauvegarde',
    backup_hint: 'Les données restent sur ce téléphone. Exportez une sauvegarde chaque semaine et gardez-la dans Fichiers ou iCloud.',
    last_backup: 'Dernière sauvegarde : {0}', never: 'jamais',
    backup_due: 'Pas de sauvegarde depuis plus de {0} jours.', backup_now: 'Sauvegarder',
    restore_t: 'Restaurer cette sauvegarde ?', restore_m: 'Les données actuelles ({0} parfums, {1} ventes) seront remplacées par celles du fichier ({2} parfums, {3} ventes).',
    restore: 'Restaurer', restored: 'Sauvegarde restaurée', restore_bad: 'Ce fichier n’est pas une sauvegarde Golden Sense.', exported: 'Sauvegarde exportée',
    install_t: 'Installer sur l’iPhone', install_m: 'Dans Safari : touchez Partager, puis « Sur l’écran d’accueil ».',
    sale_done: 'Vente enregistrée : {0}', low_after: 'Stock bas : {0}', undo: 'Annuler',
    stock_limit: 'Stock insuffisant pour {0} (disponible : {1})', missing: 'Un produit du panier n’existe plus.',
    saved: '{0} enregistré', deleted: '{0} supprimé', sale_cancelled: 'Vente annulée, stock remis à jour.',
    sample_loaded: 'Catalogue d’exemple ajouté.', error: 'L’opération a échoué. Réessayez.',
    update_ready: 'Nouvelle version installée.', reload: 'Actualiser', version: 'Version {0}',
    storage_error: 'Le stockage de ce navigateur est indisponible. Ouvrez l’application dans Safari, hors navigation privée.',
  },
  ar: {
    tab_sales: 'الصندوق', tab_stock: 'المخزون', tab_reports: 'التقارير', settings: 'الإعدادات',
    currency: 'دج', ml: 'مل',
    MEN: 'رجالي', WOMEN: 'نسائي', UNISEX: 'للجنسين',
    EDP: 'أو دو بارفان', EDT: 'أو دو تواليت', OIL: 'زيت عطري', OIL_short: 'زيت',
    search_perfume: 'ابحث بالاسم أو الماركة', search_stock: 'ابحث في المخزون',
    out: 'نفد', low_n: 'مخزون منخفض: {0}', stock_n: 'المخزون: {0}',
    catalog_empty_t: 'لا توجد عطور للبيع', catalog_empty_m: 'أضف عطورك في تبويب المخزون لتبدأ البيع.',
    go_stock: 'الذهاب إلى المخزون', no_results_t: 'لا توجد نتائج', no_results_m: 'جرّب اسمًا أو ماركة أو فلترًا آخر.',
    cart: 'السلة', clear_cart: 'تفريغ', view_cart: 'السلة', items_n: 'عدد القطع: {0}',
    cart_empty_t: 'السلة فارغة', cart_empty_m: 'اضغط على عطر لإضافته.',
    subtotal: 'المجموع الفرعي', discount: 'تخفيض', discount_pct: 'تخفيض ({0}%)', total: 'المجموع', profit: 'الربح',
    validate: 'تأكيد البيع', only_n: 'المتوفر {0} فقط', stock_issue: 'بعض الكميات تتجاوز المخزون المتوفر.',
    d_none: 'بدون', d_pct: '%', d_amount: 'مبلغ', d_pct_hint: 'نسبة التخفيض', d_amount_hint: 'مبلغ التخفيض',
    err_pct: 'أدخل نسبة بين 0 و 100.', err_amount: 'مبلغ غير صالح', err_exceeds: 'التخفيض أكبر من المجموع.',
    remove: 'حذف', decrease: 'إنقاص', increase: 'زيادة', close: 'إغلاق', clear: 'مسح',
    inv_empty_t: 'لا توجد عطور بعد', inv_empty_m: 'أضف أول عطر، أو حمّل كتالوجًا تجريبيًا لتجربة التطبيق.',
    add_perfume: 'إضافة عطر', load_sample: 'تحميل كتالوج تجريبي',
    refs: 'المنتجات', units: 'الوحدات في المخزون', value_cost: 'القيمة بسعر الشراء', value_sale: 'القيمة بسعر البيع',
    low_alert_t: '{0} عطر بمخزون منخفض', low_alert_m: 'بقي أقل من {0} وحدات.', show: 'عرض', show_all: 'عرض الكل',
    cost: 'الشراء', price: 'البيع', margin: 'الهامش',
    edit_perfume: 'تعديل العطر', f_name: 'الاسم', f_brand: 'الماركة', f_gender: 'الفئة', f_type: 'النوع',
    f_volume: 'الحجم', f_stock: 'الكمية في المخزون', f_cost: 'سعر الشراء', f_price: 'سعر البيع',
    err_required: 'مطلوب', err_volume: 'حجم غير صالح', err_qty: 'كمية غير صالحة',
    warn_below: 'أقل من سعر الشراء', margin_unit: 'الهامش للوحدة: {0}',
    delete: 'حذف', cancel: 'إلغاء', save: 'حفظ',
    del_t: 'حذف هذا العطر؟', del_m: 'سيتم حذف «{0}» من المخزون. سجل المبيعات يبقى محفوظًا.',
    today: 'اليوم', yesterday: 'أمس', revenue_today: 'رقم أعمال اليوم', net_profit: 'صافي الربح', sales: 'المبيعات', items_sold: 'القطع المباعة',
    top3: 'أفضل 3 عطور', all_time: 'منذ البداية', no_sales_period: 'لا توجد مبيعات في هذه الفترة.', sold_n: '{0} مباعة',
    history: 'سجل المبيعات', history_empty_t: 'لا توجد مبيعات', history_empty_m: 'ستظهر المبيعات المؤكدة هنا.',
    sales_n: '{0} عملية بيع', sale_no: 'بيع رقم {0}', profit_v: 'الربح {0}', purchase_cost: 'تكلفة الشراء', show_more: 'عرض المزيد',
    cancel_sale: 'إلغاء البيع', cancel_sale_t: 'إلغاء هذا البيع؟', cancel_sale_m: 'سيتم حذف البيع وإرجاع الكميات إلى المخزون.', keep: 'الإبقاء',
    language: 'اللغة', theme: 'المظهر', th_system: 'تلقائي', th_light: 'فاتح', th_dark: 'داكن',
    backup: 'النسخ الاحتياطي', backup_export: 'تصدير نسخة احتياطية', backup_import: 'استرجاع نسخة احتياطية',
    backup_hint: 'البيانات محفوظة في هذا الهاتف فقط. صدّر نسخة احتياطية كل أسبوع واحفظها في الملفات أو iCloud.',
    last_backup: 'آخر نسخة احتياطية: {0}', never: 'أبدًا',
    backup_due: 'لا توجد نسخة احتياطية منذ أكثر من {0} أيام.', backup_now: 'احفظ الآن',
    restore_t: 'استرجاع هذه النسخة؟', restore_m: 'سيتم استبدال البيانات الحالية ({0} عطر، {1} عملية بيع) ببيانات الملف ({2} عطر، {3} عملية بيع).',
    restore: 'استرجاع', restored: 'تم استرجاع النسخة الاحتياطية', restore_bad: 'هذا الملف ليس نسخة احتياطية من Golden Sense.', exported: 'تم تصدير النسخة الاحتياطية',
    install_t: 'التثبيت على iPhone', install_m: 'في Safari: اضغط على مشاركة ثم «إضافة إلى الشاشة الرئيسية».',
    sale_done: 'تم تسجيل البيع: {0}', low_after: 'مخزون منخفض: {0}', undo: 'تراجع',
    stock_limit: 'المخزون غير كافٍ لـ {0} (المتوفر: {1})', missing: 'أحد منتجات السلة لم يعد موجودًا.',
    saved: 'تم حفظ {0}', deleted: 'تم حذف {0}', sale_cancelled: 'تم إلغاء البيع وتحديث المخزون.',
    sample_loaded: 'تمت إضافة الكتالوج التجريبي.', error: 'فشلت العملية. حاول مرة أخرى.',
    update_ready: 'تم تثبيت نسخة جديدة.', reload: 'تحديث', version: 'الإصدار {0}',
    storage_error: 'التخزين غير متاح في هذا المتصفح. افتح التطبيق في Safari خارج التصفح الخاص.',
  },
  en: {
    tab_sales: 'Checkout', tab_stock: 'Stock', tab_reports: 'Reports', settings: 'Settings',
    currency: 'DA', ml: 'ml',
    MEN: 'Men', WOMEN: 'Women', UNISEX: 'Unisex',
    EDP: 'Eau de Parfum', EDT: 'Eau de Toilette', OIL: 'Perfume oil', OIL_short: 'Oil',
    search_perfume: 'Search by name or brand', search_stock: 'Search the stock',
    out: 'Out of stock', low_n: 'Low stock: {0}', stock_n: 'In stock: {0}',
    catalog_empty_t: 'Nothing to sell yet', catalog_empty_m: 'Add your perfumes in the Stock tab to start selling.',
    go_stock: 'Go to stock', no_results_t: 'No results', no_results_m: 'Try another name, brand or filter.',
    cart: 'Cart', clear_cart: 'Clear', view_cart: 'Cart', items_n: 'Items: {0}',
    cart_empty_t: 'Cart is empty', cart_empty_m: 'Tap a perfume to add it.',
    subtotal: 'Subtotal', discount: 'Discount', discount_pct: 'Discount ({0}%)', total: 'Total', profit: 'Profit',
    validate: 'Complete sale', only_n: 'Only {0} in stock', stock_issue: 'Some quantities exceed the available stock.',
    d_none: 'None', d_pct: '%', d_amount: 'Amount', d_pct_hint: 'Discount percentage', d_amount_hint: 'Discount amount',
    err_pct: 'Enter a percentage between 0 and 100.', err_amount: 'Invalid amount', err_exceeds: 'The discount is higher than the subtotal.',
    remove: 'Remove', decrease: 'Decrease', increase: 'Increase', close: 'Close', clear: 'Clear',
    inv_empty_t: 'No perfumes yet', inv_empty_m: 'Add your first perfume, or load a sample catalog to try the app.',
    add_perfume: 'Add perfume', load_sample: 'Load a sample catalog',
    refs: 'Products', units: 'Units in stock', value_cost: 'Value at cost', value_sale: 'Value at retail',
    low_alert_t: '{0} perfume(s) running low', low_alert_m: 'Fewer than {0} units left.', show: 'Show', show_all: 'Show all',
    cost: 'Cost', price: 'Price', margin: 'Margin',
    edit_perfume: 'Edit perfume', f_name: 'Name', f_brand: 'Brand', f_gender: 'Gender', f_type: 'Type',
    f_volume: 'Size', f_stock: 'Quantity in stock', f_cost: 'Cost price', f_price: 'Selling price',
    err_required: 'Required', err_volume: 'Invalid size', err_qty: 'Invalid quantity',
    warn_below: 'Below the cost price', margin_unit: 'Margin per unit: {0}',
    delete: 'Delete', cancel: 'Cancel', save: 'Save',
    del_t: 'Delete this perfume?', del_m: '“{0}” will be removed from stock. Past sales are kept.',
    today: 'Today', yesterday: 'Yesterday', revenue_today: 'Revenue today', net_profit: 'Net profit', sales: 'Sales', items_sold: 'Items sold',
    top3: 'Top 3 perfumes', all_time: 'All time', no_sales_period: 'No sales for this period.', sold_n: '{0} sold',
    history: 'Sales history', history_empty_t: 'No sales yet', history_empty_m: 'Completed sales will appear here.',
    sales_n: '{0} sale(s)', sale_no: 'Sale #{0}', profit_v: 'Profit {0}', purchase_cost: 'Purchase cost', show_more: 'Show more',
    cancel_sale: 'Cancel sale', cancel_sale_t: 'Cancel this sale?', cancel_sale_m: 'The sale will be deleted and its quantities returned to stock.', keep: 'Keep',
    language: 'Language', theme: 'Appearance', th_system: 'Auto', th_light: 'Light', th_dark: 'Dark',
    backup: 'Backup', backup_export: 'Export a backup', backup_import: 'Restore a backup',
    backup_hint: 'Data stays on this phone. Export a backup every week and keep it in Files or iCloud.',
    last_backup: 'Last backup: {0}', never: 'never',
    backup_due: 'No backup for more than {0} days.', backup_now: 'Back up',
    restore_t: 'Restore this backup?', restore_m: 'Current data ({0} perfumes, {1} sales) will be replaced by the file’s data ({2} perfumes, {3} sales).',
    restore: 'Restore', restored: 'Backup restored', restore_bad: 'This file is not a Golden Sense backup.', exported: 'Backup exported',
    install_t: 'Install on iPhone', install_m: 'In Safari: tap Share, then “Add to Home Screen”.',
    sale_done: 'Sale saved: {0}', low_after: 'Low stock: {0}', undo: 'Undo',
    stock_limit: 'Not enough stock for {0} (available: {1})', missing: 'A product in the cart no longer exists.',
    saved: '{0} saved', deleted: '{0} deleted', sale_cancelled: 'Sale cancelled, stock restored.',
    sample_loaded: 'Sample catalog added.', error: 'That didn’t work. Try again.',
    update_ready: 'A new version is installed.', reload: 'Reload', version: 'Version {0}',
    storage_error: 'Storage is unavailable in this browser. Open the app in Safari, outside private browsing.',
  },
};

const LOCALES = { ar: 'ar-DZ-u-nu-latn', fr: 'fr-DZ', en: 'en-GB' };

const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* stockage indisponible */ } },
};

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

/* ====================================================================== */
/* Montants, saisie, recherche                                            */
/* ====================================================================== */

const NBSP = ' ';

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

function formatAmount(cents) {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const units = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const frac = abs % 100;
  return (negative ? '-' : '') + units + (frac ? ',' + String(frac).padStart(2, '0') : '');
}
function money(cents) { return formatAmount(cents) + NBSP + t('currency'); }
const sep = () => (lang === 'ar' ? '، ' : ', ');
function moneyInput(cents) {
  const frac = cents % 100;
  return frac ? `${Math.floor(cents / 100)}.${String(frac).padStart(2, '0')}` : String(cents / 100);
}
function formatPercent(p) { return String(Math.round(p * 100) / 100); }

function cleanDecimal(s) { return normalizeDigits(s).replace(/[^0-9.,]/g, '').slice(0, 12); }
function cleanInteger(s, max = 6) { return normalizeDigits(s).replace(/[^0-9]/g, '').slice(0, max); }

function searchKey(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/\p{Mn}+/gu, '');
}
function searchTokens(q) { return searchKey(q).split(/\s+/).filter(Boolean); }
function matches(p, tokens) {
  if (!tokens.length) return true;
  const hay = searchKey(`${p.name} ${p.brand} ${p.volumeMl}ml ${p.volumeMl}`);
  return tokens.every(tk => hay.includes(tk));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Calcul unique des totaux (écran ET enregistrement) ---------- */

function discountAmount(subtotal, mode, percent, fixed) {
  if (mode === 'PERCENT') {
    const p = Math.min(Math.max(percent, 0), 100);
    const d = Math.round(subtotal * p / 10000) * 100;   // arrondi au dinar
    return Math.min(Math.max(d, 0), subtotal);
  }
  if (mode === 'FIXED') return Math.min(Math.max(fixed, 0), subtotal);
  return 0;
}

function computeTotals(lines, mode, percent, fixed) {
  let subtotal = 0, cost = 0, count = 0;
  for (const { p, qty } of lines) {
    subtotal += p.salePrice * qty;
    cost += p.purchasePrice * qty;
    count += qty;
  }
  const discount = discountAmount(subtotal, mode, percent, fixed);
  const total = subtotal - discount;
  return { count, subtotal, discount, total, cost, profit: total - cost };
}

/* ====================================================================== */
/* Base de données (IndexedDB)                                            */
/* ====================================================================== */

let db = null;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('golden-sense', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('perfumes')) d.createObjectStore('perfumes', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('sales')) {
        d.createObjectStore('sales', { keyPath: 'id', autoIncrement: true }).createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll(name) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(name, 'readonly').objectStore(name).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Transaction en lecture-écriture : `work` reçoit les stores, retourne la valeur finale via `done`. */
function writeTx(names, work) {
  return new Promise((resolve, reject) => {
    const tr = db.transaction(names, 'readwrite');
    const stores = Object.fromEntries(names.map(n => [n, tr.objectStore(n)]));
    let value, failure = null;
    const done = v => { value = v; };
    const fail = f => { if (!failure) { failure = f; try { tr.abort(); } catch (e) { /* déjà terminée */ } } };
    tr.oncomplete = () => resolve(value);
    tr.onabort = () => (failure ? resolve(failure) : reject(tr.error || new Error('aborted')));
    try { work(stores, done, fail); } catch (e) { fail(null); reject(e); }
  });
}

const repo = {
  savePerfume(p) {
    return writeTx(['perfumes'], ({ perfumes }, done) => {
      const req = perfumes.put(p);
      req.onsuccess = () => done(req.result);
    });
  },
  deletePerfume(id) {
    return writeTx(['perfumes'], ({ perfumes }) => { perfumes.delete(id); });
  },
  /** Ajoute le catalogue d'exemple seulement si l'inventaire est vide. */
  insertSample() {
    return writeTx(['perfumes'], ({ perfumes }, done) => {
      const req = perfumes.count();
      req.onsuccess = () => {
        if (req.result > 0) { done(false); return; }
        sampleCatalog().forEach(p => perfumes.add(p));
        done(true);
      };
    });
  },
  /**
   * Vente : relit chaque parfum, vérifie le stock, décrémente et enregistre la vente
   * dans UNE seule transaction. Si un contrôle échoue, rien n'est écrit.
   */
  checkout(lines, mode, percent, fixed) {
    return writeTx(['perfumes', 'sales'], ({ perfumes, sales }, done, fail) => {
      const found = new Array(lines.length);
      let pending = lines.length;
      lines.forEach(({ id, qty }, i) => {
        const req = perfumes.get(id);
        req.onsuccess = () => {
          const p = req.result;
          if (!p) return fail({ type: 'missing' });
          if (p.stock < qty) return fail({ type: 'stock', name: p.name, available: p.stock });
          found[i] = { p, qty };
          if (--pending === 0) finish();
        };
      });
      function finish() {
        const tot = computeTotals(found, mode, percent, fixed);
        const applied = tot.discount > 0 ? mode : 'NONE';
        const sale = {
          createdAt: Date.now(),
          itemCount: tot.count,
          subtotal: tot.subtotal,
          discountMode: applied,
          discountPercent: applied === 'PERCENT' ? percent : 0,
          discountAmount: tot.discount,
          total: tot.total,
          totalCost: tot.cost,
          profit: tot.profit,
          items: found.map(({ p, qty }) => ({
            perfumeId: p.id, name: p.name, brand: p.brand, volumeMl: p.volumeMl,
            quantity: qty, unitPrice: p.salePrice, unitCost: p.purchasePrice,
          })),
        };
        const low = [];
        for (const { p, qty } of found) {
          const remaining = p.stock - qty;
          perfumes.put({ ...p, stock: remaining });
          if (remaining < LOW_STOCK) low.push({ name: p.name, remaining });
        }
        const add = sales.add(sale);
        add.onsuccess = () => done({ type: 'ok', saleId: add.result, total: tot.total, low });
      }
    });
  },
  /** Annule une vente : remet les quantités en stock puis la supprime. */
  cancelSale(saleId) {
    return writeTx(['perfumes', 'sales'], ({ perfumes, sales }) => {
      const req = sales.get(saleId);
      req.onsuccess = () => {
        const sale = req.result;
        if (!sale) return;
        for (const item of sale.items) {
          const g = perfumes.get(item.perfumeId);
          g.onsuccess = () => { if (g.result) perfumes.put({ ...g.result, stock: g.result.stock + item.quantity }); };
        }
        sales.delete(saleId);
      };
    });
  },
  replaceAll(data) {
    return writeTx(['perfumes', 'sales'], ({ perfumes, sales }) => {
      perfumes.clear();
      sales.clear();
      data.perfumes.forEach(p => perfumes.put(p));
      data.sales.forEach(s => sales.put(s));
    });
  },
};

function sampleCatalog() {
  const s = (name, brand, gender, type, volumeMl, costDa, priceDa, stock) => ({
    name, brand, gender, type, volumeMl, purchasePrice: costDa * 100, salePrice: priceDa * 100, stock, createdAt: Date.now(),
  });
  return [
    s('Sauvage', 'Dior', 'MEN', 'EDT', 100, 17000, 23500, 6),
    s('Bleu de Chanel', 'Chanel', 'MEN', 'EDP', 100, 21000, 28000, 2),
    s('N°5', 'Chanel', 'WOMEN', 'EDP', 100, 24000, 32000, 4),
    s('J’adore', 'Dior', 'WOMEN', 'EDP', 50, 15500, 21000, 1),
    s('Miss Dior', 'Dior', 'WOMEN', 'EDP', 100, 20000, 27000, 5),
    s('Aventus', 'Creed', 'MEN', 'EDP', 100, 48000, 62000, 2),
    s('Black Opium', 'Yves Saint Laurent', 'WOMEN', 'EDP', 90, 17500, 24000, 7),
    s('Oud Wood', 'Tom Ford', 'UNISEX', 'EDP', 50, 33000, 43000, 3),
    s('Baccarat Rouge 540', 'Maison Francis Kurkdjian', 'UNISEX', 'EDP', 70, 38000, 52000, 0),
    s('Acqua di Giò', 'Giorgio Armani', 'MEN', 'EDT', 100, 13500, 19000, 8),
    s('La Vie est Belle', 'Lancôme', 'WOMEN', 'EDP', 75, 14500, 20000, 5),
    s('Musc blanc', 'Al Rehab', 'UNISEX', 'OIL', 6, 250, 500, 24),
  ];
}

/* ====================================================================== */
/* État de l'application                                                  */
/* ====================================================================== */

const state = {
  ready: false,
  perfumes: [],
  sales: [],                 // plus récente en premier
  tab: 'sales',
  cart: new Map(),           // id du parfum → quantité (ordre d'ajout conservé)
  discountMode: 'NONE',
  discountText: '',
  gender: null,
  type: null,
  lowOnly: false,
  topScope: 'today',
  historyLimit: HISTORY_PAGE,
  processing: false,
  cartOpen: false,
};

async function reload() {
  const [perfumes, sales] = await Promise.all([getAll('perfumes'), getAll('sales')]);
  perfumes.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name) || a.volumeMl - b.volumeMl);
  sales.sort((a, b) => b.createdAt - a.createdAt);
  state.perfumes = perfumes;
  state.sales = sales;
  state.ready = true;
  // Un parfum supprimé ailleurs disparaît du panier.
  for (const id of [...state.cart.keys()]) if (!perfumes.some(p => p.id === id)) state.cart.delete(id);
}

function perfumeById(id) { return state.perfumes.find(p => p.id === id); }
const isLow = p => p.stock < LOW_STOCK;

function cartView() {
  const lines = [];
  for (const [id, qty] of state.cart) {
    const p = perfumeById(id);
    if (p) lines.push({ p, qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.p.salePrice * l.qty, 0);
  const input = state.discountText.trim();
  let percent = 0, fixed = 0, error = null;
  if (state.discountMode === 'PERCENT' && input) {
    const v = Number(normalizeDigits(input).replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || v > 100 || !/^\d+([.,]\d*)?$/.test(normalizeDigits(input))) error = 'err_pct';
    else percent = v;
  } else if (state.discountMode === 'FIXED' && input) {
    const v = parseMoney(input);
    if (v === null) error = 'err_amount';
    else if (v > subtotal) { error = 'err_exceeds'; fixed = v; }
    else fixed = v;
  }
  const totals = computeTotals(lines, state.discountMode, percent, fixed);
  const stockIssue = lines.some(l => l.qty > l.p.stock);
  return { lines, percent, fixed, error, totals, stockIssue, canCheckout: lines.length > 0 && !error && !stockIssue };
}

function dayStart(ts = Date.now()) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

function topSellers(sales, limit = 3) {
  const map = new Map();
  for (const sale of sales) {
    const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 0;   // remise répartie sur les lignes
    for (const it of sale.items) {
      const e = map.get(it.perfumeId) || { name: it.name, brand: it.brand, volumeMl: it.volumeMl, qty: 0, revenue: 0 };
      e.qty += it.quantity;
      e.revenue += it.quantity * it.unitPrice * ratio;
      map.set(it.perfumeId, e);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, limit);
}

/* ====================================================================== */
/* Icônes                                                                 */
/* ====================================================================== */

const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M18 7l-.9 12.1a1.5 1.5 0 0 1-1.5 1.4H8.4a1.5 1.5 0 0 1-1.5-1.4L6 7"/>',
  warn: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  bag: '<path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  bottle: '<rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M10.5 6v2.5M13.5 6v2.5"/><rect x="5" y="8.5" width="14" height="13" rx="3.5"/><path d="M5 14.5h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  tag: '<path d="M3 12.5V4h8.5L21 13.5 13.5 21z"/><circle cx="7.5" cy="8" r="1.4"/>',
  export: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  import: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

/* ====================================================================== */
/* Rendu                                                                  */
/* ====================================================================== */

const $ = sel => document.querySelector(sel);
const fmtDate = opts => new Intl.DateTimeFormat(LOCALES[lang], opts);

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
  renderReports();
}

function renderNav() {
  document.querySelectorAll('.tab').forEach(b => {
    if (b.dataset.tab === state.tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  ['sales', 'stock', 'reports'].forEach(v => { $(`#view-${v}`).hidden = v !== state.tab; });
  $('#tabTitle').textContent = t({ sales: 'tab_sales', stock: 'tab_stock', reports: 'tab_reports' }[state.tab]);
  const low = state.perfumes.filter(isLow).length;
  const badge = $('#lowBadge');
  badge.hidden = low === 0;
  badge.textContent = low;
}

/* ---------------------------- Caisse ---------------------------- */

function renderSales() {
  renderChips();
  renderCatalog();
  renderCart();
}

function renderChips() {
  const chip = (kind, value, label) =>
    `<button class="chip" data-action="filter" data-kind="${kind}" data-value="${value}" aria-pressed="${state[kind] === value}">${esc(label)}</button>`;
  $('#posChips').innerHTML =
    ['MEN', 'WOMEN', 'UNISEX'].map(g => chip('gender', g, t(g))).join('') +
    '<span class="sep"></span>' +
    ['EDP', 'EDT', 'OIL'].map(ty => chip('type', ty, ty === 'OIL' ? t('OIL_short') : ty)).join('');
}

function stockPill(stock) {
  if (stock <= 0) return `<span class="pill out">${icon('warn', 'sm')}${t('out')}</span>`;
  if (stock < LOW_STOCK) return `<span class="pill low">${icon('warn', 'sm')}${t('low_n', stock)}</span>`;
  return `<span class="pill">${t('stock_n', stock)}</span>`;
}

function metaLine(p) {
  return `<span>${esc(t(p.type))}${sep()}<span class="num">${p.volumeMl}</span>${NBSP}${t('ml')}</span><span class="tag">${esc(t(p.gender))}</span>`;
}

function emptyBlock(glyph, title, message, actions = '') {
  return `<div class="empty"><div class="glyph">${icon(glyph)}</div><h3>${esc(title)}</h3><p>${esc(message)}</p>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
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
    const inCart = state.cart.get(p.id) || 0;
    return `<button class="row" data-action="add" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
      <span><span class="brand">${esc(p.brand)}</span><span class="name">${esc(p.name)}</span><span class="meta">${metaLine(p)}</span></span>
      <span class="side"><span class="price num">${money(p.salePrice)}</span>
        ${inCart ? `<span class="in-cart">×${inCart}</span>` : stockPill(p.stock)}</span>
    </button>`;
  }).join('');
}

function renderCart() {
  const cv = cartView();
  const empty = cv.lines.length === 0;
  $('#clearCartBtn').hidden = empty;

  $('#cartLines').innerHTML = empty
    ? emptyBlock('bag', t('cart_empty_t'), t('cart_empty_m'))
    : cv.lines.map(({ p, qty }) => `
      <div class="line">
        <div><div class="name">${esc(p.name)}</div><div class="meta">${esc(p.brand)}${sep()}<span class="num">${p.volumeMl}</span>${NBSP}${t('ml')}</div></div>
        <div class="ctrl">
          <button class="step" data-action="qty" data-id="${p.id}" data-delta="-1" aria-label="${esc(t('decrease'))}">${icon('minus', 'sm')}</button>
          <span class="qty num">${qty}</span>
          <button class="step" data-action="qty" data-id="${p.id}" data-delta="1" aria-label="${esc(t('increase'))}">${icon('plus', 'sm')}</button>
          <button class="remove" data-action="remove" data-id="${p.id}" aria-label="${esc(t('remove'))}">${icon('trash')}</button>
        </div>
        <div class="amount num">${money(p.salePrice * qty)}</div>
        ${qty > p.stock ? `<div class="warn">${esc(t('only_n', p.stock))}</div>` : ''}
      </div>`).join('');

  renderDiscount(empty);
  renderTotals(cv);

  // Barre « panier » du téléphone
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
  box.innerHTML = `<div class="discount"><span class="label">${esc(t('discount'))}</span>
    <div class="seg" role="group">${modes.map(([m, k]) =>
      `<button data-action="discount-mode" data-mode="${m}" aria-pressed="${state.discountMode === m}">${esc(t(k))}</button>`).join('')}</div>
    ${field}</div>`;
}

function renderTotals(cv = cartView()) {
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
      ${tot.discount > 0 ? `<div class="trow discount-row"><span>${esc(state.discountMode === 'PERCENT' ? t('discount_pct', formatPercent(cv.percent)) : t('discount'))}</span><span class="num">−${NBSP}${money(tot.discount)}</span></div>` : ''}
      <div class="trow profit ${tot.profit < 0 ? 'neg' : ''}"><span>${esc(t('profit'))}</span><span class="num">${money(tot.profit)}</span></div>
    </div>`;
  $('#cartFoot').hidden = empty;
  $('#cartFoot').innerHTML = empty ? '' : `
    <button class="validate" data-action="checkout" ${cv.canCheckout && !state.processing ? '' : 'disabled'}>
      <span>${esc(t('validate'))}</span><span class="num">${money(tot.total)}</span>
    </button>
    ${cv.stockIssue ? `<p class="err foot-note">${esc(t('stock_issue'))}</p>` : ''}`;
}

function setCartOpen(open) {
  state.cartOpen = open;
  $('#cart').classList.toggle('open', open);
  $('#cartScrim').classList.toggle('on', open);
}

/* ---------------------------- Stock ---------------------------- */

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
  const units = all.reduce((s, p) => s + p.stock, 0);
  const valueCost = all.reduce((s, p) => s + p.purchasePrice * p.stock, 0);
  const valueSale = all.reduce((s, p) => s + p.salePrice * p.stock, 0);

  box.innerHTML = `
    <div class="figures">
      <div class="figure"><small>${esc(t('refs'))}</small><span class="num">${all.length}</span></div>
      <div class="figure"><small>${esc(t('units'))}</small><span class="num">${units}</span></div>
      <div class="figure"><small>${esc(t('value_cost'))}</small><span class="num">${money(valueCost)}</span></div>
      <div class="figure"><small>${esc(t('value_sale'))}</small><span class="num">${money(valueSale)}</span></div>
    </div>
    ${low.length ? `<div class="alert" role="status">${icon('warn')}
      <span class="txt"><strong>${esc(t('low_alert_t', low.length))}</strong><small>${esc(t('low_alert_m', LOW_STOCK))}</small></span>
      <button class="btn text" data-action="toggle-low">${esc(t(lowOnly ? 'show_all' : 'show'))}</button></div>` : ''}
    <div class="list">
      ${items.length ? items.map(p => {
        const margin = p.salePrice - p.purchasePrice;
        return `<button class="row" data-action="edit" data-id="${p.id}">
          <span><span class="brand">${esc(p.brand)}</span><span class="name">${esc(p.name)}</span><span class="meta">${metaLine(p)}</span></span>
          <span class="side">${stockPill(p.stock)}</span>
          <span class="prices">
            <span><small>${esc(t('cost'))}</small><span class="num">${money(p.purchasePrice)}</span></span>
            <span><small>${esc(t('price'))}</small><span class="num">${money(p.salePrice)}</span></span>
            <span><small>${esc(t('margin'))}</small><span class="num ${margin < 0 ? 'loss' : 'gain'}">${money(margin)}</span></span>
          </span>
        </button>`;
      }).join('') : emptyBlock('search', t('no_results_t'), t('no_results_m'))}
    </div>`;
}

/* ---------------------------- Rapports ---------------------------- */

function dayLabel(ts) {
  const today = dayStart();
  const d = dayStart(ts);
  if (d === today) return t('today');
  if (d === dayStart(today - 12 * 3600 * 1000)) return t('yesterday');
  const s = fmtDate({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderReports() {
  const box = $('#reportBody');
  if (!state.ready) { box.innerHTML = ''; return; }
  const start = dayStart();
  const todaySales = state.sales.filter(s => s.createdAt >= start);
  const revenue = todaySales.reduce((s, x) => s + x.total, 0);
  const profit = todaySales.reduce((s, x) => s + x.profit, 0);
  const items = todaySales.reduce((s, x) => s + x.itemCount, 0);
  const top = topSellers(state.topScope === 'all' ? state.sales : todaySales);
  const todayText = fmtDate({ weekday: 'long', day: 'numeric', month: 'long' }).format(Date.now());

  const since = Math.max(Number(store.get('gs.lastBackup') || 0), Number(store.get('gs.since') || Date.now()));
  const backupDue = state.sales.length > 0 && Date.now() - since > BACKUP_REMINDER_DAYS * 86400000;

  // Historique groupé par jour (la liste est déjà triée du plus récent au plus ancien)
  const shown = state.sales.slice(0, state.historyLimit);
  const groups = [];
  for (const s of shown) {
    const key = dayStart(s.createdAt);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, sales: [] }; groups.push(g); }
    g.sales.push(s);
  }
  const time = fmtDate({ hour: '2-digit', minute: '2-digit', hour12: false });
  const dayTotals = new Map();   // totaux par jour, sur toutes les ventes (pas seulement celles affichées)
  for (const s of state.sales) {
    const k = dayStart(s.createdAt);
    const e = dayTotals.get(k) || { n: 0, sum: 0 };
    e.n += 1;
    e.sum += s.total;
    dayTotals.set(k, e);
  }

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
        <div class="kpi"><small>${esc(t('items_sold'))}</small><span class="num">${items}</span></div>
      </div>
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
          <span class="who"><span class="name">${esc(e.name)}</span><small>${esc(e.brand)}${sep()}<span class="num">${e.volumeMl}</span>${NBSP}${t('ml')}</small></span>
          <span class="how"><strong>${esc(t('sold_n', e.qty))}</strong><small class="num">${money(Math.round(e.revenue))}</small></span>
        </div>`).join('') : `<p class="muted">${esc(t('no_sales_period'))}</p>`}
    </section>
    <section class="col-history">
      <div class="section-head"><h2>${esc(t('history'))}</h2></div>
      ${groups.length ? groups.map(g => {
        const tot = dayTotals.get(g.key);
        return `<div class="dayhead"><span><strong>${esc(dayLabel(g.key))}</strong><small>${esc(t('sales_n', tot.n))}</small></span><span class="num">${money(tot.sum)}</span></div>
          ${g.sales.map(s => `<button class="sale" data-action="open-sale" data-id="${s.id}">
            <span class="time">${time.format(s.createdAt)}</span>
            <span class="what">${esc(t('sale_no', s.id))}<small>${esc(t('items_n', s.itemCount))}${s.discountAmount > 0 ? ` <span class="disc">${icon('tag', 'sm')}</span>` : ''}</small></span>
            <span class="amt"><span class="num">${money(s.total)}</span><small class="${s.profit < 0 ? 'loss' : ''}">${esc(t('profit_v', money(s.profit)))}</small></span>
          </button>`).join('')}`;
      }).join('') + (state.sales.length > shown.length ? `<button class="btn ghost block more" data-action="more-history">${esc(t('show_more'))}</button>` : '')
      : emptyBlock('receipt', t('history_empty_t'), t('history_empty_m'))}
    </section>`;
}

/* ====================================================================== */
/* Fenêtres : formulaire parfum, détail de vente, confirmation, réglages  */
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
      <header><h2>${esc(title)}</h2></header>
      <div class="body"><p>${esc(message)}</p></div>
      <div class="foot"><span class="grow"></span>
        <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(confirm)}</button>
      </div>`, { center: true, onClose: () => { if (!answered) resolve(false); } });
    modal.querySelector('[data-ok]').addEventListener('click', () => { answered = true; closeModal(); resolve(true); });
  });
}

function openEditor(perfume) {
  const isNew = !perfume;
  const p = perfume || { name: '', brand: '', gender: 'UNISEX', type: 'EDP', volumeMl: '', purchasePrice: null, salePrice: null, stock: '' };
  const brands = [...new Map(state.perfumes.map(x => [x.brand.trim().toLowerCase(), x.brand.trim()])).values()]
    .filter(Boolean).sort((a, b) => a.localeCompare(b));
  const opt = (name, value, label, current) =>
    `<button type="button" class="chip" data-opt="${name}" data-value="${value}" aria-pressed="${current === value}">${esc(label)}</button>`;
  const fieldHtml = (id, label, value, { mode = 'text', unit = '', max = 80 } = {}) => `
    <div class="field" data-field="${id}">
      <label class="label" for="f_${id}">${esc(label)}</label>
      <div class="input"><input id="f_${id}" inputmode="${mode}" maxlength="${max}" autocomplete="off" value="${esc(value)}">${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</div>
      <div class="err" hidden></div>
    </div>`;

  const modal = openModal(`
    <header><h2>${esc(t(isNew ? 'add_perfume' : 'edit_perfume'))}</h2>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <form class="body" id="perfumeForm" novalidate>
      ${fieldHtml('name', t('f_name'), p.name)}
      ${fieldHtml('brand', t('f_brand'), p.brand, { max: 60 })}
      <div class="suggest" id="brandSuggest"></div>
      <div class="field"><span class="label">${esc(t('f_gender'))}</span>
        <div class="options">${['MEN', 'WOMEN', 'UNISEX'].map(g => opt('gender', g, t(g), p.gender)).join('')}</div></div>
      <div class="field"><span class="label">${esc(t('f_type'))}</span>
        <div class="options">${['EDP', 'EDT', 'OIL'].map(ty => opt('type', ty, t(ty), p.type)).join('')}</div></div>
      <div class="two">
        ${fieldHtml('volume', t('f_volume'), p.volumeMl, { mode: 'numeric', unit: t('ml'), max: 5 })}
        ${fieldHtml('stock', t('f_stock'), p.stock, { mode: 'numeric', max: 6 })}
      </div>
      <div class="two">
        ${fieldHtml('cost', t('f_cost'), p.purchasePrice == null ? '' : moneyInput(p.purchasePrice), { mode: 'decimal', unit: t('currency'), max: 12 })}
        ${fieldHtml('price', t('f_price'), p.salePrice == null ? '' : moneyInput(p.salePrice), { mode: 'decimal', unit: t('currency'), max: 12 })}
      </div>
      <div class="margin-line" id="marginLine"></div>
      <button type="submit" hidden></button>
    </form>
    <div class="foot">
      ${isNew ? '' : `<button class="btn danger" data-del>${icon('trash')}${esc(t('delete'))}</button>`}
      <span class="grow"></span>
      <button class="btn ghost" data-close>${esc(t('cancel'))}</button>
      <button class="btn primary" data-save>${esc(t('save'))}</button>
    </div>`);

  const form = modal.querySelector('#perfumeForm');
  const val = id => form.querySelector(`#f_${id}`).value;
  const choice = { gender: p.gender, type: p.type };
  let showErrors = false;
  let saving = false;

  const setErr = (id, msg, warnOnly = false) => {
    const f = form.querySelector(`[data-field="${id}"]`);
    const e = f.querySelector('.err');
    e.hidden = !msg;
    e.textContent = msg || '';
    e.classList.toggle('muted', warnOnly);
    f.classList.toggle('invalid', !!msg && !warnOnly);
  };

  function read() {
    const v = {
      name: val('name').trim(), brand: val('brand').trim(),
      volume: parseIntStrict(val('volume')), stock: parseIntStrict(val('stock')),
      cost: parseMoney(val('cost')), price: parseMoney(val('price')),
    };
    v.valid = !!v.name && !!v.brand && v.volume > 0 && v.stock !== null && v.cost !== null && v.price !== null;
    return v;
  }

  function validate() {
    const v = read();
    setErr('name', showErrors && !v.name ? t('err_required') : '');
    setErr('brand', showErrors && !v.brand ? t('err_required') : '');
    setErr('volume', showErrors && !(v.volume > 0) ? t('err_volume') : '');
    setErr('stock', showErrors && v.stock === null ? t('err_qty') : '');
    setErr('cost', showErrors && v.cost === null ? t('err_amount') : '');
    if (showErrors && v.price === null) setErr('price', t('err_amount'));
    else if (v.cost !== null && v.price !== null && v.price < v.cost) setErr('price', t('warn_below'), true);
    else setErr('price', '');
    const line = form.querySelector('#marginLine');
    if (v.cost !== null && v.price !== null) {
      line.textContent = t('margin_unit', money(v.price - v.cost));
      line.className = 'margin-line ' + (v.price - v.cost < 0 ? 'err' : 'ok');
    } else line.textContent = '';
    return v;
  }

  function renderSuggestions() {
    const typed = val('brand').trim().toLowerCase();
    const list = brands.filter(b => !typed || (b.toLowerCase().includes(typed) && b.toLowerCase() !== typed)).slice(0, 8);
    form.querySelector('#brandSuggest').innerHTML = list.map(b => `<button type="button" data-brand="${esc(b)}">${esc(b)}</button>`).join('');
  }

  form.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'f_volume' || id === 'f_stock') e.target.value = cleanInteger(e.target.value, id === 'f_volume' ? 5 : 6);
    if (id === 'f_cost' || id === 'f_price') e.target.value = cleanDecimal(e.target.value);
    if (id === 'f_brand') renderSuggestions();
    validate();
  });
  form.addEventListener('click', e => {
    const b = e.target.closest('[data-brand]');
    if (b) { form.querySelector('#f_brand').value = b.dataset.brand; renderSuggestions(); validate(); return; }
    const o = e.target.closest('[data-opt]');
    if (o) {
      choice[o.dataset.opt] = o.dataset.value;
      form.querySelectorAll(`[data-opt="${o.dataset.opt}"]`).forEach(x => x.setAttribute('aria-pressed', x === o));
    }
  });

  async function save() {
    if (saving) return;
    showErrors = true;
    const v = validate();
    if (!v.valid) { form.querySelector('.field.invalid input')?.focus(); return; }
    saving = true;
    const record = {
      ...(isNew ? {} : { id: perfume.id }),
      name: v.name, brand: v.brand, gender: choice.gender, type: choice.type,
      volumeMl: v.volume, purchasePrice: v.cost, salePrice: v.price, stock: v.stock,
      createdAt: isNew ? Date.now() : perfume.createdAt,
    };
    closeModal();   // fermé avant l'écriture : un double appui ne crée pas de doublon
    await guard(async () => {
      await repo.savePerfume(record);
      requestPersistence();
      await refresh();
      toast(t('saved', record.name));
    });
  }

  form.addEventListener('submit', e => { e.preventDefault(); save(); });
  modal.querySelector('[data-save]').addEventListener('click', save);
  modal.querySelector('[data-del]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: t('del_t'), message: t('del_m', perfume.name), confirm: t('delete'), danger: true });
    if (!ok) return;
    await guard(async () => {
      await repo.deletePerfume(perfume.id);
      state.cart.delete(perfume.id);
      await refresh();
      toast(t('deleted', perfume.name));
    });
  });

  renderSuggestions();
  validate();
  if (isNew) setTimeout(() => form.querySelector('#f_name').focus(), 60);
}

function openSaleDetail(saleId) {
  const s = state.sales.find(x => x.id === saleId);
  if (!s) return;
  const when = fmtDate({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(s.createdAt);
  const modal = openModal(`
    <header><div style="flex:1"><h2>${esc(t('sale_no', s.id))}</h2><p>${esc(when)}</p></div>
      <button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <div>${s.items.map(it => `
        <div class="detail-line"><strong>${esc(it.name)}</strong><span class="num">${money(it.quantity * it.unitPrice)}</span>
          <small>${esc(it.brand)}${sep()}<span class="num">${it.volumeMl}</span>${NBSP}${t('ml')} — <span class="num">${it.quantity}</span> × ${money(it.unitPrice)}</small></div>`).join('')}</div>
      <div class="totals">
        <div class="trow"><span>${esc(t('subtotal'))}</span><span class="num">${money(s.subtotal)}</span></div>
        ${s.discountAmount > 0 ? `<div class="trow discount-row"><span>${esc(s.discountMode === 'PERCENT' ? t('discount_pct', formatPercent(s.discountPercent)) : t('discount'))}</span><span class="num">−${NBSP}${money(s.discountAmount)}</span></div>` : ''}
        <div class="trow"><span><strong>${esc(t('total'))}</strong></span><span class="num" style="font-size:1.4rem;color:var(--amber)">${money(s.total)}</span></div>
        <div class="trow"><span>${esc(t('purchase_cost'))}</span><span class="num">${money(s.totalCost)}</span></div>
        <div class="trow profit ${s.profit < 0 ? 'neg' : ''}"><span>${esc(t('profit'))}</span><span class="num">${money(s.profit)}</span></div>
      </div>
    </div>
    <div class="foot">
      <button class="btn danger" data-cancel-sale>${esc(t('cancel_sale'))}</button>
      <span class="grow"></span>
      <button class="btn primary" data-close>${esc(t('close'))}</button>
    </div>`);
  modal.querySelector('[data-cancel-sale]').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: t('cancel_sale_t'), message: t('cancel_sale_m'), confirm: t('cancel_sale'), danger: true });
    if (ok) cancelSale(saleId);
  });
}

function openSettings() {
  const theme = store.get('gs.theme') || 'system';
  const last = Number(store.get('gs.lastBackup') || 0);
  const lastText = last ? fmtDate({ day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(last) : t('never');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const seg = (action, items, current) => `<div class="seg" role="group">${items.map(([v, label]) =>
    `<button data-set="${action}" data-value="${v}" aria-pressed="${current === v}">${esc(label)}</button>`).join('')}</div>`;

  const modal = openModal(`
    <header><h2>${esc(t('settings'))}</h2><button class="icon-btn" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></header>
    <div class="body">
      <div class="setting-group"><h3>${esc(t('language'))}</h3>
        ${seg('lang', [['ar', 'العربية'], ['fr', 'Français'], ['en', 'English']], lang)}</div>
      <div class="setting-group"><h3>${esc(t('theme'))}</h3>
        ${seg('theme', [['system', t('th_system')], ['light', t('th_light')], ['dark', t('th_dark')]], theme)}</div>
      <div class="setting-group"><h3>${esc(t('backup'))}</h3>
        <p class="hint" style="margin:0">${esc(t('backup_hint'))}</p>
        <p class="hint" style="margin:0">${esc(t('last_backup', lastText))}</p>
        <button class="btn primary block" data-run="export">${icon('export')}${esc(t('backup_export'))}</button>
        <button class="btn ghost block" data-run="import">${icon('import')}${esc(t('backup_import'))}</button></div>
      ${ios && !standalone ? `<div class="setting-group"><h3>${esc(t('install_t'))}</h3><p class="hint" style="margin:0">${esc(t('install_m'))}</p></div>` : ''}
      <p class="version">Golden Sense — ${esc(t('version', APP_VERSION))}</p>
    </div>`);
  modal.addEventListener('click', e => {
    const s = e.target.closest('[data-set]');
    if (s) {
      if (s.dataset.set === 'lang') setLanguage(s.dataset.value);
      if (s.dataset.set === 'theme') { store.set('gs.theme', s.dataset.value); applyTheme(); }
      openSettings();
      return;
    }
    const r = e.target.closest('[data-run]');
    if (r && r.dataset.run === 'export') exportBackup();
    if (r && r.dataset.run === 'import') $('#restoreInput').click();
  });
}

/* ====================================================================== */
/* Actions                                                                */
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

function addToCart(id) {
  const p = perfumeById(id);
  if (!p) return;
  const current = state.cart.get(id) || 0;
  if (current + 1 > p.stock) { toast(t('stock_limit', p.name, p.stock)); return; }
  state.cart.set(id, current + 1);
  if (navigator.vibrate) navigator.vibrate(8);
  renderCatalog();
  renderCart();
}

function changeQty(id, delta) {
  const p = perfumeById(id);
  const current = state.cart.get(id);
  if (!p || current == null) return;
  const next = current + delta;
  if (next <= 0) state.cart.delete(id);
  else if (delta > 0 && next > p.stock) { toast(t('stock_limit', p.name, p.stock)); return; }
  else state.cart.set(id, next);
  renderCatalog();
  renderCart();
}

async function checkout() {
  const cv = cartView();
  if (!cv.canCheckout || state.processing) return;
  state.processing = true;
  renderTotals(cv);
  const sold = cv.lines.map(l => ({ id: l.p.id, qty: l.qty }));
  try {
    const res = await repo.checkout(sold, state.discountMode, cv.percent, cv.fixed);
    if (res.type === 'ok') {
      // Retire seulement ce qui a été vendu.
      for (const { id, qty } of sold) {
        const left = (state.cart.get(id) || 0) - qty;
        if (left > 0) state.cart.set(id, left); else state.cart.delete(id);
      }
      state.discountMode = 'NONE';
      state.discountText = '';
      requestPersistence();
      state.processing = false;
      await refresh();
      let msg = t('sale_done', money(res.total));
      if (res.low.length) msg += '\n⚠ ' + t('low_after', res.low.map(l => `${l.name} (${l.remaining})`).join(', '));
      toast(msg, { action: t('undo'), duration: 8000, onAction: () => cancelSale(res.saleId) });
    } else if (res.type === 'stock') {
      toast(t('stock_limit', res.name, res.available));
      await refresh();
    } else {
      toast(t('missing'));
      await refresh();
    }
  } catch (e) {
    console.error(e);
    toast(t('error'));
  } finally {
    state.processing = false;
    renderTotals();
  }
}

async function cancelSale(saleId) {
  closeModal();
  await guard(async () => {
    await repo.cancelSale(saleId);
    await refresh();
    toast(t('sale_cancelled'));
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

/* ---------- Sauvegarde / restauration ---------- */

async function exportBackup() {
  const data = { app: 'golden-sense', format: 1, exportedAt: new Date().toISOString(), perfumes: state.perfumes, sales: state.sales };
  const d = new Date();
  const name = `golden-sense-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const markDone = () => { store.set('gs.lastBackup', String(Date.now())); toast(t('exported')); renderReports(); if (closeCurrentModal) openSettings(); };
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      markDone();
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;   // partage annulé
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

function isValidBackup(data) {
  const okPerfume = p => p && Number.isInteger(p.id) && typeof p.name === 'string' && typeof p.brand === 'string' &&
    ['MEN', 'WOMEN', 'UNISEX'].includes(p.gender) && ['EDP', 'EDT', 'OIL'].includes(p.type) &&
    Number.isInteger(p.volumeMl) && Number.isInteger(p.purchasePrice) && Number.isInteger(p.salePrice) && Number.isInteger(p.stock);
  const okSale = s => s && Number.isInteger(s.id) && Number.isFinite(s.createdAt) && Number.isInteger(s.total) &&
    Number.isInteger(s.profit) && Number.isInteger(s.subtotal) && Array.isArray(s.items);
  return data && data.app === 'golden-sense' && Array.isArray(data.perfumes) && Array.isArray(data.sales) &&
    data.perfumes.every(okPerfume) && data.sales.every(okSale);
}

async function restoreFromFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
  if (!isValidBackup(data)) { toast(t('restore_bad')); return; }
  const ok = await confirmDialog({
    title: t('restore_t'),
    message: t('restore_m', state.perfumes.length, state.sales.length, data.perfumes.length, data.sales.length),
    confirm: t('restore'), danger: true,
  });
  if (!ok) return;
  await guard(async () => {
    await repo.replaceAll(data);
    state.cart.clear();
    await refresh();
    toast(t('restored'));
  });
}

/* ---------- Messages ---------- */

let toastTimer = null;
function toast(message, { action, onAction, duration = 3500 } = {}) {
  const root = $('#toastRoot');
  clearTimeout(toastTimer);
  root.innerHTML = `<div class="toast" role="status"><span class="msg">${esc(message)}</span>${action ? `<button>${esc(action)}</button>` : ''}</div>`;
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
  switch (el.dataset.action) {
    case 'add': addToCart(id); break;
    case 'qty': changeQty(id, Number(el.dataset.delta)); break;
    case 'remove': state.cart.delete(id); renderCatalog(); renderCart(); break;
    case 'clear-cart': state.cart.clear(); state.discountMode = 'NONE'; state.discountText = ''; renderCatalog(); renderCart(); break;
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
    case 'edit': openEditor(perfumeById(id)); break;
    case 'load-sample': loadSample(el); break;
    case 'toggle-low': state.lowOnly = !state.lowOnly; renderStock(); break;
    case 'top-scope': state.topScope = el.dataset.scope; renderReports(); break;
    case 'more-history': state.historyLimit += HISTORY_PAGE; renderReports(); break;
    case 'open-sale': openSaleDetail(id); break;
    case 'export': exportBackup(); break;
    case 'settings': openSettings(); break;
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'posSearch' || e.target.id === 'stockSearch') {
    e.target.parentElement.querySelector('.clear').hidden = !e.target.value;
    if (e.target.id === 'posSearch') renderCatalog(); else renderStock();
  } else if (e.target.id === 'discountInput') {
    const cleaned = cleanDecimal(e.target.value);
    if (cleaned !== e.target.value) e.target.value = cleaned;
    state.discountText = cleaned;
    renderTotals();   // le champ n'est pas redessiné : pas de perte du curseur
  }
});

// « Entrée » dans la recherche ferme le clavier.
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.target.id === 'posSearch' || e.target.id === 'stockSearch')) e.target.blur();
});

$('#restoreInput').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  closeModal();
  if (file) restoreFromFile(file);
});

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// Passage à minuit : les chiffres du jour se mettent à jour.
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

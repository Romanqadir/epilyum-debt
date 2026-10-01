/**
 * Languages for the printed statement — and only for the statement.
 *
 * The app itself stays Kurdish; this exists because the document leaves the
 * company. A clinic in Basra reads Arabic and a distributor abroad reads
 * English, and handing either of them a Kurdish page makes them take the
 * numbers on trust. Nothing here touches what is stored: the same payments
 * are simply labelled in the reader's language.
 */

export const STATEMENT_LANGS = [
  { value: 'ku', label: 'کوردی' },
  { value: 'ar', label: 'عەرەبی' },
  { value: 'en', label: 'ئینگلیزی' },
]

const CITY_AR = {
  Baghdad: 'بغداد',
  Basra: 'البصرة',
  Nineveh: 'نينوى',
  Erbil: 'أربيل',
  Sulaymaniyah: 'السليمانية',
  Duhok: 'دهوك',
  Kirkuk: 'كركوك',
  Karbala: 'كربلاء',
  Najaf: 'النجف',
  'Dhi Qar': 'ذي قار',
  Babil: 'بابل',
  Anbar: 'الأنبار',
  'Salah al-Din': 'صلاح الدين',
  Diyala: 'ديالى',
  Wasit: 'واسط',
  'Al-Qadisiyyah': 'القادسية',
  Maysan: 'ميسان',
  'Al-Muthanna': 'المثنى',
}

const STRINGS = {
  ku: {
    htmlLang: 'ckb',
    dir: 'rtl',
    kind: 'پسوڵەی قیستەکان',
    allPeriods: 'هەموو ماوەکان',
    totalPaid: 'کۆی قیستەکانی ئەم ماوەیە',
    count: 'ژمارەی قیست',
    remaining: 'ماوە',
    date: 'بەروار',
    invoice: 'ژمارەی پسوڵە',
    amount: 'بڕ',
    empty: 'هیچ قیستێک لەم ماوەیەدا تۆمار نەکراوە.',
    // English month names are what the rest of the app already shows.
    monthLocale: 'en-GB',
    iqdAfter: 'د.ع',
  },
  ar: {
    htmlLang: 'ar',
    dir: 'rtl',
    kind: 'كشف الأقساط',
    allPeriods: 'كل الفترات',
    totalPaid: 'إجمالي أقساط هذه الفترة',
    count: 'عدد الأقساط',
    remaining: 'المتبقي',
    date: 'التاريخ',
    invoice: 'رقم الإيصال',
    amount: 'المبلغ',
    empty: 'لا توجد أقساط مسجلة في هذه الفترة.',
    // Arabic month names, but Latin digits — Arabic-Indic numerals next to
    // the Latin figures in the table would read as two different systems.
    monthLocale: 'ar-u-nu-latn',
    iqdAfter: 'د.ع',
  },
  en: {
    htmlLang: 'en',
    dir: 'ltr',
    kind: 'Instalment Statement',
    allPeriods: 'All periods',
    totalPaid: 'Total paid this period',
    count: 'Instalments',
    remaining: 'Remaining',
    date: 'Date',
    invoice: 'Invoice no.',
    amount: 'Amount',
    empty: 'No instalments recorded for this period.',
    monthLocale: 'en-GB',
    iqdBefore: 'IQD',
  },
}

export const statementStrings = (lang) => STRINGS[lang] ?? STRINGS.ku

/** The stored city value is already the English name. */
export const statementCity = (city, lang) => {
  if (!city) return ''
  if (lang === 'ar') return CITY_AR[city] ?? city
  if (lang === 'en') return city
  return null // Kurdish falls back to the app's own cityLabel
}

const group = (n, decimals) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

/** Dollars read the same everywhere; only the dinar tag changes. */
export const statementMoney = (n, currency, lang) => {
  if (currency !== 'iqd') return '$' + group(n, 2)
  const t = statementStrings(lang)
  return t.iqdBefore ? `${t.iqdBefore} ${group(n, 0)}` : `${group(n, 0)} ${t.iqdAfter}`
}

export const statementMonth = (key, lang) => {
  if (!key) return ''
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString(statementStrings(lang).monthLocale, { month: 'long', year: 'numeric' })
}

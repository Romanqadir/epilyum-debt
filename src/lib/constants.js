// Cities and devices come from the Epilyum daily-report form.
// The English value is what gets stored; the Kurdish label is only for display.

export const CITIES = [
  { value: 'Baghdad',        label: 'بەغدا' },
  { value: 'Basra',          label: 'بەسرە' },
  { value: 'Nineveh',        label: 'نەینەوا' },
  { value: 'Erbil',          label: 'هەولێر' },
  { value: 'Sulaymaniyah',   label: 'سلێمانی' },
  { value: 'Duhok',          label: 'دهۆک' },
  { value: 'Kirkuk',         label: 'کەرکوک' },
  { value: 'Karbala',        label: 'کەربەلا' },
  { value: 'Najaf',          label: 'نەجەف' },
  { value: 'Dhi Qar',        label: 'زیقار' },
  { value: 'Babil',          label: 'بابل' },
  { value: 'Anbar',          label: 'ئەنبار' },
  { value: 'Salah al-Din',   label: 'سەلاحەدین' },
  { value: 'Diyala',         label: 'دیالە' },
  { value: 'Wasit',          label: 'واست' },
  { value: 'Al-Qadisiyyah',  label: 'قادسیە' },
  { value: 'Maysan',         label: 'مەیسان' },
  { value: 'Al-Muthanna',    label: 'موسەننا' },
]

export const DEVICES = [
  'Epilyum Hair Removal',
  'Epilyum Axisone CO2',
  'Epilyum Axisone & Thulium',
  'Epilyum Pictron11',
  'Epilyum IPL Revive',
  'Epilyum Thermilif',
  'Epilyum Thermiq',
  'Epilyum AI Reveal',
  'Epilyum Cryolipolysis',
  'RF',
  'Pelvora',
  'Cervera',
  'UPS',
  'Hydra',
]

export const SPECIALITIES = [
  { value: 'Dermatologist',   label: 'پزیشکی پێست' },
  { value: 'Plastic Surgeon', label: 'نەشتەرگەری جوانکاری' },
  { value: 'Other',           label: 'هیتر' },
]

// Where the collected cash went. Stored as the value, shown as the label.
export const ALLOCATIONS = [
  { value: 'ibo',      label: 'کاک ئیبۆ' },
  { value: 'rasty',    label: 'د. ڕاستی' },
  { value: 'expenses', label: 'خەرجی' },
]

/**
 * One colour per destination, kept here so every bar, dot and legend that
 * shows the split agrees — a colour that means کاک ئیبۆ in one panel has to
 * mean the same in the next.
 */
export const ALLOCATION_COLORS = {
  ibo: 'bg-navy-900',
  rasty: 'bg-brand-600',
  expenses: 'bg-accent-400',
}

// Only these two are ever handed over free; the rest are always sold.
export const GIFTABLE_DEVICES = ['UPS', 'Hydra']

// A prepayment goes to a person, never to the expenses pot — that pot is
// funded by the instalments reps collect.
export const PREPAID_ALLOCATIONS = ALLOCATIONS.filter((a) => a.value !== 'expenses')

// Starting points for the expense form; the field stays free text.
export const EXPENSE_CATEGORIES = [
  'مووچەی کارمەند',
  'نسبە',
  'کرێی شوێن',
  'ڕێکلام و بلۆگەر',
  'گواستنەوە',
  'چاککردنەوە',
  'Qicard',
  'FIB',
  'بەنزین',
  'خواردن',
  'هیتر',
]

// A commission belongs to a person, so this one category asks who for.
export const COMMISSION_CATEGORY = 'نسبە'

export const EMPLOYEES = [
  'Ahmed',
  'Ali',
  'Ameer',
  'Haifa',
  'Harun',
  'Muhammed',
  'Sairan',
  'Sarchl',
  'Sirwan',
  'Zhinar',
]

export const CURRENCIES = [
  { value: 'usd', label: 'دۆلار ($)' },
  { value: 'iqd', label: 'دینار (د.ع)' },
]

export const cityLabel = (v) => CITIES.find((c) => c.value === v)?.label ?? v
export const allocationLabel = (v) => ALLOCATIONS.find((a) => a.value === v)?.label ?? v
export const specialityLabel = (v) => SPECIALITIES.find((s) => s.value === v)?.label ?? v

/**
 * Units per model for one sale, as [{ device, qty }].
 * Rows saved before per-device quantities existed carry only device_count;
 * when such a row names a single model, that count is all of it.
 */
export const saleDevices = (sale) => {
  const devices = sale?.devices ?? []
  const map = sale?.device_qty ?? {}
  const gifts = new Set(sale?.gift_devices ?? [])
  const hasMap = map && Object.keys(map).length > 0
  return devices.map((device) => {
    const legacy = devices.length === 1 ? Number(sale?.device_count ?? 1) : 1
    const qty = hasMap ? Number(map[device] ?? 1) : legacy
    return { device, qty: Math.max(1, qty || 1), gift: gifts.has(device) }
  })
}

/** Units in a sale, split into what was paid for and what was given. */
export const saleUnits = (sale) => {
  const items = saleDevices(sale)
  const gift = items.filter((i) => i.gift).reduce((t, i) => t + i.qty, 0)
  const paid = items.filter((i) => !i.gift).reduce((t, i) => t + i.qty, 0)
  return { paid, gift, total: paid + gift }
}

/** "Epilyum Hair Removal ×2، UPS (دیاری)" */
export const saleDeviceLabel = (sale) => {
  const items = saleDevices(sale)
  if (items.length === 0) return 'بێ ئامێر'
  return items
    .map(({ device, qty, gift }) =>
      `${device}${qty > 1 ? ` ×${qty}` : ''}${gift ? ' (دیاری)' : ''}`)
    .join('، ')
}

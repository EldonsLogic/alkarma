/** The 27 governorates of Egypt, with English + Arabic names. */
export interface Governorate {
  code: string;   // stable identifier stored on shipping rates / orders
  en: string;
  ar: string;
}

export const EG_GOVERNORATES: Governorate[] = [
  { code: "cairo",         en: "Cairo",            ar: "القاهرة" },
  { code: "giza",          en: "Giza",             ar: "الجيزة" },
  { code: "alexandria",    en: "Alexandria",       ar: "الإسكندرية" },
  { code: "qalyubia",      en: "Qalyubia",         ar: "القليوبية" },
  { code: "dakahlia",      en: "Dakahlia",         ar: "الدقهلية" },
  { code: "sharqia",       en: "Sharqia",          ar: "الشرقية" },
  { code: "gharbia",       en: "Gharbia",          ar: "الغربية" },
  { code: "monufia",       en: "Monufia",          ar: "المنوفية" },
  { code: "beheira",       en: "Beheira",          ar: "البحيرة" },
  { code: "kafr_el_sheikh",en: "Kafr El Sheikh",   ar: "كفر الشيخ" },
  { code: "damietta",      en: "Damietta",         ar: "دمياط" },
  { code: "port_said",     en: "Port Said",        ar: "بورسعيد" },
  { code: "ismailia",      en: "Ismailia",         ar: "الإسماعيلية" },
  { code: "suez",          en: "Suez",             ar: "السويس" },
  { code: "fayoum",        en: "Fayoum",           ar: "الفيوم" },
  { code: "beni_suef",     en: "Beni Suef",        ar: "بني سويف" },
  { code: "minya",         en: "Minya",            ar: "المنيا" },
  { code: "assiut",        en: "Assiut",           ar: "أسيوط" },
  { code: "sohag",         en: "Sohag",            ar: "سوهاج" },
  { code: "qena",          en: "Qena",             ar: "قنا" },
  { code: "luxor",         en: "Luxor",            ar: "الأقصر" },
  { code: "aswan",         en: "Aswan",            ar: "أسوان" },
  { code: "red_sea",       en: "Red Sea",          ar: "البحر الأحمر" },
  { code: "new_valley",    en: "New Valley",       ar: "الوادي الجديد" },
  { code: "matrouh",       en: "Matrouh",          ar: "مطروح" },
  { code: "north_sinai",   en: "North Sinai",      ar: "شمال سيناء" },
  { code: "south_sinai",   en: "South Sinai",      ar: "جنوب سيناء" },
];

export function governorateName(code: string): string {
  const g = EG_GOVERNORATES.find((x) => x.code === code);
  if (!g) return code;
  return g.ar;
}

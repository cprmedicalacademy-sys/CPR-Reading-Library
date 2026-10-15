export interface LibraryConfig {
  name: string;
  shortName: string;
  tagline: string;
  addressBangla: string;
  addressDetailBangla: string;
  addressFullBangla: string;
  addressEnglish: string;
  addressDetailEnglish: string;
  addressFullEnglish: string;
  locationShort: string;
  locationShortEn: string;
  phone1: string;
  phone2: string;
  whatsapp: string;
  phoneDisplay: string;
  email: string;
}

export const DEFAULT_LIBRARY_CONFIG: LibraryConfig = {
  name: 'CPR Reading Library',
  shortName: 'CPR Library',
  tagline: 'Doctors Study & Reference Facility',
  
  // Official Address from Physical Banner
  addressBangla: 'মতি টাওয়ার (৫ম তলা), গুলজার মোড়, চকবাজার, চট্টগ্রাম',
  addressDetailBangla: 'EBL ব্যাংকের ATM বুথের ডান পাশে লিফটের ৪ তলা',
  addressFullBangla: 'মতি টাওয়ার (৫ম তলা), গুলজার মোড়, চকবাজার, চট্টগ্রাম (EBL ব্যাংকের ATM বুথের ডান পাশে লিফটের ৪ তলা)',
  
  addressEnglish: 'Moti Tower (5th Floor), Gulzar More, Chawkbazar, Chattogram',
  addressDetailEnglish: 'Right side of EBL Bank ATM Booth, Lift-4',
  addressFullEnglish: 'Moti Tower (5th Floor), Gulzar More, Chawkbazar, Chattogram (Right side of EBL Bank ATM, Lift-4)',
  
  locationShort: 'গুলজার মোড়, চকবাজার, চট্টগ্রাম',
  locationShortEn: 'Gulzar More, Chawkbazar, Chattogram',
  
  // Official Phone & WhatsApp Numbers from Physical Banner
  phone1: '01898-938981',
  phone2: '01898-938982',
  whatsapp: '01898-938981',
  phoneDisplay: '01898-938981, 01898-938982',
  
  email: 'cprmedicalacademy@gmail.com',
};

const STORAGE_KEY_LIBRARY_CONFIG = 'cpr_library_contact_config';

export function getLibraryConfig(): LibraryConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LIBRARY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_LIBRARY_CONFIG, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_LIBRARY_CONFIG;
}

export function saveLibraryConfig(config: Partial<LibraryConfig>): void {
  try {
    const current = getLibraryConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY_LIBRARY_CONFIG, JSON.stringify(updated));
    // Trigger custom event so reactive components update immediately
    window.dispatchEvent(new Event('cpr-library-config-updated'));
  } catch (err) {
    console.error('Failed to save library config:', err);
  }
}

export function resetLibraryConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_LIBRARY_CONFIG);
    window.dispatchEvent(new Event('cpr-library-config-updated'));
  } catch (err) {
    console.error('Failed to reset library config:', err);
  }
}

// For static or direct access compatibility
export const LIBRARY_CONFIG = DEFAULT_LIBRARY_CONFIG;

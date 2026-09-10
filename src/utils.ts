/**
 * Comprehensive System Utilities
 * Provides resilient, error-safe helpers for data normalization, date calculations,
 * image compression, and storage operations.
 */

/**
 * Safely trims any value into a trimmed string, preventing null/undefined dereference crashes.
 */
export const safeTrim = (val: unknown): string => {
  if (typeof val === 'string') return val.trim();
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

/**
 * Safely converts any value into an uppercase trimmed string.
 */
export const safeUpper = (val: unknown): string => {
  return safeTrim(val).toUpperCase();
};

/**
 * Parses YYYY-MM-DD date strings without temporal timezone shifts.
 * Standard Date(str) parses date-only strings as UTC midnight, which causes
 * dates to shift backward by 1 day and distort quarter/monthly calculations in Western timezones.
 */
export const parseDateSafe = (dateStr: string): {
  year: number;
  month: number;
  day: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
} => {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    const qNum = Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
    const qStr = `Q${qNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      quarter: qStr,
      label: `${now.getFullYear()} ${qStr}`
    };
  }

  const parts = dateStr.trim().split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const month = Math.min(12, Math.max(1, parseInt(parts[1], 10) || 1));
    const day = Math.min(31, Math.max(1, parseInt(parts[2], 10) || 1));
    const qNum = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
    const qStr = `Q${qNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    return {
      year,
      month,
      day,
      quarter: qStr,
      label: `${year} ${qStr}`
    };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const qNum = Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
    const qStr = `Q${qNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      quarter: qStr,
      label: `${now.getFullYear()} ${qStr}`
    };
  }

  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const qNum = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
  const qStr = `Q${qNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
  return {
    year,
    month,
    day: d.getUTCDate(),
    quarter: qStr,
    label: `${year} ${qStr}`
  };
};

/**
 * Compresses and downsamples image files before converting to Base64.
 * Prevents localStorage QuotaExceededError by keeping payload sizes under ~150KB.
 */
export const compressImage = (
  file: File,
  maxDimension = 1200,
  quality = 0.75
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }

    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((e.target?.result as string) || '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

/**
 * Defensive localStorage wrapper preventing fatal QuotaExceededError exceptions.
 */
export const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[Storage] localStorage write failed for "${key}":`, err);
    return false;
  }
};

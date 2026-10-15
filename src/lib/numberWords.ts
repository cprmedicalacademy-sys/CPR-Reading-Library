/**
 * Converts a numeric amount in Bangladeshi Taka (BDT) into formal words
 * e.g., 5000 -> "Five Thousand Taka Only"
 *       12500 -> "Twelve Thousand Five Hundred Taka Only"
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertUnderThousand(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return TENS[ten] + (one !== 0 ? ' ' + ONES[one] : '');
  }
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  return (
    ONES[hundred] +
    ' Hundred' +
    (rest !== 0 ? ' ' + convertUnderThousand(rest) : '')
  );
}

export function amountInWords(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) {
    return 'Zero Taka Only';
  }

  const rounded = Math.floor(amount);
  const parts: string[] = [];

  // Bangladeshi counting system: Crores (1,00,00,000), Lakhs (1,00,000), Thousands (1,000), Hundreds (100)
  const crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    parts.push(convertUnderThousand(crore) + ' Crore');
  }
  if (lakh > 0) {
    parts.push(convertUnderThousand(lakh) + ' Lakh');
  }
  if (thousand > 0) {
    parts.push(convertUnderThousand(thousand) + ' Thousand');
  }
  if (remainder > 0) {
    parts.push(convertUnderThousand(remainder));
  }

  const result = parts.join(' ').trim();
  return result ? `${result} Taka Only` : 'Zero Taka Only';
}

/**
 * Format currency in Bangladeshi Taka
 * e.g., 12000 -> "৳12,000"
 */
export function formatTaka(amount: number): string {
  if (isNaN(amount)) return '৳0';
  return `৳${Number(amount).toLocaleString('en-BD')}`;
}

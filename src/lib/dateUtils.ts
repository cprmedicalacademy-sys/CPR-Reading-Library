import { MembershipStatus } from '../types';

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes date N months from today or a given base date
 */
export function addMonthsToDate(months: number, baseDateStr?: string): string {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const target = new Date(base.getTime());
  target.setMonth(target.getMonth() + months);
  
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD or ISO string into Bangladesh standard readable format:
 * e.g., "15 Oct 2026" or "15 October 2026"
 */
export function formatBdDate(dateStr?: string | null, format: 'short' | 'long' | 'numeric' = 'long'): string {
  if (!dateStr) return 'N/A';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    
    if (format === 'numeric') {
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: format === 'short' ? 'short' : 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats full timestamp with time
 */
export function formatBdDateTime(isoStr?: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  } catch {
    return isoStr;
  }
}

/**
 * Calculate membership status dynamically based on expires_on and is_active flag
 */
export function calculateMembershipStatus(expiresOn: string, isActive: boolean): MembershipStatus {
  if (!isActive) return 'INACTIVE';
  
  const todayStr = getTodayIsoDate();
  // String comparison YYYY-MM-DD works lexicographically
  if (expiresOn < todayStr) {
    return 'EXPIRED';
  }
  return 'ACTIVE';
}

/**
 * Calculate days remaining until expiry
 * Positive number = days left
 * 0 = expires today
 * Negative number = expired X days ago
 */
export function getDaysRemaining(expiresOn: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [y, m, d] = expiresOn.split('-').map(Number);
  const expiry = new Date(y, m - 1, d);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a membership is expiring soon (within next 30 days and currently active)
 */
export function isExpiringSoon(expiresOn: string, isActive: boolean): boolean {
  if (!isActive) return false;
  const days = getDaysRemaining(expiresOn);
  return days >= 0 && days <= 30;
}

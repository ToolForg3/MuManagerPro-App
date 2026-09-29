/**
 * Utility functions for masking sensitive infrastructure metadata (Host/IP, DB users)
 * in accordance with OWASP and PROJECT_RULES Section 12.
 */

export const maskHost = (h?: string): string => {
  if (!h) return '';
  const ipMatch = h.match(/^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipMatch) return `${ipMatch[1]}.***.***`;
  if (h === 'localhost' || h === '127.0.0.1') return h;
  if (h.length > 8) return h.substring(0, 4) + '***' + h.substring(h.length - 3);
  return '***';
};

export const maskUser = (u?: string): string => {
  if (!u) return '';
  if (u.length <= 1) return `${u}***`;
  return `${u[0]}***${u[u.length - 1]}`;
};

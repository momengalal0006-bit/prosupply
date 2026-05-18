import { API } from '../services/api';

const IMG_PLACEHOLDER = 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Product';

/**
 * Normalize an image path from the API into a URL.
 * Returns a relative path so the Vite proxy (dev) or same-origin (prod) can serve it.
 */
export function normalizeImageUrl(imgPath, placeholder = IMG_PLACEHOLDER) {
  if (!imgPath) return placeholder;
  if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
  if (imgPath.startsWith('/uploads/')) return imgPath;
  const unified = imgPath.replace(/\\/g, '/');
  const uploadsIndex = unified.toLowerCase().indexOf('/uploads/');
  if (uploadsIndex >= 0) return unified.slice(uploadsIndex);
  return `/${unified.replace(/^\/+/, '')}`;
}

/**
 * Generate star rating JSX elements
 */
export function starsArray(rating, total = 5) {
  const rounded = Math.round(rating || 0);
  return Array.from({ length: total }, (_, i) => ({
    filled: i < rounded,
    index: i,
  }));
}

/**
 * Format price with EGP currency
 */
export function formatPrice(price) {
  return `EGP ${parseFloat(price || 0).toFixed(2)}`;
}

/**
 * Format a date string to locale date
 */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Format a date string to locale date + time
 */
export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString();
}

/**
 * Split fullName into firstName and lastName
 */
export function splitName(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Build fullName from firstName and lastName
 */
export function buildFullName(firstName, lastName) {
  return `${firstName || ''} ${lastName || ''}`.trim();
}

/**
 * Normalize document URL for admin applications page
 */
export function normalizeDocUrl(doc) {
  if (!doc) return '#';
  if (doc.startsWith('http://') || doc.startsWith('https://')) return doc;
  if (doc.startsWith('/uploads/')) return `${API}${doc}`;
  if (doc.includes('uploads')) {
    const parts = doc.replaceAll('\\', '/').split('uploads/');
    if (parts[1]) return `${API}/uploads/${parts[1]}`;
  }
  return `${API}/${doc.replace(/^\/+/, '')}`;
}

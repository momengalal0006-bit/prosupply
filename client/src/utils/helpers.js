import { API } from '../services/api';

const IMG_PLACEHOLDER = 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Product';


export function normalizeImageUrl(imgPath, placeholder = IMG_PLACEHOLDER) {
  if (!imgPath) return placeholder;
  if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
  if (imgPath.startsWith('/uploads/')) return imgPath;
  const unified = imgPath.replace(/\\/g, '/');
  const uploadsIndex = unified.toLowerCase().indexOf('/uploads/');
  if (uploadsIndex >= 0) return unified.slice(uploadsIndex);
  return `/${unified.replace(/^\/+/, '')}`;
}


export function starsArray(rating, total = 5) {
  const rounded = Math.round(rating || 0);
  return Array.from({ length: total }, (_, i) => ({
    filled: i < rounded,
    index: i,
  }));
}


export function formatPrice(price) {
  return `EGP ${parseFloat(price || 0).toFixed(2)}`;
}


export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}


export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString();
}


export function splitName(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}


export function buildFullName(firstName, lastName) {
  return `${firstName || ''} ${lastName || ''}`.trim();
}


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

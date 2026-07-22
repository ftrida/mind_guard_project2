// MindGuard Frontend Configuration & API / Asset URL helper

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// Derive server base URL by removing trailing /api if present
export const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Returns full URL for an uploaded file or asset.
 * Handles full URLs (http/https), relative paths, and fallbacks.
 */
export const getUploadUrl = (photoPath?: string): string => {
  if (!photoPath) {
    return '/uploads/default-avatar.png';
  }
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://') || photoPath.startsWith('data:')) {
    return photoPath;
  }
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `${SERVER_BASE_URL}${cleanPath}`;
};

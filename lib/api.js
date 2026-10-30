'use client';

import logger from './logger';
import { beginNetworkRequest, endNetworkRequest } from './network-tracker';

const DIRECT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const API_BASE_URL = process.env.NEXT_PUBLIC_USE_API_PROXY === 'true' ? '' : DIRECT_API_URL;
const API_TIMEOUT = 30000;

const createTimeoutController = () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  return { controller, timeoutId };
};

const clearSessionAndRedirect = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint?.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  let token = null;
  try {
    if (storedUser) token = JSON.parse(storedUser)?.token;
  } catch (_) {}

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const { controller, timeoutId } = createTimeoutController();

  const config = {
    method: 'GET',
    credentials: 'include',
    ...options,
    signal: controller.signal,
    headers: { ...defaultHeaders, ...options.headers },
  };

  beginNetworkRequest();

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (response.status === 401) {
      const isAuthEndpoint =
        url.includes('/api/auth/refresh') || url.includes('/api/auth/login');
      if (!isAuthEndpoint && typeof window !== 'undefined') {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken =
              refreshData?.data?.accessToken || refreshData?.accessToken;
            if (newToken) {
              const stored = localStorage.getItem('user');
              if (stored) {
                const u = JSON.parse(stored);
                u.token = newToken;
                localStorage.setItem('user', JSON.stringify(u));
              }
              clearTimeout(timeoutId);
              const retryRes = await fetch(url, {
                ...config,
                headers: { ...config.headers, Authorization: `Bearer ${newToken}` },
                signal: undefined,
              });
              if (retryRes.ok) return retryRes.json();
            }
          }
        } catch (refreshErr) {
          logger.error('Token refresh failed:', refreshErr);
        }
      }
      clearSessionAndRedirect();
      return { success: false, error: 'Session expired. Please log in again.', sessionExpired: true };
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return data;
    }
    // CSV or other text
    return { success: true, data: await response.text(), _raw: true };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      logger.error('Request timed out:', url);
      return { success: false, error: 'Request timed out. Please try again.' };
    }
    logger.error('API call error:', err);
    return {
      success: false,
      error:
        err.message === 'Failed to fetch'
          ? 'Cannot connect to server. Make sure the backend is running.'
          : err.message || 'An error occurred',
    };
  } finally {
    endNetworkRequest();
  }
};

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (email, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiCall('/api/auth/logout', { method: 'POST' }),

  refresh: () =>
    apiCall('/api/auth/refresh', { method: 'POST' }),

  getMe: () => apiCall('/api/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    apiCall('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  forgotPassword: (email) =>
    apiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, newPassword) =>
    apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export const productAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/products${q ? '?' + q : ''}`);
  },

  get: (id) => apiCall(`/api/products/${id}`),

  create: (data) =>
    apiCall('/api/products', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    apiCall(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) => apiCall(`/api/products/${id}`, { method: 'DELETE' }),

  toggleActive: (id) =>
    apiCall(`/api/products/${id}/toggle-active`, { method: 'PATCH' }),
};

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const categoryAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/categories${q ? '?' + q : ''}`);
  },

  get: (id) => apiCall(`/api/categories/${id}`),

  create: (data) =>
    apiCall('/api/categories', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    apiCall(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) => apiCall(`/api/categories/${id}`, { method: 'DELETE' }),

  createSubcategory: (categoryId, data) =>
    apiCall(`/api/categories/${categoryId}/subcategories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSubcategory: (categoryId, id, data) =>
    apiCall(`/api/categories/${categoryId}/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSubcategory: (categoryId, id) =>
    apiCall(`/api/categories/${categoryId}/subcategories/${id}`, { method: 'DELETE' }),
};

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export const orderAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/orders${q ? '?' + q : ''}`);
  },

  get: (id) => apiCall(`/api/orders/${id}`),

  updateStatus: (id, data) =>
    apiCall(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  addAdminNotes: (id, adminNotes) =>
    apiCall(`/api/orders/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ adminNotes }) }),

  cancel: (id, reason) =>
    apiCall(`/api/orders/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  sendReviewRequest: (id) =>
    apiCall(`/api/orders/${id}/send-review-request`, { method: 'POST' }),
  refreshTracking: (id) =>
    apiCall(`/api/orders/${id}/tracking/refresh`, { method: 'POST' }),
  bookShipment: (id) =>
    apiCall(`/api/orders/${id}/shipment`, { method: 'POST' }),
};

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

export const customerAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/customers${q ? '?' + q : ''}`);
  },

  get: (id) => apiCall(`/api/customers/${id}`),

  update: (id, data) =>
    apiCall(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── REFUNDS ─────────────────────────────────────────────────────────────────

export const refundAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/refunds${q ? '?' + q : ''}`);
  },

  get: (id) => apiCall(`/api/refunds/${id}`),

  create: (data) =>
    apiCall('/api/refunds', { method: 'POST', body: JSON.stringify(data) }),

  updateStatus: (id, status) =>
    apiCall(`/api/refunds/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export const dashboardAPI = {
  getStats: () => apiCall('/api/dashboard'),
};

// ─── SITE SETTINGS ───────────────────────────────────────────────────────────

export const siteSettingsAPI = {
  get: () => apiCall('/api/site-settings'),
  update: (data) =>
    apiCall('/api/site-settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── SYSTEM CONFIG ───────────────────────────────────────────────────────────

export const systemConfigAPI = {
  list: () => apiCall('/api/system-config'),
  set: (key, value) =>
    apiCall(`/api/system-config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
};

// ─── BANNERS ─────────────────────────────────────────────────────────────────

export const bannerAPI = {
  list: () => apiCall('/api/banners'),
  get: (id) => apiCall(`/api/banners/${id}`),
  create: (data) =>
    apiCall('/api/banners', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    apiCall(`/api/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/api/banners/${id}`, { method: 'DELETE' }),
  reorder: (items) =>
    apiCall('/api/banners/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),
  toggleActive: (id) =>
    apiCall(`/api/banners/${id}/toggle`, { method: 'PATCH' }),
};

// ─── ENQUIRIES ───────────────────────────────────────────────────────────────

export const notificationAPI = {
  list: () => apiCall('/api/notifications'),
  markRead: (id) => apiCall(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiCall('/api/notifications/read-all', { method: 'POST' }),
};

export const ticketAPI = {
  list: () => apiCall('/api/tickets'),
  create: (data) => apiCall('/api/tickets', { method: 'POST', body: JSON.stringify(data) }),
  get: (id) => apiCall(`/api/tickets/${id}`),
  update: (id, data) => apiCall(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  reply: (id, body) => apiCall(`/api/tickets/${id}/replies`, { method: 'POST', body: JSON.stringify({ body }) }),
};

export const enquiryAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/enquiries${q ? '?' + q : ''}`);
  },
  get: (id) => apiCall(`/api/enquiries/${id}`),
  updateStatus: (id, status) =>
    apiCall(`/api/enquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  openTicket: (id, orderNumber) =>
    apiCall(`/api/enquiries/${id}/ticket`, {
      method: 'POST',
      body: JSON.stringify({ orderNumber: orderNumber || null }),
    }),
  addNotes: (id, notes) =>
    apiCall(`/api/enquiries/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
};

// ─── NEWSLETTER ──────────────────────────────────────────────────────────────

export const newsletterAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/newsletter${q ? '?' + q : ''}`);
  },
  toggleSubscriber: (id) =>
    apiCall(`/api/newsletter/${id}/toggle`, { method: 'PATCH' }),
  exportCSV: () => apiCall('/api/newsletter/export'),
  broadcast: (subject, html) =>
    apiCall('/api/newsletter/broadcast', { method: 'POST', body: JSON.stringify({ subject, html }) }),
};

// ─── USERS ───────────────────────────────────────────────────────────────────

export const userAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/users${q ? '?' + q : ''}`);
  },
  get: (id) => apiCall(`/api/users/${id}`),
  create: (data) =>
    apiCall('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    apiCall(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: (id) =>
    apiCall(`/api/users/${id}/deactivate`, { method: 'PATCH' }),
};

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

export const reviewAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/reviews${q ? '?' + q : ''}`);
  },
  updateStatus: (id, status) =>
    apiCall(`/api/reviews/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id) => apiCall(`/api/reviews/${id}`, { method: 'DELETE' }),
};

// ─── FAQS ────────────────────────────────────────────────────────────────────

export const faqAPI = {
  list: () => apiCall('/api/faqs'),
  create: (data) => apiCall('/api/faqs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/api/faqs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/api/faqs/${id}`, { method: 'DELETE' }),
  reorder: (items) => apiCall('/api/faqs/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
};

// ─── DISCOUNTS ───────────────────────────────────────────────────────────────

export const blogAPI = {
  list: (params = {}) => apiCall(`/api/blogs?${new URLSearchParams(params)}`),
  get: (id) => apiCall(`/api/blogs/${id}`),
  create: (data) => apiCall('/api/blogs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/api/blogs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publish: (id) => apiCall(`/api/blogs/${id}/publish`, { method: 'PATCH' }),
  unpublish: (id) => apiCall(`/api/blogs/${id}/unpublish`, { method: 'PATCH' }),
  delete: (id) => apiCall(`/api/blogs/${id}`, { method: 'DELETE' }),
};

export const benefitAPI = {
  list: (productId) => apiCall(`/api/products/${productId}/benefits`),
  create: (productId, data) =>
    apiCall(`/api/products/${productId}/benefits`, { method: 'POST', body: JSON.stringify(data) }),
  update: (productId, benefitId, data) =>
    apiCall(`/api/products/${productId}/benefits/${benefitId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (productId, benefitId) =>
    apiCall(`/api/products/${productId}/benefits/${benefitId}`, { method: 'DELETE' }),
};

export const packCardAPI = {
  list: () => apiCall('/api/pack-cards'),
  create: (data) => apiCall('/api/pack-cards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/api/pack-cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/api/pack-cards/${id}`, { method: 'DELETE' }),
};

export const mediaAPI = {
  list: (productId) => apiCall(`/api/products/${productId}/media`),
  create: (productId, data) =>
    apiCall(`/api/products/${productId}/media`, { method: 'POST', body: JSON.stringify(data) }),
  update: (productId, mediaId, data) =>
    apiCall(`/api/products/${productId}/media/${mediaId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (productId, mediaId) =>
    apiCall(`/api/products/${productId}/media/${mediaId}`, { method: 'DELETE' }),
};

export const highlightAPI = {
  list: (productId) => apiCall(`/api/products/${productId}/highlights`),
  create: (productId, data) =>
    apiCall(`/api/products/${productId}/highlights`, { method: 'POST', body: JSON.stringify(data) }),
  update: (productId, highlightId, data) =>
    apiCall(`/api/products/${productId}/highlights/${highlightId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (productId, highlightId) =>
    apiCall(`/api/products/${productId}/highlights/${highlightId}`, { method: 'DELETE' }),
};

export const relatedAPI = {
  list: (productId) => apiCall(`/api/products/${productId}/related`),
  create: (productId, data) =>
    apiCall(`/api/products/${productId}/related`, { method: 'POST', body: JSON.stringify(data) }),
  update: (productId, relatedId, data) =>
    apiCall(`/api/products/${productId}/related/${relatedId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (productId, relatedId) =>
    apiCall(`/api/products/${productId}/related/${relatedId}`, { method: 'DELETE' }),
};

export const variantAPI = {
  list: (productId) => apiCall(`/api/products/${productId}/variants`),
  create: (productId, data) =>
    apiCall(`/api/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(data) }),
  update: (productId, variantId, data) =>
    apiCall(`/api/products/${productId}/variants/${variantId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (productId, variantId) =>
    apiCall(`/api/products/${productId}/variants/${variantId}`, { method: 'DELETE' }),
};

export const discountAPI = {
  list: () => apiCall('/api/discounts'),
  create: (data) => apiCall('/api/discounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/api/discounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/api/discounts/${id}`, { method: 'DELETE' }),
};

// ─── ACTIVITY ────────────────────────────────────────────────────────────────

export const activityAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall(`/api/activity${q ? '?' + q : ''}`);
  },
};

// ─── UPLOAD ──────────────────────────────────────────────────────────────────

export const uploadAPI = {
  uploadImage: async (file, folder = 'products') => {
    const form = new FormData();
    form.append('image', file);
    let token = null;
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) token = JSON.parse(stored)?.token;
    } catch (_) {}

    const response = await fetch(
      `${DIRECT_API_URL}/api/upload/image?folder=${encodeURIComponent(folder)}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Failed to upload image');
    }
    return data;
  },

  uploadVideo: async (file) => {
    const form = new FormData();
    form.append('video', file);
    let token = null;
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) token = JSON.parse(stored)?.token;
    } catch (_) {}
    const response = await fetch(`${DIRECT_API_URL}/api/upload/video`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Failed to upload video');
    }
    return data;
  },

  deleteImage: (url) =>
    apiCall('/api/upload/image', {
      method: 'DELETE',
      body: JSON.stringify({ url }),
    }),

  getPresignedUrl: (filename, contentType) =>
    apiCall('/api/upload/presign', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    }),

  uploadToS3: async (presignedUrl, file) => {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!response.ok) throw new Error('S3 upload failed');
    return presignedUrl.split('?')[0];
  },
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Salon, Booking, Review, User } from '../types';

const API_BASE = '/api';

async function fetchWithError(url: string, options?: RequestInit) {
  const token = localStorage.getItem('leish_auth_token');
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string; role?: string; phone?: string; salonId?: string; bio?: string }) =>
    fetchWithError('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchWithError('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchWithError('/auth/me'),
  updateProfile: (data: { id: string; name?: string; phone?: string; bio?: string; avatar?: string; salonId?: string }) =>
    fetchWithError('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getDemoAccounts: () => fetchWithError('/auth/demo-accounts'),
};

// Salons API
export const salonsApi = {
  getAll: () => fetchWithError('/salons'),
  getById: (id: string) => fetchWithError(`/salons/${id}`),
  update: (id: string, data: Partial<Salon>) =>
    fetchWithError(`/salons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addService: (id: string, data: { name: string; price: number; duration: number; description?: string; category?: string }) =>
    fetchWithError(`/salons/${id}/services`, { method: 'POST', body: JSON.stringify(data) }),
  deleteService: (id: string, serviceId: string) =>
    fetchWithError(`/salons/${id}/services/${serviceId}`, { method: 'DELETE' }),
};

// Bookings API
export const bookingsApi = {
  getAll: (params?: { email?: string; salonId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchWithError(`/bookings${query ? `?${query}` : ''}`);
  },
  create: (data: any) =>
    fetchWithError('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    fetchWithError(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// Reviews API
export const reviewsApi = {
  getBySalon: (salonId: string) => fetchWithError(`/reviews/${salonId}`),
  create: (data: { salonId: string; clientName: string; rating: number; text: string }) =>
    fetchWithError('/reviews', { method: 'POST', body: JSON.stringify(data) }),
};

// React Query hooks
export const useSalons = () =>
  useQuery({ queryKey: ['salons'], queryFn: salonsApi.getAll });

export const useSalon = (id: string) =>
  useQuery({ queryKey: ['salon', id], queryFn: () => salonsApi.getById(id), enabled: !!id });

export const useBookings = (params?: { email?: string; salonId?: string }) =>
  useQuery({ queryKey: ['bookings', params], queryFn: () => bookingsApi.getAll(params) });

export const useReviews = (salonId: string) =>
  useQuery({ queryKey: ['reviews', salonId], queryFn: () => reviewsApi.getBySalon(salonId), enabled: !!salonId });

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
};

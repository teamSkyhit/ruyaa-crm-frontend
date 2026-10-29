'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryAPI } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoryAPI.list();
      if (!res.success) throw new Error(res.error || 'Failed to fetch categories');
      return res.data || [];
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => categoryAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => categoryAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => categoryAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

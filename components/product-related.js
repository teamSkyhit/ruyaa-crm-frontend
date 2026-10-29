'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { relatedAPI, productAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function ProductRelated({ productId }) {
  const queryClient = useQueryClient();
  const [relatedProductId, setRelatedProductId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const { data, isLoading } = useQuery({
    queryKey: ['related', productId],
    queryFn: () => relatedAPI.list(productId),
    enabled: !!productId,
  });
  const { data: catalog } = useQuery({
    queryKey: ['products', 'related-picker'],
    queryFn: () => productAPI.list({ limit: '200' }),
  });

  const rows = data?.data || [];
  const products = (catalog?.data || catalog?.products || []).filter((item) => item.id !== productId);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['related', productId] });
  }

  const createMutation = useMutation({
    mutationFn: (payload) => relatedAPI.create(productId, payload),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to add related product');
        return;
      }
      toast.success('Related product added');
      setRelatedProductId('');
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => relatedAPI.delete(productId, id),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to remove related product');
        return;
      }
      toast.success('Related product removed');
      refresh();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The public page hides inactive products and products that are not shown on the website.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No related products yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <span>{row.related?.name || row.relatedProductId}</span>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(row.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="grid gap-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!relatedProductId) return;
            createMutation.mutate({ relatedProductId, sortOrder: Number(sortOrder) || 0 });
          }}
        >
          <div className="space-y-1">
            <Label>Product</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={relatedProductId}
              onChange={(e) => setRelatedProductId(e.target.value)}
              required
            >
              <option value="">Select a product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 w-24">
            <Label>Order</Label>
            <Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>Add related product</Button>
        </form>
      </CardContent>
    </Card>
  );
}

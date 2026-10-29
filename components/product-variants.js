'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { variantAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const EMPTY = {
  name: '',
  sku: '',
  price: '',
  compareAtPrice: '',
  quantity: '0',
  sortOrder: '0',
  isActive: true,
};

export default function ProductVariants({ productId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['variants', productId],
    queryFn: () => variantAPI.list(productId),
    enabled: !!productId,
  });

  const variants = data?.variants || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['variants', productId] });
  }

  const createMutation = useMutation({
    mutationFn: (payload) => variantAPI.create(productId, payload),
    onSuccess: (res) => {
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Weight added');
      setForm(EMPTY);
      refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }) => variantAPI.update(productId, id, payload),
    onSuccess: (res) => {
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => variantAPI.delete(productId, id),
    onSuccess: (res) => {
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Weight deleted');
      setDeleteTarget(null);
      refresh();
    },
  });

  function addVariant(e) {
    e.preventDefault();
    createMutation.mutate({
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      quantity: Number(form.quantity) || 0,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Compare at</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Active</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : variants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">No weights yet. Add 75g, 125g, 200g and their prices.</TableCell>
              </TableRow>
            ) : (
              variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>{variant.name}</TableCell>
                  <TableCell className="font-mono text-xs">{variant.sku || '—'}</TableCell>
                  <TableCell>₹{Number(variant.price).toFixed(0)}</TableCell>
                  <TableCell>
                    {variant.compareAtPrice != null ? `₹${Number(variant.compareAtPrice).toFixed(0)}` : '—'}
                  </TableCell>
                  <TableCell>{variant.quantity}</TableCell>
                  <TableCell>
                    <Switch
                      checked={variant.isActive}
                      onCheckedChange={(isActive) => updateMutation.mutate({ id: variant.id, data: { isActive } })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(variant)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <form onSubmit={addVariant} className="grid grid-cols-2 md:grid-cols-3 gap-3 border-t pt-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="125g" required />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Optional" />
          </div>
          <div className="space-y-1">
            <Label>Price</Label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label>Compare at</Label>
            <Input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Sort order</Label>
            <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add variant'}
            </Button>
          </div>
        </form>
      </CardContent>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete variant?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{deleteTarget?.name} will be removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

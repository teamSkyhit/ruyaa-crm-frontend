'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { packCardAPI, productAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';

const EMPTY = {
  title: '',
  subtitle: '',
  badge: '',
  image: '',
  price: '',
  compareAtPrice: '',
  sortOrder: 0,
  isActive: true,
  productId: '',
};

export default function PackCardsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['pack-cards'],
    queryFn: async () => {
      const res = await packCardAPI.list();
      if (!res?.success) throw new Error(res?.error || 'Failed to load pack cards');
      return res.data || [];
    },
  });

  const { data: productsRes } = useQuery({
    queryKey: ['products', 'pack-picker'],
    queryFn: () => productAPI.list({ limit: '100' }),
  });

  const products = productsRes?.data || [];
  const packs = data || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['pack-cards'] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? packCardAPI.update(editing.id, payload) : packCardAPI.create(payload)),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to save pack card');
        return;
      }
      toast.success(editing ? 'Pack card updated' : 'Pack card created');
      setOpen(false);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => packCardAPI.delete(id),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to delete pack card');
        return;
      }
      toast.success('Pack card deleted');
      refresh();
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(pack) {
    setEditing(pack);
    setForm({
      title: pack.title || '',
      subtitle: pack.subtitle || '',
      badge: pack.badge || '',
      image: pack.image || '',
      price: pack.price ?? '',
      compareAtPrice: pack.compareAtPrice ?? '',
      sortOrder: pack.sortOrder ?? 0,
      isActive: pack.isActive,
      productId: pack.productId || '',
    });
    setOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    saveMutation.mutate({
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      badge: form.badge.trim(),
      image: form.image.trim(),
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
      productId: form.productId || null,
    });
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Pack Cards</h1>
            <Badge variant="secondary">{packs.length}</Badge>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add pack
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          These cards appear on the product page. Leave the product empty to show a pack on every soap.
        </p>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : packs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pack cards yet.</TableCell>
                  </TableRow>
                ) : packs.map((pack) => (
                  <TableRow key={pack.id}>
                    <TableCell>
                      <p className="font-medium">{pack.title}</p>
                      <p className="text-sm text-muted-foreground">{[pack.badge, pack.subtitle].filter(Boolean).join(' · ') || '—'}</p>
                    </TableCell>
                    <TableCell>
                      ₹{Number(pack.price).toFixed(0)}
                      {pack.compareAtPrice != null ? ` · ₹${Number(pack.compareAtPrice).toFixed(0)}` : ''}
                    </TableCell>
                    <TableCell>{pack.product?.name || 'All products'}</TableCell>
                    <TableCell>
                      <Badge className={pack.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                        {pack.isActive ? 'Active' : 'Hidden'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(pack)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(pack.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit pack card' : 'New pack card'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Pack of 2" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Subtitle</Label>
                  <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Duo Ritual" />
                </div>
                <div className="space-y-1">
                  <Label>Badge</Label>
                  <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Save 10%" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Price</Label>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Compare at</Label>
                  <Input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
                </div>
              </div>
              <PictureUpload
                folder="packs"
                label="Picture"
                optional
                value={form.image}
                onChange={(image) => setForm({ ...form, image })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Product</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  >
                    <option value="">All products</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Sort order</Label>
                  <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} id="pack-active" />
                <Label htmlFor="pack-active">Active</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{editing ? 'Save' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

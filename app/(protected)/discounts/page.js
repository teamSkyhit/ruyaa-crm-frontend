'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tag, Plus, Pencil, Trash2, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { discountAPI, productAPI } from '@/lib/api';
import { format } from 'date-fns';

const formatCurrency = (v) => (v !== null && v !== undefined ? `₹${Number(v).toFixed(0)}` : '—');
const formatDate = (v) => (v ? format(new Date(v), 'dd MMM yyyy') : '—');

const EMPTY_FORM = {
  code: '',
  type: 'PERCENTAGE',
  value: '',
  minOrderAmount: '',
  maxUses: '',
  isActive: true,
  validFrom: '',
  validUntil: '',
  bogoProductId: '',
  comboProductIds: [],
  comboDiscount: '',
};

function discountLabel(d) {
  if (d.type === 'BOGO') return 'BOGO';
  if (d.type === 'COMBO') return 'COMBO';
  if (d.type === 'PERCENTAGE') return `${Number(d.value).toFixed(0)}%`;
  return `₹${Number(d.value).toFixed(0)}`;
}

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['discounts'],
    queryFn: discountAPI.list,
  });

  const discounts = data?.discounts || [];

  const { data: productData } = useQuery({
    queryKey: ['products', 'discount-picker'],
    queryFn: () => productAPI.list({ limit: '100' }),
    enabled: dialogOpen,
  });
  const products = productData?.data || [];

  const createMutation = useMutation({
    mutationFn: discountAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('Discount code created');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message || 'Failed to create discount code'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => discountAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('Discount code updated');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message || 'Failed to update discount code'),
  });

  const deleteMutation = useMutation({
    mutationFn: discountAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('Discount code deleted');
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to delete discount code'),
  });

  function openCreate() {
    setEditingDiscount(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(d) {
    setEditingDiscount(d);
    setForm({
      code: d.code,
      type: d.type,
      value: String(d.value),
      minOrderAmount: d.minOrderAmount !== null ? String(d.minOrderAmount) : '',
      maxUses: d.maxUses !== null ? String(d.maxUses) : '',
      isActive: d.isActive,
      validFrom: d.validFrom ? format(new Date(d.validFrom), "yyyy-MM-dd'T'HH:mm") : '',
      validUntil: d.validUntil ? format(new Date(d.validUntil), "yyyy-MM-dd'T'HH:mm") : '',
      bogoProductId: d.bogoProductId || '',
      comboProductIds: d.comboProductIds || [],
      comboDiscount: d.comboDiscount != null ? String(d.comboDiscount) : '',
    });
    setDialogOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      isActive: form.isActive,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
      bogoProductId: form.type === 'BOGO' ? form.bogoProductId : null,
      comboProductIds: form.type === 'COMBO' ? form.comboProductIds : [],
      comboDiscount: form.type === 'COMBO' && form.comboDiscount !== '' ? Number(form.comboDiscount) : null,
    };
    if (editingDiscount) {
      updateMutation.mutate({ id: editingDiscount.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}"`);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Discount Codes</h1>
            <Badge variant="secondary">{discounts.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Code
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : discounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No discount codes yet. Click "New Code" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  discounts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="font-mono font-semibold text-sm bg-muted px-2 py-0.5 rounded">
                            {d.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyCode(d.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{discountLabel(d)}</span>
                      </TableCell>
                      <TableCell className="text-sm">{formatCurrency(d.minOrderAmount)}</TableCell>
                      <TableCell className="text-sm">
                        {d.usedCount}
                        {d.maxUses !== null ? ` / ${d.maxUses}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(d.validUntil)}</TableCell>
                      <TableCell>
                        <Badge
                          className={d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                        >
                          {d.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(d)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDiscount ? 'Edit Discount Code' : 'New Discount Code'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label>Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WELCOME10"
                    required
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                      <SelectItem value="BOGO">BOGO — buy and get one free</SelectItem>
                      <SelectItem value="COMBO">Combo — buy a set, save ₹</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Value *</Label>
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'PERCENTAGE' ? '10' : '50'}
                    min={0}
                    required={form.type === 'PERCENTAGE' || form.type === 'FIXED'}
                    disabled={form.type === 'BOGO' || form.type === 'COMBO'}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Min Order Amount</Label>
                  <Input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    placeholder="Optional (₹)"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="Unlimited if empty"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Valid From</Label>
                  <Input
                    type="datetime-local"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Valid Until</Label>
                  <Input
                    type="datetime-local"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  />
                </div>
              </div>
              {form.type === 'BOGO' && (
                <div className="space-y-1">
                  <Label>Free product *</Label>
                  <Select value={form.bogoProductId} onValueChange={(v) => setForm({ ...form, bogoProductId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose the product that is free" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.type === 'COMBO' && (
                <div className="space-y-2">
                  <Label>Products that must all be in the cart *</Label>
                  <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-1">
                    {products.map((product) => {
                      const checked = form.comboProductIds.includes(product.id);
                      return (
                        <label key={product.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const comboProductIds = checked
                                ? form.comboProductIds.filter((id) => id !== product.id)
                                : [...form.comboProductIds, product.id];
                              setForm({ ...form, comboProductIds });
                            }}
                          />
                          {product.name}
                        </label>
                      );
                    })}
                  </div>
                  <div className="space-y-1">
                    <Label>Combo discount (₹ off) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.comboDiscount}
                      onChange={(e) => setForm({ ...form, comboDiscount: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  id="discount-active"
                />
                <Label htmlFor="discount-active">Active</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : editingDiscount ? 'Save Changes' : 'Create Code'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Discount Code?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Code <code className="font-mono font-semibold">{deleteConfirm?.code}</code> will be
              permanently deleted. This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

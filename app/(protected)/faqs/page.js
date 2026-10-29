'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { HelpCircle, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { faqAPI, productAPI } from '@/lib/api';

const EMPTY_FORM = { question: '', answer: '', category: '', sortOrder: 0, isActive: true, productId: '' };

export default function FaqsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['faqs'],
    queryFn: faqAPI.list,
  });

  const faqs = data?.faqs || [];

  const { data: productsRes } = useQuery({
    queryKey: ['products', 'faq-picker'],
    queryFn: () => productAPI.list({ limit: '100' }),
  });
  const products = productsRes?.data || [];

  const createMutation = useMutation({
    mutationFn: faqAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ created');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message || 'Failed to create FAQ'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => faqAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ updated');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message || 'Failed to update FAQ'),
  });

  const deleteMutation = useMutation({
    mutationFn: faqAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ deleted');
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to delete FAQ'),
  });

  function openCreate() {
    setEditingFaq(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(faq) {
    setEditingFaq(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
      sortOrder: faq.sortOrder,
      isActive: faq.isActive,
      productId: faq.productId || '',
    });
    setDialogOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder),
      productId: form.productId || null,
    };
    if (editingFaq) {
      updateMutation.mutate({ id: editingFaq.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">FAQs</h1>
            <Badge variant="secondary">{faqs.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add FAQ
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : faqs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No FAQs yet. Click "Add FAQ" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  faqs.map((faq, i) => (
                    <TableRow key={faq.id}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="font-medium line-clamp-1">{faq.question}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{faq.answer}</p>
                      </TableCell>
                      <TableCell>
                        {faq.category ? (
                          <Badge variant="outline" className="text-xs">{faq.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {faq.product?.name || 'All products'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={faq.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                        >
                          {faq.isActive ? 'Active' : 'Hidden'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(faq)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(faq)}
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
              <DialogTitle>{editingFaq ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Question *</Label>
                <Input
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="e.g. Is this product suitable for sensitive skin?"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Answer *</Label>
                <Textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="Detailed answer…"
                  rows={4}
                  required
                />
              </div>
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
                <p className="text-xs text-muted-foreground">All products shows this answer on every soap page.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Shipping, Products"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    min={0}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  id="faq-active"
                />
                <Label htmlFor="faq-active">Active (visible on storefront)</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : editingFaq ? 'Save Changes' : 'Create FAQ'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete FAQ?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              "{deleteConfirm?.question}" will be permanently deleted.
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

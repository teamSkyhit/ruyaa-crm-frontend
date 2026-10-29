'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { bannerAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';

const EMPTY_FORM = {
  imageUrl: '', mobileImageUrl: '', title: '', subtitle: '',
  ctaText: '', ctaUrl: '', validFrom: '', validUntil: '', sortOrder: 0,
};

export default function BannersPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await bannerAPI.list();
      if (!res.success) throw new Error(res.error || 'Failed to load banners');
      return res.data || [];
    },
  });

  const banners = (data || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const invalidate = () => qc.invalidateQueries({ queryKey: ['banners'] });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingBanner
        ? bannerAPI.update(editingBanner.id, payload)
        : bannerAPI.create(payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(editingBanner ? 'Banner updated' : 'Banner created');
        setDialogOpen(false);
        invalidate();
      } else {
        toast.error(res.error || 'Failed to save banner');
      }
    },
    onError: () => toast.error('Failed to save banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bannerAPI.delete(id),
    onSuccess: (res) => {
      if (res.success) { toast.success('Banner deleted'); invalidate(); }
      else toast.error(res.error || 'Failed to delete banner');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete banner'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => bannerAPI.toggleActive(id),
    onSuccess: (res) => {
      if (!res.success) toast.error(res.error || 'Failed to toggle banner');
      invalidate();
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items) => bannerAPI.reorder(items),
    onSuccess: (res) => {
      if (!res.success) toast.error(res.error || 'Failed to reorder');
      invalidate();
    },
  });

  const openAdd = () => {
    setEditingBanner(null);
    setForm({ ...EMPTY_FORM, sortOrder: banners.length });
    setDialogOpen(true);
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setForm({
      imageUrl: banner.imageUrl ?? '',
      mobileImageUrl: banner.mobileImageUrl ?? '',
      title: banner.title ?? '',
      subtitle: banner.subtitle ?? '',
      ctaText: banner.ctaText ?? '',
      ctaUrl: banner.ctaUrl ?? '',
      validFrom: banner.validFrom ? banner.validFrom.slice(0, 10) : '',
      validUntil: banner.validUntil ? banner.validUntil.slice(0, 10) : '',
      sortOrder: banner.sortOrder ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.imageUrl.trim()) {
      toast.error('Upload a banner picture');
      return;
    }
    saveMutation.mutate({
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
    });
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const reordered = [...banners];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    reorderMutation.mutate(reordered.map((b, i) => ({ id: b.id, sortOrder: i })));
  };

  const moveDown = (idx) => {
    if (idx === banners.length - 1) return;
    const reordered = [...banners];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    reorderMutation.mutate(reordered.map((b, i) => ({ id: b.id, sortOrder: i })));
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Banners</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage homepage banners and their order</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Banner
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Banners</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : banners.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">No banners yet. Add one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.map((banner, idx) => (
                  <div key={banner.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {/* Order arrows */}
                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(idx)} disabled={idx === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(idx)} disabled={idx === banners.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Image preview */}
                    <div className="h-14 w-24 rounded overflow-hidden bg-muted shrink-0">
                      {banner.imageUrl ? (
                        <img src={banner.imageUrl} alt={banner.title || 'banner'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{banner.title || <span className="italic text-muted-foreground">Untitled</span>}</p>
                      {banner.subtitle && <p className="text-xs text-muted-foreground truncate">{banner.subtitle}</p>}
                      {banner.ctaText && (
                        <Badge variant="outline" className="text-xs mt-1">{banner.ctaText}</Badge>
                      )}
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{banner.isActive ? 'Active' : 'Inactive'}</span>
                      <Switch
                        checked={!!banner.isActive}
                        onCheckedChange={() => toggleMutation.mutate(banner.id)}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(banner)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(banner)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PictureUpload
              folder="banners"
              label="Picture"
              value={form.imageUrl}
              onChange={(imageUrl) => set('imageUrl', imageUrl)}
            />
            <PictureUpload
              folder="banners"
              label="Mobile picture"
              optional
              value={form.mobileImageUrl}
              onChange={(mobileImageUrl) => set('mobileImageUrl', mobileImageUrl)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input id="subtitle" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Text</Label>
                <Input id="ctaText" value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} placeholder="Shop Now" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaUrl">CTA URL</Label>
                <Input id="ctaUrl" value={form.ctaUrl} onChange={(e) => set('ctaUrl', e.target.value)} placeholder="/collections/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From</Label>
                <Input id="validFrom" type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input id="validUntil" type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title || 'this banner'}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}

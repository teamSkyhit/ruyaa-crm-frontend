'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { benefitAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const EMPTY = { title: '', description: '', image: '', imageAlt: '', sortOrder: '0', isActive: true };

export default function ProductBenefits({ productId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['benefits', productId],
    queryFn: () => benefitAPI.list(productId),
    enabled: !!productId,
  });

  const benefits = data?.data || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['benefits', productId] });
  }

  const createMutation = useMutation({
    mutationFn: (payload) => benefitAPI.create(productId, payload),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to add benefit');
        return;
      }
      toast.success('Benefit added');
      setForm(EMPTY);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => benefitAPI.delete(productId, id),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to delete benefit');
        return;
      }
      toast.success('Benefit deleted');
      refresh();
    },
  });

  function addBenefit(e) {
    e.preventDefault();
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image || null,
      imageAlt: form.imageAlt.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benefit cards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : benefits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No benefit cards yet.</p>
        ) : (
          <ul className="space-y-2">
            {benefits.map((benefit) => (
              <li key={benefit.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-medium">{benefit.title}</p>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(benefit.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addBenefit} className="grid gap-3 border-t pt-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Deep Moisturization"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Helps lock in moisture and keeps skin soft and supple."
              rows={2}
              required
            />
          </div>
          <PictureUpload
            folder="products"
            label="Picture"
            optional
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
          />
          <div className="space-y-1">
            <Label>Alt text</Label>
            <Input value={form.imageAlt} onChange={(e) => setForm({ ...form, imageAlt: e.target.value })} />
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1 w-24">
              <Label>Order</Label>
              <Input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(isActive) => setForm({ ...form, isActive })}
                id="benefit-active"
              />
              <Label htmlFor="benefit-active">Active</Label>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>Add benefit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

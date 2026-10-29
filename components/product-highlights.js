'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { highlightAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const EMPTY = { title: '', description: '', image: '', imageAlt: '', sortOrder: '0' };

export default function ProductHighlights({ productId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['highlights', productId],
    queryFn: () => highlightAPI.list(productId),
    enabled: !!productId,
  });
  const highlights = data?.data || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['highlights', productId] });
  }

  const createMutation = useMutation({
    mutationFn: (payload) => highlightAPI.create(productId, payload),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to add highlight');
        return;
      }
      toast.success('Highlight added');
      setForm(EMPTY);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => highlightAPI.delete(productId, id),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to delete highlight');
        return;
      }
      toast.success('Highlight deleted');
      refresh();
    },
  });

  function addHighlight(e) {
    e.preventDefault();
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image || null,
      imageAlt: form.imageAlt.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: true,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Highlight icons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : highlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No highlights yet.</p>
        ) : (
          <ul className="space-y-2">
            {highlights.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addHighlight} className="grid gap-3 border-t pt-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <PictureUpload
            folder="products"
            label="Icon"
            optional
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Alt text</Label>
              <Input value={form.imageAlt} onChange={(e) => setForm({ ...form, imageAlt: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={createMutation.isPending}>Add highlight</Button>
        </form>
      </CardContent>
    </Card>
  );
}

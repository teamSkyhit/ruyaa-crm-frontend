'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mediaAPI, variantAPI, uploadAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const EMPTY = { kind: 'IMAGE', variantId: '', altText: '', sortOrder: '0', image: '', thumbnail: '' };

export default function ProductMedia({ productId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [videoFile, setVideoFile] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['media', productId],
    queryFn: () => mediaAPI.list(productId),
    enabled: !!productId,
  });
  const { data: weightData } = useQuery({
    queryKey: ['variants', productId],
    queryFn: () => variantAPI.list(productId),
    enabled: !!productId,
  });

  const media = data?.data || [];
  const weights = weightData?.data?.variants || weightData?.variants || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['media', productId] });
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
  }

  const createMutation = useMutation({
    mutationFn: (payload) => mediaAPI.create(productId, payload),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to add media');
        return;
      }
      toast.success('Media added');
      setForm(EMPTY);
      setVideoFile(null);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => mediaAPI.delete(productId, id),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to delete media');
        return;
      }
      toast.success('Media deleted');
      refresh();
    },
  });

  async function addMedia(e) {
    e.preventDefault();
    let url = form.image;
    if (form.kind === 'VIDEO') {
      if (!videoFile) {
        toast.error('Choose a video file');
        return;
      }
      const uploaded = await uploadAPI.uploadVideo(videoFile);
      url = uploaded?.data?.url;
    }
    if (!url) {
      toast.error('Upload a picture or video first');
      return;
    }
    createMutation.mutate({
      kind: form.kind,
      variantId: form.variantId || null,
      url,
      thumbnailUrl: form.thumbnail || null,
      altText: form.altText,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: true,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pictures and videos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This is the gallery for the product. Add a picture or video here, or choose a weight to give that weight its own. A weight with nothing uploaded keeps showing this gallery.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : media.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media yet.</p>
        ) : (
          <ul className="space-y-2">
            {media.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-medium">{item.kind} · {item.variantId ? 'Weight' : 'Product'}</p>
                  <p className="text-sm text-muted-foreground">{item.altText || item.url}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addMedia} className="grid gap-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="IMAGE">Picture</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Applies to</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.variantId}
                onChange={(e) => setForm({ ...form, variantId: e.target.value })}
              >
                <option value="">Product gallery</option>
                {weights.map((weight) => (
                  <option key={weight.id} value={weight.id}>{weight.name}</option>
                ))}
              </select>
            </div>
          </div>
          {form.kind === 'IMAGE' ? (
            <PictureUpload
              folder="products"
              label="Picture"
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
            />
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Video (MP4 or WebM, up to 30MB)</Label>
                <Input type="file" accept="video/mp4,video/webm" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              </div>
              <PictureUpload
                folder="products"
                label="Thumbnail"
                optional
                value={form.thumbnail}
                onChange={(thumbnail) => setForm({ ...form, thumbnail })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Alt text</Label>
              <Input value={form.altText} onChange={(e) => setForm({ ...form, altText: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={createMutation.isPending}>Add media</Button>
        </form>
      </CardContent>
    </Card>
  );
}

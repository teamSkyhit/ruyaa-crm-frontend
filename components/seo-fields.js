'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export const EMPTY_SEO = {
  imageAlt: '',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  robotsIndex: true,
  robotsFollow: true,
};

export function seoFrom(record, altKey = 'imageAlt') {
  return {
    imageAlt: record?.[altKey] || '',
    metaTitle: record?.metaTitle || '',
    metaDescription: record?.metaDescription || '',
    canonicalUrl: record?.canonicalUrl || '',
    ogTitle: record?.ogTitle || '',
    ogDescription: record?.ogDescription || '',
    ogImage: record?.ogImage || '',
    robotsIndex: record?.robotsIndex !== false,
    robotsFollow: record?.robotsFollow !== false,
  };
}

export default function SeoFields({ form, setForm, altLabel = 'Image alt text' }) {
  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">Search and social</p>
      <div className="space-y-1">
        <Label>{altLabel}</Label>
        <Input value={form.imageAlt || ''} onChange={(e) => set('imageAlt', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label>Meta title</Label>
          <Input value={form.metaTitle || ''} onChange={(e) => set('metaTitle', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Meta description</Label>
          <Input value={form.metaDescription || ''} onChange={(e) => set('metaDescription', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Canonical URL</Label>
          <Input value={form.canonicalUrl || ''} onChange={(e) => set('canonicalUrl', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Social title</Label>
          <Input value={form.ogTitle || ''} onChange={(e) => set('ogTitle', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Social description</Label>
          <Input value={form.ogDescription || ''} onChange={(e) => set('ogDescription', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Social image URL</Label>
          <Input value={form.ogImage || ''} onChange={(e) => set('ogImage', e.target.value)} placeholder="Filled after upload, or paste a stored URL" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={form.robotsIndex !== false} onCheckedChange={(value) => set('robotsIndex', value)} />
          <Label>Index</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.robotsFollow !== false} onCheckedChange={(value) => set('robotsFollow', value)} />
          <Label>Follow</Label>
        </div>
      </div>
    </div>
  );
}

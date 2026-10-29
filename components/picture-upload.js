'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { uploadAPI } from '@/lib/api';
import { toast } from 'sonner';

const MAX_BYTES = 5 * 1024 * 1024;

function asList(value, multiple) {
  if (multiple) return Array.isArray(value) ? value.filter(Boolean) : [];
  return value ? [value] : [];
}

async function deleteStoredPicture(url) {
  try {
    const result = await uploadAPI.deleteImage(url);
    if (result?.success === false) {
      toast.error(result.error || 'Could not delete the picture');
      return false;
    }
    return true;
  } catch (err) {
    toast.error(err.message || 'Could not delete the picture');
    return false;
  }
}

export default function PictureUpload({
  value,
  onChange,
  multiple = false,
  label = 'Pictures',
  optional = false,
  folder = 'products',
  hint,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const pictures = asList(value, multiple);

  const publish = (next) => {
    onChange(multiple ? next : next[0] || '');
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const accepted = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a picture`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }
      accepted.push(file);
      if (!multiple) break;
    }
    if (!accepted.length) return;

    setUploading(true);
    const uploaded = [];
    try {
      for (const file of accepted) {
        const result = await uploadAPI.uploadImage(file, folder);
        const url = result.data?.url;
        if (!url) throw new Error('Upload did not return a picture address');
        uploaded.push(url);
      }
      const replaced = multiple ? [] : pictures;
      publish(multiple ? [...pictures, ...uploaded] : uploaded);
      for (const url of replaced) {
        if (url) await deleteStoredPicture(url);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload picture');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = async (index) => {
    const url = pictures[index];
    if (url) {
      const removed = await deleteStoredPicture(url);
      if (!removed) return;
    }
    publish(pictures.filter((_, i) => i !== index));
    toast.success('Picture deleted');
  };

  const makeCover = (index) => {
    if (!multiple || index === 0) return;
    const next = [...pictures];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    publish(next);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {optional ? <span className="text-muted-foreground font-normal"> (optional)</span> : null}
      </Label>
      {pictures.length > 0 && (
        <div className={multiple ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
          {pictures.map((url, index) => (
            <div key={`${url}-${index}`} className="space-y-1">
              <div className="relative h-28 overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-contain" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => removeAt(index)}
                  aria-label="Remove picture"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                {multiple && index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {multiple && index > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={() => makeCover(index)}>
                    Use as cover
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => removeAt(index)}>
                  <X className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading…' : pictures.length ? (multiple ? 'Add pictures' : 'Replace picture') : 'Upload picture'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">
        {hint || (multiple
          ? 'Upload the gallery. The first picture is the cover. Remove deletes that file. JPG, PNG, WebP, or GIF, up to 5MB each.'
          : 'JPG, PNG, WebP, or GIF, up to 5MB. Remove deletes the file.')}
      </p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { categoryAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  mrp: z.coerce.number().min(0, 'MRP required'),
  salePrice: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  fullIngredients: z.string().optional(),
  weight: z.string().optional(),
  shelfLife: z.string().optional(),
  howToUse: z.string().optional(),
  storageInstructions: z.string().optional(),
  manufacturer: z.string().optional(),
  licenceNumber: z.string().optional(),
  image: z.string().optional(),
  quantity: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
  showOnWebsite: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  imageAlt: z.string().optional(),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
});

function galleryFrom(values) {
  const list = Array.isArray(values?.images) ? values.images.filter(Boolean) : [];
  if (values?.image && !list.includes(values.image)) list.unshift(values.image);
  return list;
}

export default function ProductForm({ defaultValues, onSubmit, isSubmitting, showPictures = true, submitLabel = 'Save Product' }) {
  const [ingredientInput, setIngredientInput] = useState('');
  const [featuredIngredients, setFeaturedIngredients] = useState(
    defaultValues?.featuredIngredients || []
  );
  const [pictures, setPictures] = useState(() => galleryFrom(defaultValues));

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoryAPI.list();
      if (!res?.success) return [];
      return res.data || [];
    },
  });

  const categories = categoriesData || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      weight: '125g',
      quantity: 0,
      lowStockThreshold: 10,
      isActive: true,
      showOnWebsite: true,
      ...defaultValues,
    },
  });

  const isActive = watch('isActive');
  const showOnWebsite = watch('showOnWebsite');
  const categoryId = watch('categoryId');
  const subcategoryId = watch('subcategoryId');
  const subcategoryOptions =
    categories.find((cat) => String(cat.id) === String(categoryId))?.subcategories || [];

  useEffect(() => {
    if (defaultValues?.featuredIngredients) {
      setFeaturedIngredients(defaultValues.featuredIngredients);
    }
    setPictures(galleryFrom(defaultValues));
  }, [defaultValues]);

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (!trimmed) return;
    const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    setFeaturedIngredients((prev) => [...new Set([...prev, ...parts])]);
    setIngredientInput('');
  };

  const removeIngredient = (ing) => {
    setFeaturedIngredients((prev) => prev.filter((i) => i !== ing));
  };

  const handleFormSubmit = (data) => {
    const payload = {
      ...data,
      featuredIngredients,
      subcategoryId: data.subcategoryId || null,
    };
    if (showPictures) {
      payload.image = pictures[0] || null;
      payload.images = pictures;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <Select
            value={categoryId || undefined}
            onValueChange={(v) => {
              setValue('categoryId', v);
              const nextSubs = categories.find((cat) => String(cat.id) === String(v))?.subcategories || [];
              if (!nextSubs.some((sub) => String(sub.id) === String(subcategoryId))) {
                setValue('subcategoryId', '');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subcategoryId">Subcategory</Label>
          <Select
            value={subcategoryId || undefined}
            onValueChange={(v) => setValue('subcategoryId', v === 'none' ? '' : v)}
            disabled={!categoryId}
          >
            <SelectTrigger>
              <SelectValue placeholder={categoryId ? 'Select subcategory' : 'Select a category first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {subcategoryOptions.map((sub) => (
                <SelectItem key={sub.id} value={String(sub.id)}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mrp">MRP (₹) *</Label>
          <Input id="mrp" type="number" step="0.01" {...register('mrp')} />
          {errors.mrp && <p className="text-xs text-destructive">{errors.mrp.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="salePrice">Sale Price (₹)</Label>
          <Input id="salePrice" type="number" step="0.01" {...register('salePrice')} />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register('description')} />
      </div>

      {/* Featured ingredients */}
      <div className="space-y-1.5">
        <Label>Featured Ingredients</Label>
        <div className="flex gap-2">
          <Input
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            placeholder="Type ingredient(s), comma-separated"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addIngredient();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addIngredient}>
            Add
          </Button>
        </div>
        {featuredIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {featuredIngredients.map((ing) => (
              <Badge key={ing} variant="secondary" className="flex items-center gap-1">
                {ing}
                <button
                  type="button"
                  onClick={() => removeIngredient(ing)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Full ingredients */}
      <div className="space-y-1.5">
        <Label htmlFor="fullIngredients">Full Ingredients</Label>
        <Textarea id="fullIngredients" rows={2} {...register('fullIngredients')} />
      </div>

      {/* Product details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="weight">Default weight</Label>
          <Input id="weight" {...register('weight')} placeholder="125g" />
          <p className="text-xs text-muted-foreground">
            {showPictures
              ? 'Shown before a shopper picks a weight. Weight options are added on the next screen.'
              : 'Shown before a shopper picks a weight. The weight options are managed below.'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shelfLife">Shelf Life</Label>
          <Input id="shelfLife" {...register('shelfLife')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="howToUse">How to Use</Label>
          <Textarea id="howToUse" rows={2} {...register('howToUse')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="storageInstructions">Storage Instructions</Label>
          <Textarea id="storageInstructions" rows={2} {...register('storageInstructions')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input id="manufacturer" {...register('manufacturer')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="licenceNumber">Licence Number</Label>
          <Input id="licenceNumber" {...register('licenceNumber')} />
        </div>
      </div>

      {showPictures && (
        <div className="space-y-2">
          <PictureUpload
            multiple
            folder="products"
            label="Pictures"
            value={pictures}
            onChange={setPictures}
          />
          <p className="text-sm text-muted-foreground">
            After saving, this product opens with weights, videos, benefit cards, highlights, and related products.
          </p>
        </div>
      )}

      {/* Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" type="number" {...register('quantity')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
          <Input id="lowStockThreshold" type="number" {...register('lowStockThreshold')} />
        </div>
      </div>

      {/* SEO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="metaTitle">Meta Title</Label>
          <Input id="metaTitle" {...register('metaTitle')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metaDescription">Meta Description</Label>
          <Input id="metaDescription" {...register('metaDescription')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="canonicalUrl">Canonical URL</Label>
          <Input id="canonicalUrl" {...register('canonicalUrl')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ogTitle">Social title</Label>
          <Input id="ogTitle" {...register('ogTitle')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ogDescription">Social description</Label>
          <Input id="ogDescription" {...register('ogDescription')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ogImage">Social image URL</Label>
          <Input id="ogImage" {...register('ogImage')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="imageAlt">Cover image alt</Label>
          <Input id="imageAlt" {...register('imageAlt')} />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch id="robotsIndex" checked={watch('robotsIndex') !== false} onCheckedChange={(value) => setValue('robotsIndex', value)} />
          <Label htmlFor="robotsIndex">Index</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="robotsFollow" checked={watch('robotsFollow') !== false} onCheckedChange={(value) => setValue('robotsFollow', value)} />
          <Label htmlFor="robotsFollow">Follow</Label>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="isActive"
            checked={!!isActive}
            onCheckedChange={(v) => setValue('isActive', v)}
            className="data-[state=checked]:bg-[#4A5C38]"
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="showOnWebsite"
            checked={!!showOnWebsite}
            onCheckedChange={(v) => setValue('showOnWebsite', v)}
            className="data-[state=checked]:bg-[#4A5C38]"
          />
          <Label htmlFor="showOnWebsite">Show on Website</Label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-[#4A5C38] hover:bg-[#3d4d2f] text-white"
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import ProductForm from '@/components/product-form';
import ProductVariants from '@/components/product-variants';
import ProductBenefits from '@/components/product-benefits';
import ProductMedia from '@/components/product-media';
import ProductHighlights from '@/components/product-highlights';
import ProductRelated from '@/components/product-related';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function EditProductContent() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await productAPI.get(id);
      if (!res?.success) throw new Error(res?.error || 'Failed to load');
      return res.data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (formData) => productAPI.update(id, formData),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['product', id] });
        toast.success('Product updated');
      } else {
        toast.error(res?.error || 'Failed to update product');
      }
    },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => productAPI.delete(id),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success('Product deleted');
        router.push('/products');
      } else {
        toast.error(res?.error || 'Failed to delete product');
      }
    },
    onError: () => toast.error('Failed to delete product'),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Product not found.
      </div>
    );
  }

  // Normalize categoryId to string for the form select
  const defaultValues = {
    ...data,
    categoryId: data.categoryId ? String(data.categoryId) : undefined,
    subcategoryId: data.subcategoryId ? String(data.subcategoryId) : '',
    featuredIngredients: data.featuredIngredients || [],
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Product</h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{data.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ProductForm
        defaultValues={defaultValues}
        onSubmit={updateMutation.mutate}
        isSubmitting={updateMutation.isPending}
        showPictures={false}
      />
      <ProductVariants productId={id} />
      <ProductMedia productId={id} />
      <ProductBenefits productId={id} />
      <ProductHighlights productId={id} />
      <ProductRelated productId={id} />
    </div>
  );
}

export default function EditProductPage() {
  return (
    <ProtectedRoute>
      <EditProductContent />
    </ProtectedRoute>
  );
}

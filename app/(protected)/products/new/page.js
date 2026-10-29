'use client';

import { useMutation } from '@tanstack/react-query';
import { productAPI } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import ProductForm from '@/components/product-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function NewProductContent() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data) => productAPI.create(data),
    onSuccess: (res) => {
      if (res?.success) {
        toast.success('Product created. Add weights, videos, and the rest of the page here.');
        router.push(`/products/${res.data.id}`);
      } else {
        toast.error(res?.error || 'Failed to create product');
      }
    },
    onError: () => toast.error('Failed to create product'),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Add Product</h1>
      </div>
      <ProductForm
        onSubmit={mutation.mutate}
        isSubmitting={mutation.isPending}
        showPictures
        submitLabel="Save and continue"
      />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <ProtectedRoute>
      <NewProductContent />
    </ProtectedRoute>
  );
}

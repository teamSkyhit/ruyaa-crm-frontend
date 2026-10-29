'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI, categoryAPI } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function ProductsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('all');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoryAPI.list();
      if (!res?.success) return [];
      return res.data || [];
    },
  });

  const subcategoryOptions = categories.flatMap((cat) =>
    (cat.subcategories || []).map((sub) => ({
      id: sub.id,
      label: `${cat.name} / ${sub.name}`,
    }))
  );

  const { data, isLoading } = useQuery({
    queryKey: ['products', subcategoryId],
    queryFn: async () => {
      const params = subcategoryId !== 'all' ? { subcategoryId, limit: '100' } : { limit: '100' };
      const res = await productAPI.list(params);
      if (!res?.success) throw new Error(res?.error || 'Failed to load');
      return res.data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => productAPI.toggleActive(id),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success('Product updated');
      } else {
        toast.error(res?.error || 'Failed to update');
      }
    },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.delete(id),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success('Product deleted');
      } else {
        toast.error(res?.error || 'Failed to delete');
      }
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const products = (data || []).filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(s) ||
      p.sku?.toLowerCase().includes(s) ||
      p.category?.name?.toLowerCase().includes(s) ||
      p.subcategory?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild className="bg-[#4A5C38] hover:bg-[#3d4d2f] text-white">
          <Link href="/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subcategoryId} onValueChange={setSubcategoryId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="All subcategories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subcategories</SelectItem>
            {subcategoryOptions.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground border rounded-lg">
          {search || subcategoryId !== 'all' ? 'No products match this filter.' : 'No products yet.'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 font-medium">Active</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover border shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                            <span className="text-xs text-muted-foreground">No img</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[180px]">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.category?.name || '—'}
                      {product.subcategory?.name ? ` / ${product.subcategory.name}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <span className="font-medium">₹{Number(product.salePrice || product.mrp || 0).toFixed(2)}</span>
                        {product.mrp && product.salePrice && product.mrp !== product.salePrice && (
                          <p className="text-xs text-muted-foreground line-through">
                            ₹{Number(product.mrp).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          (product.quantity ?? 0) <= (product.lowStockThreshold ?? 10)
                            ? 'text-amber-600 font-medium'
                            : ''
                        }
                      >
                        {product.quantity ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={!!product.isActive}
                        onCheckedChange={() => toggleMutation.mutate(product.id)}
                        disabled={toggleMutation.isPending}
                        className="data-[state=checked]:bg-[#4A5C38]"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                          <Link href={`/products/${product.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{product.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(product.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}

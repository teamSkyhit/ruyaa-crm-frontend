'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';
import SeoFields, { EMPTY_SEO, seoFrom } from '@/components/seo-fields';
import ProtectedRoute from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_FORM = { name: '', slug: '', sortOrder: 0, isActive: true, image: '', ...EMPTY_SEO };

function toForm(initial) {
  if (!initial) return { ...EMPTY_FORM };
  return {
    name: initial.name || '',
    slug: initial.slug || '',
    sortOrder: initial.sortOrder ?? 0,
    isActive: initial.isActive !== false,
    image: initial.image || '',
    ...seoFrom(initial),
  };
}

function SubcategoryDialog({ open, onClose, initial, categoryName, onSave, isSaving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(initial));
    setSlugEdited(Boolean(initial?.id));
  }, [open, initial]);

  const handleOpenChange = (next) => {
    if (!next) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      slug: form.slug,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: !!form.isActive,
      image: form.image || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? 'Edit Subcategory' : `Add subcategory in ${categoryName}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: slugEdited ? prev.slug : slugify(name),
                }));
              }}
              placeholder="Subcategory name"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setForm((prev) => ({ ...prev, slug: e.target.value }));
              }}
              placeholder="auto-generated"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
            />
          </div>
          <PictureUpload
            folder="subcategories"
            label="Picture"
            optional
            value={form.image || ''}
            onChange={(image) => setForm((prev) => ({ ...prev, image }))}
          />
          <SeoFields form={form} setForm={setForm} />
          <div className="flex items-center gap-2">
            <Switch
              id="sub-active"
              checked={!!form.isActive}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
              className="data-[state=checked]:bg-[#4A5C38]"
            />
            <Label htmlFor="sub-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !form.name.trim()}
              className="bg-[#4A5C38] hover:bg-[#3d4d2f] text-white"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ open, onClose, initial, onSave, isSaving }) {
  const [form, setForm] = useState(() => toForm(initial));
  const [slugEdited, setSlugEdited] = useState(Boolean(initial?.id));

  useEffect(() => {
    if (!open) return;
    setForm(toForm(initial));
    setSlugEdited(Boolean(initial?.id));
  }, [open, initial]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugEdited ? prev.slug : slugify(name),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugEdited(true);
    setForm((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, image: form.image || null });
  };

  const handleOpenChange = (next) => {
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={handleNameChange}
              placeholder="Category name"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="auto-generated"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))
              }
            />
          </div>
          <PictureUpload
            folder="categories"
            label="Picture"
            optional
            value={form.image || ''}
            onChange={(image) => setForm((prev) => ({ ...prev, image }))}
          />
          <SeoFields form={form} setForm={setForm} />
          <div className="flex items-center gap-2">
            <Switch
              id="cat-active"
              checked={!!form.isActive}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
              className="data-[state=checked]:bg-[#4A5C38]"
            />
            <Label htmlFor="cat-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !form.name.trim()}
              className="bg-[#4A5C38] hover:bg-[#3d4d2f] text-white"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesContent() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [subTarget, setSubTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoryAPI.list();
      if (!res?.success) throw new Error(res?.error || 'Failed to load');
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (form) => categoryAPI.create(form),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        toast.success('Category created');
        setDialogOpen(false);
      } else {
        toast.error(res?.error || 'Failed to create');
      }
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...form }) => categoryAPI.update(id, form),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        toast.success('Category updated');
        setDialogOpen(false);
        setEditTarget(null);
      } else {
        toast.error(res?.error || 'Failed to update');
      }
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoryAPI.delete(id),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        toast.success('Category deleted');
      } else {
        toast.error(res?.error || 'Failed to delete');
      }
    },
    onError: () => toast.error('Failed to delete category'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const createSubMutation = useMutation({
    mutationFn: ({ categoryId, form }) => categoryAPI.createSubcategory(categoryId, form),
    onSuccess: (res) => {
      if (res?.success) {
        invalidate();
        toast.success('Subcategory created');
        setSubTarget(null);
      } else {
        toast.error(res?.error || 'Failed to create subcategory');
      }
    },
    onError: () => toast.error('Failed to create subcategory'),
  });

  const updateSubMutation = useMutation({
    mutationFn: ({ categoryId, id, form }) => categoryAPI.updateSubcategory(categoryId, id, form),
    onSuccess: (res) => {
      if (res?.success) {
        invalidate();
        toast.success('Subcategory updated');
        setSubTarget(null);
      } else {
        toast.error(res?.error || 'Failed to update subcategory');
      }
    },
    onError: () => toast.error('Failed to update subcategory'),
  });

  const deleteSubMutation = useMutation({
    mutationFn: ({ categoryId, id }) => categoryAPI.deleteSubcategory(categoryId, id),
    onSuccess: (res) => {
      if (res?.success) {
        invalidate();
        toast.success('Subcategory deleted');
      } else {
        toast.error(res?.error || 'Failed to delete subcategory');
      }
    },
    onError: () => toast.error('Failed to delete subcategory'),
  });

  const openAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (cat) => {
    setEditTarget(cat);
    setDialogOpen(true);
  };

  const handleSave = (form) => {
    if (editTarget?.id) {
      updateMutation.mutate({ id: editTarget.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSubSaving = createSubMutation.isPending || updateSubMutation.isPending;
  const categories = data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={openAdd} className="bg-[#4A5C38] hover:bg-[#3d4d2f] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground border rounded-lg">
          No categories yet. Add your first one.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-center px-4 py-3 font-medium">Sort</th>
                <th className="text-center px-4 py-3 font-medium">Products</th>
                <th className="text-center px-4 py-3 font-medium">Active</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {cat.slug}
                  </td>
                  <td className="px-4 py-3 text-center">{cat.sortOrder ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary">{cat._count?.products ?? cat.productCount ?? 0}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cat.isActive ? (
                      <Badge className="bg-[#4A5C38]/10 text-[#4A5C38] hover:bg-[#4A5C38]/20">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
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
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{cat.name}&quot;? Products in this category will be uncategorized.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(cat.id)}
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
              )).flatMap((row, index) => {
                const cat = categories[index];
                const subs = cat.subcategories || [];
                return [
                  row,
                  <tr key={`${cat.id}-subs`} className="border-b last:border-0 bg-muted/20">
                    <td colSpan={6} className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-1">Subcategories</span>
                        {subs.length === 0 && (
                          <span className="text-xs text-muted-foreground">None yet</span>
                        )}
                        {subs.map((sub) => (
                          <span
                            key={sub.id}
                            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs"
                          >
                            {sub.name}
                            {!sub.isActive && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">Inactive</Badge>
                            )}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => setSubTarget({ category: cat, subcategory: sub })}
                              aria-label={`Edit ${sub.name}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="text-destructive hover:text-destructive/80"
                                  aria-label={`Delete ${sub.name}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete &quot;{sub.name}&quot; from {cat.name}? This is blocked while products still use it.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSubMutation.mutate({ categoryId: cat.id, id: sub.id })}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </span>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSubTarget({ category: cat, subcategory: null })}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editTarget}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <SubcategoryDialog
        open={!!subTarget}
        onClose={() => setSubTarget(null)}
        initial={subTarget?.subcategory}
        categoryName={subTarget?.category?.name || ''}
        isSaving={isSubSaving}
        onSave={(form) => {
          if (!subTarget?.category) return;
          if (subTarget.subcategory?.id) {
            updateSubMutation.mutate({
              categoryId: subTarget.category.id,
              id: subTarget.subcategory.id,
              form,
            });
          } else {
            createSubMutation.mutate({ categoryId: subTarget.category.id, form });
          }
        }}
      />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <ProtectedRoute>
      <CategoriesContent />
    </ProtectedRoute>
  );
}

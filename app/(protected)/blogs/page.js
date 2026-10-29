'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { BookOpen, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { blogAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';
import SeoFields, { EMPTY_SEO, seoFrom } from '@/components/seo-fields';
import { format } from 'date-fns';

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  body: '',
  coverUrl: '',
  ...EMPTY_SEO,
  tags: '',
  authorName: 'Ruyaa Team',
  isPublished: false,
};

function slugPreview(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'post';
}

export default function BlogsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['blogs'],
    queryFn: () => blogAPI.list({ limit: '50' }),
  });

  const blogs = data?.blogs || [];

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? blogAPI.update(editing.id, payload) : blogAPI.create(payload),
    onSuccess: (res) => {
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast.success(editing ? 'Blog updated' : 'Blog created');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message || 'Failed to save blog'),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }) => (publish ? blogAPI.publish(id) : blogAPI.unpublish(id)),
    onSuccess: (res) => {
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
    },
    onError: (e) => toast.error(e.message || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: blogAPI.delete,
    onSuccess: (res) => {
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast.success('Blog deleted');
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to delete blog'),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(blog) {
    setEditing(blog);
    setForm({
      title: blog.title,
      excerpt: blog.excerpt || '',
      body: blog.body || '',
      coverUrl: blog.coverUrl || '',
      ...seoFrom(blog, 'coverAlt'),
      tags: (blog.tags || []).join(', '),
      authorName: blog.authorName || 'Ruyaa Team',
      isPublished: blog.isPublished,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    saveMutation.mutate({
      title: form.title.trim(),
      excerpt: form.excerpt,
      body: form.body,
      coverUrl: form.coverUrl,
      coverAlt: form.imageAlt,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      canonicalUrl: form.canonicalUrl,
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      ogImage: form.ogImage,
      robotsIndex: form.robotsIndex,
      robotsFollow: form.robotsFollow,
      tags: form.tags,
      authorName: form.authorName,
      isPublished: form.isPublished,
    });
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Blogs</h1>
            <Badge variant="secondary">{blogs.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Post
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : blogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No posts yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  blogs.map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell className="font-medium">{blog.title}</TableCell>
                      <TableCell>
                        <Badge className={blog.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                          {blog.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{blog.authorName}</TableCell>
                      <TableCell className="text-sm">
                        {blog.publishedAt ? format(new Date(blog.publishedAt), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => publishMutation.mutate({ id: blog.id, publish: !blog.isPublished })}
                          >
                            {blog.isPublished ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(blog)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(blog)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Post' : 'New Post'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Slug: {editing?.slug || slugPreview(form.title)}</p>
              </div>
              <div className="space-y-1">
                <Label>Excerpt</Label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>Body (HTML) *</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={10}
                  required
                  className="font-mono text-sm"
                />
              </div>
              <PictureUpload
                folder="blogs"
                label="Cover picture"
                optional
                value={form.coverUrl}
                onChange={(coverUrl) => setForm({ ...form, coverUrl })}
              />
              <SeoFields form={form} setForm={setForm} altLabel="Cover alt text" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Author</Label>
                  <Input
                    value={form.authorName}
                    onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="skincare, ingredients"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
                  id="blog-published"
                />
                <Label htmlFor="blog-published">Published</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Post'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete this post?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {deleteConfirm?.title} will be permanently deleted.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

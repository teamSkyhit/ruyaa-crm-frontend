'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Star, RefreshCw, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { reviewAPI } from '@/lib/api';
import { format } from 'date-fns';

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reviews', statusFilter],
    queryFn: () => reviewAPI.list({ status: statusFilter, limit: 50 }),
  });

  const reviews = data?.data?.reviews || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => reviewAPI.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(status === 'APPROVED' ? 'Review approved' : 'Review rejected');
    },
    onError: (e) => toast.error(e.message || 'Failed to update review'),
  });

  const deleteMutation = useMutation({
    mutationFn: reviewAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review deleted');
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to delete review'),
  });

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Product Reviews</h1>
            <Badge variant="secondary">{reviews.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No {statusFilter.toLowerCase()} reviews.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium max-w-[140px] truncate">
                        {r.product?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{r.customerName}</p>
                        <p className="text-xs text-muted-foreground">{r.customerEmail}</p>
                      </TableCell>
                      <TableCell>
                        <StarRating rating={r.rating} />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {r.title && <p className="text-sm font-medium line-clamp-1">{r.title}</p>}
                        {r.comment && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[r.status] || ''}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status !== 'APPROVED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: r.id, status: 'APPROVED' })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {r.status !== 'REJECTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-500 hover:text-orange-600"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: r.id, status: 'REJECTED' })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(r)}
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

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Review?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Review by {deleteConfirm?.customerName} will be permanently deleted.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
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

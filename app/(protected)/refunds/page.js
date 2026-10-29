'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { RotateCcw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { refundAPI } from '@/lib/api';
import { format } from 'date-fns';

const formatCurrency = (v) => `₹${Number(v).toFixed(2)}`;
const formatDate = (v) => format(new Date(v), 'dd MMM yyyy, HH:mm');

const STATUS_BADGE = {
  INITIATED: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  PROCESSED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function RefundsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['refunds', { page, statusFilter }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await refundAPI.list(params);
      if (!res.success) throw new Error(res.error || 'Failed to load refunds');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => refundAPI.updateStatus(id, status),
    onSuccess: (res, { status }) => {
      if (res.success) {
        toast.success(`Refund marked as ${status.toLowerCase()}`);
        qc.invalidateQueries({ queryKey: ['refunds'] });
      } else {
        toast.error(res.error || 'Failed to update refund');
      }
    },
    onError: () => toast.error('Failed to update refund'),
  });

  const refunds = data?.refunds || [];
  const totalPages = data?.meta?.pages || data?.pagination?.pages || 1;
  const total = data?.meta?.total || data?.pagination?.total || 0;

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Refunds</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} refund{total !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['refunds'] })}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="INITIATED">Initiated</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="PROCESSED">Processed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : refunds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <RotateCcw className="h-10 w-10" />
                <p className="text-sm">No refunds found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-48"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>
                          <button
                            className="font-mono text-sm font-medium hover:underline text-left"
                            onClick={() => router.push(`/orders/${refund.orderId}`)}
                          >
                            {refund.order?.orderNumber || refund.orderId}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">
                          {refund.order?.customer?.name || refund.order?.customerName || '—'}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {formatCurrency(refund.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {refund.order?.paymentMethod || '—'}
                        </TableCell>
                        <TableCell className="text-sm max-w-48">
                          <p className="truncate">{refund.reason || '—'}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[refund.status] || 'bg-gray-100 text-gray-700'}`}>
                            {refund.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(refund.createdAt)}
                        </TableCell>
                        <TableCell>
                          {refund.status === 'INITIATED' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                disabled={updateMutation.isPending}
                                onClick={() => updateMutation.mutate({ id: refund.id, status: 'PROCESSED' })}
                              >
                                Mark Processed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                disabled={updateMutation.isPending}
                                onClick={() => updateMutation.mutate({ id: refund.id, status: 'FAILED' })}
                              >
                                Mark Failed
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => setPage(p)}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </ProtectedRoute>
  );
}

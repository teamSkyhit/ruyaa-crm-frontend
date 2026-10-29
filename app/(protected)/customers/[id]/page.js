'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, RefreshCw, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { customerAPI } from '@/lib/api';
import { format } from 'date-fns';

const formatCurrency = (v) => `₹${Number(v).toFixed(2)}`;
const formatDate = (v) => format(new Date(v), 'dd MMM yyyy, HH:mm');

const STATUS_BADGE = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-pink-100 text-pink-700',
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [notesInitialized, setNotesInitialized] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await customerAPI.get(id);
      if (!res.success) throw new Error(res.error || 'Failed to load customer');
      return res.data;
    },
  });

  const customer = data?.customer || data;

  if (customer && !notesInitialized) {
    setNotes(customer.notes || '');
    setNotesInitialized(true);
  }

  const notesMutation = useMutation({
    mutationFn: () => customerAPI.update(id, { notes }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Notes saved');
        qc.invalidateQueries({ queryKey: ['customer', id] });
      } else {
        toast.error(res.error || 'Failed to save notes');
      }
    },
    onError: () => toast.error('Failed to save notes'),
  });

  const orders = customer?.orders || [];

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/customers')} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Customers
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !customer ? (
          <p className="text-muted-foreground">Customer not found.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              {/* Profile card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-lg font-semibold">{customer.name || '—'}</p>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="break-all">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(customer.createdAt)}
                    </p>
                  )}
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    rows={5}
                    placeholder="Internal notes about this customer..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={2000}
                  />
                  <Button
                    size="sm"
                    onClick={() => notesMutation.mutate()}
                    disabled={notesMutation.isPending}
                  >
                    {notesMutation.isPending ? 'Saving...' : 'Save Notes'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Orders tab */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Orders</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6">No orders yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order) => (
                            <TableRow
                              key={order.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => router.push(`/orders/${order.id}`)}
                            >
                              <TableCell className="font-mono text-sm font-medium">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(order.createdAt)}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {formatCurrency(order.total || order.totalAmount || 0)}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                                  {order.status?.replace(/_/g, ' ')}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

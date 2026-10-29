'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { orderAPI, refundAPI } from '@/lib/api';
import { format } from 'date-fns';

const formatCurrency = (v) => `₹${Number(v).toFixed(2)}`;
const formatDate = (v) => format(new Date(v), 'dd MMM yyyy, HH:mm');

const PAYMENT_BADGE = {
  RAZORPAY: 'bg-blue-100 text-blue-700',
  COD: 'bg-gray-100 text-gray-700',
  CASH: 'bg-green-100 text-green-700',
  UPI: 'bg-purple-100 text-purple-700',
  CARD: 'bg-orange-100 text-orange-700',
};

const STATUS_BADGE = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-pink-100 text-pink-700',
};

const PAYMENT_STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-pink-100 text-pink-700',
};

const CHANNEL_BADGE = {
  POS: 'bg-amber-100 text-amber-700',
  ONLINE: 'bg-blue-100 text-blue-700',
};

const STATUS_TRANSITIONS = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  CANCELLED: [],
  DELIVERED: [],
  REFUNDED: [],
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [trackingInitialized, setTrackingInitialized] = useState(false);
  const [notesInitialized, setNotesInitialized] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await orderAPI.get(id);
      if (!res.success) throw new Error(res.error || 'Failed to load order');
      return res.data;
    },
    onSuccess: (data) => {
      const order = data?.order || data;
      if (!trackingInitialized) {
        setTrackingNumber(order.trackingNumber || '');
        setTrackingUrl(order.trackingUrl || '');
        setTrackingInitialized(true);
      }
      if (!notesInitialized) {
        setAdminNotes(order.adminNotes || '');
        setNotesInitialized(true);
      }
    },
  });

  const order = data?.order || data;

  // Initialize tracking/notes from order when loaded
  if (order && !trackingInitialized) {
    setTrackingNumber(order.trackingNumber || '');
    setTrackingUrl(order.trackingUrl || '');
    setTrackingInitialized(true);
  }
  if (order && !notesInitialized) {
    setAdminNotes(order.adminNotes || '');
    setNotesInitialized(true);
  }

  const trackingMutation = useMutation({
    mutationFn: () => orderAPI.updateStatus(id, { trackingNumber, trackingUrl }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Tracking info saved');
        qc.invalidateQueries({ queryKey: ['order', id] });
      } else {
        toast.error(res.error || 'Failed to save tracking');
      }
    },
    onError: () => toast.error('Failed to save tracking'),
  });

  const bookShipment = useMutation({
    mutationFn: () => orderAPI.bookShipment(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Shipment booked with Shiprocket');
        setTrackingInitialized(false);
        qc.invalidateQueries({ queryKey: ['order', id] });
      } else {
        toast.error(res.error || 'Shiprocket did not accept the shipment');
      }
    },
    onError: () => toast.error('Shiprocket did not accept the shipment'),
  });

  const refreshTracking = useMutation({
    mutationFn: () => orderAPI.refreshTracking(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Tracking updated from Shiprocket');
        setTrackingInitialized(false);
        qc.invalidateQueries({ queryKey: ['order', id] });
      } else {
        toast.error(res.error || 'Shiprocket tracking could not be read');
      }
    },
    onError: () => toast.error('Shiprocket tracking could not be read'),
  });

  const notesMutation = useMutation({
    mutationFn: () => orderAPI.addAdminNotes(id, adminNotes),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Notes saved');
        qc.invalidateQueries({ queryKey: ['order', id] });
      } else {
        toast.error(res.error || 'Failed to save notes');
      }
    },
    onError: () => toast.error('Failed to save notes'),
  });

  const statusMutation = useMutation({
    mutationFn: () => orderAPI.updateStatus(id, { status: newStatus }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
        setNewStatus('');
        qc.invalidateQueries({ queryKey: ['order', id] });
        qc.invalidateQueries({ queryKey: ['orders'] });
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    },
    onError: () => toast.error('Failed to update status'),
  });

  const refundMutation = useMutation({
    mutationFn: () => refundAPI.create({
      orderId: order.id,
      amount: Number(refundAmount),
      reason: refundReason,
    }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Refund initiated');
        setRefundOpen(false);
        setRefundReason('');
        qc.invalidateQueries({ queryKey: ['order', id] });
        qc.invalidateQueries({ queryKey: ['refunds'] });
      } else {
        toast.error(res.error || 'Failed to create refund');
      }
    },
    onError: () => toast.error('Failed to create refund'),
  });

  const openRefundDialog = () => {
    setRefundAmount(String(order?.total || order?.totalAmount || ''));
    setRefundReason('');
    setRefundOpen(true);
  };

  const transitions = order ? (STATUS_TRANSITIONS[order.status] || []) : [];
  const canRefund = order?.paymentStatus === 'PAID' && order?.status !== 'REFUNDED';

  const items = order?.items || order?.orderItems || [];
  const subtotal = order?.subtotal || items.reduce((s, i) => s + (i.price || i.unitPrice || 0) * (i.quantity || i.qty || 1), 0);
  const shippingFee = order?.shippingFee || order?.shipping || 0;
  const total = order?.total || order?.totalAmount || 0;
  const shippingAddress = order?.shippingAddress || order?.address;

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/orders')} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Orders
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !order ? (
          <p className="text-muted-foreground">Order not found.</p>
        ) : (
          <div className="space-y-6">
            {/* Header card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="font-mono text-xl">{order.orderNumber}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_BADGE[order.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {order.paymentStatus}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_BADGE[order.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                      {order.paymentMethod}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CHANNEL_BADGE[order.channel] || 'bg-gray-100 text-gray-700'}`}>
                      {order.channel}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Order items */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Items</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => {
                          const unitPrice = item.price || item.unitPrice || 0;
                          const qty = item.quantity || item.qty || 1;
                          return (
                            <TableRow key={item.id || idx}>
                              <TableCell className="font-medium text-sm">
                                {item.product?.name || item.productName || item.name || '—'}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {item.product?.sku || item.sku || '—'}
                              </TableCell>
                              <TableCell className="text-right text-sm">{qty}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(unitPrice)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{formatCurrency(unitPrice * qty)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="p-4 border-t space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="flex items-center gap-2">
                          {order.freeShippingApplied ? (
                            <>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">FREE</span>
                              <span className="line-through text-muted-foreground">{formatCurrency(shippingFee)}</span>
                            </>
                          ) : (
                            formatCurrency(shippingFee)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tracking */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tracking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tracking-number">Tracking Number</Label>
                      <Input
                        id="tracking-number"
                        placeholder="e.g. 1Z999AA10123456784"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tracking-url">Tracking URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="tracking-url"
                          placeholder="https://tracking.example.com/..."
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                        />
                        {trackingUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(trackingUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {order?.courierStatus && (
                      <p className="text-sm text-muted-foreground">Courier status: {order.courierStatus}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!order?.trackingNumber && ['CONFIRMED', 'PROCESSING'].includes(order?.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bookShipment.mutate()}
                          disabled={bookShipment.isPending}
                        >
                          {bookShipment.isPending ? 'Booking...' : 'Book with Shiprocket'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => trackingMutation.mutate()}
                        disabled={trackingMutation.isPending}
                      >
                        {trackingMutation.isPending ? 'Saving...' : 'Save Tracking'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshTracking.mutate()}
                        disabled={refreshTracking.isPending || !order?.trackingNumber}
                      >
                        {refreshTracking.isPending ? 'Checking...' : 'Refresh from Shiprocket'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Notes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Admin Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      rows={4}
                      placeholder="Internal notes (not visible to customer)..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
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

              <div className="space-y-6">
                {/* Customer */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-medium">{order.customer?.name || order.customerName || '—'}</p>
                    {(order.customer?.email || order.customerEmail) && (
                      <p className="text-muted-foreground">{order.customer?.email || order.customerEmail}</p>
                    )}
                    {(order.customer?.phone || order.customerPhone) && (
                      <p className="text-muted-foreground">{order.customer?.phone || order.customerPhone}</p>
                    )}
                    {order.customer?.id && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => router.push(`/customers/${order.customer.id}`)}
                      >
                        View profile →
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Shipping address */}
                {shippingAddress && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Shipping Address</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-0.5">
                      {shippingAddress.name && <p className="font-medium text-foreground">{shippingAddress.name}</p>}
                      {shippingAddress.line1 && <p>{shippingAddress.line1}</p>}
                      {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                      {(shippingAddress.city || shippingAddress.state) && (
                        <p>{[shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ')}</p>
                      )}
                      {shippingAddress.pincode && <p>{shippingAddress.pincode}</p>}
                      {shippingAddress.country && <p>{shippingAddress.country}</p>}
                      {shippingAddress.phone && <p>{shippingAddress.phone}</p>}
                    </CardContent>
                  </Card>
                )}

                {/* Status update */}
                {transitions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Update Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {transitions.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!newStatus || statusMutation.isPending}
                        onClick={() => statusMutation.mutate()}
                      >
                        {statusMutation.isPending ? 'Updating...' : 'Update Status'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Refund */}
                {canRefund && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Refund</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={openRefundDialog}
                      >
                        Issue Refund
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refund dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Amount (₹)</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Textarea
                id="refund-reason"
                rows={3}
                placeholder="Reason for refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!refundAmount || !refundReason || refundMutation.isPending}
              onClick={() => refundMutation.mutate()}
            >
              {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

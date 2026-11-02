'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Search, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall, productAPI, customerAPI } from '@/lib/api';

const formatCurrency = (v) => `₹${Number(v || 0).toFixed(2)}`;

const EMPTY_ITEM = { productId: '', variantId: '', quantity: 1, price: '0.00', productName: '' };

const EMPTY_ADDRESS = { line1: '', line2: '', city: '', state: '', pincode: '' };

export default function POSPage() {
  const router = useRouter();

  // Customer
  const [emailInput, setEmailInput] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);

  // Address
  const [address, setAddress] = useState(EMPTY_ADDRESS);

  // Items
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  // Order
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [createdOrder, setCreatedOrder] = useState(null);

  // Products list
  const { data: productsData } = useQuery({
    queryKey: ['products-pos'],
    queryFn: async () => {
      const res = await productAPI.list({ limit: 100, isActive: true });
      if (!res.success) throw new Error(res.error || 'Failed to load products');
      return res.data;
    },
  });
  const products = productsData || [];

  const lookupCustomer = useCallback(async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setLookingUpCustomer(true);
    try {
      const res = await customerAPI.list({ search: email, limit: 5 });
      const list = res?.data?.customers || res?.data || [];
      const match = list.find((c) => c.email?.toLowerCase() === email);
      if (match) {
        setCustomerEmail(match.email);
        setCustomerName(match.name || '');
        setCustomerPhone(match.phone || '');
        toast.success('Customer found');
      } else {
        setCustomerEmail(email);
        toast.info('New customer — fill in their details');
      }
    } catch {
      setCustomerEmail(email);
    } finally {
      setLookingUpCustomer(false);
    }
  }, [emailInput]);

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };

      // Auto-fill price when product changes
      if (field === 'productId') {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[idx].productName = product.name;
          next[idx].price = String(product.price || product.basePrice || '0.00');
          next[idx].variantId = '';
        }
      }
      return next;
    });
  };

  const lineSubtotal = (item) =>
    (parseFloat(item.price || 0) * parseInt(item.quantity || 1, 10)).toFixed(2);

  const orderTotal = items.reduce(
    (sum, item) => sum + parseFloat(lineSubtotal(item)),
    0
  ).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerEmail.trim()) {
      toast.error('Customer email is required');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Customer phone is required');
      return;
    }
    if (!address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
      toast.error('Complete shipping address is required');
      return;
    }
    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) {
      toast.error('Add at least one product');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        shippingAddress: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          line1: address.line1.trim(),
          line2: address.line2.trim() || undefined,
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode.trim(),
        },
        items: validItems.map((i) => ({
          productId: i.productId,
          ...(i.variantId ? { variantId: i.variantId } : {}),
          quantity: parseInt(i.quantity, 10) || 1,
          price: parseFloat(i.price || 0),
        })),
        paymentMethod,
        source: 'POS',
        status: 'CONFIRMED',
        notes: notes.trim() || undefined,
      };

      const res = await apiCall('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to create order');
        return;
      }

      const orderData = res.data?.order || res.data;
      setCreatedOrder(orderData);
      toast.success(`Order ${orderData.orderNumber} created`);
    } catch (err) {
      toast.error(err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCreatedOrder(null);
    setEmailInput('');
    setCustomerEmail('');
    setCustomerName('');
    setCustomerPhone('');
    setAddress(EMPTY_ADDRESS);
    setItems([{ ...EMPTY_ITEM }]);
    setPaymentMethod('COD');
    setNotes('');
  };

  if (createdOrder) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'user']}>
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle className="h-14 w-14 text-green-600" />
            <h2 className="text-2xl font-semibold">Order Created</h2>
            <p className="text-muted-foreground">
              Order{' '}
              <span className="font-mono font-semibold text-foreground">
                {createdOrder.orderNumber}
              </span>{' '}
              was created successfully.
            </p>
            {createdOrder.total && (
              <p className="text-lg font-semibold">{formatCurrency(createdOrder.total)}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push(`/orders/${createdOrder.id}`)}
              disabled={!createdOrder.id}
            >
              View Order
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Create Another
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Manual Order</h1>
          <p className="text-sm text-muted-foreground mt-1">Create an order on behalf of a customer</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Customer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="email-lookup">Email</Label>
                    <Input
                      id="email-lookup"
                      type="email"
                      placeholder="customer@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), lookupCustomer())}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={lookupCustomer}
                      disabled={lookingUpCustomer || !emailInput.trim()}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      {lookingUpCustomer ? 'Looking up...' : 'Look up'}
                    </Button>
                  </div>
                </div>

                {customerEmail && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="customer-name">Full Name *</Label>
                      <Input
                        id="customer-name"
                        placeholder="Jane Doe"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customer-phone">Phone *</Label>
                      <Input
                        id="customer-phone"
                        placeholder="+91 98765 43210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping address */}
            {customerEmail && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-line1">Address Line 1 *</Label>
                    <Input
                      id="addr-line1"
                      placeholder="House / Flat / Building"
                      value={address.line1}
                      onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-line2">Address Line 2</Label>
                    <Input
                      id="addr-line2"
                      placeholder="Area / Locality (optional)"
                      value={address.line2}
                      onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="addr-city">City *</Label>
                      <Input
                        id="addr-city"
                        placeholder="Bengaluru"
                        value={address.city}
                        onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="addr-state">State *</Label>
                      <Input
                        id="addr-state"
                        placeholder="Karnataka"
                        value={address.state}
                        onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="addr-pincode">Pincode *</Label>
                      <Input
                        id="addr-pincode"
                        placeholder="560001"
                        value={address.pincode}
                        onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products */}
            {customerEmail && (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Products</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Unit Price (₹)</TableHead>
                        <TableHead className="text-right w-28">Subtotal</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={(v) => updateItem(idx, 'productId', v)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select product..." />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItem(idx, 'price', e.target.value)}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(lineSubtotal(item))}
                          </TableCell>
                          <TableCell>
                            {items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeItem(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right column */}
          {customerEmail && (
            <div className="space-y-6">
              {/* Payment method */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="COD" id="pm-cod" />
                      <Label htmlFor="pm-cod" className="cursor-pointer font-medium">
                        Cash on Delivery
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="RAZORPAY" id="pm-prepaid" />
                      <Label htmlFor="pm-prepaid" className="cursor-pointer font-medium">
                        Prepaid (Razorpay)
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={3}
                    placeholder="Internal notes or customer instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={1000}
                  />
                </CardContent>
              </Card>

              {/* Order total */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{items.filter((i) => i.productId).length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(orderTotal)}</span>
                  </div>
                  <Button
                    type="submit"
                    className="w-full mt-2 bg-[#4A5C38] hover:bg-[#3d4d2e] text-white"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Order'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </form>
    </ProtectedRoute>
  );
}

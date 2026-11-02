'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Store, Truck, Bell, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { siteSettingsAPI, systemConfigAPI } from '@/lib/api';

function SettingsContent() {
  const qc = useQueryClient();

  const [storeForm, setStoreForm] = useState({
    brandName: '', contactEmail: '', contactPhone: '', address: '',
  });

  const [shippingForm, setShippingForm] = useState({
    shippingCharge: '', freeShippingThreshold: '', estimatedDeliveryDays: '',
  });

  const [notifForm, setNotifForm] = useState({
    from_email: '',
    whatsapp_api_key: '',
  });
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  const [razorpayKeyId, setRazorpayKeyId] = useState('');

  const { data: siteData, isLoading: siteLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await siteSettingsAPI.get();
      if (!res.success) throw new Error(res.error || 'Failed');
      return res.data;
    },
  });

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const res = await systemConfigAPI.list();
      if (!res.success) throw new Error(res.error || 'Failed');
      return res.data || [];
    },
  });

  useEffect(() => {
    if (siteData) {
      setStoreForm({
        brandName: siteData.brandName || '',
        contactEmail: siteData.contactEmail || '',
        contactPhone: siteData.contactPhone || '',
        address: siteData.address || '',
      });
      setShippingForm({
        shippingCharge: siteData.shippingCharge?.toString() || '',
        freeShippingThreshold: siteData.freeShippingThreshold?.toString() || '',
        estimatedDeliveryDays: siteData.estimatedDeliveryDays || '',
      });
    }
  }, [siteData]);

  useEffect(() => {
    if (configData) {
      const byKey = Object.fromEntries(configData.map((r) => [r.key, r.value]));
      setNotifForm({ from_email: byKey.from_email || '', whatsapp_api_key: byKey.whatsapp_api_key || '' });
      setWhatsappEnabled(!!byKey.whatsapp_api_key && byKey.whatsapp_api_key !== '••••••••');
      setRazorpayKeyId(byKey.razorpay_key_id || '');
    }
  }, [configData]);

  const siteMutation = useMutation({
    mutationFn: (payload) => siteSettingsAPI.update(payload),
    onSuccess: (res) => {
      if (res.success) { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['site-settings'] }); }
      else toast.error(res.error || 'Failed to save');
    },
    onError: () => toast.error('Failed to save'),
  });

  const saveSystemKey = async (key, value) => {
    const res = await systemConfigAPI.set(key, value);
    if (res.success) { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['system-config'] }); }
    else toast.error(res.error || 'Failed to save');
  };

  const isLoading = siteLoading || configLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-[#4A5C38]" />
            Store Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Store Name</Label>
            <Input value={storeForm.brandName} onChange={(e) => setStoreForm((p) => ({ ...p, brandName: e.target.value }))} placeholder="Ruyaa Essentials" />
          </div>
          <div className="space-y-2">
            <Label>Store Email</Label>
            <Input type="email" value={storeForm.contactEmail} onChange={(e) => setStoreForm((p) => ({ ...p, contactEmail: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Store Phone</Label>
            <Input value={storeForm.contactPhone} onChange={(e) => setStoreForm((p) => ({ ...p, contactPhone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Store Address</Label>
            <Textarea value={storeForm.address} onChange={(e) => setStoreForm((p) => ({ ...p, address: e.target.value }))} rows={3} />
          </div>
          <Button
            className="bg-[#4A5C38] hover:bg-[#3a4a2c]"
            onClick={() => siteMutation.mutate(storeForm)}
            disabled={siteMutation.isPending}
          >
            {siteMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Store Info
          </Button>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-[#4A5C38]" />
            Shipping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Shipping Cost (₹)</Label>
            <Input type="number" min="0" value={shippingForm.shippingCharge} onChange={(e) => setShippingForm((p) => ({ ...p, shippingCharge: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Free Shipping Threshold (₹)</Label>
            <p className="text-xs text-muted-foreground">Orders above this amount qualify for free shipping</p>
            <Input type="number" min="0" value={shippingForm.freeShippingThreshold} onChange={(e) => setShippingForm((p) => ({ ...p, freeShippingThreshold: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Estimated Delivery Days</Label>
            <Input value={shippingForm.estimatedDeliveryDays} placeholder="5-7 days" onChange={(e) => setShippingForm((p) => ({ ...p, estimatedDeliveryDays: e.target.value }))} />
          </div>
          <Button
            className="bg-[#4A5C38] hover:bg-[#3a4a2c]"
            onClick={() => siteMutation.mutate(shippingForm)}
            disabled={siteMutation.isPending}
          >
            Save Shipping
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-[#4A5C38]" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Admin Email for Alerts</Label>
            <div className="flex gap-2">
              <Input value={notifForm.from_email} onChange={(e) => setNotifForm((p) => ({ ...p, from_email: e.target.value }))} placeholder="admin@example.com" />
              <Button variant="outline" onClick={() => saveSystemKey('from_email', notifForm.from_email)}>Save</Button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">WhatsApp Alerts</p>
              <p className="text-xs text-muted-foreground">Send order updates via WhatsApp (requires API key in System Config)</p>
            </div>
            <Switch
              checked={whatsappEnabled}
              onCheckedChange={(checked) => {
                setWhatsappEnabled(checked);
                if (!checked) saveSystemKey('whatsapp_api_key', '');
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Razorpay */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-[#4A5C38]" />
            Razorpay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Razorpay Key ID</Label>
            <p className="text-xs text-muted-foreground">Read-only. Update keys in System Config.</p>
            <Input value={razorpayKeyId} readOnly className="bg-muted font-mono text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">
            To update Razorpay keys or other secrets, go to{' '}
            <a href="/system-config" className="underline text-[#4A5C38]">System Config</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

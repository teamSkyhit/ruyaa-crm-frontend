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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { siteSettingsAPI } from '@/lib/api';
import PictureUpload from '@/components/picture-upload';

export default function SiteSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    // Branding
    brandName: '', tagline: '', logoUrl: '', faviconUrl: '',
    // Contact
    contactEmail: '', contactPhone: '', whatsappNumber: '', address: '',
    // Social
    instagramUrl: '', facebookUrl: '', youtubeUrl: '', pinterestUrl: '',
    // Homepage
    heroTitle: '', heroSubtitle: '', heroCTAText: '', aboutTitle: '', aboutText: '',
    announcementBarEnabled: false, announcementBarText: '', announcementBarLink: '',
    // Shipping
    shippingCharge: '', freeShippingThreshold: '', estimatedDeliveryDays: '',
    codEnabled: false, orderConfirmationEmailEnabled: false,
    // SEO
    defaultMetaTitle: '', defaultMetaDescription: '', googleAnalyticsId: '', googleSearchConsoleVerification: '',
    // Policies
    returnPolicy: '', privacyPolicy: '', termsOfService: '', shippingPolicy: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await siteSettingsAPI.get();
      if (!res.success) throw new Error(res.error || 'Failed to load settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm((prev) => ({ ...prev, ...data }));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload) => siteSettingsAPI.update(payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Settings saved');
        qc.invalidateQueries({ queryKey: ['site-settings'] });
      } else {
        toast.error(res.error || 'Failed to save settings');
      }
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const saveTab = (fields) => {
    const payload = {};
    fields.forEach((f) => { payload[f] = form[f]; });
    mutation.mutate(payload);
  };

  const Field = ({ id, label, value, onChange, type = 'text', placeholder }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );

  const TextareaField = ({ id, label, value, onChange, rows = 5, placeholder }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );

  const SwitchField = ({ id, label, checked, onChange, description }) => (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <Label htmlFor={id} className="cursor-pointer">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch id={id} checked={!!checked} onCheckedChange={onChange} />
    </div>
  );

  const SaveButton = ({ fields }) => (
    <div className="flex justify-end pt-4">
      <Button onClick={() => saveTab(fields)} disabled={mutation.isPending}>
        {mutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Changes
      </Button>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Settings className="h-6 w-6" /> Site Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your store&apos;s branding, contact info, and policies
          </p>
        </div>

        {isLoading ? (
          <Card><CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent></Card>
        ) : (
          <Tabs defaultValue="branding">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="contact">Contact &amp; Social</TabsTrigger>
              <TabsTrigger value="homepage">Homepage</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <Card>
                <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Field id="brandName" label="Brand Name" value={form.brandName} onChange={(v) => set('brandName', v)} />
                  <Field id="tagline" label="Tagline" value={form.tagline} onChange={(v) => set('tagline', v)} />
                  <PictureUpload folder="brand" label="Logo" optional value={form.logoUrl} onChange={(logoUrl) => set('logoUrl', logoUrl)} />
                  <PictureUpload folder="brand" label="Favicon" optional value={form.faviconUrl} onChange={(faviconUrl) => set('faviconUrl', faviconUrl)} />
                  <SaveButton fields={['brandName', 'tagline', 'logoUrl', 'faviconUrl']} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader><CardTitle>Contact &amp; Social</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field id="contactEmail" label="Contact Email" type="email" value={form.contactEmail} onChange={(v) => set('contactEmail', v)} />
                    <Field id="contactPhone" label="Contact Phone" value={form.contactPhone} onChange={(v) => set('contactPhone', v)} />
                    <Field id="whatsappNumber" label="WhatsApp Number" value={form.whatsappNumber} onChange={(v) => set('whatsappNumber', v)} />
                  </div>
                  <Field id="address" label="Address" value={form.address} onChange={(v) => set('address', v)} />
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-3">Social Links</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field id="instagramUrl" label="Instagram" value={form.instagramUrl} onChange={(v) => set('instagramUrl', v)} placeholder="https://instagram.com/..." />
                      <Field id="facebookUrl" label="Facebook" value={form.facebookUrl} onChange={(v) => set('facebookUrl', v)} placeholder="https://facebook.com/..." />
                      <Field id="youtubeUrl" label="YouTube" value={form.youtubeUrl} onChange={(v) => set('youtubeUrl', v)} placeholder="https://youtube.com/..." />
                      <Field id="pinterestUrl" label="Pinterest" value={form.pinterestUrl} onChange={(v) => set('pinterestUrl', v)} placeholder="https://pinterest.com/..." />
                    </div>
                  </div>
                  <SaveButton fields={['contactEmail', 'contactPhone', 'whatsappNumber', 'address', 'instagramUrl', 'facebookUrl', 'youtubeUrl', 'pinterestUrl']} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="homepage">
              <Card>
                <CardHeader><CardTitle>Homepage</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field id="heroTitle" label="Hero Title" value={form.heroTitle} onChange={(v) => set('heroTitle', v)} />
                    <Field id="heroSubtitle" label="Hero Subtitle" value={form.heroSubtitle} onChange={(v) => set('heroSubtitle', v)} />
                    <Field id="heroCTAText" label="Hero CTA Text" value={form.heroCTAText} onChange={(v) => set('heroCTAText', v)} />
                  </div>
                  <Field id="aboutTitle" label="About Section Title" value={form.aboutTitle} onChange={(v) => set('aboutTitle', v)} />
                  <TextareaField id="aboutText" label="About Section Text" value={form.aboutText} onChange={(v) => set('aboutText', v)} rows={4} />
                  <div className="pt-2 border-t space-y-3">
                    <p className="text-sm font-medium">Announcement Bar</p>
                    <SwitchField id="announcementBarEnabled" label="Enable Announcement Bar" checked={form.announcementBarEnabled} onChange={(v) => set('announcementBarEnabled', v)} />
                    <Field id="announcementBarText" label="Announcement Text" value={form.announcementBarText} onChange={(v) => set('announcementBarText', v)} />
                    <Field id="announcementBarLink" label="Announcement Link" value={form.announcementBarLink} onChange={(v) => set('announcementBarLink', v)} placeholder="https://..." />
                  </div>
                  <SaveButton fields={['heroTitle', 'heroSubtitle', 'heroCTAText', 'aboutTitle', 'aboutText', 'announcementBarEnabled', 'announcementBarText', 'announcementBarLink']} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipping">
              <Card>
                <CardHeader><CardTitle>Shipping &amp; Orders</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field id="shippingCharge" label="Shipping Charge (₹)" type="number" value={form.shippingCharge} onChange={(v) => set('shippingCharge', v)} />
                    <Field id="freeShippingThreshold" label="Free Shipping Above (₹)" type="number" value={form.freeShippingThreshold} onChange={(v) => set('freeShippingThreshold', v)} />
                    <Field id="estimatedDeliveryDays" label="Estimated Delivery (days)" type="number" value={form.estimatedDeliveryDays} onChange={(v) => set('estimatedDeliveryDays', v)} />
                  </div>
                  <SwitchField id="codEnabled" label="Cash on Delivery (COD)" description="Allow customers to pay on delivery" checked={form.codEnabled} onChange={(v) => set('codEnabled', v)} />
                  <SwitchField id="orderConfirmationEmailEnabled" label="Order Confirmation Email" description="Send email to customer when order is placed" checked={form.orderConfirmationEmailEnabled} onChange={(v) => set('orderConfirmationEmailEnabled', v)} />
                  <SaveButton fields={['shippingCharge', 'freeShippingThreshold', 'estimatedDeliveryDays', 'codEnabled', 'orderConfirmationEmailEnabled']} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo">
              <Card>
                <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Field id="defaultMetaTitle" label="Default Meta Title" value={form.defaultMetaTitle} onChange={(v) => set('defaultMetaTitle', v)} />
                  <TextareaField id="defaultMetaDescription" label="Default Meta Description" value={form.defaultMetaDescription} onChange={(v) => set('defaultMetaDescription', v)} rows={3} />
                  <Field id="googleAnalyticsId" label="Google Analytics ID" value={form.googleAnalyticsId} onChange={(v) => set('googleAnalyticsId', v)} placeholder="G-XXXXXXXXXX" />
                  <Field id="googleSearchConsoleVerification" label="Google Search Console Verification" value={form.googleSearchConsoleVerification} onChange={(v) => set('googleSearchConsoleVerification', v)} />
                  <SaveButton fields={['defaultMetaTitle', 'defaultMetaDescription', 'googleAnalyticsId', 'googleSearchConsoleVerification']} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies">
              <Card>
                <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <TextareaField id="returnPolicy" label="Return Policy" value={form.returnPolicy} onChange={(v) => set('returnPolicy', v)} rows={6} />
                  <TextareaField id="privacyPolicy" label="Privacy Policy" value={form.privacyPolicy} onChange={(v) => set('privacyPolicy', v)} rows={6} />
                  <TextareaField id="termsOfService" label="Terms of Service" value={form.termsOfService} onChange={(v) => set('termsOfService', v)} rows={6} />
                  <TextareaField id="shippingPolicy" label="Shipping Policy" value={form.shippingPolicy} onChange={(v) => set('shippingPolicy', v)} rows={6} />
                  <SaveButton fields={['returnPolicy', 'privacyPolicy', 'termsOfService', 'shippingPolicy']} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ProtectedRoute>
  );
}

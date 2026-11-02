'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { emailTemplateAPI } from '@/lib/api';
import Link from 'next/link';

function NewTemplateContent() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    key: '',
    subject: '',
    bodyHtml: '',
    isActive: true,
  });

  const mutation = useMutation({
    mutationFn: (payload) => emailTemplateAPI.create(payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Template created');
        qc.invalidateQueries({ queryKey: ['email-templates'] });
        router.push('/email-templates');
      } else {
        toast.error(res.error || 'Failed to create template');
      }
    },
    onError: () => toast.error('Failed to create template'),
  });

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Template name is required');
    if (!form.key.trim()) return toast.error('Template key is required');
    if (!form.subject.trim()) return toast.error('Subject is required');
    if (!form.bodyHtml.trim()) return toast.error('Body is required');
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/email-templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Email Template</h1>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Order Confirmation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              value={form.key}
              onChange={(e) => set('key', e.target.value.replace(/\s+/g, '_').toLowerCase())}
              placeholder="order_confirmation"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Unique identifier used in code. Use snake_case (e.g. order_confirmation).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Your order #{{orderNumber}} has been confirmed!"
            />
            <p className="text-xs text-muted-foreground">Use {'{{variableName}}'} syntax for dynamic values.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyHtml">Body (HTML)</Label>
            <Textarea
              id="bodyHtml"
              value={form.bodyHtml}
              onChange={(e) => set('bodyHtml', e.target.value)}
              rows={16}
              className="font-mono text-sm"
              placeholder={'<html>\n  <body>\n    <h1>Hello {{customerName}},</h1>\n    <p>Your order #{{orderNumber}} is confirmed!</p>\n  </body>\n</html>'}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive templates will not be sent</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
          </div>

          <div className="flex gap-3">
            <Button
              className="bg-[#4A5C38] hover:bg-[#3a4a2c]"
              onClick={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Template
            </Button>
            <Link href="/email-templates">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewEmailTemplatePage() {
  return (
    <ProtectedRoute>
      <NewTemplateContent />
    </ProtectedRoute>
  );
}

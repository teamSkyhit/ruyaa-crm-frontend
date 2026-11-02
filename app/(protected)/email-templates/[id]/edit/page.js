'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { emailTemplateAPI } from '@/lib/api';
import Link from 'next/link';

function EditTemplateContent() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    subject: '',
    bodyHtml: '',
    isActive: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const res = await emailTemplateAPI.get(id);
      if (!res.success) throw new Error(res.error || 'Failed to load template');
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || '',
        subject: data.subject || '',
        bodyHtml: data.bodyHtml || '',
        isActive: data.isActive ?? true,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload) => emailTemplateAPI.update(id, payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Template saved');
        qc.invalidateQueries({ queryKey: ['email-templates'] });
        qc.invalidateQueries({ queryKey: ['email-template', id] });
        router.push('/email-templates');
      } else {
        toast.error(res.error || 'Failed to save');
      }
    },
    onError: () => toast.error('Failed to save template'),
  });

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const variables = data?.variables || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/email-templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Template</h1>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Input id="key" value={data?.key || ''} readOnly className="bg-muted font-mono text-sm" />
            <p className="text-xs text-muted-foreground">The key is read-only and used to identify this template in code.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Your order #{{orderNumber}} is confirmed!"
            />
            <p className="text-xs text-muted-foreground">Use {'{{variableName}}'} syntax for dynamic values.</p>
          </div>

          {variables.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground">Available Variables</Label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-xs">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bodyHtml">Body (HTML)</Label>
            <Textarea
              id="bodyHtml"
              value={form.bodyHtml}
              onChange={(e) => set('bodyHtml', e.target.value)}
              rows={16}
              className="font-mono text-sm"
              placeholder="<html>...</html>"
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
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Template
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

export default function EditEmailTemplatePage() {
  return (
    <ProtectedRoute>
      <EditTemplateContent />
    </ProtectedRoute>
  );
}

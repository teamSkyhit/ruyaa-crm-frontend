'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Edit2, Check, X, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { systemConfigAPI } from '@/lib/api';

const isSensitive = (key) =>
  /secret|key|password|token|api_|apikey|private/i.test(key);

const KEY_LABELS = {
  razorpay_key_id: 'Razorpay Key ID',
  razorpay_key_secret: 'Razorpay Key Secret',
  razorpay_webhook_secret: 'Razorpay webhook secret',
  resend_api_key: 'Resend API key',
  from_email: 'Sender email address',
  order_number_seq: 'Next order number',
  public_api_key: 'Storefront API key',
  shiprocket_email: 'Shiprocket email',
  shiprocket_password: 'Shiprocket password',
  shiprocket_pickup_pincode: 'Shiprocket pickup pincode',
  shiprocket_pickup_location: 'Shiprocket pickup location',
  shiprocket_channel_id: 'Shiprocket channel id',
  shiprocket_webhook_token: 'Shiprocket webhook token',
  whatsapp_api_key: 'WhatsApp API key',
  whatsapp_base_url: 'WhatsApp API base URL',
};

export default function SystemConfigPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // { key, value }
  const [editValue, setEditValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const res = await systemConfigAPI.list();
      if (!res.success) throw new Error(res.error || 'Failed to load config');
      return res.data || [];
    },
  });

  const configs = data || [];

  const mutation = useMutation({
    mutationFn: ({ key, value }) => systemConfigAPI.set(key, value),
    onSuccess: (res, { key }) => {
      if (res.success) {
        toast.success(`Config "${key}" updated`);
        setEditing(null);
        qc.invalidateQueries({ queryKey: ['system-config'] });
      } else {
        toast.error(res.error || 'Failed to update config');
      }
    },
    onError: () => toast.error('Failed to update config'),
  });

  const startEdit = (cfg) => {
    setEditing(cfg.key);
    const masked = isSensitive(cfg.key) && cfg.value === '••••••••';
    setEditValue(masked ? '' : (cfg.value ?? ''));
  };

  const cancelEdit = () => { setEditing(null); setEditValue(''); };

  const saveEdit = (key) => {
    mutation.mutate({ key, value: editValue });
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">System Config</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Low-level key-value configuration for the backend
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 pt-4 pb-4">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Warning:</span> These are sensitive credentials and system parameters. Changes take effect immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Configuration Keys
              <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['system-config'] })} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : configs.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                No configuration keys found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((cfg) => {
                      const sensitive = isSensitive(cfg.key);
                      const isEditingThis = editing === cfg.key;
                      return (
                        <TableRow key={cfg.key}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              {cfg.key}
                              {sensitive && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  sensitive
                                </Badge>
                              )}
                            </div>
                            {KEY_LABELS[cfg.key] && (
                              <div className="text-xs text-muted-foreground font-sans mt-0.5">{KEY_LABELS[cfg.key]}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {isEditingThis ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(cfg.key);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {sensitive ? '••••••••' : (cfg.value ?? <em className="opacity-50">empty</em>)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(cfg.key)} disabled={mutation.isPending}>
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => startEdit(cfg)}>
                                <Edit2 className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

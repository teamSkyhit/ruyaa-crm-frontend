'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Mail, Download, RefreshCw, ToggleLeft, ToggleRight, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { newsletterAPI } from '@/lib/api';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
});

export default function NewsletterPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [broadcast, setBroadcast] = useState({ subject: '', html: '' });
  const [broadcastResult, setBroadcastResult] = useState(null);

  const broadcastMutation = useMutation({
    mutationFn: () => newsletterAPI.broadcast(broadcast.subject, broadcast.html),
    onSuccess: (res) => {
      if (res.success) {
        setBroadcastResult(res.data);
        toast.success(`Sent to ${res.data.sent} subscribers`);
        setBroadcast({ subject: '', html: '' });
      } else {
        toast.error(res.error || 'Broadcast failed');
      }
    },
    onError: (e) => toast.error(e.message || 'Broadcast failed'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['newsletter', { page }],
    queryFn: async () => {
      const res = await newsletterAPI.list({ page, limit: 25 });
      if (!res.success) throw new Error(res.error || 'Failed to load subscribers');
      return res.data;
    },
  });

  const subscribers = data?.subscribers || data?.data || [];
  const totalPages = data?.meta?.pages || data?.pagination?.pages || 1;
  const total = data?.meta?.total || data?.pagination?.total || 0;

  const toggleMutation = useMutation({
    mutationFn: (id) => newsletterAPI.toggleSubscriber(id),
    onSuccess: (res) => {
      if (!res.success) toast.error(res.error || 'Failed to toggle subscriber');
      qc.invalidateQueries({ queryKey: ['newsletter'] });
    },
    onError: () => toast.error('Failed to toggle subscriber'),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await newsletterAPI.exportCSV();
      if (!res.success && !res._raw) throw new Error(res.error || 'Export failed');
      const csv = res._raw ? res.data : res.data;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Newsletter</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} subscriber{total !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Subscribers
              <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['newsletter'] })} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subscribers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Mail className="h-10 w-10" />
                <p className="text-sm">No subscribers yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead className="w-24">Toggle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {sub.source || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.isActive ? 'default' : 'secondary'}>
                            {sub.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(sub.createdAt || sub.subscribedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate(sub.id)}
                            disabled={toggleMutation.isPending}
                            className="gap-1"
                          >
                            {sub.isActive ? (
                              <><ToggleRight className="h-4 w-4 text-green-600" /> Deactivate</>
                            ) : (
                              <><ToggleLeft className="h-4 w-4 text-muted-foreground" /> Activate</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" />
              Send Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {broadcastResult && (
              <div className="text-sm p-3 bg-green-50 text-green-700 rounded border border-green-200">
                Sent to <strong>{broadcastResult.sent}</strong> subscribers.
                {broadcastResult.failed > 0 && ` ${broadcastResult.failed} failed.`}
              </div>
            )}
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input
                value={broadcast.subject}
                onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })}
                placeholder="e.g. New Product Launch — Ruyaa Essentials"
              />
            </div>
            <div className="space-y-1">
              <Label>HTML Body *</Label>
              <Textarea
                value={broadcast.html}
                onChange={(e) => setBroadcast({ ...broadcast, html: e.target.value })}
                placeholder="Paste your HTML email body here…"
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            <Button
              disabled={!broadcast.subject || !broadcast.html || broadcastMutation.isPending}
              onClick={() => broadcastMutation.mutate()}
            >
              {broadcastMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send to {total} active subscribers</>
              )}
            </Button>
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
                  <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">{p}</PaginationLink>
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

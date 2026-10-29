'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { MessageSquare, Phone, Mail, Package, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { enquiryAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

const STATUS_CONFIG = {
  NEW: { label: 'New', variant: 'default', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  CONTACTED: { label: 'Contacted', variant: 'secondary', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  CLOSED: { label: 'Closed', variant: 'outline', className: '' },
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function EnquiriesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', { page, statusFilter }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await enquiryAPI.list(params);
      if (!res.success) throw new Error(res.error || 'Failed to load enquiries');
      return res.data;
    },
  });

  const enquiries = data?.enquiries || data?.data || [];
  const totalPages = data?.meta?.pages || data?.pagination?.pages || 1;
  const total = data?.meta?.total || data?.pagination?.total || 0;

  const filtered = search.trim()
    ? enquiries.filter((e) =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.phone?.includes(search) ||
        e.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.product?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : enquiries;

  const openDetail = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setEditStatus(enquiry.status);
    setEditNotes(enquiry.notes || '');
    setOrderNumber('');
  };

  const openTicket = async () => {
    if (!selectedEnquiry) return;
    setSaving(true);
    try {
      const res = await enquiryAPI.openTicket(selectedEnquiry.id, orderNumber.trim());
      if (!res.success) throw new Error(res.error || 'Failed to open ticket');
      toast.success(res.data?.existing ? 'Ticket already open' : 'Ticket opened');
      router.push(`/tickets/${res.data.id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to open ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedEnquiry) return;
    setSaving(true);
    try {
      const res = await enquiryAPI.updateStatus(selectedEnquiry.id, editStatus);
      if (!res.success) throw new Error(res.error || 'Failed to update status');
      const notesRes = await enquiryAPI.addNotes(selectedEnquiry.id, editNotes);
      if (!notesRes.success) throw new Error(notesRes.error || 'Failed to save notes');
      toast.success('Enquiry updated');
      setSelectedEnquiry(null);
      qc.invalidateQueries({ queryKey: ['enquiries'] });
    } catch (err) {
      toast.error(err.message || 'Failed to update enquiry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Enquiries</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} lead{total !== 1 ? 's' : ''} from the website
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['enquiries'] })} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <MessageSquare className="h-10 w-10" />
                <p className="text-sm">No enquiries found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((enquiry) => {
                      const sc = STATUS_CONFIG[enquiry.status] ?? STATUS_CONFIG.NEW;
                      return (
                        <TableRow
                          key={enquiry.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDetail(enquiry)}
                        >
                          <TableCell>
                            <div className="font-medium">{enquiry.name}</div>
                            {enquiry.phone && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3" />{enquiry.phone}
                              </div>
                            )}
                            {enquiry.email && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />{enquiry.email}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {enquiry.product ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                {enquiry.product.name}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">General</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-56">
                            <p className="text-sm truncate">
                              {enquiry.message?.length > 60
                                ? enquiry.message.slice(0, 60) + '…'
                                : enquiry.message}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className={sc.className}>{sc.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(enquiry.createdAt)}
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

      {/* Detail Dialog */}
      {selectedEnquiry && (
        <Dialog open={!!selectedEnquiry} onOpenChange={(open) => !open && setSelectedEnquiry(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enquiry Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                <p className="font-semibold">{selectedEnquiry.name}</p>
                {selectedEnquiry.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedEnquiry.phone}`} className="hover:underline">{selectedEnquiry.phone}</a>
                  </div>
                )}
                {selectedEnquiry.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedEnquiry.email}`} className="hover:underline">{selectedEnquiry.email}</a>
                  </div>
                )}
                {selectedEnquiry.product && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEnquiry.product.name}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{formatDate(selectedEnquiry.createdAt)}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Message</Label>
                <p className="text-sm leading-relaxed">{selectedEnquiry.message}</p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order number</Label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Optional, for example RE00001"
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  rows={3}
                  placeholder="Add notes for your team..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  maxLength={2000}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEnquiry(null)}>Cancel</Button>
              <Button variant="outline" onClick={openTicket} disabled={saving}>Open ticket</Button>
              <Button onClick={handleUpdateStatus} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ProtectedRoute>
  );
}

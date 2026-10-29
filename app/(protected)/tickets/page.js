'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ticketAPI } from '@/lib/api';
import { toast } from 'sonner';

const EMPTY = { name: '', phone: '', email: '', subject: '', message: '', orderNumber: '' };

export default function TicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketAPI.list(),
  });
  const tickets = data?.data || [];
  const createMutation = useMutation({
    mutationFn: () => ticketAPI.create(form),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to create ticket');
        return;
      }
      toast.success('Ticket opened');
      setOpen(false);
      setForm(EMPTY);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      router.push(`/tickets/${res.data.id}`);
    },
  });

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Support tickets</h1>
          <Button onClick={() => setOpen(true)}>New ticket</Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/tickets/${ticket.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted">
                  <span>
                    <span className="font-medium">{ticket.ticketNumber}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{ticket.subject}</span>
                  </span>
                  <span className="text-sm">{ticket.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New ticket</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Order number</Label>
                <Input value={form.orderNumber} onChange={(event) => setForm({ ...form, orderNumber: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Message</Label>
                <Textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>Open ticket</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ticketAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function TicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketAPI.get(id),
    enabled: !!id,
  });
  const ticket = data?.data;

  const replyMutation = useMutation({
    mutationFn: () => ticketAPI.reply(id, reply),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to send reply');
        return;
      }
      toast.success(res.emailed ? 'Reply sent and emailed' : 'Reply saved. No email was sent.');
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => ticketAPI.update(id, { status }),
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.error || 'Failed to update status');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  return (
    <ProtectedRoute>
      <div className="max-w-3xl space-y-6">
        {isLoading || !ticket ? (
          <p className="text-sm text-muted-foreground">{isLoading ? 'Loading…' : 'Ticket not found.'}</p>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-semibold">{ticket.ticketNumber}</h1>
              <p className="text-muted-foreground">{ticket.subject}</p>
              <p className="text-sm">{ticket.name} · {ticket.phone}{ticket.email ? ` · ${ticket.email}` : ''}</p>
              {ticket.order && (
                <Link href={`/orders/${ticket.order.id}`} className="text-sm underline">
                  Order {ticket.order.orderNumber}
                </Link>
              )}
            </div>
            <div className="flex gap-2">
              {['OPEN', 'PENDING', 'RESOLVED'].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={ticket.status === status ? 'default' : 'outline'}
                  onClick={() => statusMutation.mutate(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
            <ul className="space-y-3">
              {ticket.messages.map((message) => (
                <li key={message.id} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{message.author}</p>
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                </li>
              ))}
            </ul>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (reply.trim()) replyMutation.mutate();
              }}
            >
              <Textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder="Reply to the customer" />
              <Button type="submit" disabled={replyMutation.isPending}>Send reply</Button>
            </form>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

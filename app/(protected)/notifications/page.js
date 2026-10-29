'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { notificationAPI } from '@/lib/api';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.list(),
  });
  const items = data?.data || [];

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <Button
            variant="outline"
            onClick={async () => {
              await notificationAPI.markAllRead();
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }}
          >
            Mark all read
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <Link href={item.link || '/notifications'} className="block">
                  <p className={item.readAt ? 'text-sm' : 'text-sm font-medium'}>{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}

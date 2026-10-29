'use client';

import { memo, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  RotateCcw,
  ShoppingBag,
  Image,
  Settings,
  Database,
  MessageSquare,
  Mail,
  Activity,
  LogOut,
  Menu,
  Bell,
  ChevronRight,
  HelpCircle,
  Tag,
  Star,
  BookOpen,
  LifeBuoy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Loader from '@/components/ui/loader';
import { subscribeToNetworkStatus, getActiveRequestCount } from '@/lib/network-tracker';
import { notificationAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Pack Cards', href: '/pack-cards', icon: ShoppingBag },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Refunds', href: '/refunds', icon: RotateCcw },
  { name: 'Banners', href: '/banners', icon: Image },
  { name: 'Site Settings', href: '/site-settings', icon: Settings },
  { name: 'System Config', href: '/system-config', icon: Database },
  { name: 'FAQs', href: '/faqs', icon: HelpCircle },
  { name: 'Blogs', href: '/blogs', icon: BookOpen },
  { name: 'Discounts', href: '/discounts', icon: Tag },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Enquiries', href: '/enquiries', icon: MessageSquare },
  { name: 'Support Tickets', href: '/tickets', icon: LifeBuoy },
  { name: 'Newsletter', href: '/newsletter', icon: Mail },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Activity', href: '/activity', icon: Activity },
];

const AdminLayout = memo(({ children }) => {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: inbox } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.list(),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const notifications = inbox?.data || [];
  const unread = inbox?.unread || 0;

  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus((active) => {
      setIsLoading(active > 0);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'RA';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col transition-all duration-200 border-r bg-card',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <img
            src="https://pub-89761921e62746dda1cd99206b609c04.r2.dev/ruyaa/brand/logo-full-color.png"
            alt="Ruyaa Essentials"
            className="h-9 w-9 shrink-0 rounded-md object-cover"
          />
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Ruyaa Essentials</p>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[#4A5C38] text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title={!sidebarOpen ? name : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-3 space-y-1">
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[#4A5C38] text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
            )}
            title={!sidebarOpen ? 'Log out' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b px-4 py-3 bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          {isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
          )}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setInboxOpen((open) => !open)}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4A5C38] px-1 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </Button>
            {inboxOpen && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-card shadow-md">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-sm font-medium">Notifications</span>
                  <button
                    className="text-xs text-muted-foreground"
                    onClick={async () => {
                      await notificationAPI.markAllRead();
                      queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    }}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">No notifications yet.</p>
                  ) : (
                    notifications.slice(0, 8).map((item) => (
                      <Link
                        key={item.id}
                        href={item.link || '/notifications'}
                        className="block border-b px-3 py-2 hover:bg-muted"
                        onClick={async () => {
                          setInboxOpen(false);
                          if (!item.readAt) {
                            await notificationAPI.markRead(item.id);
                            queryClient.invalidateQueries({ queryKey: ['notifications'] });
                          }
                        }}
                      >
                        <p className={cn('text-sm', !item.readAt && 'font-medium')}>{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                      </Link>
                    ))
                  )}
                </div>
                <Link href="/notifications" className="block px-3 py-2 text-center text-sm" onClick={() => setInboxOpen(false)}>
                  View all
                </Link>
              </div>
            )}
          </div>
          <div className="h-2 w-2 rounded-full bg-[#4A5C38]" title="Backend connected" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
});

AdminLayout.displayName = 'AdminLayout';
export default AdminLayout;

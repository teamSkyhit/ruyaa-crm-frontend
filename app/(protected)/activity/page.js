'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Activity, RefreshCw } from 'lucide-react';
import { activityAPI } from '@/lib/api';

const ACTION_CONFIG = {
  CREATE: { label: 'Create', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  UPDATE: { label: 'Update', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  DELETE: { label: 'Delete', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const ENTITY_TYPES = [
  'PRODUCT', 'CATEGORY', 'ORDER', 'CUSTOMER', 'BANNER',
  'SITE_SETTINGS', 'USER', 'ENQUIRY', 'NEWSLETTER',
];

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function ActivityPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['activity', { page, entityType }],
    queryFn: async () => {
      const params = { page, limit: 25 };
      if (entityType !== 'all') params.entityType = entityType;
      const res = await activityAPI.list(params);
      if (!res.success) throw new Error(res.error || 'Failed to load activity');
      return res.data;
    },
  });

  const logs = data?.logs || data?.data || [];
  const totalPages = data?.meta?.pages || data?.pagination?.pages || 1;
  const total = data?.meta?.total || data?.pagination?.total || 0;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Activity className="h-6 w-6" /> Activity Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} event{total !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['activity'] })} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filter by entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entity types</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Activity className="h-10 w-10" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const ac = ACTION_CONFIG[log.action] ?? { label: log.action, className: '' };
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-mono">
                              {log.entityType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium max-w-32 truncate">
                            {log.entityName || log.entityId || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={ac.className}>{ac.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-52 truncate">
                            {log.details || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.user?.name || log.user?.email || log.userId || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(log.createdAt)}
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
    </ProtectedRoute>
  );
}

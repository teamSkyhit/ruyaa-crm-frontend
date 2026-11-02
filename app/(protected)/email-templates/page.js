'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { emailTemplateAPI } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';

function EmailTemplatesContent() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await emailTemplateAPI.list();
      if (!res.success) throw new Error(res.error || 'Failed to load templates');
      return res.data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => emailTemplateAPI.update(id, { isActive: !isActive }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Template updated');
        qc.invalidateQueries({ queryKey: ['email-templates'] });
      } else {
        toast.error(res.error || 'Failed to update');
      }
    },
    onError: () => toast.error('Failed to update template'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Mail className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Failed to load email templates.</p>
        <p className="text-xs text-muted-foreground">The /api/email-templates endpoint may not be set up yet.</p>
      </div>
    );
  }

  const templates = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <Link href="/email-templates/new">
          <Button className="bg-[#4A5C38] hover:bg-[#3a4a2c]">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Mail className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No email templates yet.</p>
              <Link href="/email-templates/new">
                <Button variant="outline">Create your first template</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="hidden md:table-cell">Subject</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">{tpl.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tpl.key}</code>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                      {tpl.subject}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleMutation.mutate({ id: tpl.id, isActive: tpl.isActive })}
                        disabled={toggleMutation.isPending}
                      >
                        <Badge
                          variant={tpl.isActive ? 'default' : 'secondary'}
                          className={tpl.isActive ? 'bg-[#4A5C38] cursor-pointer' : 'cursor-pointer'}
                        >
                          {tpl.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {tpl.updatedAt ? format(new Date(tpl.updatedAt), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/email-templates/${tpl.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmailTemplatesPage() {
  return (
    <ProtectedRoute>
      <EmailTemplatesContent />
    </ProtectedRoute>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Edit, UserX, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { userAPI } from '@/lib/api';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'USER' };

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
}) : '—';

export default function UsersPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await userAPI.list();
      if (!res.success) throw new Error(res.error || 'Failed to load users');
      return res.data || [];
    },
  });

  const users = data || [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingUser ? userAPI.update(editingUser.id, payload) : userAPI.create(payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(editingUser ? 'User updated' : 'User created');
        setDialogOpen(false);
        invalidate();
      } else {
        toast.error(res.error || 'Failed to save user');
      }
    },
    onError: () => toast.error('Failed to save user'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => userAPI.deactivate(id),
    onSuccess: (res) => {
      if (res.success) { toast.success('User deactivated'); invalidate(); }
      else toast.error(res.error || 'Failed to deactivate user');
    },
    onError: () => toast.error('Failed to deactivate user'),
  });

  const openAdd = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name ?? '', email: user.email ?? '', password: '', role: user.role ?? 'USER' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }
    const payload = { name: form.name, email: form.email, role: form.role };
    if (form.password.trim()) payload.password = form.password;
    saveMutation.mutate(payload);
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage admin and staff accounts</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              All Users
              <Button variant="ghost" size="sm" onClick={invalidate} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Users className="h-10 w-10" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.status === 'ACTIVE' || u.isActive ? 'default' : 'secondary'}
                            className={u.status === 'ACTIVE' || u.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                          >
                            {u.status ?? (u.isActive ? 'ACTIVE' : 'INACTIVE')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(u.lastLoginAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(u)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deactivateMutation.mutate(u.id)}
                              >
                                <UserX className="h-4 w-4 mr-2" /> Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information' : 'Create a new admin or staff account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? 'New Password (optional)' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={editingUser ? 'Leave blank to keep current' : ''}
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(v) => set('role', v)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

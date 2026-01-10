'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export default function SettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    name: '',
    role: 'admin' as 'admin' | 'super_admin',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admins:', error);
    } else {
      setAdmins(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (editingAdmin) {
      // 管理者情報を更新
      const { error } = await supabase
        .from('admins')
        .update({
          name: form.name,
          role: form.role,
        })
        .eq('id', editingAdmin.id);

      if (error) {
        setError('更新に失敗しました');
        setSubmitting(false);
        return;
      }
    } else {
      // 新規ユーザーを作成（Supabase Auth）
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
        });

      if (authError) {
        // admin APIが使えない場合は通常のsignUpを使用
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: form.email,
            password: form.password,
          });

        if (signUpError) {
          setError('ユーザー作成に失敗しました: ' + signUpError.message);
          setSubmitting(false);
          return;
        }
      }

      // 管理者テーブルに追加
      const { error: insertError } = await supabase.from('admins').insert({
        email: form.email,
        name: form.name,
        role: form.role,
      });

      if (insertError) {
        setError('管理者情報の登録に失敗しました');
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setDialogOpen(false);
    setEditingAdmin(null);
    resetForm();
    fetchAdmins();
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setForm({
      email: admin.email,
      name: admin.name,
      role: admin.role,
      password: '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    await supabase.from('admins').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAdmins();
  };

  const resetForm = () => {
    setForm({
      email: '',
      name: '',
      role: 'admin',
      password: '',
    });
    setError(null);
  };

  if (loading) {
    return (
      <AdminLayout title="設定">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="設定">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              管理者アカウント
            </CardTitle>
            <Button
              onClick={() => {
                setEditingAdmin(null);
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>氏名</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead className="text-center">権限</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      管理者が登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            admin.role === 'super_admin'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {admin.role === 'super_admin'
                            ? 'スーパー管理者'
                            : '管理者'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(admin.created_at), 'yyyy/MM/dd', {
                          locale: ja,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(admin.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 登録/編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? '管理者を編集' : '管理者を追加'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">氏名 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="山田 太郎"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@example.com"
                disabled={!!editingAdmin}
                required
              />
            </div>

            {!editingAdmin && (
              <div className="space-y-2">
                <Label htmlFor="password">パスワード *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="6文字以上"
                  required
                  minLength={6}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>権限</Label>
              <Select
                value={form.role}
                onValueChange={(value: 'admin' | 'super_admin') =>
                  setForm({ ...form, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="super_admin">スーパー管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>管理者を削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

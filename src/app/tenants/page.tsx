'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Edit, Trash2, History } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Tenant {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  move_in_date: string;
  move_out_date: string | null;
  contract_start_date: string;
  contract_end_date: string;
  room: {
    id: string;
    room_number: string;
    property: {
      id: string;
      name: string;
    };
  } | null;
}

interface MoveHistory {
  id: string;
  move_type: 'in' | 'out';
  move_date: string;
  notes: string | null;
  created_at: string;
  tenant: {
    id: string;
    name: string;
  };
  room: {
    id: string;
    room_number: string;
    property: {
      id: string;
      name: string;
    };
  };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [moveHistories, setMoveHistories] = useState<MoveHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tenants');
  const supabase = createClient();

  const fetchTenants = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, room:rooms(id, room_number, property:properties(id, name))')
      .is('move_out_date', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
    } else {
      setTenants(data || []);
    }
  };

  const fetchMoveHistories = async () => {
    const { data, error } = await supabase
      .from('move_histories')
      .select(
        '*, tenant:tenants(id, name), room:rooms(id, room_number, property:properties(id, name))'
      )
      .order('move_date', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching move histories:', error);
    } else {
      setMoveHistories(data || []);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchTenants(), fetchMoveHistories()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from('tenants').delete().eq('id', deleteId);

    if (error) {
      console.error('Error deleting tenant:', error);
    } else {
      fetchTenants();
      fetchMoveHistories();
    }
    setDeleteId(null);
  };

  const isContractExpiring = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    return end <= threeMonthsLater && end >= now;
  };

  if (loading) {
    return (
      <AdminLayout title="入居者管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="入居者管理">
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="tenants">入居者一覧</TabsTrigger>
              <TabsTrigger value="history">入退去履歴</TabsTrigger>
            </TabsList>
            <Link href="/tenants/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新規登録
              </Button>
            </Link>
          </div>

          <TabsContent value="tenants" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>氏名</TableHead>
                      <TableHead>物件 / 部屋</TableHead>
                      <TableHead>連絡先</TableHead>
                      <TableHead>入居日</TableHead>
                      <TableHead>契約期間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500"
                        >
                          入居者が登録されていません
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tenant.name}</div>
                              {tenant.name_kana && (
                                <div className="text-sm text-gray-500">
                                  {tenant.name_kana}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tenant.room ? (
                              <div>
                                <div>{tenant.room.property.name}</div>
                                <div className="text-sm text-gray-500">
                                  {tenant.room.room_number}号室
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">未割当</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {tenant.email && <div>{tenant.email}</div>}
                              {tenant.phone && <div>{tenant.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(tenant.move_in_date), 'yyyy/MM/dd', {
                              locale: ja,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {format(
                                  new Date(tenant.contract_end_date),
                                  'yyyy/MM/dd',
                                  { locale: ja }
                                )}
                                まで
                              </span>
                              {isContractExpiring(tenant.contract_end_date) && (
                                <Badge variant="destructive">更新間近</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/tenants/${tenant.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/tenants/${tenant.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(tenant.id)}
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
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>入居者</TableHead>
                      <TableHead>物件 / 部屋</TableHead>
                      <TableHead>備考</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moveHistories.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-gray-500"
                        >
                          入退去履歴がありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      moveHistories.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            {format(new Date(history.move_date), 'yyyy/MM/dd', {
                              locale: ja,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                history.move_type === 'in'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {history.move_type === 'in' ? '入居' : '退去'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/tenants/${history.tenant.id}`}
                              className="hover:underline"
                            >
                              {history.tenant.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{history.room.property.name}</div>
                              <div className="text-sm text-gray-500">
                                {history.room.room_number}号室
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {history.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入居者を削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。入退去履歴も削除されます。
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

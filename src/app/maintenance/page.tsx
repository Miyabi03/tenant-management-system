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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Maintenance {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  cost: number | null;
  reported_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  contractor: string | null;
  property: {
    id: string;
    name: string;
  };
  room: {
    id: string;
    room_number: string;
  } | null;
}

interface Property {
  id: string;
  name: string;
  rooms: { id: string; room_number: string }[];
}

const statusOptions = [
  { value: 'pending', label: '未対応' },
  { value: 'in_progress', label: '対応中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
];

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '緊急' },
];

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    property_id: '',
    room_id: '',
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    cost: '',
    reported_date: new Date().toISOString().split('T')[0],
    scheduled_date: '',
    completed_date: '',
    contractor: '',
    notes: '',
  });
  const supabase = createClient();

  const fetchMaintenances = async () => {
    let query = supabase
      .from('maintenances')
      .select(
        '*, property:properties(id, name), room:rooms(id, room_number)'
      )
      .order('reported_date', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenances:', error);
    } else {
      setMaintenances(data || []);
    }
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, rooms(id, room_number)')
      .order('name');

    if (error) {
      console.error('Error fetching properties:', error);
    } else {
      setProperties(data || []);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchMaintenances(), fetchProperties()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchMaintenances();
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const maintenanceData = {
      property_id: form.property_id,
      room_id: form.room_id || null,
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      cost: form.cost ? parseInt(form.cost) : null,
      reported_date: form.reported_date,
      scheduled_date: form.scheduled_date || null,
      completed_date: form.completed_date || null,
      contractor: form.contractor || null,
    };

    if (editingMaintenance) {
      await supabase
        .from('maintenances')
        .update(maintenanceData)
        .eq('id', editingMaintenance.id);
    } else {
      await supabase.from('maintenances').insert(maintenanceData);
    }

    setSubmitting(false);
    setDialogOpen(false);
    setEditingMaintenance(null);
    resetForm();
    fetchMaintenances();
  };

  const handleEdit = (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setForm({
      property_id: maintenance.property.id,
      room_id: maintenance.room?.id || '',
      title: maintenance.title,
      description: maintenance.description || '',
      status: maintenance.status,
      priority: maintenance.priority,
      cost: maintenance.cost?.toString() || '',
      reported_date: maintenance.reported_date,
      scheduled_date: maintenance.scheduled_date || '',
      completed_date: maintenance.completed_date || '',
      contractor: maintenance.contractor || '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('maintenances').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchMaintenances();
  };

  const resetForm = () => {
    setForm({
      property_id: '',
      room_id: '',
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      cost: '',
      reported_date: new Date().toISOString().split('T')[0],
      scheduled_date: '',
      completed_date: '',
      contractor: '',
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">未対応</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">対応中</Badge>;
      case 'completed':
        return <Badge variant="default">完了</Badge>;
      case 'cancelled':
        return <Badge variant="outline">キャンセル</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">緊急</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">高</Badge>;
      case 'medium':
        return <Badge variant="secondary">中</Badge>;
      case 'low':
        return <Badge variant="outline">低</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  const selectedProperty = properties.find((p) => p.id === form.property_id);

  if (loading) {
    return (
      <AdminLayout title="修繕・メンテナンス管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="修繕・メンテナンス管理">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">修繕一覧</h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditingMaintenance(null);
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            新規登録
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>物件 / 部屋</TableHead>
                  <TableHead className="text-center">ステータス</TableHead>
                  <TableHead className="text-center">優先度</TableHead>
                  <TableHead>報告日</TableHead>
                  <TableHead className="text-right">費用</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenances.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      修繕記録がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  maintenances.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell>
                        <div>
                          <div>{m.property.name}</div>
                          {m.room && (
                            <div className="text-sm text-gray-500">
                              {m.room.room_number}号室
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(m.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getPriorityBadge(m.priority)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(m.reported_date), 'yyyy/MM/dd', {
                          locale: ja,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.cost ? `${m.cost.toLocaleString()}円` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(m)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(m.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMaintenance ? '修繕を編集' : '修繕を登録'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>物件 *</Label>
                <Select
                  value={form.property_id}
                  onValueChange={(value) =>
                    setForm({ ...form, property_id: value, room_id: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="物件を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>部屋（任意）</Label>
                <Select
                  value={form.room_id}
                  onValueChange={(value) =>
                    setForm({ ...form, room_id: value })
                  }
                  disabled={!selectedProperty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="部屋を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProperty?.rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.room_number}号室
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例：エアコン修理"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="修繕内容の詳細"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ステータス</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>優先度</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    setForm({ ...form, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reported_date">報告日</Label>
                <Input
                  id="reported_date"
                  type="date"
                  value={form.reported_date}
                  onChange={(e) =>
                    setForm({ ...form, reported_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">予定日</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) =>
                    setForm({ ...form, scheduled_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completed_date">完了日</Label>
                <Input
                  id="completed_date"
                  type="date"
                  value={form.completed_date}
                  onChange={(e) =>
                    setForm({ ...form, completed_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">費用（円）</Label>
                <Input
                  id="cost"
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractor">業者名</Label>
                <Input
                  id="contractor"
                  value={form.contractor}
                  onChange={(e) =>
                    setForm({ ...form, contractor: e.target.value })
                  }
                  placeholder="○○設備"
                />
              </div>
            </div>

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
            <DialogTitle>修繕記録を削除しますか？</DialogTitle>
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

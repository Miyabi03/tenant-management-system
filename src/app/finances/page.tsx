'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface Finance {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string | null;
  date: string;
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

const incomeCategories = ['家賃', '管理費', '敷金', '礼金', 'その他収入'];
const expenseCategories = [
  '修繕費',
  '管理費',
  '光熱費',
  '保険料',
  '税金',
  '清掃費',
  'その他支出',
];

export default function FinancesPage() {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinance, setEditingFinance] = useState<Finance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [form, setForm] = useState({
    property_id: '',
    room_id: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const supabase = useMemo(() => createClient(), []);

  const fetchFinances = async () => {
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('finances')
      .select(
        '*, property:properties(id, name), room:rooms(id, room_number)'
      )
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching finances:', error);
    } else {
      setFinances(data || []);
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
      await Promise.all([fetchFinances(), fetchProperties()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchFinances();
  }, [selectedYear, selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const financeData = {
      property_id: form.property_id,
      room_id: form.room_id || null,
      type: form.type,
      category: form.category,
      amount: parseInt(form.amount),
      description: form.description || null,
      date: form.date,
    };

    if (editingFinance) {
      await supabase
        .from('finances')
        .update(financeData)
        .eq('id', editingFinance.id);
    } else {
      await supabase.from('finances').insert(financeData);
    }

    setSubmitting(false);
    setDialogOpen(false);
    setEditingFinance(null);
    resetForm();
    fetchFinances();
  };

  const handleEdit = (finance: Finance) => {
    setEditingFinance(finance);
    setForm({
      property_id: finance.property.id,
      room_id: finance.room?.id || '',
      type: finance.type,
      category: finance.category,
      amount: finance.amount.toString(),
      description: finance.description || '',
      date: finance.date,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('finances').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchFinances();
  };

  const resetForm = () => {
    setForm({
      property_id: '',
      room_id: '',
      type: 'income',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const selectedProperty = properties.find((p) => p.id === form.property_id);
  const categories = form.type === 'income' ? incomeCategories : expenseCategories;

  const totalIncome = finances
    .filter((f) => f.type === 'income')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalExpense = finances
    .filter((f) => f.type === 'expense')
    .reduce((sum, f) => sum + f.amount, 0);

  const profit = totalIncome - totalExpense;

  // 物件別収支データ
  const propertyStats = properties.map((p) => {
    const propertyFinances = finances.filter((f) => f.property.id === p.id);
    const income = propertyFinances
      .filter((f) => f.type === 'income')
      .reduce((sum, f) => sum + f.amount, 0);
    const expense = propertyFinances
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + f.amount, 0);
    return {
      name: p.name,
      収入: income,
      支出: expense,
      利益: income - expense,
    };
  });

  if (loading) {
    return (
      <AdminLayout title="収支管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="収支管理">
      <div className="space-y-4">
        {/* 月選択と概要 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditingFinance(null);
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            経費登録
          </Button>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                収入
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {totalIncome.toLocaleString()}円
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                支出
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {totalExpense.toLocaleString()}円
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                収支
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {profit >= 0 ? '+' : ''}
                {profit.toLocaleString()}円
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">明細一覧</TabsTrigger>
            <TabsTrigger value="property">物件別レポート</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>物件 / 部屋</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finances.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-gray-500"
                        >
                          データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      finances.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            {format(new Date(f.date), 'MM/dd', { locale: ja })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                f.type === 'income' ? 'default' : 'destructive'
                              }
                            >
                              {f.type === 'income' ? '収入' : '支出'}
                            </Badge>
                          </TableCell>
                          <TableCell>{f.category}</TableCell>
                          <TableCell>
                            <div>
                              <div>{f.property.name}</div>
                              {f.room && (
                                <div className="text-sm text-gray-500">
                                  {f.room.room_number}号室
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {f.description || '-'}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              f.type === 'income'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {f.type === 'income' ? '+' : '-'}
                            {f.amount.toLocaleString()}円
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(f)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(f.id)}
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

          <TabsContent value="property" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>物件別収支</CardTitle>
              </CardHeader>
              <CardContent>
                {propertyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={propertyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) =>
                          `${(value as number).toLocaleString()}円`
                        }
                      />
                      <Legend />
                      <Bar dataKey="収入" fill="#22c55e" />
                      <Bar dataKey="支出" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    データがありません
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 登録/編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFinance ? '経費を編集' : '経費を登録'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>種別 *</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: 'income' | 'expense') =>
                    setForm({ ...form, type: value, category: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">収入</SelectItem>
                    <SelectItem value="expense">支出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>カテゴリ *</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm({ ...form, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">金額（円） *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">日付 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="詳細を入力"
              />
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
            <DialogTitle>削除しますか？</DialogTitle>
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

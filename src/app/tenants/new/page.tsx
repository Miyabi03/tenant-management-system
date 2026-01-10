'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  status: string;
  property: {
    id: string;
    name: string;
  };
}

export default function NewTenantPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({
    room_id: '',
    name: '',
    name_kana: '',
    email: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    move_in_date: '',
    contract_start_date: '',
    contract_end_date: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, room_number, status, property:properties(id, name)')
        .eq('status', 'vacant')
        .order('room_number');

      if (error) {
        console.error('Error fetching rooms:', error);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRooms((data || []) as any);
      }
      setLoading(false);
    };

    fetchRooms();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // 入居者を登録
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        room_id: form.room_id || null,
        name: form.name,
        name_kana: form.name_kana || null,
        email: form.email || null,
        phone: form.phone || null,
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
        move_in_date: form.move_in_date,
        contract_start_date: form.contract_start_date,
        contract_end_date: form.contract_end_date,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (tenantError) {
      setError('入居者の登録に失敗しました');
      setSubmitting(false);
      return;
    }

    // 部屋のステータスを更新
    if (form.room_id) {
      await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', form.room_id);

      // 入居履歴を追加
      await supabase.from('move_histories').insert({
        room_id: form.room_id,
        tenant_id: tenant.id,
        move_type: 'in',
        move_date: form.move_in_date,
      });
    }

    router.push('/tenants');
  };

  if (loading) {
    return (
      <AdminLayout title="入居者登録">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="入居者登録">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/tenants"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          入居者一覧に戻る
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>新規入居者登録</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 部屋選択 */}
              <div className="space-y-2">
                <Label htmlFor="room_id">入居する部屋</Label>
                <Select
                  value={form.room_id}
                  onValueChange={(value) =>
                    setForm({ ...form, room_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="部屋を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.property.name} - {room.room_number}号室
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rooms.length === 0 && (
                  <p className="text-sm text-gray-500">
                    空室がありません
                  </p>
                )}
              </div>

              {/* 基本情報 */}
              <div className="space-y-4">
                <h3 className="font-medium">基本情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">氏名 *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="山田 太郎"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_kana">氏名（カナ）</Label>
                    <Input
                      id="name_kana"
                      value={form.name_kana}
                      onChange={(e) =>
                        setForm({ ...form, name_kana: e.target.value })
                      }
                      placeholder="ヤマダ タロウ"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="example@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">電話番号</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="090-1234-5678"
                    />
                  </div>
                </div>
              </div>

              {/* 緊急連絡先 */}
              <div className="space-y-4">
                <h3 className="font-medium">緊急連絡先</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact">緊急連絡先（氏名）</Label>
                    <Input
                      id="emergency_contact"
                      value={form.emergency_contact}
                      onChange={(e) =>
                        setForm({ ...form, emergency_contact: e.target.value })
                      }
                      placeholder="山田 花子"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_phone">緊急連絡先（電話番号）</Label>
                    <Input
                      id="emergency_phone"
                      value={form.emergency_phone}
                      onChange={(e) =>
                        setForm({ ...form, emergency_phone: e.target.value })
                      }
                      placeholder="080-1234-5678"
                    />
                  </div>
                </div>
              </div>

              {/* 契約情報 */}
              <div className="space-y-4">
                <h3 className="font-medium">契約情報</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="move_in_date">入居日 *</Label>
                    <Input
                      id="move_in_date"
                      type="date"
                      value={form.move_in_date}
                      onChange={(e) =>
                        setForm({ ...form, move_in_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_start_date">契約開始日 *</Label>
                    <Input
                      id="contract_start_date"
                      type="date"
                      value={form.contract_start_date}
                      onChange={(e) =>
                        setForm({ ...form, contract_start_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_end_date">契約終了日 *</Label>
                    <Input
                      id="contract_end_date"
                      type="date"
                      value={form.contract_end_date}
                      onChange={(e) =>
                        setForm({ ...form, contract_end_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 備考 */}
              <div className="space-y-2">
                <Label htmlFor="notes">備考</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="備考を入力してください"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    '登録する'
                  )}
                </Button>
                <Link href="/tenants">
                  <Button type="button" variant="outline">
                    キャンセル
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

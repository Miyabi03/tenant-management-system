'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ArrowLeft,
  Edit,
  User,
  Phone,
  Mail,
  Home,
  Calendar,
  LogOut,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Tenant {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  move_in_date: string;
  move_out_date: string | null;
  contract_start_date: string;
  contract_end_date: string;
  notes: string | null;
  room: {
    id: string;
    room_number: string;
    rent: number;
    management_fee: number;
    property: {
      id: string;
      name: string;
      address: string;
    };
  } | null;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [moveOutDialogOpen, setMoveOutDialogOpen] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState('');
  const [moveOutNotes, setMoveOutNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchTenant = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select(
        '*, room:rooms(id, room_number, rent, management_fee, property:properties(id, name, address))'
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tenant:', error);
    } else {
      setTenant(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const handleMoveOut = async () => {
    if (!tenant || !moveOutDate) return;
    setSubmitting(true);

    // 入居者の退去日を更新
    await supabase
      .from('tenants')
      .update({
        move_out_date: moveOutDate,
        room_id: null,
      })
      .eq('id', id);

    // 部屋のステータスを空室に
    if (tenant.room) {
      await supabase
        .from('rooms')
        .update({ status: 'vacant' })
        .eq('id', tenant.room.id);

      // 退去履歴を追加
      await supabase.from('move_histories').insert({
        room_id: tenant.room.id,
        tenant_id: id,
        move_type: 'out',
        move_date: moveOutDate,
        notes: moveOutNotes || null,
      });
    }

    setSubmitting(false);
    setMoveOutDialogOpen(false);
    router.push('/tenants');
  };

  if (loading) {
    return (
      <AdminLayout title="入居者詳細">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!tenant) {
    return (
      <AdminLayout title="入居者詳細">
        <div className="text-center py-8">
          <p className="text-gray-500">入居者が見つかりません</p>
          <Link href="/tenants">
            <Button className="mt-4">入居者一覧に戻る</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isContractExpiring = () => {
    const end = new Date(tenant.contract_end_date);
    const now = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    return end <= threeMonthsLater && end >= now;
  };

  return (
    <AdminLayout title="入居者詳細">
      <div className="space-y-6">
        <Link
          href="/tenants"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          入居者一覧に戻る
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                基本情報
              </CardTitle>
              <Link href={`/tenants/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">氏名</p>
                <p className="text-lg font-medium">{tenant.name}</p>
                {tenant.name_kana && (
                  <p className="text-sm text-gray-500">{tenant.name_kana}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> メール
                  </p>
                  <p>{tenant.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> 電話
                  </p>
                  <p>{tenant.phone || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">緊急連絡先</p>
                  <p>{tenant.emergency_contact || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">緊急連絡先（電話）</p>
                  <p>{tenant.emergency_phone || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 入居情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                入居情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenant.room ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500">物件</p>
                    <Link
                      href={`/properties/${tenant.room.property.id}`}
                      className="text-primary hover:underline"
                    >
                      {tenant.room.property.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {tenant.room.property.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">部屋番号</p>
                    <p className="text-lg font-medium">
                      {tenant.room.room_number}号室
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">家賃</p>
                      <p>{tenant.room.rent.toLocaleString()}円/月</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">管理費</p>
                      <p>{tenant.room.management_fee.toLocaleString()}円/月</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-500">
                  {tenant.move_out_date ? '退去済み' : '部屋未割当'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 契約情報 */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                契約情報
              </CardTitle>
              {!tenant.move_out_date && tenant.room && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMoveOutDialogOpen(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  退去処理
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">入居日</p>
                  <p>
                    {format(new Date(tenant.move_in_date), 'yyyy年MM月dd日', {
                      locale: ja,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">契約開始日</p>
                  <p>
                    {format(
                      new Date(tenant.contract_start_date),
                      'yyyy年MM月dd日',
                      { locale: ja }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">契約終了日</p>
                  <div className="flex items-center gap-2">
                    <p>
                      {format(
                        new Date(tenant.contract_end_date),
                        'yyyy年MM月dd日',
                        { locale: ja }
                      )}
                    </p>
                    {isContractExpiring() && (
                      <Badge variant="destructive">更新間近</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">退去日</p>
                  <p>
                    {tenant.move_out_date
                      ? format(new Date(tenant.move_out_date), 'yyyy年MM月dd日', {
                          locale: ja,
                        })
                      : '-'}
                  </p>
                </div>
              </div>
              {tenant.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">備考</p>
                  <p className="whitespace-pre-wrap">{tenant.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 退去処理ダイアログ */}
      <Dialog open={moveOutDialogOpen} onOpenChange={setMoveOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退去処理</DialogTitle>
            <DialogDescription>
              {tenant.name}さんの退去処理を行います。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="move_out_date">退去日 *</Label>
              <Input
                id="move_out_date"
                type="date"
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="move_out_notes">備考</Label>
              <textarea
                id="move_out_notes"
                value={moveOutNotes}
                onChange={(e) => setMoveOutNotes(e.target.value)}
                placeholder="退去理由など"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMoveOutDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={handleMoveOut} disabled={submitting || !moveOutDate}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                '退去処理を実行'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

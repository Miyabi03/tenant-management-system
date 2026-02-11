'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building,
  Loader2,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { Property, Room, Tenant } from '@/types';

interface RoomFormData {
  room_number: string;
  floor: string;
  bed_number: string;
  status: string;
}

interface TenantFormData {
  name: string;
  department: string;
  move_in_date: string;
  notes: string;
}

interface RoomWithTenant extends Room {
  tenant?: Tenant | null;
}

const initialRoomForm: RoomFormData = {
  room_number: '',
  floor: '',
  bed_number: '',
  status: 'vacant',
};

const initialTenantForm: TenantFormData = {
  name: '',
  department: '',
  move_in_date: '',
  notes: '',
};

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<RoomWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormData>(initialRoomForm);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 入居者登録用
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [selectedRoomForTenant, setSelectedRoomForTenant] = useState<Room | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantFormData>(initialTenantForm);
  const [moveOutRoomId, setMoveOutRoomId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchProperty = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching property:', error);
    } else {
      setProperty(data);
    }
  };

  const fetchRooms = async () => {
    // 部屋情報を取得
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', id)
      .order('floor')
      .order('room_number');

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      return;
    }

    // 各部屋の入居者情報を取得
    const roomsWithTenants = await Promise.all(
      (roomsData || []).map(async (room) => {
        if (room.status === 'occupied') {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .eq('room_id', room.id)
            .is('move_out_date', null)
            .single();
          return { ...room, tenant: tenantData };
        }
        return { ...room, tenant: null };
      })
    );

    setRooms(roomsWithTenants);
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchProperty(), fetchRooms()]);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const roomData = {
      property_id: id,
      room_number: roomForm.room_number,
      floor: roomForm.floor ? parseInt(roomForm.floor) : null,
      room_type: roomForm.bed_number || null, // ベッド番号をroom_typeに保存
      status: roomForm.status,
      rent: 0,
      management_fee: 0,
      deposit: 0,
      key_money: 0,
    };

    if (editingRoom) {
      const { error } = await supabase
        .from('rooms')
        .update(roomData)
        .eq('id', editingRoom.id);

      if (error) {
        console.error('Error updating room:', error.message, error.details, error.hint);
        alert(`更新エラー: ${error.message || 'RLSポリシーを確認してください'}`);
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.from('rooms').insert(roomData);

      if (error) {
        console.error('Error creating room:', error.message, error.details, error.hint);
        alert(`作成エラー: ${error.message || 'RLSポリシーを確認してください'}`);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setRoomDialogOpen(false);
    setEditingRoom(null);
    setRoomForm(initialRoomForm);
    fetchRooms();
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      room_number: room.room_number,
      floor: room.floor?.toString() || '',
      bed_number: room.room_type || '', // room_typeにベッド番号が入っている
      status: room.status,
    });
    setRoomDialogOpen(true);
  };

  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return;

    const { error } = await supabase.from('rooms').delete().eq('id', deleteRoomId);

    if (error) {
      console.error('Error deleting room:', error);
    } else {
      fetchRooms();
    }
    setDeleteRoomId(null);
  };

  // 入居者登録
  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForTenant) return;
    setSubmitting(true);

    // 入居者を登録
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        room_id: selectedRoomForTenant.id,
        name: tenantForm.name,
        name_kana: tenantForm.department, // 所属部署をname_kanaに保存
        move_in_date: tenantForm.move_in_date,
        contract_start_date: tenantForm.move_in_date,
        contract_end_date: '2099-12-31', // デフォルト値
        notes: tenantForm.notes || null,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError.message);
      alert(`登録エラー: ${tenantError.message}`);
      setSubmitting(false);
      return;
    }

    // 部屋のステータスを更新
    await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', selectedRoomForTenant.id);

    // 入居履歴を追加
    await supabase.from('move_histories').insert({
      room_id: selectedRoomForTenant.id,
      tenant_id: tenant.id,
      move_type: 'in',
      move_date: tenantForm.move_in_date,
    });

    setSubmitting(false);
    setTenantDialogOpen(false);
    setSelectedRoomForTenant(null);
    setTenantForm(initialTenantForm);
    fetchRooms();
  };

  // 退去処理
  const handleMoveOut = async () => {
    if (!moveOutRoomId) return;

    const room = rooms.find((r) => r.id === moveOutRoomId);
    if (!room?.tenant) return;

    // 入居者の退去日を設定
    await supabase
      .from('tenants')
      .update({ move_out_date: new Date().toISOString().split('T')[0] })
      .eq('id', room.tenant.id);

    // 部屋のステータスを空きに変更
    await supabase
      .from('rooms')
      .update({ status: 'vacant' })
      .eq('id', moveOutRoomId);

    // 退去履歴を追加
    await supabase.from('move_histories').insert({
      room_id: moveOutRoomId,
      tenant_id: room.tenant.id,
      move_type: 'out',
      move_date: new Date().toISOString().split('T')[0],
    });

    setMoveOutRoomId(null);
    fetchRooms();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vacant':
        return <Badge variant="destructive">空き</Badge>;
      case 'occupied':
        return <Badge variant="default">使用中</Badge>;
      case 'reserved':
        return <Badge variant="secondary">予約済</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="物件詳細">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!property) {
    return (
      <AdminLayout title="物件詳細">
        <div className="text-center py-8">
          <p className="text-gray-500">物件が見つかりません</p>
          <Link href="/properties">
            <Button className="mt-4">物件一覧に戻る</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const vacantRooms = rooms.filter((r) => r.status === 'vacant').length;
  const occupancyRate =
    rooms.length > 0
      ? Math.round(((rooms.length - vacantRooms) / rooms.length) * 100)
      : 0;

  return (
    <AdminLayout title="物件詳細">
      <div className="space-y-6">
        <Link
          href="/properties"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          物件一覧に戻る
        </Link>

        {/* 物件情報 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {property.name}
            </CardTitle>
            <Link href={`/properties/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                編集
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">住所</p>
                <p className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {property.address}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">稼働状況</p>
                <p className="flex items-center gap-2">
                  <span>
                    {rooms.length}ベッド中 {rooms.length - vacantRooms}ベッド使用中
                  </span>
                  <Badge variant={occupancyRate >= 80 ? 'default' : 'destructive'}>
                    稼働率 {occupancyRate}%
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 部屋/ベッド一覧 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>部屋・ベッド一覧</CardTitle>
            <Button
              onClick={() => {
                setEditingRoom(null);
                setRoomForm(initialRoomForm);
                setRoomDialogOpen(true);
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
                  <TableHead>階数</TableHead>
                  <TableHead>部屋番号</TableHead>
                  <TableHead>ベッド番号</TableHead>
                  <TableHead className="text-center">ステータス</TableHead>
                  <TableHead>入居者</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      部屋が登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell>{room.floor || '-'}F</TableCell>
                      <TableCell className="font-medium">
                        {room.room_number}
                      </TableCell>
                      <TableCell>{room.room_type || '-'}</TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(room.status)}
                      </TableCell>
                      <TableCell>
                        {room.tenant ? (
                          <div>
                            <p className="font-medium">{room.tenant.name}</p>
                            <p className="text-sm text-gray-500">{room.tenant.name_kana}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {room.status === 'vacant' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRoomForTenant(room);
                                setTenantForm(initialTenantForm);
                                setTenantDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              入居
                            </Button>
                          ) : room.status === 'occupied' && room.tenant ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMoveOutRoomId(room.id)}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              退去
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRoom(room)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteRoomId(room.id)}
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

      {/* 部屋登録/編集ダイアログ */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? '編集' : '部屋・ベッドを追加'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">階数</Label>
                <Input
                  id="floor"
                  type="number"
                  value={roomForm.floor}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, floor: e.target.value })
                  }
                  placeholder="例：1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_number">部屋番号 *</Label>
                <Input
                  id="room_number"
                  value={roomForm.room_number}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, room_number: e.target.value })
                  }
                  placeholder="例：101"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bed_number">ベッド番号</Label>
                <Input
                  id="bed_number"
                  value={roomForm.bed_number}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, bed_number: e.target.value })
                  }
                  placeholder="例：A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">ステータス</Label>
                <Select
                  value={roomForm.status}
                  onValueChange={(value) =>
                    setRoomForm({ ...roomForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">空き</SelectItem>
                    <SelectItem value="occupied">使用中</SelectItem>
                    <SelectItem value="reserved">予約済</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoomDialogOpen(false)}
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

      {/* 部屋削除確認ダイアログ */}
      <Dialog open={!!deleteRoomId} onOpenChange={() => setDeleteRoomId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoomId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteRoom}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 入居者登録ダイアログ */}
      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入居者登録</DialogTitle>
            <DialogDescription>
              {selectedRoomForTenant && (
                <>
                  {selectedRoomForTenant.floor}F {selectedRoomForTenant.room_number}号室
                  {selectedRoomForTenant.room_type && ` ベッド${selectedRoomForTenant.room_type}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTenantSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_name">名前 *</Label>
              <Input
                id="tenant_name"
                value={tenantForm.name}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, name: e.target.value })
                }
                placeholder="山田 太郎"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">所属部署</Label>
              <Input
                id="department"
                value={tenantForm.department}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, department: e.target.value })
                }
                placeholder="営業部"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="move_in_date">入居日 *</Label>
              <Input
                id="move_in_date"
                type="date"
                value={tenantForm.move_in_date}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, move_in_date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_notes">備考</Label>
              <textarea
                id="tenant_notes"
                value={tenantForm.notes}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, notes: e.target.value })
                }
                placeholder="備考を入力してください"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTenantDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登録中...
                  </>
                ) : (
                  '登録'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 退去確認ダイアログ */}
      <Dialog open={!!moveOutRoomId} onOpenChange={() => setMoveOutRoomId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退去処理</DialogTitle>
            <DialogDescription>
              {moveOutRoomId && rooms.find((r) => r.id === moveOutRoomId)?.tenant && (
                <>
                  {rooms.find((r) => r.id === moveOutRoomId)?.tenant?.name}さんの退去処理を行いますか？
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOutRoomId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleMoveOut}>
              退去処理を実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

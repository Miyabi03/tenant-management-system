'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Property, Room } from '@/types';

interface RoomFormData {
  room_number: string;
  floor: string;
  rent: string;
  management_fee: string;
  deposit: string;
  key_money: string;
  room_type: string;
  area: string;
  status: string;
  description: string;
}

const initialRoomForm: RoomFormData = {
  room_number: '',
  floor: '',
  rent: '',
  management_fee: '',
  deposit: '',
  key_money: '',
  room_type: '',
  area: '',
  status: 'vacant',
  description: '',
};

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormData>(initialRoomForm);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

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
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', id)
      .order('room_number');

    if (error) {
      console.error('Error fetching rooms:', error);
    } else {
      setRooms(data || []);
    }
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
      rent: parseInt(roomForm.rent) || 0,
      management_fee: parseInt(roomForm.management_fee) || 0,
      deposit: parseInt(roomForm.deposit) || 0,
      key_money: parseInt(roomForm.key_money) || 0,
      room_type: roomForm.room_type || null,
      area: roomForm.area ? parseFloat(roomForm.area) : null,
      status: roomForm.status,
      description: roomForm.description || null,
    };

    if (editingRoom) {
      const { error } = await supabase
        .from('rooms')
        .update(roomData)
        .eq('id', editingRoom.id);

      if (error) {
        console.error('Error updating room:', error);
      }
    } else {
      const { error } = await supabase.from('rooms').insert(roomData);

      if (error) {
        console.error('Error creating room:', error);
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
      rent: room.rent.toString(),
      management_fee: room.management_fee.toString(),
      deposit: room.deposit.toString(),
      key_money: room.key_money.toString(),
      room_type: room.room_type || '',
      area: room.area?.toString() || '',
      status: room.status,
      description: room.description || '',
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vacant':
        return <Badge variant="destructive">空室</Badge>;
      case 'occupied':
        return <Badge variant="default">入居中</Badge>;
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
                    {rooms.length}室中 {rooms.length - vacantRooms}室入居中
                  </span>
                  <Badge variant={occupancyRate >= 80 ? 'default' : 'destructive'}>
                    稼働率 {occupancyRate}%
                  </Badge>
                </p>
              </div>
              {property.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">説明</p>
                  <p>{property.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 部屋一覧 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>部屋一覧</CardTitle>
            <Button
              onClick={() => {
                setEditingRoom(null);
                setRoomForm(initialRoomForm);
                setRoomDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              部屋を追加
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>部屋番号</TableHead>
                  <TableHead>間取り</TableHead>
                  <TableHead className="text-right">家賃</TableHead>
                  <TableHead className="text-right">管理費</TableHead>
                  <TableHead className="text-center">ステータス</TableHead>
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
                      <TableCell className="font-medium">
                        {room.room_number}
                      </TableCell>
                      <TableCell>
                        {room.room_type || '-'}
                        {room.area && ` (${room.area}㎡)`}
                      </TableCell>
                      <TableCell className="text-right">
                        {room.rent.toLocaleString()}円
                      </TableCell>
                      <TableCell className="text-right">
                        {room.management_fee.toLocaleString()}円
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(room.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? '部屋を編集' : '部屋を追加'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="room_type">間取り</Label>
                <Input
                  id="room_type"
                  value={roomForm.room_type}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, room_type: e.target.value })
                  }
                  placeholder="例：1K"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">面積 (㎡)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.01"
                  value={roomForm.area}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, area: e.target.value })
                  }
                  placeholder="例：25.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent">家賃 (円) *</Label>
                <Input
                  id="rent"
                  type="number"
                  value={roomForm.rent}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, rent: e.target.value })
                  }
                  placeholder="例：80000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="management_fee">管理費 (円)</Label>
                <Input
                  id="management_fee"
                  type="number"
                  value={roomForm.management_fee}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, management_fee: e.target.value })
                  }
                  placeholder="例：5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">敷金 (円)</Label>
                <Input
                  id="deposit"
                  type="number"
                  value={roomForm.deposit}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, deposit: e.target.value })
                  }
                  placeholder="例：80000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key_money">礼金 (円)</Label>
                <Input
                  id="key_money"
                  type="number"
                  value={roomForm.key_money}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, key_money: e.target.value })
                  }
                  placeholder="例：80000"
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
                    <SelectItem value="vacant">空室</SelectItem>
                    <SelectItem value="occupied">入居中</SelectItem>
                    <SelectItem value="reserved">予約済</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_description">説明</Label>
              <textarea
                id="room_description"
                value={roomForm.description}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, description: e.target.value })
                }
                placeholder="部屋の説明を入力してください"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              />
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
            <DialogTitle>部屋を削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。部屋に関連するデータも削除されます。
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
    </AdminLayout>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  MapPin,
  ArrowLeft,
  MessageSquare,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address: string;
  description: string | null;
  rooms: {
    id: string;
    room_number: string;
    floor: number | null;
    rent: number;
    management_fee: number;
    deposit: number;
    key_money: number;
    room_type: string | null;
    area: number | null;
    status: string;
    description: string | null;
  }[];
}

export default function PublicPropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchProperty = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, rooms(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching property:', error);
      } else {
        setProperty(data);
      }
      setLoading(false);
    };

    fetchProperty();
  }, [id, supabase]);

  const handleInquiry = (roomId?: string) => {
    setSelectedRoomId(roomId || '');
    const room = property?.rooms.find((r) => r.id === roomId);
    setForm({
      ...form,
      subject: room
        ? `${property?.name} ${room.room_number}号室について`
        : `${property?.name}について`,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from('inquiries').insert({
      property_id: id,
      room_id: selectedRoomId || null,
      inquirer_type: 'visitor',
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      subject: form.subject,
      message: form.message,
      status: 'new',
    });

    if (error) {
      console.error('Error submitting inquiry:', error);
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const vacantRooms = property?.rooms.filter((r) => r.status === 'vacant') || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">空き物件情報</span>
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">空き物件情報</span>
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500">物件が見つかりません</p>
          <Link href="/">
            <Button className="mt-4">物件一覧に戻る</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">空き物件情報</span>
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" size="sm">
              管理者ログイン
            </Button>
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          物件一覧に戻る
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 物件情報 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{property.name}</span>
                  <Badge variant="secondary">空室 {vacantRooms.length}室</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <span>{property.address}</span>
                </div>
                {property.description && (
                  <p className="text-gray-600">{property.description}</p>
                )}
              </CardContent>
            </Card>

            {/* 空室一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>空室情報</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {vacantRooms.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    現在空室はありません
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>部屋番号</TableHead>
                        <TableHead>間取り</TableHead>
                        <TableHead className="text-right">家賃</TableHead>
                        <TableHead className="text-right">管理費</TableHead>
                        <TableHead className="text-right">敷/礼</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vacantRooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">
                            {room.room_number}
                            {room.floor && (
                              <span className="text-sm text-gray-500 ml-1">
                                ({room.floor}F)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {room.room_type || '-'}
                            {room.area && (
                              <span className="text-sm text-gray-500 ml-1">
                                ({room.area}㎡)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {room.rent.toLocaleString()}円
                          </TableCell>
                          <TableCell className="text-right">
                            {room.management_fee.toLocaleString()}円
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {room.deposit.toLocaleString()}円 /{' '}
                            {room.key_money.toLocaleString()}円
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleInquiry(room.id)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              問い合わせ
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* サイドバー - 問い合わせフォーム */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  お問い合わせ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  この物件についてのお問い合わせはこちらから
                </p>
                <Button className="w-full" onClick={() => handleInquiry()}>
                  問い合わせフォームを開く
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>&copy; 2025 入居者管理システム</p>
        </div>
      </footer>

      {/* 問い合わせダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          {submitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  送信完了
                </DialogTitle>
                <DialogDescription>
                  お問い合わせありがとうございます。
                  <br />
                  担当者より折り返しご連絡いたします。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setDialogOpen(false);
                    setSubmitted(false);
                    setForm({
                      name: '',
                      email: '',
                      phone: '',
                      subject: '',
                      message: '',
                    });
                  }}
                >
                  閉じる
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>お問い合わせフォーム</DialogTitle>
                <DialogDescription>
                  以下のフォームからお問い合わせください。
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">お名前 *</Label>
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
                  <Label htmlFor="email">メールアドレス *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="example@email.com"
                    required
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

                <div className="space-y-2">
                  <Label htmlFor="subject">件名 *</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">お問い合わせ内容 *</Label>
                  <textarea
                    id="message"
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    placeholder="内見希望日時、質問など"
                    className="w-full min-h-[120px] px-3 py-2 border rounded-md"
                    required
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
                        送信中...
                      </>
                    ) : (
                      '送信する'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

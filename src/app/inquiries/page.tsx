'use client';

import { useEffect, useMemo, useState } from 'react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Loader2, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Inquiry {
  id: string;
  inquirer_type: 'tenant' | 'visitor';
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  property: {
    id: string;
    name: string;
  } | null;
  room: {
    id: string;
    room_number: string;
  } | null;
}

const statusOptions = [
  { value: 'new', label: '新規' },
  { value: 'in_progress', label: '対応中' },
  { value: 'resolved', label: '解決済み' },
  { value: 'closed', label: 'クローズ' },
];

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchInquiries = async () => {
    let query = supabase
      .from('inquiries')
      .select(
        '*, property:properties(id, name), room:rooms(id, room_number)'
      )
      .order('created_at', { ascending: false });

    if (activeTab === 'tenant') {
      query = query.eq('inquirer_type', 'tenant');
    } else if (activeTab === 'visitor') {
      query = query.eq('inquirer_type', 'visitor');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inquiries:', error);
    } else {
      setInquiries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInquiries();
  }, [activeTab]);

  const handleViewInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setResponse(inquiry.response || '');
    setStatus(inquiry.status);
  };

  const handleUpdateInquiry = async () => {
    if (!selectedInquiry) return;
    setSubmitting(true);

    await supabase
      .from('inquiries')
      .update({
        status,
        response: response || null,
        responded_at: response ? new Date().toISOString() : null,
      })
      .eq('id', selectedInquiry.id);

    setSubmitting(false);
    setSelectedInquiry(null);
    fetchInquiries();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="destructive">新規</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">対応中</Badge>;
      case 'resolved':
        return <Badge variant="default">解決済み</Badge>;
      case 'closed':
        return <Badge variant="outline">クローズ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="問い合わせ管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="問い合わせ管理">
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="tenant">入居者</TabsTrigger>
            <TabsTrigger value="visitor">利用者</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>受付日時</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>お名前</TableHead>
                      <TableHead>件名</TableHead>
                      <TableHead>物件</TableHead>
                      <TableHead className="text-center">ステータス</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inquiries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-gray-500"
                        >
                          問い合わせがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      inquiries.map((inquiry) => (
                        <TableRow key={inquiry.id}>
                          <TableCell>
                            {format(
                              new Date(inquiry.created_at),
                              'yyyy/MM/dd HH:mm',
                              { locale: ja }
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                inquiry.inquirer_type === 'tenant'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {inquiry.inquirer_type === 'tenant'
                                ? '入居者'
                                : '利用者'}
                            </Badge>
                          </TableCell>
                          <TableCell>{inquiry.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {inquiry.subject}
                          </TableCell>
                          <TableCell>
                            {inquiry.property ? (
                              <div>
                                <div>{inquiry.property.name}</div>
                                {inquiry.room && (
                                  <div className="text-sm text-gray-500">
                                    {inquiry.room.room_number}号室
                                  </div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(inquiry.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInquiry(inquiry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

      {/* 問い合わせ詳細ダイアログ */}
      <Dialog
        open={!!selectedInquiry}
        onOpenChange={() => setSelectedInquiry(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>問い合わせ詳細</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">お名前</Label>
                  <p className="font-medium">{selectedInquiry.name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">受付日時</Label>
                  <p>
                    {format(
                      new Date(selectedInquiry.created_at),
                      'yyyy/MM/dd HH:mm',
                      { locale: ja }
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> メール
                  </Label>
                  <p>{selectedInquiry.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> 電話
                  </Label>
                  <p>{selectedInquiry.phone || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-gray-500">件名</Label>
                <p className="font-medium">{selectedInquiry.subject}</p>
              </div>

              <div>
                <Label className="text-gray-500">内容</Label>
                <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                  {selectedInquiry.message}
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select value={status} onValueChange={setStatus}>
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

                <div className="space-y-2 mt-4">
                  <Label htmlFor="response">対応記録</Label>
                  <textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="対応内容を入力してください"
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedInquiry(null)}
                >
                  閉じる
                </Button>
                <Button onClick={handleUpdateInquiry} disabled={submitting}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

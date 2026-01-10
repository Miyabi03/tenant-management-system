'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [form, setForm] = useState({
    name: '',
    name_kana: '',
    email: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    contract_start_date: '',
    contract_end_date: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchTenant = async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching tenant:', error);
      } else if (data) {
        setForm({
          name: data.name,
          name_kana: data.name_kana || '',
          email: data.email || '',
          phone: data.phone || '',
          emergency_contact: data.emergency_contact || '',
          emergency_phone: data.emergency_phone || '',
          contract_start_date: data.contract_start_date,
          contract_end_date: data.contract_end_date,
          notes: data.notes || '',
        });
      }
      setLoading(false);
    };

    fetchTenant();
  }, [id, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase
      .from('tenants')
      .update({
        name: form.name,
        name_kana: form.name_kana || null,
        email: form.email || null,
        phone: form.phone || null,
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
        contract_start_date: form.contract_start_date,
        contract_end_date: form.contract_end_date,
        notes: form.notes || null,
      })
      .eq('id', id);

    if (error) {
      setError('入居者情報の更新に失敗しました');
      setSubmitting(false);
      return;
    }

    router.push(`/tenants/${id}`);
  };

  if (loading) {
    return (
      <AdminLayout title="入居者編集">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="入居者編集">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href={`/tenants/${id}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          入居者詳細に戻る
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>入居者情報の編集</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">氏名 *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">緊急連絡先（氏名）</Label>
                  <Input
                    id="emergency_contact"
                    value={form.emergency_contact}
                    onChange={(e) =>
                      setForm({ ...form, emergency_contact: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">緊急連絡先（電話）</Label>
                  <Input
                    id="emergency_phone"
                    value={form.emergency_phone}
                    onChange={(e) =>
                      setForm({ ...form, emergency_phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="notes">備考</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                      更新中...
                    </>
                  ) : (
                    '更新する'
                  )}
                </Button>
                <Link href={`/tenants/${id}`}>
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

'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Property {
  id: string;
  name: string;
  address: string;
  description: string | null;
  total_rooms: number;
  created_at: string;
  rooms: {
    id: string;
    status: string;
  }[];
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*, rooms(id, status)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
    } else {
      setProperties(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', deleteId);

    if (error) {
      console.error('Error deleting property:', error);
    } else {
      fetchProperties();
    }
    setDeleteId(null);
  };

  const getOccupancyRate = (rooms: Property['rooms']) => {
    if (!rooms || rooms.length === 0) return 0;
    const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
    return Math.round((occupiedRooms / rooms.length) * 100);
  };

  if (loading) {
    return (
      <AdminLayout title="物件管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="物件管理">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">物件一覧</h2>
          <Link href="/properties/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物件名</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead className="text-center">部屋数</TableHead>
                  <TableHead className="text-center">空室</TableHead>
                  <TableHead className="text-center">稼働率</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      物件が登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  properties.map((property) => {
                    const vacantRooms = property.rooms.filter(
                      (r) => r.status === 'vacant'
                    ).length;
                    const occupancyRate = getOccupancyRate(property.rooms);

                    return (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">
                          {property.name}
                        </TableCell>
                        <TableCell>{property.address}</TableCell>
                        <TableCell className="text-center">
                          {property.rooms.length}室
                        </TableCell>
                        <TableCell className="text-center">
                          {vacantRooms}室
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={occupancyRate >= 80 ? 'default' : 'destructive'}
                          >
                            {occupancyRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/properties/${property.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/properties/${property.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(property.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>物件を削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。物件に関連する部屋データも全て削除されます。
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

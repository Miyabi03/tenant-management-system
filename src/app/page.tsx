'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, DoorOpen, Banknote } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address: string;
  description: string | null;
  rooms: {
    id: string;
    room_number: string;
    rent: number;
    management_fee: number;
    room_type: string | null;
    area: number | null;
    status: string;
  }[];
}

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, rooms(id, room_number, rent, management_fee, room_type, area, status)')
        .order('name');

      if (error) {
        console.error('Error fetching properties:', error);
      } else {
        // 空室がある物件のみフィルタ
        const propertiesWithVacant = (data || []).filter((p) =>
          p.rooms.some((r: { status: string }) => r.status === 'vacant')
        );
        setProperties(propertiesWithVacant);
      }
      setLoading(false);
    };

    fetchProperties();
  }, []);

  const getVacantRooms = (rooms: Property['rooms']) => {
    return rooms.filter((r) => r.status === 'vacant');
  };

  const getMinRent = (rooms: Property['rooms']) => {
    const vacantRooms = getVacantRooms(rooms);
    if (vacantRooms.length === 0) return 0;
    return Math.min(...vacantRooms.map((r) => r.rent));
  };

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">空き物件一覧</h1>
          <p className="text-gray-600">
            現在空室のある物件をご覧いただけます。詳細からお問い合わせください。
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              現在空室のある物件はありません
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => {
              const vacantRooms = getVacantRooms(property.rooms);
              const minRent = getMinRent(property.rooms);

              return (
                <Card key={property.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{property.name}</span>
                      <Badge variant="secondary">
                        空室 {vacantRooms.length}室
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{property.address}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Banknote className="h-4 w-4 text-gray-400" />
                      <span>
                        家賃 <span className="font-bold text-lg">{minRent.toLocaleString()}</span>円〜
                      </span>
                    </div>

                    {property.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {property.description}
                      </p>
                    )}

                    <Link href={`/vacant/${property.id}`}>
                      <Button className="w-full">詳細を見る</Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>&copy; 2025 入居者管理システム</p>
        </div>
      </footer>
    </div>
  );
}

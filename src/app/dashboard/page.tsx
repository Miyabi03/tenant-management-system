'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  DoorOpen,
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardData {
  totalProperties: number;
  totalRooms: number;
  vacantRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  pendingInquiries: number;
  monthlyIncome: number;
  monthlyExpense: number;
  propertyStats: {
    name: string;
    totalRooms: number;
    vacantRooms: number;
    occupancyRate: number;
  }[];
}

const COLORS = ['#22c55e', '#ef4444'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 物件データを取得
        const { data: properties } = await supabase
          .from('properties')
          .select('*, rooms(*)');

        // 問い合わせ数を取得
        const { count: pendingInquiries } = await supabase
          .from('inquiries')
          .select('*', { count: 'exact', head: true })
          .in('status', ['new', 'in_progress']);

        // 今月の収支を取得
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const { data: finances } = await supabase
          .from('finances')
          .select('*')
          .gte('date', firstDay.toISOString().split('T')[0])
          .lte('date', lastDay.toISOString().split('T')[0]);

        // データを集計
        let totalRooms = 0;
        let vacantRooms = 0;
        let occupiedRooms = 0;
        const propertyStats: DashboardData['propertyStats'] = [];

        if (properties) {
          properties.forEach((property) => {
            const rooms = property.rooms || [];
            const propertyTotalRooms = rooms.length;
            const propertyVacantRooms = rooms.filter(
              (r: { status: string }) => r.status === 'vacant'
            ).length;
            const propertyOccupiedRooms = propertyTotalRooms - propertyVacantRooms;

            totalRooms += propertyTotalRooms;
            vacantRooms += propertyVacantRooms;
            occupiedRooms += propertyOccupiedRooms;

            propertyStats.push({
              name: property.name,
              totalRooms: propertyTotalRooms,
              vacantRooms: propertyVacantRooms,
              occupancyRate:
                propertyTotalRooms > 0
                  ? Math.round(
                      ((propertyTotalRooms - propertyVacantRooms) /
                        propertyTotalRooms) *
                        100
                    )
                  : 0,
            });
          });
        }

        const monthlyIncome =
          finances
            ?.filter((f) => f.type === 'income')
            .reduce((sum, f) => sum + f.amount, 0) || 0;

        const monthlyExpense =
          finances
            ?.filter((f) => f.type === 'expense')
            .reduce((sum, f) => sum + f.amount, 0) || 0;

        setData({
          totalProperties: properties?.length || 0,
          totalRooms,
          vacantRooms,
          occupiedRooms,
          occupancyRate:
            totalRooms > 0
              ? Math.round(((totalRooms - vacantRooms) / totalRooms) * 100)
              : 0,
          pendingInquiries: pendingInquiries || 0,
          monthlyIncome,
          monthlyExpense,
          propertyStats,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="ダッシュボード">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  const pieData = [
    { name: '入居中', value: data?.occupiedRooms || 0 },
    { name: '空室', value: data?.vacantRooms || 0 },
  ];

  const profit = (data?.monthlyIncome || 0) - (data?.monthlyExpense || 0);

  return (
    <AdminLayout title="ダッシュボード">
      <div className="space-y-6">
        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                物件数
              </CardTitle>
              <Building className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.totalProperties}</div>
              <p className="text-xs text-gray-500 mt-1">
                部屋数: {data?.totalRooms}室
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                空室状況
              </CardTitle>
              <DoorOpen className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.vacantRooms}
                <span className="text-sm font-normal text-gray-500">室</span>
              </div>
              <div className="flex items-center mt-1">
                <Badge
                  variant={
                    (data?.occupancyRate || 0) >= 80 ? 'default' : 'destructive'
                  }
                >
                  稼働率 {data?.occupancyRate}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                未対応の問い合わせ
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.pendingInquiries}</div>
              <p className="text-xs text-gray-500 mt-1">件の対応待ち</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                今月の収支
              </CardTitle>
              <Wallet className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {profit >= 0 ? '+' : ''}
                {profit.toLocaleString()}円
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="flex items-center text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data?.monthlyIncome.toLocaleString()}円
                </span>
                <span className="flex items-center text-red-600">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {data?.monthlyExpense.toLocaleString()}円
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* チャート */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 物件別稼働率 */}
          <Card>
            <CardHeader>
              <CardTitle>物件別稼働率</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.propertyStats && data.propertyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.propertyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, '稼働率']}
                    />
                    <Bar dataKey="occupancyRate" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  物件データがありません
                </div>
              )}
            </CardContent>
          </Card>

          {/* 空室状況の円グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>全体の空室状況</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.totalRooms && data.totalRooms > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  部屋データがありません
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

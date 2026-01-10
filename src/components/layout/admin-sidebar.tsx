'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Building2,
  LayoutDashboard,
  Building,
  Users,
  Wrench,
  MessageSquare,
  Wallet,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { href: '/properties', icon: Building, label: '物件管理' },
  { href: '/tenants', icon: Users, label: '入居者管理' },
  { href: '/maintenance', icon: Wrench, label: '修繕・メンテナンス' },
  { href: '/inquiries', icon: MessageSquare, label: '問い合わせ' },
  { href: '/finances', icon: Wallet, label: '収支管理' },
  { href: '/settings', icon: Settings, label: '設定' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* ロゴ */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span className="font-bold">入居者管理</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <Building2 className="h-6 w-6" />
          </Link>
        )}
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-800'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 折りたたみボタン */}
      <div className="px-2 py-2 border-t border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* ログアウト */}
      <div className="px-2 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-gray-400 hover:text-white hover:bg-gray-800',
            collapsed ? 'justify-center' : 'justify-start'
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-3">ログアウト</span>}
        </Button>
      </div>
    </aside>
  );
}

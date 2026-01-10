// 物件
export interface Property {
  id: string;
  name: string;
  address: string;
  description: string | null;
  total_rooms: number;
  created_at: string;
  updated_at: string;
}

// 部屋
export interface Room {
  id: string;
  property_id: string;
  room_number: string;
  floor: number | null;
  rent: number;
  management_fee: number;
  deposit: number;
  key_money: number;
  room_type: string | null;
  area: number | null;
  status: 'vacant' | 'occupied' | 'reserved';
  description: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
}

// 入居者
export interface Tenant {
  id: string;
  room_id: string;
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
  created_at: string;
  updated_at: string;
  room?: Room;
}

// 入退去履歴
export interface MoveHistory {
  id: string;
  room_id: string;
  tenant_id: string;
  move_type: 'in' | 'out';
  move_date: string;
  notes: string | null;
  created_at: string;
  room?: Room;
  tenant?: Tenant;
}

// 修繕・メンテナンス
export interface Maintenance {
  id: string;
  property_id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  cost: number | null;
  reported_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  contractor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
  room?: Room;
}

// 問い合わせ
export interface Inquiry {
  id: string;
  property_id: string | null;
  room_id: string | null;
  tenant_id: string | null;
  inquirer_type: 'tenant' | 'visitor';
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
  room?: Room;
  tenant?: Tenant;
}

// 収支
export interface Finance {
  id: string;
  property_id: string;
  room_id: string | null;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  property?: Property;
  room?: Room;
}

// 管理者
export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

// ダッシュボード用の統計
export interface DashboardStats {
  totalProperties: number;
  totalRooms: number;
  vacantRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  pendingInquiries: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyProfit: number;
  propertyStats: {
    propertyId: string;
    propertyName: string;
    totalRooms: number;
    vacantRooms: number;
    occupancyRate: number;
  }[];
}

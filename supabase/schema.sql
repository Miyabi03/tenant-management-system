-- 入居者管理システム データベーススキーマ

-- 管理者テーブル
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 物件テーブル
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 部屋テーブル
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER,
  rent INTEGER NOT NULL DEFAULT 0,
  management_fee INTEGER NOT NULL DEFAULT 0,
  deposit INTEGER NOT NULL DEFAULT 0,
  key_money INTEGER NOT NULL DEFAULT 0,
  room_type TEXT,
  area DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'reserved')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, room_number)
);

-- 入居者テーブル
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_kana TEXT,
  email TEXT,
  phone TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 入退去履歴テーブル
CREATE TABLE move_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  move_type TEXT NOT NULL CHECK (move_type IN ('in', 'out')),
  move_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 修繕・メンテナンステーブル
CREATE TABLE maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  cost INTEGER,
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_date DATE,
  completed_date DATE,
  contractor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 問い合わせテーブル
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  inquirer_type TEXT NOT NULL CHECK (inquirer_type IN ('tenant', 'visitor')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 収支テーブル
CREATE TABLE finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_rooms_property_id ON rooms(property_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_tenants_room_id ON tenants(room_id);
CREATE INDEX idx_move_histories_room_id ON move_histories(room_id);
CREATE INDEX idx_move_histories_tenant_id ON move_histories(tenant_id);
CREATE INDEX idx_maintenances_property_id ON maintenances(property_id);
CREATE INDEX idx_maintenances_status ON maintenances(status);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_inquirer_type ON inquiries(inquirer_type);
CREATE INDEX idx_finances_property_id ON finances(property_id);
CREATE INDEX idx_finances_type ON finances(type);
CREATE INDEX idx_finances_date ON finances(date);

-- 更新日時自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON maintenances FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_finances_updated_at BEFORE UPDATE ON finances FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 部屋の総数を物件に自動反映するトリガー
CREATE OR REPLACE FUNCTION update_property_total_rooms()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE properties SET total_rooms = total_rooms + 1 WHERE id = NEW.property_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE properties SET total_rooms = total_rooms - 1 WHERE id = OLD.property_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_total_rooms
AFTER INSERT OR DELETE ON rooms
FOR EACH ROW EXECUTE FUNCTION update_property_total_rooms();

-- RLS (Row Level Security) ポリシー
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーのみアクセス可能なポリシー
CREATE POLICY "Allow authenticated users" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON properties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON rooms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON tenants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON move_histories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON maintenances FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON inquiries FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON finances FOR ALL USING (auth.role() = 'authenticated');

-- 空き物件は誰でも閲覧可能（利用者向け）
CREATE POLICY "Allow public read vacant rooms" ON rooms FOR SELECT USING (status = 'vacant');
CREATE POLICY "Allow public read properties" ON properties FOR SELECT USING (true);

-- 問い合わせは誰でも作成可能（利用者向け）
CREATE POLICY "Allow public insert inquiries" ON inquiries FOR INSERT WITH CHECK (true);

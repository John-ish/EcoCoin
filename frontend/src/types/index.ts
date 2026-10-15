export type UserRole = 'student' | 'staff' | 'admin';

export type WasteCategory = 'plastic' | 'paper' | 'metal' | 'glass' | 'organic' | 'general' | 'multi-stream';

export type BinStatus = 'NORMAL' | 'NEAR_FULL' | 'FULL' | 'MAINTENANCE' | 'OFFLINE';

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_STAFF_REVIEW';

export type TransactionType = 'DEPOSIT_REWARD' | 'VOUCHER_REDEMPTION' | 'STREAK_BONUS' | 'ADMIN_ADJUSTMENT' | 'TRANSFER';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  student_id: string;
  role: UserRole;
  department_id?: string;
  department_name?: string;
  avatar_url?: string;
  balance: number;
  lifetime_earned: number;
  total_kg_recycled: number;
  streak_days: number;
  last_active_at?: string;
}

export interface Bin {
  id: string;
  bin_code: string;
  name: string;
  category: WasteCategory;
  campus_zone: string;
  building: string;
  floor: string;
  latitude: number;
  longitude: number;
  fill_level_pct: number;
  capacity_liters: number;
  battery_level_pct: number;
  status: BinStatus;
  last_collected_at: string;
}

export interface BoundingBoxDetection {
  raw_label: string;
  category: WasteCategory;
  confidence: number;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] or [x1, y1, x2, y2]
}

export interface Deposit {
  id: string;
  student_id: string;
  student_name?: string;
  bin_id: string;
  bin_name?: string;
  reported_category: WasteCategory;
  ai_predicted_category?: WasteCategory;
  ai_confidence?: number;
  ai_bounding_boxes?: BoundingBoxDetection[];
  image_url?: string;
  annotated_image?: string;
  estimated_weight_kg: number;
  coins_awarded: number;
  status: DepositStatus;
  verification_notes?: string;
  verified_by?: string;
  created_at: string;
  verified_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  reference_type: 'deposit' | 'redemption' | 'manual_adjustment' | 'bonus';
  reference_id?: string;
  description: string;
  created_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  category: 'food' | 'printing' | 'merchandise' | 'sustainable_gear' | 'transport';
  cost_coins: number;
  sponsor: string;
  discount_value: string;
  terms: string;
  stock_available: number;
  image_url?: string;
  is_active: boolean;
}

export interface Redemption {
  id: string;
  student_id: string;
  reward_id: string;
  reward_title: string;
  voucher_code: string;
  coins_spent: number;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  building: string;
  total_eco_coins: number;
  total_kg_diverted: number;
  student_count: number;
}

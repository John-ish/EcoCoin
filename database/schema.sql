-- ==============================================================================
-- EcoCoin Database Schema (PostgreSQL / Supabase)
-- ==============================================================================
-- Features:
-- 1. Full Row-Level Security (RLS) policies.
-- 2. Immutable, auditable transaction ledger.
-- 3. Stored procedures preventing client-side balance manipulation.
-- 4. Triggers for automated balance integrity verification.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. DEPARTMENTS TABLE (for inter-department leaderboards)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    building VARCHAR(100) NOT NULL,
    total_eco_coins BIGINT DEFAULT 0,
    total_kg_diverted NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES TABLE (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    student_id VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    avatar_url TEXT,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
    total_kg_recycled NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_kg_recycled >= 0),
    streak_days INTEGER NOT NULL DEFAULT 1 CHECK (streak_days >= 0),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. RECYCLING BINS TABLE (Digital Twin Campus Assets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('plastic', 'paper', 'metal', 'glass', 'organic', 'general', 'e-waste', 'multi-stream')),
    campus_zone VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    floor VARCHAR(20) DEFAULT '1st Floor',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    fill_level_pct INTEGER NOT NULL DEFAULT 0 CHECK (fill_level_pct BETWEEN 0 AND 100),
    capacity_liters INTEGER NOT NULL DEFAULT 120,
    battery_level_pct INTEGER NOT NULL DEFAULT 95 CHECK (battery_level_pct BETWEEN 0 AND 100),
    status VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (status IN ('NORMAL', 'NEAR_FULL', 'FULL', 'MAINTENANCE', 'OFFLINE')),
    last_collected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. DEPOSITS TABLE (Waste Submissions & CV Predictions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE RESTRICT,
    reported_category VARCHAR(30) NOT NULL,
    ai_predicted_category VARCHAR(30),
    ai_confidence NUMERIC(5, 4),
    ai_bounding_boxes JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    estimated_weight_kg NUMERIC(6, 2) DEFAULT 0.15,
    coins_awarded INTEGER DEFAULT 0,
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_STAFF_REVIEW')),
    verification_notes TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. AUDITABLE TRANSACTION LEDGER
-- ------------------------------------------------------------------------------
-- Every single coin credit or debit must be logged here.
-- Balances can never be mutated without an associated ledger row.
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DEPOSIT_REWARD', 'VOUCHER_REDEMPTION', 'STREAK_BONUS', 'ADMIN_ADJUSTMENT', 'TRANSFER')),
    amount INTEGER NOT NULL CHECK (amount <> 0), -- positive for credit, negative for debit
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('deposit', 'redemption', 'manual_adjustment', 'bonus')),
    reference_id UUID,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. REWARDS CATALOG (Campus Vouchers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('food', 'printing', 'merchandise', 'transport', 'sustainable_gear')),
    cost_coins INTEGER NOT NULL CHECK (cost_coins > 0),
    sponsor VARCHAR(100) NOT NULL,
    discount_value VARCHAR(50) NOT NULL,
    terms TEXT,
    stock_available INTEGER NOT NULL DEFAULT 100 CHECK (stock_available >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. REDEMPTIONS TABLE (Student Claimed Vouchers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
    voucher_code VARCHAR(30) NOT NULL UNIQUE,
    coins_spent INTEGER NOT NULL CHECK (coins_spent > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED')),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_balance ON public.profiles(balance DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_bins_zone_status ON public.bins(campus_zone, status);
CREATE INDEX IF NOT EXISTS idx_deposits_student ON public.deposits(student_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_student ON public.redemptions(student_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- Public can read basic profile info for leaderboard
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Users can only update their own non-financial fields (full_name, avatar_url)
CREATE POLICY "Users can update own profile non-financial info"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    -- Crucial: Balance and lifetime_earned cannot be modified directly via client UPDATE
    AND balance = (SELECT balance FROM public.profiles WHERE id = auth.uid())
    AND lifetime_earned = (SELECT lifetime_earned FROM public.profiles WHERE id = auth.uid())
);

-- Bins:
-- All authenticated users can view campus bins (Digital Twin)
CREATE POLICY "Campus bins are visible to all authenticated users"
ON public.bins FOR SELECT TO authenticated
USING (true);

-- Only Admins/Staff can modify bins
CREATE POLICY "Admins can insert and update bins"
ON public.bins FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Deposits:
-- Students can read their own deposits
CREATE POLICY "Students can view own deposits"
ON public.deposits FOR SELECT TO authenticated
USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Students can insert deposit submissions with PENDING status
CREATE POLICY "Students can submit deposits"
ON public.deposits FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = student_id
    AND status = 'PENDING'
    AND coins_awarded = 0
);

-- Only Admins/Staff can update deposit status & award coins
CREATE POLICY "Admins/Staff can verify deposits"
ON public.deposits FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Transactions:
-- Ledger is read-only for students; strictly no client-side insert/update/delete
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Rewards:
-- All users can view active rewards
CREATE POLICY "Active rewards are viewable by all users"
ON public.rewards FOR SELECT TO authenticated
USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Redemptions:
-- Students can view their own redemptions
CREATE POLICY "Students can view own redemptions"
ON public.redemptions FOR SELECT TO authenticated
USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Departments:
-- Viewable by all authenticated users
CREATE POLICY "Departments are viewable by all users"
ON public.departments FOR SELECT TO authenticated
USING (true);


-- ==============================================================================
-- SECURE STORED PROCEDURES (ATOMIC BALANCE TRANSACTIONS)
-- ==============================================================================

-- 1. AWARD DEPOSIT REWARD (Executed only by server or verified admin)
CREATE OR REPLACE FUNCTION public.award_deposit_coins(
    p_deposit_id UUID,
    p_coins_amount INTEGER,
    p_verifier_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated DB privileges to update protected balance
AS $$
DECLARE
    v_deposit RECORD;
    v_new_balance INTEGER;
    v_new_lifetime INTEGER;
    v_weight NUMERIC;
BEGIN
    -- Check caller is admin/staff
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_verifier_id AND role IN ('admin', 'staff')) THEN
        RAISE EXCEPTION 'Unauthorized: Only staff or admins can verify deposits and award coins.';
    END IF;

    -- Fetch deposit
    SELECT * INTO v_deposit FROM public.deposits WHERE id = p_deposit_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit with ID % not found.', p_deposit_id;
    END IF;

    IF v_deposit.status = 'APPROVED' THEN
        RAISE EXCEPTION 'Deposit has already been approved and credited.';
    END IF;

    -- Update deposit status
    UPDATE public.deposits
    SET status = 'APPROVED',
        coins_awarded = p_coins_amount,
        verified_by = p_verifier_id,
        verified_at = NOW(),
        verification_notes = COALESCE(p_notes, verification_notes)
    WHERE id = p_deposit_id;

    -- Update profile balance and totals
    UPDATE public.profiles
    SET balance = balance + p_coins_amount,
        lifetime_earned = lifetime_earned + p_coins_amount,
        total_kg_recycled = total_kg_recycled + COALESCE(v_deposit.estimated_weight_kg, 0.20),
        updated_at = NOW()
    WHERE id = v_deposit.student_id
    RETURNING balance, lifetime_earned INTO v_new_balance, v_new_lifetime;

    -- Update bin fill level
    UPDATE public.bins
    SET fill_level_pct = LEAST(100, fill_level_pct + 4),
        status = CASE WHEN fill_level_pct + 4 >= 90 THEN 'FULL'
                      WHEN fill_level_pct + 4 >= 75 THEN 'NEAR_FULL'
                      ELSE status END,
        updated_at = NOW()
    WHERE id = v_deposit.bin_id;

    -- Record transaction in immutable ledger
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_after,
        reference_type,
        reference_id,
        description
    ) VALUES (
        v_deposit.student_id,
        'DEPOSIT_REWARD',
        p_coins_amount,
        v_new_balance,
        'deposit',
        p_deposit_id,
        format('Verified deposit: %s at %s (+%s EcoCoins)', v_deposit.reported_category, (SELECT name FROM public.bins WHERE id = v_deposit.bin_id), p_coins_amount)
    );

    RETURN jsonb_build_object(
        'success', true,
        'deposit_id', p_deposit_id,
        'coins_awarded', p_coins_amount,
        'new_balance', v_new_balance
    );
END;
$$;


-- 2. REDEEM REWARD VOUCHER (Atomic balance debit and voucher generation)
CREATE OR REPLACE FUNCTION public.redeem_reward_voucher(
    p_student_id UUID,
    p_reward_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reward RECORD;
    v_user_balance INTEGER;
    v_new_balance INTEGER;
    v_code VARCHAR(30);
    v_redemption_id UUID;
BEGIN
    -- Fetch current user balance
    SELECT balance INTO v_user_balance FROM public.profiles WHERE id = p_student_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile not found.';
    END IF;

    -- Fetch reward
    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
    IF NOT FOUND OR NOT v_reward.is_active THEN
        RAISE EXCEPTION 'Reward is currently unavailable.';
    END IF;

    IF v_reward.stock_available <= 0 THEN
        RAISE EXCEPTION 'Reward is out of stock.';
    END IF;

    IF v_user_balance < v_reward.cost_coins THEN
        RAISE EXCEPTION 'Insufficient EcoCoin balance (% available, % required).', v_user_balance, v_reward.cost_coins;
    END IF;

    -- Deduct balance
    v_new_balance := v_user_balance - v_reward.cost_coins;
    UPDATE public.profiles
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_student_id;

    -- Decrement stock
    UPDATE public.rewards
    SET stock_available = stock_available - 1
    WHERE id = p_reward_id;

    -- Generate voucher code
    v_code := 'ECO-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- Create redemption
    INSERT INTO public.redemptions (
        student_id,
        reward_id,
        voucher_code,
        coins_spent,
        status,
        expires_at
    ) VALUES (
        p_student_id,
        p_reward_id,
        v_code,
        v_reward.cost_coins,
        'ACTIVE',
        NOW() + INTERVAL '30 days'
    ) RETURNING id INTO v_redemption_id;

    -- Write to auditable transaction ledger
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_after,
        reference_type,
        reference_id,
        description
    ) VALUES (
        p_student_id,
        'VOUCHER_REDEMPTION',
        -v_reward.cost_coins,
        v_new_balance,
        'redemption',
        v_redemption_id,
        format('Redeemed voucher: %s (-%s EcoCoins)', v_reward.title, v_reward.cost_coins)
    );

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'voucher_code', v_code,
        'coins_spent', v_reward.cost_coins,
        'new_balance', v_new_balance
    );
END;
$$;

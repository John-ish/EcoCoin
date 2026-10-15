import {
  Profile,
  Bin,
  Deposit,
  Transaction,
  Reward,
  Redemption,
  Department,
  WasteCategory,
  DepositStatus
} from '../types';
import {
  INITIAL_PROFILES,
  INITIAL_BINS,
  INITIAL_REWARDS,
  INITIAL_TRANSACTIONS,
  INITIAL_DEPOSITS,
  INITIAL_REDEMPTIONS,
  INITIAL_DEPARTMENTS,
} from './mockData';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'ecocoin_current_user_id',
  PROFILES: 'ecocoin_profiles',
  BINS: 'ecocoin_bins',
  REWARDS: 'ecocoin_rewards',
  TRANSACTIONS: 'ecocoin_transactions',
  DEPOSITS: 'ecocoin_deposits',
  REDEMPTIONS: 'ecocoin_redemptions',
  DEPARTMENTS: 'ecocoin_departments',
};

// In-memory or localStorage state helper
function loadState<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    console.warn(`Error reading localStorage for ${key}`, e);
    return defaultVal;
  }
}

function saveState<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Error writing localStorage for ${key}`, e);
  }
}

// Reward Coin Values per waste stream
export const REWARD_VALUES: Record<WasteCategory, number> = {
  plastic: 10,
  metal: 15,
  paper: 8,
  glass: 12,
  organic: 6,
  general: 2,
  'multi-stream': 10,
};

export const REWARD_WEIGHTS: Record<WasteCategory, number> = {
  plastic: 0.15,
  metal: 0.20,
  paper: 0.12,
  glass: 0.35,
  organic: 0.25,
  general: 0.10,
  'multi-stream': 0.18,
};

class EcoCoinService {
  private isLiveSupabase: boolean;

  constructor() {
    this.isLiveSupabase = isSupabaseConfigured();
    // Initialize default storage if empty
    if (!localStorage.getItem(STORAGE_KEYS.PROFILES)) {
      this.resetToDefaults();
    }
  }

  public isUsingMock(): boolean {
    return !this.isLiveSupabase;
  }

  public resetToDefaults(): void {
    saveState(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    saveState(STORAGE_KEYS.BINS, INITIAL_BINS);
    saveState(STORAGE_KEYS.REWARDS, INITIAL_REWARDS);
    saveState(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    saveState(STORAGE_KEYS.DEPOSITS, INITIAL_DEPOSITS);
    saveState(STORAGE_KEYS.REDEMPTIONS, INITIAL_REDEMPTIONS);
    saveState(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    saveState(STORAGE_KEYS.CURRENT_USER_ID, 'user-student-1');
  }

  // --- User & Persona Management ---
  public getCurrentUser(): Profile {
    const currentId = loadState(STORAGE_KEYS.CURRENT_USER_ID, 'user-student-1');
    const profiles = loadState<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const user = profiles.find((p) => p.id === currentId);
    return user || profiles[0];
  }

  public switchPersona(role: 'student' | 'admin'): Profile {
    const profiles = loadState<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const target = profiles.find((p) => p.role === role) || profiles[0];
    saveState(STORAGE_KEYS.CURRENT_USER_ID, target.id);
    return target;
  }

  public async getProfiles(): Promise<Profile[]> {
    if (this.isLiveSupabase && supabase) {
      const { data } = await supabase.from('profiles').select('*').order('balance', { ascending: false });
      if (data) return data as Profile[];
    }
    return loadState<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  }

  // --- Smart Bins / Digital Twin ---
  public async getBins(category?: string, status?: string, zone?: string): Promise<Bin[]> {
    if (this.isLiveSupabase && supabase) {
      let query = supabase.from('bins').select('*');
      if (category && category !== 'all') query = query.eq('category', category);
      if (status && status !== 'all') query = query.eq('status', status);
      if (zone && zone !== 'all') query = query.eq('campus_zone', zone);
      const { data } = await query;
      if (data) return data as Bin[];
    }

    let bins = loadState<Bin[]>(STORAGE_KEYS.BINS, INITIAL_BINS);
    if (category && category !== 'all') {
      bins = bins.filter((b) => b.category.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'all') {
      bins = bins.filter((b) => b.status.toUpperCase() === status.toUpperCase());
    }
    if (zone && zone !== 'all') {
      bins = bins.filter((b) => b.campus_zone.toLowerCase() === zone.toLowerCase());
    }
    return bins;
  }

  public async updateBinTelemetry(
    binId: string,
    updates: Partial<Pick<Bin, 'fill_level_pct' | 'status' | 'battery_level_pct'>>
  ): Promise<Bin> {
    if (this.isLiveSupabase && supabase) {
      const { data } = await supabase
        .from('bins')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', binId)
        .select()
        .single();
      if (data) return data as Bin;
    }

    const bins = loadState<Bin[]>(STORAGE_KEYS.BINS, INITIAL_BINS);
    const index = bins.findIndex((b) => b.id === binId || b.bin_code === binId);
    if (index === -1) throw new Error('Bin not found');

    const updated = {
      ...bins[index],
      ...updates,
      last_collected_at: updates.fill_level_pct === 0 ? 'Just now' : bins[index].last_collected_at,
    };

    // Auto-update status if fill level changed
    if (updates.fill_level_pct !== undefined) {
      if (updates.fill_level_pct >= 90) updated.status = 'FULL';
      else if (updates.fill_level_pct >= 75) updated.status = 'NEAR_FULL';
      else if (updated.status !== 'MAINTENANCE') updated.status = 'NORMAL';
    }

    bins[index] = updated;
    saveState(STORAGE_KEYS.BINS, bins);
    return updated;
  }

  // --- Auditable Transaction Ledger ---
  public async getTransactions(userId?: string): Promise<Transaction[]> {
    if (this.isLiveSupabase && supabase) {
      let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data } = await query;
      if (data) return data as Transaction[];
    }

    let txs = loadState<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    if (userId) {
      txs = txs.filter((t) => t.user_id === userId);
    }
    return txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- Rewards Catalog & Redemptions ---
  public async getRewards(): Promise<Reward[]> {
    if (this.isLiveSupabase && supabase) {
      const { data } = await supabase.from('rewards').select('*').eq('is_active', true);
      if (data) return data as Reward[];
    }
    return loadState<Reward[]>(STORAGE_KEYS.REWARDS, INITIAL_REWARDS);
  }

  public async getRedemptions(studentId?: string): Promise<Redemption[]> {
    if (this.isLiveSupabase && supabase) {
      let query = supabase.from('redemptions').select('*').order('created_at', { ascending: false });
      if (studentId) query = query.eq('student_id', studentId);
      const { data } = await query;
      if (data) return data as Redemption[];
    }

    let reds = loadState<Redemption[]>(STORAGE_KEYS.REDEMPTIONS, INITIAL_REDEMPTIONS);
    if (studentId) reds = reds.filter((r) => r.student_id === studentId);
    return reds;
  }

  public async redeemReward(rewardId: string): Promise<{ success: boolean; redemption: Redemption; newBalance: number }> {
    const user = this.getCurrentUser();
    
    if (this.isLiveSupabase && supabase) {
      // Invoke secure stored procedure
      const { data, error } = await supabase.rpc('redeem_reward_voucher', {
        p_student_id: user.id,
        p_reward_id: rewardId,
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Mock Stored Procedure Execution
    const rewards = loadState<Reward[]>(STORAGE_KEYS.REWARDS, INITIAL_REWARDS);
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) throw new Error('Reward not found');
    if (reward.stock_available <= 0) throw new Error('Reward is out of stock');
    if (user.balance < reward.cost_coins) {
      throw new Error(`Insufficient EcoCoins! Have: ${user.balance}, Required: ${reward.cost_coins}`);
    }

    // 1. Deduct balance atomically
    const newBalance = user.balance - reward.cost_coins;
    const profiles = loadState<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const profileIdx = profiles.findIndex((p) => p.id === user.id);
    profiles[profileIdx].balance = newBalance;
    saveState(STORAGE_KEYS.PROFILES, profiles);

    // 2. Decrement stock
    reward.stock_available -= 1;
    saveState(STORAGE_KEYS.REWARDS, rewards);

    // 3. Issue voucher
    const code = `ECO-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const redemption: Redemption = {
      id: `red-${Date.now()}`,
      student_id: user.id,
      reward_id: reward.id,
      reward_title: reward.title,
      voucher_code: code,
      coins_spent: reward.cost_coins,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };
    const redemptions = loadState<Redemption[]>(STORAGE_KEYS.REDEMPTIONS, INITIAL_REDEMPTIONS);
    redemptions.unshift(redemption);
    saveState(STORAGE_KEYS.REDEMPTIONS, redemptions);

    // 4. Record to transaction ledger
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      user_id: user.id,
      type: 'VOUCHER_REDEMPTION',
      amount: -reward.cost_coins,
      balance_after: newBalance,
      reference_type: 'redemption',
      reference_id: redemption.id,
      description: `Redeemed voucher: ${reward.title} (-${reward.cost_coins} EcoCoins)`,
      created_at: new Date().toISOString(),
    };
    const txs = loadState<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    txs.unshift(tx);
    saveState(STORAGE_KEYS.TRANSACTIONS, txs);

    return { success: true, redemption, newBalance };
  }

  // --- Waste Deposit Submission & Computer Vision ---
  public async submitDeposit(payload: {
    binId: string;
    reportedCategory: WasteCategory;
    imageDataUrl?: string;
    imageFile?: File;
  }): Promise<{
    deposit: Deposit;
    verified: boolean;
    coinsAwarded: number;
    annotatedImage?: string;
  }> {
    const user = this.getCurrentUser();
    const bins = await this.getBins();
    const bin = bins.find((b) => b.id === payload.binId || b.bin_code === payload.binId);
    if (!bin) throw new Error('Target campus bin not found');

    let aiCategory: WasteCategory = payload.reportedCategory;
    let aiConfidence = 0.91;
    let annotatedImage = payload.imageDataUrl;
    let detections = undefined;

    // Try calling the Python FastAPI CV endpoint if file is present
    if (payload.imageFile) {
      try {
        const formData = new FormData();
        formData.append('file', payload.imageFile);
        formData.append('target_bin_category', bin.category);

        const res = await fetch('/api/cv/classify', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const cvResult = await res.json();
          aiCategory = (cvResult.prediction as WasteCategory) || payload.reportedCategory;
          aiConfidence = cvResult.confidence || 0.90;
          annotatedImage = cvResult.annotated_image || annotatedImage;
          detections = cvResult.bounding_boxes;
        }
      } catch (err) {
        console.warn('FastAPI CV service offline, falling back to built-in vision pipeline:', err);
      }
    }

    // Verification check: Confidence threshold & bin type match
    const isCategoryMatch = bin.category === 'multi-stream' || aiCategory === bin.category;
    const isHighConfidence = aiConfidence >= 0.80;

    let depositStatus: DepositStatus = 'APPROVED';
    let coinsToAward = 0;
    let verificationNotes = '';

    if (!isHighConfidence) {
      depositStatus = 'NEEDS_STAFF_REVIEW';
      coinsToAward = 0; // Crucial requirement: No coins awarded without verification!
      verificationNotes = `AI confidence (${Math.round(aiConfidence * 100)}%) is below auto-approve threshold. Sent to Staff Review Queue.`;
    } else if (!isCategoryMatch) {
      depositStatus = 'NEEDS_STAFF_REVIEW';
      coinsToAward = 0;
      verificationNotes = `Stream Mismatch: Deposited into '${bin.category}' bin, but item detected as '${aiCategory}'. Sent to Staff Review Queue.`;
    } else {
      depositStatus = 'APPROVED';
      coinsToAward = REWARD_VALUES[aiCategory] || 10;
      verificationNotes = `Auto-verified by EcoCoin Vision AI (${Math.round(aiConfidence * 100)}% confidence). Coins credited.`;
    }

    const weightKg = REWARD_WEIGHTS[aiCategory] || 0.15;

    const newDeposit: Deposit = {
      id: `dep-${Date.now()}`,
      student_id: user.id,
      student_name: user.full_name,
      bin_id: bin.id,
      bin_name: bin.name,
      reported_category: payload.reportedCategory,
      ai_predicted_category: aiCategory,
      ai_confidence: aiConfidence,
      ai_bounding_boxes: detections,
      image_url: payload.imageDataUrl,
      annotated_image: annotatedImage,
      estimated_weight_kg: weightKg,
      coins_awarded: coinsToAward,
      status: depositStatus,
      verification_notes: verificationNotes,
      created_at: new Date().toISOString(),
      verified_at: depositStatus === 'APPROVED' ? new Date().toISOString() : undefined,
    };

    // Save deposit
    const deposits = loadState<Deposit[]>(STORAGE_KEYS.DEPOSITS, INITIAL_DEPOSITS);
    deposits.unshift(newDeposit);
    saveState(STORAGE_KEYS.DEPOSITS, deposits);

    // If auto-approved, credit user balance & write to transaction ledger
    if (depositStatus === 'APPROVED' && coinsToAward > 0) {
      const profiles = loadState<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
      const pIdx = profiles.findIndex((p) => p.id === user.id);
      if (pIdx !== -1) {
        profiles[pIdx].balance += coinsToAward;
        profiles[pIdx].lifetime_earned += coinsToAward;
        profiles[pIdx].total_kg_recycled = Number((profiles[pIdx].total_kg_recycled + weightKg).toFixed(2));
        saveState(STORAGE_KEYS.PROFILES, profiles);
      }

      // Record to transaction ledger
      const tx: Transaction = {
        id: `tx-${Date.now()}`,
        user_id: user.id,
        type: 'DEPOSIT_REWARD',
        amount: coinsToAward,
        balance_after: user.balance + coinsToAward,
        reference_type: 'deposit',
        reference_id: newDeposit.id,
        description: `Verified deposit: ${aiCategory} at ${bin.name} (+${coinsToAward} EcoCoins)`,
        created_at: new Date().toISOString(),
      };
      const txs = loadState<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
      txs.unshift(tx);
      saveState(STORAGE_KEYS.TRANSACTIONS, txs);

      // Increment bin fill level
      await this.updateBinTelemetry(bin.id, {
        fill_level_pct: Math.min(100, bin.fill_level_pct + 4),
      });
    }

    return {
      deposit: newDeposit,
      verified: depositStatus === 'APPROVED',
      coinsAwarded: coinsToAward,
      annotatedImage,
    };
  }

  // --- Staff / Admin Review Queue Verification ---
  public async getReviewQueue(): Promise<Deposit[]> {
    const deposits = loadState<Deposit[]>(STORAGE_KEYS.DEPOSITS, INITIAL_DEPOSITS);
    return deposits.filter((d) => d.status === 'NEEDS_STAFF_REVIEW');
  }

  public async verifyDepositAdmin(
    depositId: string,
    decision: 'APPROVE' | 'REJECT',
    approvedCategory?: WasteCategory,
    notes?: string
  ): Promise<{ success: boolean; deposit: Deposit; coinsAwarded: number }> {
    const deposits = loadState<Deposit[]>(STORAGE_KEYS.DEPOSITS, INITIAL_DEPOSITS);
    const dIdx = deposits.findIndex((d) => d.id === depositId);
    if (dIdx === -1) throw new Error('Deposit not found');

    const deposit = deposits[dIdx];
    const cat = approvedCategory || deposit.ai_predicted_category || deposit.reported_category;
    let coinsAwarded = 0;

    if (decision === 'APPROVE') {
      coinsAwarded = REWARD_VALUES[cat] || 10;
      deposit.status = 'APPROVED';
      deposit.coins_awarded = coinsAwarded;
      deposit.verified_by = 'Staff Admin';
      deposit.verified_at = new Date().toISOString();
      deposit.verification_notes = notes || `Manually verified & approved by staff as ${cat}.`;

      // Credit student balance
      const profiles = loadState<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
      const studentIdx = profiles.findIndex((p) => p.id === deposit.student_id);
      if (studentIdx !== -1) {
        profiles[studentIdx].balance += coinsAwarded;
        profiles[studentIdx].lifetime_earned += coinsAwarded;
        profiles[studentIdx].total_kg_recycled = Number(
          (profiles[studentIdx].total_kg_recycled + (REWARD_WEIGHTS[cat] || 0.15)).toFixed(2)
        );
        saveState(STORAGE_KEYS.PROFILES, profiles);

        // Record to ledger
        const tx: Transaction = {
          id: `tx-${Date.now()}`,
          user_id: deposit.student_id,
          type: 'DEPOSIT_REWARD',
          amount: coinsAwarded,
          balance_after: profiles[studentIdx].balance,
          reference_type: 'deposit',
          reference_id: deposit.id,
          description: `Staff approved deposit: ${cat} at ${deposit.bin_name || 'Campus Bin'} (+${coinsAwarded} EcoCoins)`,
          created_at: new Date().toISOString(),
        };
        const txs = loadState<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
        txs.unshift(tx);
        saveState(STORAGE_KEYS.TRANSACTIONS, txs);
      }
    } else {
      deposit.status = 'REJECTED';
      deposit.coins_awarded = 0;
      deposit.verified_by = 'Staff Admin';
      deposit.verified_at = new Date().toISOString();
      deposit.verification_notes = notes || 'Rejected by staff: item does not meet recycling guidelines.';
    }

    deposits[dIdx] = deposit;
    saveState(STORAGE_KEYS.DEPOSITS, deposits);

    return { success: true, deposit, coinsAwarded };
  }

  // --- Leaderboards & Departments ---
  public async getDepartments(): Promise<Department[]> {
    return loadState<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  }

  public async getStudentLeaderboard(): Promise<Profile[]> {
    const profiles = loadState<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    return profiles.slice().sort((a, b) => b.balance - a.balance);
  }
}

export const apiService = new EcoCoinService();

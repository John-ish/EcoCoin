import React, { useState } from 'react';
import {
  Gift,
  Coins,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Reward, Redemption, Profile } from '../types';
import { apiService } from '../services/api';

interface RewardsViewProps {
  rewards: Reward[];
  redemptions: Redemption[];
  user: Profile;
  onRefreshData: () => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  rewards,
  redemptions,
  user,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'vouchers'>('catalog');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [newRedemption, setNewRedemption] = useState<Redemption | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const userRedemptions = redemptions.filter((r) => r.student_id === user.id);

  const handleRedeem = async (reward: Reward) => {
    if (user.balance < reward.cost_coins) {
      alert(`Insufficient EcoCoins! You have ${user.balance} ECO, but this reward costs ${reward.cost_coins} ECO.`);
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await apiService.redeemReward(reward.id);
      setNewRedemption(res.redemption);
      setSelectedReward(null);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#06b6d4'],
      });

      onRefreshData();
    } catch (err: any) {
      alert(`Redemption failed: ${err.message}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" />
            Campus EcoCoin Rewards & Vouchers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Exchange your verified recycling EcoCoins for campus dining coupons, library printing credits, bookstore vouchers, and sustainable campus gear.
          </p>
        </div>

        {/* Tab Switcher: Store vs My Claimed Vouchers */}
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vouchers Store
          </button>
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'vouchers'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            My Vouchers ({userRedemptions.length})
          </button>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        /* Rewards Catalog Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => {
            const canAfford = user.balance >= reward.cost_coins;
            return (
              <div
                key={reward.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-2xl hover:shadow-emerald-950/20 group"
              >
                <div>
                  <div className="relative aspect-video overflow-hidden bg-slate-800">
                    <img
                      src={reward.image_url || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop'}
                      alt={reward.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs font-bold text-amber-300 font-mono">
                      {reward.discount_value}
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900/90 text-slate-300">
                      Stock: {reward.stock_available}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                        {reward.sponsor}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5 line-clamp-1">
                        {reward.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {reward.description}
                    </p>

                    <p className="text-[11px] text-slate-500 italic border-t border-slate-800 pt-2 line-clamp-1">
                      Terms: {reward.terms}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-2">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-bold text-white">{reward.cost_coins}</span>
                    <span className="text-xs text-slate-400">ECO</span>
                  </div>

                  <button
                    disabled={!canAfford || reward.stock_available <= 0}
                    onClick={() => setSelectedReward(reward)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      canAfford && reward.stock_available > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {!canAfford ? 'Need More ECO' : 'Redeem Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* My Claimed Vouchers Tab */
        <div className="space-y-4">
          {userRedemptions.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <Ticket className="w-12 h-12 mx-auto text-slate-600" />
              <h3 className="text-lg font-bold text-slate-300">No Vouchers Claimed Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Recycle campus waste to accumulate EcoCoins, then exchange them for campus discounts and vouchers here.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Browse Rewards Store
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRedemptions.map((red) => (
                <div
                  key={red.id}
                  className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-850 border border-slate-700/80 space-y-3 relative overflow-hidden shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Active Campus Voucher
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">
                        {red.reward_title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Cost: {red.coins_spent} ECO
                    </span>
                  </div>

                  {/* Voucher Code Box */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-dashed border-amber-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-500 block">
                        Present this barcode / code to cashier:
                      </span>
                      <span className="text-lg font-mono font-extrabold tracking-wider text-amber-300">
                        {red.voucher_code}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(red.voucher_code)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Copy Voucher Code"
                    >
                      {copiedCode === red.voucher_code ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Issued: {new Date(red.created_at).toLocaleDateString()}</span>
                    <span>Expires: {new Date(red.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Redemption Confirmation Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedReward(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Voucher Redemption</h3>
                <span className="text-xs text-slate-400">{selectedReward.sponsor}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Reward:</span>
                <span className="font-bold text-white">{selectedReward.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Deduction:</span>
                <span className="font-bold font-mono text-rose-400">-{selectedReward.cost_coins} EcoCoins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="font-bold font-mono text-emerald-400">
                  {user.balance - selectedReward.cost_coins} EcoCoins
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              This action writes an immutable debit record to the campus transaction ledger and issues a single-use redemption code.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSelectedReward(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isRedeeming}
                onClick={() => handleRedeem(selectedReward)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                {isRedeeming ? 'Issuing Voucher...' : 'Confirm Redemption'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal for Just-Redeemed Voucher */}
      {newRedemption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white">Voucher Claimed!</h3>
            <p className="text-xs text-slate-400">
              Your voucher for <strong>{newRedemption.reward_title}</strong> has been generated and recorded to the ledger.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-dashed border-amber-500/50">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Voucher Code:</span>
              <span className="text-xl font-mono font-extrabold text-amber-300 tracking-wider">
                {newRedemption.voucher_code}
              </span>
            </div>

            <button
              onClick={() => {
                setNewRedemption(null);
                setActiveTab('vouchers');
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
            >
              View in My Vouchers
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

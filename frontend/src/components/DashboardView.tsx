import React from 'react';
import {
  Coins,
  QrCode,
  MapPin,
  Flame,
  Leaf,
  Scale,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Gift,
  ArrowUpRight,
  ShieldAlert,
  History as HistoryIcon
} from 'lucide-react';
import { Profile, Deposit, Transaction, Bin } from '../types';

interface DashboardViewProps {
  user: Profile;
  deposits: Deposit[];
  transactions: Transaction[];
  bins: Bin[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  deposits,
  transactions,
  bins,
  onNavigate,
}) => {
  const userDeposits = deposits.filter((d) => d.student_id === user.id).slice(0, 5);
  const userTransactions = transactions.filter((t) => t.user_id === user.id).slice(0, 5);
  
  // Calculate impact metrics
  const totalKg = user.total_kg_recycled || 0;
  const co2SavedKg = Number((totalKg * 1.62).toFixed(2));
  const fullBinsCount = bins.filter((b) => b.fill_level_pct >= 80).length;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-700/60 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop'}
              alt={user.full_name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Welcome back, {user.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {user.role === 'admin' ? 'Administrator' : 'Eco-Champion'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {user.student_id} • {user.department_name || 'Campus Student'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Streak Counter */}
            <div className="px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-medium block">
                  Streak
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {user.streak_days} Days 🔥
                </span>
              </div>
            </div>

            {/* EcoCoin Balance Card */}
            <div className="px-5 py-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center gap-3 shadow-lg shadow-emerald-950/30">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold block">
                  Available Balance
                </span>
                <span className="text-2xl font-extrabold text-white font-mono tracking-tight">
                  {user.balance.toLocaleString()}
                  <span className="text-xs text-emerald-400 ml-1 font-sans">ECO</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-700/50">
          <button
            onClick={() => onNavigate('deposit')}
            className="flex items-center justify-between p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-700/30 group"
          >
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-emerald-100" />
              <span>Scan Bin & Deposit Waste</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('map')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span>Campus Digital Twin Map</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('rewards')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Gift className="w-5 h-5 text-amber-400" />
              <span>Redeem Campus Vouchers</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Campus IoT Alert Banner if bins near capacity */}
      {fullBinsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="text-sm">
              <strong>Campus Smart Bins Notice:</strong> {fullBinsCount} bin(s) currently exceed 80% fill capacity. Consider using alternate stations shown on the Digital Twin map.
            </span>
          </div>
          <button
            onClick={() => onNavigate('map')}
            className="text-xs font-semibold px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg border border-amber-500/40 whitespace-nowrap ml-4"
          >
            Inspect Bins
          </button>
        </div>
      )}

      {/* Environmental Impact Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Lifetime Earned</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {user.lifetime_earned.toLocaleString()}
          </div>
          <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> All-time EcoCoin awards
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Waste Diverted</span>
            <Scale className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {totalKg} <span className="text-sm font-sans font-normal text-slate-400">kg</span>
          </div>
          <span className="text-xs text-cyan-400 mt-1 block font-medium">
            Solid waste diverted from landfills
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">CO2 Prevented</span>
            <Leaf className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {co2SavedKg} <span className="text-sm font-sans font-normal text-slate-400">kg</span>
          </div>
          <span className="text-xs text-teal-400 mt-1 block font-medium">
            Greenhouse gas emissions offset
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Verified Deposits</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {deposits.filter((d) => d.student_id === user.id && d.status === 'APPROVED').length}
          </div>
          <span className="text-xs text-emerald-400 mt-1 block font-medium">
            Audited & verified submissions
          </span>
        </div>
      </div>

      {/* Two Column Layout: Recent Deposits & Transaction Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deposits & Status */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              Recent Waste Deposits
            </h2>
            <button
              onClick={() => onNavigate('deposit')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              + New Deposit
            </button>
          </div>

          <div className="space-y-3">
            {userDeposits.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No deposits yet. Scan a bin to earn your first EcoCoins!
              </div>
            ) : (
              userDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                        dep.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : dep.status === 'NEEDS_STAFF_REVIEW'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {dep.reported_category.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200 capitalize">
                          {dep.reported_category} Item
                        </span>
                        {dep.status === 'APPROVED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            Verified
                          </span>
                        ) : dep.status === 'NEEDS_STAFF_REVIEW' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/30">
                            Staff Review
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-500/30">
                            Rejected
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {dep.bin_name} • {dep.estimated_weight_kg} kg
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold font-mono ${
                        dep.coins_awarded > 0 ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {dep.coins_awarded > 0 ? `+${dep.coins_awarded}` : '0'} ECO
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(dep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Auditable Ledger Summary */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-cyan-400" />
              Auditable Ledger Summary
            </h2>
            <button
              onClick={() => onNavigate('ledger')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              View Full Ledger →
            </button>
          </div>

          <div className="space-y-3">
            {userTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No transactions recorded yet.
              </div>
            ) : (
              userTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200 line-clamp-1">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Bal: {tx.balance_after} ECO</span>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-bold font-mono whitespace-nowrap ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ECO
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

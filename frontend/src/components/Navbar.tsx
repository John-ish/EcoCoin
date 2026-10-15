import React from 'react';
import {
  Coins,
  QrCode,
  MapPin,
  History as HistoryIcon,
  Gift,
  Trophy,
  ShieldCheck,
  User,
  RotateCcw,
  Sparkles,
  Database
} from 'lucide-react';
import { Profile } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: Profile;
  onSwitchPersona: (role: 'student' | 'admin') => void;
  isMock: boolean;
  onOpenSupabaseGuide: () => void;
  pendingReviewsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onSwitchPersona,
  isMock,
  onOpenSupabaseGuide,
  pendingReviewsCount,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Coins className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                EcoCoin
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-mono tracking-wider uppercase">
                Campus Waste AI
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('deposit')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                currentTab === 'deposit'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              Deposit & CV
            </button>
            <button
              onClick={() => setCurrentTab('map')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                currentTab === 'map'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 text-cyan-400" />
              Digital Twin
            </button>
            <button
              onClick={() => setCurrentTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                currentTab === 'ledger'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <HistoryIcon className="w-4 h-4 text-slate-400" />
              Ledger
            </button>
            <button
              onClick={() => setCurrentTab('rewards')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                currentTab === 'rewards'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Gift className="w-4 h-4 text-amber-400" />
              Rewards
            </button>
            <button
              onClick={() => setCurrentTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                currentTab === 'leaderboard'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              Leaderboard
            </button>
            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 relative transition-colors ${
                currentTab === 'admin'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Admin
              {pendingReviewsCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-slate-950 text-xs font-bold font-mono">
                  {pendingReviewsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Controls: Balance, Persona Switcher, Data Mode */}
          <div className="flex items-center gap-3">
            {/* Supabase Status Pill */}
            <button
              onClick={onOpenSupabaseGuide}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all ${
                isMock
                  ? 'bg-slate-800/80 text-amber-300 border-amber-500/30 hover:border-amber-400'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
              }`}
              title="Click for Supabase Connection Guide"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              {isMock ? 'Mock Mode' : 'Supabase Live'}
            </button>

            {/* EcoCoin Balance Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl shadow-inner">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Coins className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-white font-mono tracking-tight">
                  {user.balance.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold block leading-none">
                  ECO
                </span>
              </div>
            </div>

            {/* Persona Switcher Dropdown */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5">
              <button
                onClick={() => onSwitchPersona('student')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  user.role === 'student'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => onSwitchPersona('admin')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  user.role === 'admin'
                    ? 'bg-indigo-500 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`p-1.5 flex flex-col items-center ${currentTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentTab('deposit')}
            className={`p-1.5 flex flex-col items-center ${currentTab === 'deposit' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            Deposit
          </button>
          <button
            onClick={() => setCurrentTab('map')}
            className={`p-1.5 flex flex-col items-center ${currentTab === 'map' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            Digital Twin
          </button>
          <button
            onClick={() => setCurrentTab('ledger')}
            className={`p-1.5 flex flex-col items-center ${currentTab === 'ledger' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            Ledger
          </button>
          <button
            onClick={() => setCurrentTab('rewards')}
            className={`p-1.5 flex flex-col items-center ${currentTab === 'rewards' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            Rewards
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`p-1.5 flex flex-col items-center ${currentTab === 'admin' ? 'text-indigo-400' : 'text-slate-400'}`}
          >
            Admin
          </button>
        </div>
      </div>
    </header>
  );
};

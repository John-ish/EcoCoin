import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DepositView } from './components/DepositView';
import { DigitalTwinView } from './components/DigitalTwinView';
import { LedgerView } from './components/LedgerView';
import { RewardsView } from './components/RewardsView';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { apiService } from './services/api';
import {
  Profile,
  Bin,
  Deposit,
  Transaction,
  Reward,
  Redemption,
  Department,
} from './types';
import { RotateCcw, Database } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [user, setUser] = useState<Profile>(apiService.getCurrentUser());
  const [bins, setBins] = useState<Bin[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load all app data
  const loadData = async () => {
    try {
      const currentUser = apiService.getCurrentUser();
      setUser(currentUser);

      const [loadedBins, loadedTxs, loadedRews, loadedReds, loadedDepts, loadedProfs] =
        await Promise.all([
          apiService.getBins(),
          apiService.getTransactions(),
          apiService.getRewards(),
          apiService.getRedemptions(),
          apiService.getDepartments(),
          apiService.getProfiles(),
        ]);

      setBins(loadedBins);
      setTransactions(loadedTxs);
      setRewards(loadedRews);
      setRedemptions(loadedReds);
      setDepartments(loadedDepts);
      setProfiles(loadedProfs);

      // Load deposits from review queue + general deposits
      const q = await apiService.getReviewQueue();
      // Also grab student's recent deposits
      const allDeps = JSON.parse(localStorage.getItem('ecocoin_deposits') || '[]');
      setDeposits(allDeps);
    } catch (e) {
      console.error('Failed to load EcoCoin state:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchPersona = (role: 'student' | 'admin') => {
    const newUser = apiService.switchPersona(role);
    setUser(newUser);
    loadData();
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to initial seeds?')) {
      apiService.resetToDefaults();
      loadData();
    }
  };

  const pendingReviewsCount = deposits.filter((d) => d.status === 'NEEDS_STAFF_REVIEW').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Header Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onSwitchPersona={handleSwitchPersona}
        isMock={apiService.isUsingMock()}
        onOpenSupabaseGuide={() => setIsSupabaseGuideOpen(true)}
        pendingReviewsCount={pendingReviewsCount}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-400">Loading EcoCoin Digital Twin Engine...</span>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                user={user}
                deposits={deposits}
                transactions={transactions}
                bins={bins}
                onNavigate={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'deposit' && (
              <DepositView
                bins={bins}
                onDepositComplete={loadData}
                onNavigateToMap={() => setCurrentTab('map')}
              />
            )}

            {currentTab === 'map' && (
              <DigitalTwinView
                bins={bins}
                onRefreshBins={loadData}
                onNavigateToDeposit={(binId) => setCurrentTab('deposit')}
              />
            )}

            {currentTab === 'ledger' && (
              <LedgerView
                transactions={transactions}
                currentUserId={user.id}
              />
            )}

            {currentTab === 'rewards' && (
              <RewardsView
                rewards={rewards}
                redemptions={redemptions}
                user={user}
                onRefreshData={loadData}
              />
            )}

            {currentTab === 'leaderboard' && (
              <LeaderboardView
                departments={departments}
                students={profiles}
                currentUserId={user.id}
              />
            )}

            {currentTab === 'admin' && (
              <AdminDashboardView
                deposits={deposits}
                bins={bins}
                onRefreshData={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">EcoCoin</span>
            <span>•</span>
            <span>Campus Waste Management, Computer Vision & Digital Twin Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSupabaseGuideOpen(true)}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" />
              Supabase Setup Guide
            </button>
            <button
              onClick={handleResetData}
              className="hover:text-slate-300 transition-colors flex items-center gap-1"
              title="Reset mock store to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Seeds
            </button>
          </div>
        </div>
      </footer>

      {/* Supabase Connection Setup Modal */}
      <SupabaseGuideModal
        isOpen={isSupabaseGuideOpen}
        onClose={() => setIsSupabaseGuideOpen(false)}
      />
    </div>
  );
}

export default App;

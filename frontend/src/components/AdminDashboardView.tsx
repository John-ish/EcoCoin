import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Coins,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
  Settings,
  Clock,
  Sparkles
} from 'lucide-react';
import { Deposit, Bin, WasteCategory } from '../types';
import { apiService, REWARD_VALUES } from '../services/api';

interface AdminDashboardViewProps {
  deposits: Deposit[];
  bins: Bin[];
  onRefreshData: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  deposits,
  bins,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'bins' | 'policies'>('queue');
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [approvedCategory, setApprovedCategory] = useState<WasteCategory>('plastic');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter deposits requiring staff review
  const reviewQueue = deposits.filter((d) => d.status === 'NEEDS_STAFF_REVIEW');

  const handleDecision = async (depositId: string, decision: 'APPROVE' | 'REJECT') => {
    setIsProcessing(true);
    try {
      await apiService.verifyDepositAdmin(
        depositId,
        decision,
        approvedCategory,
        reviewNotes || undefined
      );
      setSelectedDeposit(null);
      setReviewNotes('');
      onRefreshData();
    } catch (err: any) {
      alert(`Verification action failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlushBin = async (binId: string) => {
    await apiService.updateBinTelemetry(binId, { fill_level_pct: 0, status: 'NORMAL' });
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              Sustainability Admin & Verification Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/30">
              Campus Staff Access
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review unverified/flagged waste submissions, audit the smart bin infrastructure fleet, and manage incentive reward allocations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'queue'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Review Queue
            {reviewQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
                {reviewQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bins')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'bins'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bin Fleet ({bins.length})
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'policies'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reward Policies
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        /* Staff Review Queue */
        <div className="space-y-4">
          {reviewQueue.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Review Queue is Clear!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All waste submissions have been processed and auto-verified by the Computer Vision pipeline.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-all shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider block">
                          Quarantined Submission
                        </span>
                        <h4 className="text-base font-bold text-white mt-0.5">
                          {item.student_name || item.student_id}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {item.bin_name} • {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/30">
                        Pending Staff Review
                      </span>
                    </div>

                    {/* Image comparison preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img
                        src={item.annotated_image || item.image_url || 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=500&auto=format&fit=crop'}
                        alt="Submission Photo"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Flag Reason */}
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300">
                      <strong>Flag Reason:</strong> {item.verification_notes}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                      <span>Reported: <strong className="text-slate-200">{item.reported_category}</strong></span>
                      <span>AI Detected: <strong className="text-cyan-400">{item.ai_predicted_category} ({Math.round((item.ai_confidence || 0) * 100)}%)</strong></span>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => {
                        setSelectedDeposit(item);
                        setApprovedCategory(item.ai_predicted_category || item.reported_category);
                      }}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect & Review Submission
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'bins' ? (
        /* Bin Fleet Management */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Campus Smart Bins Fleet Status</h3>
            <span className="text-xs text-slate-400 font-mono">
              Total Managed Receptacles: {bins.length}
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/70 border-b border-slate-700 text-slate-400 uppercase font-mono">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Name / Zone</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Fill Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bins.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">
                    {b.bin_code}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white block">{b.name}</span>
                    <span className="text-[11px] text-slate-400">{b.building} • {b.campus_zone}</span>
                  </td>
                  <td className="py-3 px-4 uppercase font-mono text-cyan-400 font-semibold">
                    {b.category}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            b.fill_level_pct >= 90
                              ? 'bg-rose-500'
                              : b.fill_level_pct >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${b.fill_level_pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-300 font-bold">{b.fill_level_pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        b.status === 'FULL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          : b.status === 'NEAR_FULL'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleFlushBin(b.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] transition-colors"
                      title="Empty bin and reset fill level"
                    >
                      Empty Bin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Reward Policy Tuner */
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            Waste Incentive Reward Policy Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Coins allocated per verified deposit item and estimated greenhouse impact conversions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {Object.entries(REWARD_VALUES).map(([cat, coins]) => (
              <div
                key={cat}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-bold text-white uppercase font-mono">
                    {cat}
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Campus Stream Rate
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-lg font-bold text-emerald-400">+{coins}</span>
                  <span className="text-xs text-slate-400 block">EcoCoins</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Review Decision Modal */}
      {selectedDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white">Staff Verification Decision</h3>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <img
                src={selectedDeposit.annotated_image || selectedDeposit.image_url}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <span className="text-white font-medium">{selectedDeposit.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bin:</span>
                <span className="text-white font-medium">{selectedDeposit.bin_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reported Category:</span>
                <span className="text-white font-mono uppercase">{selectedDeposit.reported_category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI Prediction:</span>
                <span className="text-cyan-400 font-mono font-bold">
                  {selectedDeposit.ai_predicted_category} ({Math.round((selectedDeposit.ai_confidence || 0) * 100)}%)
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">
                Confirmed Material Category (if overriding):
              </label>
              <select
                value={approvedCategory}
                onChange={(e) => setApprovedCategory(e.target.value as WasteCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
              >
                <option value="plastic">Plastic (+10 ECO)</option>
                <option value="metal">Metal (+15 ECO)</option>
                <option value="paper">Paper (+8 ECO)</option>
                <option value="glass">Glass (+12 ECO)</option>
                <option value="organic">Organic (+6 ECO)</option>
                <option value="general">General (+2 ECO)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Staff Review Notes:</label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Confirmed aluminum beverage container, approved."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setSelectedDeposit(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleDecision(selectedDeposit.id, 'REJECT')}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleDecision(selectedDeposit.id, 'APPROVE')}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

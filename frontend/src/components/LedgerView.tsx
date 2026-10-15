import React, { useState } from 'react';
import {
  History as HistoryIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Download,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Transaction } from '../types';

interface LedgerViewProps {
  transactions: Transaction[];
  currentUserId: string;
}

export const LedgerView: React.FC<LedgerViewProps> = ({ transactions, currentUserId }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    if (filterType === 'credits') return tx.amount > 0;
    if (filterType === 'debits') return tx.amount < 0;
    return tx.type === filterType;
  });

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Type', 'Amount (ECO)', 'Balance After', 'Reference Type', 'Description', 'Timestamp'];
    const rows = filtered.map((t) => [
      t.id,
      t.type,
      t.amount,
      t.balance_after,
      t.reference_type,
      `"${t.description.replace(/"/g, '""')}"`,
      t.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecocoin-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-emerald-400" />
            Auditable EcoCoin Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable, cryptographic-style transaction record of all campus waste reward credits, voucher debits, and adjustments.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Export Ledger CSV
        </button>
      </div>

      {/* Security Guarantee Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Tamper-Proof Audit Standard:</strong> In compliance with the campus financial guidelines, student balances can never be directly incremented or decremented via client scripts. Every coin change requires an associated ledger row with resulting balance verification.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/40'
          }`}
        >
          All Activity ({transactions.length})
        </button>
        <button
          onClick={() => setFilterType('credits')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'credits'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/40'
          }`}
        >
          Earned Credits (+)
        </button>
        <button
          onClick={() => setFilterType('debits')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'debits'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/40'
          }`}
        >
          Redeemed Debits (-)
        </button>
        <button
          onClick={() => setFilterType('DEPOSIT_REWARD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'DEPOSIT_REWARD'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/40'
          }`}
        >
          Waste Deposits
        </button>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/70 border-b border-slate-700/80 text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Resulting Balance</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {tx.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {tx.description}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                          tx.amount > 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                      <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ECO
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300 font-semibold whitespace-nowrap">
                      {tx.balance_after} ECO
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

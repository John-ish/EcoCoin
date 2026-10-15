import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldAlert,
  Terminal,
  FileCode,
  X
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const isConnected = isSupabaseConfigured();

  if (!isOpen) return null;

  const copyText = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const envSample = `VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...YOUR_PUBLIC_ANON_KEY`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Connect Supabase to EcoCoin
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-mono text-slate-400">
                Current Status: {isConnected ? 'Supabase Live Connected' : 'Running on Built-in Mock Engine'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Alert */}
        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-300 space-y-1">
          <strong className="text-emerald-300 flex items-center gap-1.5 font-semibold">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Security Rule: Secret Keys Protection
          </strong>
          <p className="leading-relaxed">
            Never put your <code>service_role</code> secret key into frontend code or <code>.env</code>. The frontend uses ONLY the public <code>anon</code> key. Balances are secured via PostgreSQL Row Level Security (RLS) and stored procedures.
          </p>
        </div>

        {/* 3 Steps */}
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">1</span>
                Create Supabase Project
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-medium"
              >
                Open Supabase Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400">
              Create a free project on Supabase and wait ~60 seconds for PostgreSQL provisioning.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">2</span>
              Apply Database Schema & Policies
            </span>
            <p className="text-slate-400">
              Navigate to the <strong>SQL Editor</strong> in Supabase and paste the contents of <code className="text-emerald-300">database/schema.sql</code> and <code className="text-emerald-300">database/seed.sql</code>.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 flex items-center justify-between">
              <span>codeclash2/database/schema.sql</span>
              <span className="text-slate-500">Includes RLS & Stored Procedures</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">3</span>
                Configure Environment Variables
              </span>
              <button
                onClick={() => copyText(envSample, 3)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-medium"
              >
                {copiedStep === 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedStep === 3 ? 'Copied!' : 'Copy .env snippet'}
              </button>
            </div>
            <p className="text-slate-400">
              Create a file named <code className="text-emerald-300">frontend/.env</code> with your Supabase credentials:
            </p>
            <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-cyan-300 overflow-x-auto">
              {envSample}
            </pre>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
          >
            Got It, Back to EcoCoin
          </button>
        </div>
      </div>
    </div>
  );
};

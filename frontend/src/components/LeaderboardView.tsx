import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Users,
  Flame,
  Scale,
  Coins,
  Building,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Department, Profile } from '../types';

interface LeaderboardViewProps {
  departments: Department[];
  students: Profile[];
  currentUserId: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  departments,
  students,
  currentUserId,
}) => {
  const [tab, setTab] = useState<'students' | 'departments'>('students');

  const sortedStudents = students.slice().sort((a, b) => b.balance - a.balance);
  const sortedDepartments = departments.slice().sort((a, b) => b.total_eco_coins - a.total_eco_coins);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Campus Sustainability Leaderboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track student recycling champions and inter-departmental sustainability rankings across campus.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-lg self-start sm:self-auto">
          <button
            onClick={() => setTab('students')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === 'students'
                ? 'bg-yellow-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Student Champions
          </button>
          <button
            onClick={() => setTab('departments')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === 'departments'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Department Clash
          </button>
        </div>
      </div>

      {tab === 'students' ? (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sortedStudents.slice(0, 3).map((stu, index) => {
              const medals = [
                { bg: 'from-amber-400 to-yellow-500', border: 'border-yellow-400/50', rank: '1st', text: 'text-yellow-400' },
                { bg: 'from-slate-300 to-slate-400', border: 'border-slate-300/50', rank: '2nd', text: 'text-slate-300' },
                { bg: 'from-amber-700 to-amber-600', border: 'border-amber-700/50', rank: '3rd', text: 'text-amber-500' },
              ][index];

              return (
                <div
                  key={stu.id}
                  className={`relative p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-850 border ${medals.border} shadow-2xl flex flex-col items-center text-center`}
                >
                  <div className="absolute top-4 right-4 text-xs font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-200">
                    {medals.rank}
                  </div>

                  <img
                    src={stu.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop'}
                    alt={stu.full_name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-800 shadow-xl mb-3"
                  />

                  <h3 className="text-base font-bold text-white">{stu.full_name}</h3>
                  <span className="text-xs text-slate-400">{stu.department_name}</span>

                  <div className="mt-4 pt-4 border-t border-slate-800 w-full flex items-center justify-around font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block">Balance</span>
                      <strong className="text-emerald-400 font-bold">{stu.balance} ECO</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Diverted</span>
                      <strong className="text-cyan-400 font-bold">{stu.total_kg_recycled} kg</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Streak</span>
                      <strong className="text-amber-400 font-bold">{stu.streak_days}d 🔥</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Students Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/70 border-b border-slate-700 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Diverted (kg)</th>
                  <th className="py-3 px-4 text-right">Streak</th>
                  <th className="py-3 px-4 text-right">EcoCoin Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedStudents.map((stu, idx) => (
                  <tr
                    key={stu.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      stu.id === currentUserId ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={stu.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="font-semibold text-white">
                          {stu.full_name} {stu.id === currentUserId && '(You)'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {stu.department_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-cyan-400">
                      {stu.total_kg_recycled} kg
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                      {stu.streak_days} Days 🔥
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {stu.balance.toLocaleString()} ECO
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Department Clash Rankings */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedDepartments.map((dept, idx) => (
              <div
                key={dept.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold font-mono text-lg text-emerald-400">
                      #{idx + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{dept.name}</h3>
                      <span className="text-xs text-slate-400">
                        {dept.building} • {dept.student_count} Active Students
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {dept.code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-500 block">Total EcoCoins</span>
                    <strong className="text-emerald-400 text-base font-bold">
                      {dept.total_eco_coins.toLocaleString()} ECO
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-500 block">Solid Waste Diverted</span>
                    <strong className="text-cyan-400 text-base font-bold">
                      {dept.total_kg_diverted.toLocaleString()} kg
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

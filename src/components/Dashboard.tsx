import { useState } from "react";
import { FileText, Search, PlusCircle, ArrowUpRight, TrendingDown, DollarSign, ShieldCheck, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { Contract, AnalyticsData } from "../types";
import { motion } from "motion/react";

interface DashboardProps {
  analytics: AnalyticsData | null;
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  onNavigateToAnalyze: () => void;
  loading: boolean;
}

export default function Dashboard({ analytics, contracts, onSelectContract, onNavigateToAnalyze, loading }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all");

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = filterRating === "all" || c.complianceRating.toLowerCase() === filterRating.toLowerCase();
    return matchesSearch && matchesRating;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-slate-900">
            Compliance Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Real-time visual ledger for automated contract risk scans, legal drafting, and mitigation.
          </p>
        </div>

        <button
          onClick={onNavigateToAnalyze}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-500 active:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
        >
          <PlusCircle className="h-5 w-5" />
          Review New Contract
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* CELL 1: col-span-2 row-span-2 - Average Health Score Dashboard */}
          <div className="md:col-span-2 md:row-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col justify-between min-h-[420px] transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">AI Risk Analysis</h2>
                <p className="text-3xl font-extrabold tracking-tight text-slate-800">Compliance Score</p>
              </div>
              <div className={`px-4 py-2 rounded-full font-extrabold text-lg border ${
                (analytics?.summary.avgScore || 0) >= 80 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {analytics?.summary.avgScore || 0}%
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center py-6">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04]">
                <div className="w-56 h-56 border-[16px] border-indigo-600 rounded-full animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className={`text-5xl font-black tracking-tighter uppercase ${
                  (analytics?.summary.avgScore || 0) >= 80 ? "text-emerald-600" : "text-indigo-600"
                }`}>
                  {(analytics?.summary.avgScore || 0) >= 80 ? "STABLE" : "WARNING"}
                </p>
                <p className="text-slate-400 text-xs font-semibold">
                  {(analytics?.summary.avgScore || 0) >= 80 
                    ? "Safe compliance posture across workspace" 
                    : "High severity flags require active redress"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-bold">Workspace</p>
                <p className="font-bold text-sm text-slate-800">Active</p>
              </div>
              <div className="text-center border-x border-slate-100">
                <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-bold">Flags Count</p>
                <p className="font-bold text-sm text-rose-600">{analytics?.summary.highSeverityRisks || 0} active</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-bold">Audit Grade</p>
                <p className="font-bold text-sm text-slate-800">
                  {(analytics?.summary.avgScore || 0) >= 85 ? "S-Tier" : "A-Tier"}
                </p>
              </div>
            </div>
          </div>

          {/* CELL 2: col-span-2 row-span-1 - Smart Document Processing Banner */}
          <div className="md:col-span-2 bg-indigo-600 rounded-[2rem] p-8 text-white flex flex-col justify-between min-h-[220px] transition-all hover:bg-indigo-700/95 shadow-md shadow-indigo-600/10">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Smart Document Processing</h3>
              <span className="px-3 py-1 bg-white/20 rounded-full text-[9px] uppercase font-bold tracking-widest">
                Active AI Engine
              </span>
            </div>
            
            <div className="flex items-center gap-6 my-4">
              <div className="w-12 h-16 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center text-2xl shrink-0">
                📄
              </div>
              <div className="flex-1">
                <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                  LexiGuard is analyzing and scoring text agreements using the Gemini 1.5 Flash legal-trained heuristic pipeline. Convert copy-pasted boilerplate or text files to secure redline solutions instantly.
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToAnalyze}
              className="w-full py-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-indigo-600 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-900/10 cursor-pointer"
            >
              Upload & Scan Contracts
            </button>
          </div>

          {/* CELL 3: col-span-1 row-span-1 - Total contracts and daily queries visual */}
          <div className="md:col-span-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[180px] transition-all hover:shadow-md">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Contracts</p>
              <p className="text-4xl font-black text-slate-800 tracking-tight">
                {analytics?.summary.totalContracts || 0}
              </p>
            </div>
            
            {/* Visual small bar chart */}
            <div className="flex items-end gap-1.5 h-12 pt-2">
              <div className="flex-1 bg-slate-100 h-[40%] rounded-sm" />
              <div className="flex-1 bg-slate-100 h-[60%] rounded-sm" />
              <div className="flex-1 bg-slate-100 h-[55%] rounded-sm" />
              <div className="flex-1 bg-indigo-500 h-[90%] rounded-sm animate-pulse" />
              <div className="flex-1 bg-slate-100 h-[70%] rounded-sm" />
              <div className="flex-1 bg-slate-100 h-[45%] rounded-sm" />
            </div>
          </div>

          {/* CELL 4: col-span-1 row-span-1 - Financial savings and values */}
          <div className="md:col-span-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[180px] transition-all hover:shadow-md">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Financial Saved</p>
              <p className="text-2xl font-black text-emerald-600 tracking-tight">
                {formatCurrency(analytics?.summary.financialSavings || 0)}
              </p>
            </div>

            {/* Micro visual team avatar stack */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[10px] text-slate-400 font-medium">Global coverage</span>
              <div className="flex -space-x-1.5">
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[9px]">🇺🇸</div>
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[9px]">🇬🇧</div>
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[9px]">🇪🇺</div>
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-white flex items-center justify-center text-[8px] text-white font-bold">+12</div>
              </div>
            </div>
          </div>

          {/* CELL 5: col-span-2 row-span-1 - Agreements Catalog */}
          <div className="md:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col justify-between min-h-[340px] transition-all hover:shadow-md">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-base font-extrabold text-slate-800">Agreements Catalog</h2>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 w-full sm:w-32"
                  />
                </div>

                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[11px] text-slate-600 px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Grades</option>
                  <option value="good">Good</option>
                  <option value="needs review">Review</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Catalog list wrapper with overflow protection */}
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[220px] flex-1 mt-2 pr-1">
              {filteredContracts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="h-8 w-8 text-slate-200 mx-auto" />
                  <p className="text-xs">No agreements matched your criteria.</p>
                </div>
              ) : (
                filteredContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => onSelectContract(contract)}
                    className="py-3 hover:bg-slate-50/70 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <h3 className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {contract.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{contract.summary}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${getScoreColor(contract.riskScore)}`}>
                        {contract.complianceRating}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CELL 6: col-span-2 row-span-1 - Security Log Trails styled with rich background */}
          <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[340px] transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-7xl font-mono select-none pointer-events-none">
              ∞
            </div>

            <div className="relative z-10 w-full flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Compliance Logs</p>
                <p className="text-lg font-bold mb-4 text-slate-100">Secured Node Ledger Trails</p>
              </div>

              {/* Logs visual list */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[180px] pr-1">
                {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                  analytics.recentActivity.slice(0, 3).map((log, i) => (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-200 truncate">{log.details}</p>
                        <p className="text-[10px] text-indigo-300/60 font-mono uppercase tracking-wider">{log.action}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No logs available in this workspace session.</p>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-4 pt-2 border-t border-white/5">
                <span>SOC-2 ENCRYPTED TRAIL</span>
                <span>REG-US-EAST</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

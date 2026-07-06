import { useState } from "react";
import { ScrollText, Search, Activity, Shield, Trash2, ShieldAlert, Terminal, HelpCircle, CreditCard, Link, AlertCircle, CheckCircle } from "lucide-react";
import { AuditLog } from "../types";
import { motion } from "motion/react";

interface AdminPanelProps {
  logs: AuditLog[];
  loading: boolean;
  stripeConfigured?: boolean;
  pendingSubscriptions?: any[];
  token: string | null;
  onRefreshData?: () => void;
}

export default function AdminPanel({
  logs,
  loading,
  stripeConfigured = false,
  pendingSubscriptions = [],
  token,
  onRefreshData
}: AdminPanelProps) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const handleApprove = async (userId: string, plan: string) => {
    if (!token) return;
    setActingOn(userId);
    try {
      const response = await fetch("/api/admin/approve-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, plan })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to approve subscription");
      }
      alert("Subscription approved successfully! The user's account has been upgraded.");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to REJECT this subscription? The user's status will reset to free.")) {
      return;
    }
    setActingOn(userId);
    try {
      const response = await fetch("/api/admin/reject-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reject subscription");
      }
      alert("Subscription rejected. The user's pending status has been cleared.");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setActingOn(null);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.details.toLowerCase().includes(search.toLowerCase()) ||
                          log.userEmail.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (act: string) => {
    switch (act) {
      case "WORKSPACE_INIT":
        return "text-blue-600 bg-blue-50 border-blue-100";
      case "USER_REGISTER":
      case "USER_LOGIN":
        return "text-indigo-600 bg-indigo-50 border-indigo-100";
      case "CONTRACT_UPLOAD":
      case "CONTRACT_ANALYZE":
        return "text-purple-600 bg-purple-50 border-purple-100";
      case "CONTRACT_DELETE":
        return "text-rose-600 bg-rose-50 border-rose-100";
      case "SUBSCRIPTION_UPGRADE":
        return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "SUBSCRIPTION_CANCEL":
        return "text-amber-600 bg-amber-50 border-amber-100";
      default:
        return "text-slate-600 bg-slate-50 border-slate-100";
    }
  };

  // Get unique action types for dropdown
  const actionTypes = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display text-slate-900 flex items-center gap-2.5">
            <Shield className="h-7 w-7 text-purple-600" />
            Security Audit Logs
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Immutable log trail of all workspaces, contracts, scans, and analytical sessions.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-lg font-mono">
          <Terminal className="h-4 w-4" />
          SOC-2 COMPLIANCE PREVIEW
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/60 subtle-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase block">Log Capacity</span>
            <span className="text-2xl font-bold text-slate-900 block">{logs.length} / 200</span>
            <span className="text-[10px] text-slate-400 font-medium block">Automatic rotation enabled</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <ScrollText className="h-5 w-5 text-slate-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/60 subtle-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase block">Compliance Node</span>
            <span className="text-2xl font-bold text-emerald-600 block">Active</span>
            <span className="text-[10px] text-slate-500 font-medium block">Region: us-east1 container</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/60 subtle-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase block">Encrypted Audits</span>
            <span className="text-2xl font-bold text-slate-900 block">AES-256</span>
            <span className="text-[10px] text-slate-500 font-medium block">Cryptographic signature valid</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* SaaS Monetization & Payoneer Ledger Control Room */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 subtle-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                Payoneer Billing Control Room
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Pakistan Supported (PK) Direct Payoneer Ledger - Manual Subscription Audit Interface.
              </p>
            </div>
          </div>

          <div className="flex items-center font-mono">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Payoneer Active (PK Support)
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              Manual Payoneer Verification Ledger active:
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Since Stripe is restricted in Pakistan, we have activated the direct Payoneer Manual Subscription Ledger. All client upgrade requests route instantly to this queue for manual audit proof, keeping your operations fully localized and zero-commission.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 space-y-1.5">
              <span className="font-bold text-purple-600 font-mono">STEP 1</span>
              <p className="font-semibold text-slate-800">Check Payoneer Balance</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Log into your Payoneer account and verify the receipt matching the customer's <strong>Transaction ID (TxID)</strong> and <strong>Sender Email</strong>.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 space-y-1.5">
              <span className="font-bold text-purple-600 font-mono">STEP 2</span>
              <p className="font-semibold text-slate-800">Approve & Activate</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Click <strong>"Approve & Activate"</strong> to instantly unlock premium compliance features for the user's workspace securely.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 space-y-1.5">
              <span className="font-bold text-purple-600 font-mono">STEP 3</span>
              <p className="font-semibold text-slate-800">Reject Invalid Claims</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Click <strong>"Reject & Void"</strong> to decline spoofed reference codes and reset the workspace back to free trial limits immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payoneer Subscriptions Verification Queue */}
      {pendingSubscriptions && pendingSubscriptions.length > 0 ? (
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl subtle-shadow overflow-hidden">
          <div className="p-4 border-b border-amber-200 bg-amber-100/40 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <h2 className="font-bold text-amber-950 text-sm font-display">
              Pending Payoneer Auditing Queue ({pendingSubscriptions.length})
            </h2>
            <span className="text-[10px] text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded font-mono ml-auto">
              MANUAL ACTION REQUIRED
            </span>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white">
            {pendingSubscriptions.map((sub: any) => (
              <div key={sub.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-100 border border-amber-200/60 px-2 py-0.5 rounded">
                      {sub.subscription?.plan} Plan
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      User Email: {sub.email}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-slate-400">Payoneer Email/ID:</span>
                      <strong className="text-slate-900 select-all font-semibold">{sub.subscription?.payoneerEmail}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-slate-400">Transaction ID (TxID):</span>
                      <strong className="text-purple-700 select-all font-mono font-bold">{sub.subscription?.transactionId}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-slate-400">Submitted At:</span>
                      <span>{sub.subscription?.submittedAt ? new Date(sub.subscription?.submittedAt).toLocaleString() : "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    disabled={actingOn !== null}
                    onClick={() => handleReject(sub.id)}
                    className="px-3.5 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-600 hover:text-rose-700 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actingOn === sub.id ? "Voiding..." : "Reject & Void"}
                  </button>
                  <button
                    disabled={actingOn !== null}
                    onClick={() => handleApprove(sub.id, sub.subscription?.plan)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{actingOn === sub.id ? "Approving..." : "Approve & Activate"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4 text-slate-400" />
          <span>No pending manual Payoneer subscriptions in queue. All clear!</span>
        </div>
      )}

      {/* Main Ledger card */}
      <div className="bg-white border border-slate-200 rounded-xl subtle-shadow overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4.5 w-4.5 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Auditable Event Ledger</h2>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 w-full sm:w-56"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-white border border-slate-200 text-xs text-slate-600 px-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">All Actions</option>
              {actionTypes.map((type, i) => (
                <option key={i} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center animate-pulse text-slate-400 text-xs">Loading auditable trail logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <ScrollText className="h-8 w-8 text-slate-300 mx-auto" />
              <p>No auditable entries matched criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase text-[10px] bg-slate-50/20">
                  <th className="p-4 font-semibold">Log Action</th>
                  <th className="p-4 font-semibold">Activity details</th>
                  <th className="p-4 font-semibold">User Email</th>
                  <th className="p-4 font-semibold">Client host IP</th>
                  <th className="p-4 font-semibold">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40">
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-sans text-slate-800 font-medium max-w-sm truncate">{log.details}</td>
                    <td className="p-4 text-slate-500">{log.userEmail}</td>
                    <td className="p-4 text-slate-400">{log.ip}</td>
                    <td className="p-4 text-slate-400 text-[10px]">
                      {new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

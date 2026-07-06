import { Shield, LayoutDashboard, SearchCode, PenTool, CreditCard, ScrollText, LogOut, Sparkles } from "lucide-react";
import { User } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Workspace Dashboard", icon: LayoutDashboard },
    { id: "analyze", label: "Analyze Contract", icon: SearchCode, highlight: true },
    { id: "draft", label: "AI Drafting Studio", icon: PenTool },
    { id: "billing", label: "Subscription Billing", icon: CreditCard },
    { id: "logs", label: "Security Audit Logs", icon: ScrollText },
  ];

  const getPlanBadge = (plan: string, status?: string) => {
    if (status === "pending") {
      return "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
    }
    switch (plan) {
      case "free":
        return "bg-slate-200 text-slate-700 border-slate-300";
      case "starter":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "growth":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "enterprise":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col h-screen shrink-0 fixed left-0 top-0 z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-white leading-tight">LexiGuard</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">SECURE LEGAL AI</p>
          </div>
        </div>
      </div>

      {/* Workspace Plan Info */}
      <div className="p-4 mx-4 my-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Workspace Status</span>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getPlanBadge(user?.subscription.plan || "free", user?.subscription.status)}`}>
            {user?.subscription.status === "pending" ? `PENDING ${user?.subscription.plan}` : user?.subscription.plan}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-200 mt-2 truncate">{user?.name || "Amanullah Rana"}</p>
        <p className="text-[11px] text-slate-400 truncate">{user?.email || "amanullahrana446@gmail.com"}</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/20"
                  : "hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                }`} />
                <span>{item.label}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold px-1.5 py-0.5 rounded">
                  <Sparkles className="h-2 w-2" />
                  Analyze
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all cursor-pointer group"
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-rose-400 transition-colors" />
          <span className="group-hover:text-rose-400 transition-colors">Sign Out Workspace</span>
        </button>
      </div>
    </aside>
  );
}

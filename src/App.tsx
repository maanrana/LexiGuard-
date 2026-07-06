import { useState, useEffect } from "react";
import { User, Contract, AnalyticsData, UserSubscription } from "./types";
import Auth from "./components/Auth";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Analyzer from "./components/Analyzer";
import ReportView from "./components/ReportView";
import DraftingAssistant from "./components/DraftingAssistant";
import Billing from "./components/Billing";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  // Session State
  const [token, setToken] = useState<string | null>(localStorage.getItem("lexiguard_session_token"));
  const [user, setUser] = useState<User | null>(null);

  // App Navigation
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Prefill buffer for AI drafting workflow to analyzer
  const [prefillTitle, setPrefillTitle] = useState("");
  const [prefillContent, setPrefillContent] = useState("");

  // Data Store States
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Loading indicator flags
  const [appInitializing, setAppInitializing] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // 1. Session check on start
  useEffect(() => {
    async function checkSession() {
      if (!token) {
        setAppInitializing(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (response.ok) {
          setUser(data.user);
        } else {
          // Token is dead, wipe
          handleLogout();
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        handleLogout();
      } finally {
        setAppInitializing(false);
      }
    }

    checkSession();
  }, [token]);

  // 2. Fetch data once logged in
  useEffect(() => {
    if (user) {
      fetchWorkspaceData();
    }
  }, [user]);

  const fetchWorkspaceData = async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      // Parallel fetches for swift loading
      const [contractsRes, analyticsRes] = await Promise.all([
        fetch("/api/contracts", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/analytics", { headers: { "Authorization": `Bearer ${token}` } }),
      ]);

      const contractsData = await contractsRes.json();
      const analyticsData = await analyticsRes.json();

      if (contractsRes.ok) setContracts(contractsData.contracts || []);
      if (analyticsRes.ok) setAnalytics(analyticsData);
    } catch (err) {
      console.error("Failed to load workspace files:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    localStorage.setItem("lexiguard_session_token", newToken);
    setToken(newToken);
    setUser(newUser);
    setCurrentTab("dashboard");
    setSelectedContract(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("lexiguard_session_token");
    setToken(null);
    setUser(null);
    setContracts([]);
    setAnalytics(null);
    setCurrentTab("dashboard");
    setSelectedContract(null);
  };

  // Upgraded subscription status sync
  const handleUpdateSubscription = (sub: UserSubscription) => {
    if (user) {
      const updatedUser = { ...user, subscription: sub };
      setUser(updatedUser);
      fetchWorkspaceData(); // Refresh limits & logs
    }
  };

  // Refreshes contract catalog once analysis completes
  const handleAnalysisComplete = (newContract: Contract) => {
    setContracts((prev) => [newContract, ...prev]);
    setSelectedContract(newContract); // Drill down immediately!
    fetchWorkspaceData(); // Reload stats and logs
  };

  // Sync comment updates inside specific report deep dives
  const handleUpdateContract = (updated: Contract) => {
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedContract(updated);
  };

  // AI draft integration into analyzer
  const handleImportDraftToAnalyze = (title: string, content: string) => {
    setPrefillTitle(title);
    setPrefillContent(content);
    setSelectedContract(null);
    setCurrentTab("analyze");
  };

  if (appInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
        <span className="text-slate-400 text-sm font-mono tracking-wider">SECURE LEGAL NODE INITIALIZING...</span>
      </div>
    );
  }

  // Not logged in: Route to authentication cards
  if (!user || !token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Navigation Command Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setSelectedContract(null);
          setCurrentTab(tab);
        }}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Viewport Content area */}
      <main className="flex-1 pl-64 min-h-screen flex flex-col">
        {/* Navigation Breadcrumb Bar */}
        <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-10 subtle-shadow">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Workspace</span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs text-slate-800 font-bold uppercase tracking-wider">
              {selectedContract ? "Agreement Report Card" : currentTab}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {dataLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-indigo-500 border-t-transparent" />
                refreshing data...
              </span>
            )}
            <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-800 uppercase shadow-inner">
              {user.name.substring(0, 2)}
            </div>
          </div>
        </header>

        {/* View Routing */}
        <div className="p-4 md:p-8 flex-1">
          {selectedContract ? (
            <ReportView
              contract={selectedContract}
              onBack={() => {
                setSelectedContract(null);
                fetchWorkspaceData(); // Refresh list scores/metrics
              }}
              token={token}
              onUpdateContract={handleUpdateContract}
            />
          ) : (
            <>
              {currentTab === "dashboard" && (
                <Dashboard
                  analytics={analytics}
                  contracts={contracts}
                  onSelectContract={setSelectedContract}
                  onNavigateToAnalyze={() => setCurrentTab("analyze")}
                  loading={dataLoading && contracts.length === 0}
                />
              )}

              {currentTab === "analyze" && (
                <div key={prefillContent ? "prefilled" : "empty"}>
                  <Analyzer
                    onAnalysisComplete={handleAnalysisComplete}
                    token={token}
                    /* Pass down prefilled buffers if present */
                  />
                  {/* Prefill helper code: If App holds pre-filled text, inject it directly */}
                  {prefillContent && (
                    <PrefillInjector
                      prefillTitle={prefillTitle}
                      prefillContent={prefillContent}
                      onCleared={() => {
                        setPrefillTitle("");
                        setPrefillContent("");
                      }}
                    />
                  )}
                </div>
              )}

              {currentTab === "draft" && (
                <DraftingAssistant
                  token={token}
                  onImportToAnalyze={handleImportDraftToAnalyze}
                />
              )}

              {currentTab === "billing" && (
                <Billing
                  user={user}
                  onUpdateSubscription={handleUpdateSubscription}
                  token={token}
                  payoneerEmail={analytics?.payoneerEmail}
                />
              )}

              {currentTab === "logs" && (
                <AdminPanel
                  logs={analytics?.recentActivity || []}
                  loading={dataLoading}
                  stripeConfigured={analytics?.stripeConfigured || false}
                  pendingSubscriptions={analytics?.pendingSubscriptions || []}
                  token={token}
                  onRefreshData={fetchWorkspaceData}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Prefill assistant component that accesses Analyzer elements by firing mock event on mount
interface InjectorProps {
  prefillTitle: string;
  prefillContent: string;
  onCleared: () => void;
}

function PrefillInjector({ prefillTitle, prefillContent, onCleared }: InjectorProps) {
  useEffect(() => {
    const titleInput = document.querySelector('input[placeholder="e.g. Mutual NDA with SaaSify, LLC"]') as HTMLInputElement;
    const textArea = document.querySelector('textarea[placeholder="Paste contract paragraphs, agreements text, or legal boilerplate statements here..."]') as HTMLTextAreaElement;

    if (titleInput && textArea) {
      titleInput.value = prefillTitle;
      textArea.value = prefillContent;

      // Trigger standard React synthetic inputs updates
      const titleEvent = new Event("input", { bubbles: true });
      const textEvent = new Event("input", { bubbles: true });

      // Dispatching value changes to React state managers
      const titleTracker = (titleInput as any)._valueTracker;
      const textTracker = (textArea as any)._valueTracker;

      if (titleTracker) titleTracker.setValue("");
      if (textTracker) textTracker.setValue("");

      titleInput.dispatchEvent(titleEvent);
      textArea.dispatchEvent(textEvent);

      onCleared();
    }
  }, [prefillTitle, prefillContent]);

  return null;
}

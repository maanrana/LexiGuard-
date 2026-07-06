import React, { useState } from "react";
import { Check, ShieldCheck, CreditCard, Receipt, FileCheck, HelpCircle, XCircle } from "lucide-react";
import { User, UserSubscription } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface BillingProps {
  user: User | null;
  onUpdateSubscription: (sub: UserSubscription) => void;
  token: string | null;
  payoneerEmail?: string;
}

export default function Billing({ user, onUpdateSubscription, token, payoneerEmail = "amanullahrana446@gmail.com" }: BillingProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [payoneerSenderEmail, setPayoneerSenderEmail] = useState("");
  const [payoneerTxId, setPayoneerTxId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"payoneer">("payoneer");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "processing" | "success">("form");
  const [approvingAdmin, setApprovingAdmin] = useState(false);

  const handleAdminApproveSelf = async () => {
    if (!token || !user) return;
    setApprovingAdmin(true);
    try {
      const response = await fetch("/api/admin/approve-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to approve subscription");
      }
      alert("🎉 Success! As an administrator, your upgrade request has been instantly verified and activated!");
      
      const meResponse = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (meResponse.ok) {
        const meData = await meResponse.json();
        onUpdateSubscription(meData.user.subscription);
      }
    } catch (err: any) {
      alert(err.message || "An error occurred during instant approval.");
    } finally {
      setApprovingAdmin(false);
    }
  };

  const plans = [
    {
      id: "starter",
      name: "Workspace Starter",
      price: 29,
      period: "month",
      desc: "For solo founders, freelancers, and independent agencies.",
      features: [
        "Up to 5 contract reviews/mo",
        "Standard risk classifications",
        "Compliance Health Score index",
        "NDA & Service agreement templates",
        "Standard email support",
      ],
      badge: "SOLO DRAFT"
    },
    {
      id: "growth",
      name: "Compliance Growth",
      price: 79,
      period: "month",
      desc: "Perfect for active software startups, scaling agencies, and SMBs.",
      features: [
        "Up to 25 contract reviews/mo",
        "High-fidelity AI redlining",
        "Missing clause templates",
        "AI Drafting Studio",
        "Workspace notes & annotations",
        "Priority live email support",
      ],
      badge: "MOST POPULAR",
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise SLA",
      price: 199,
      period: "month",
      desc: "Fully protective suite for larger law teams, funds, and corporations.",
      features: [
        "Unlimited contract scans",
        "Full portfolio analysis",
        "Dedicated corporate boilerplate drafts",
        "Multi-editor workspaces sharing",
        "Immutable Audit Security Logs",
        "Dedicated compliance agent support",
      ],
      badge: "UNLIMITED CLAUSES"
    }
  ];

  const initiateCheckout = (planId: string) => {
    setCheckoutPlan(planId);
    setCheckoutStep("form");
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;

    setCheckoutStep("processing");

    try {
      const response = await fetch("/api/billing/payoneer-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: checkoutPlan,
          payoneerEmail: payoneerSenderEmail,
          transactionId: payoneerTxId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit Payoneer transaction.");
      }

      onUpdateSubscription(data.subscription);
      setCheckoutStep("success");
      alert(`🎉 Success! Your Payoneer payment proof (TxID: ${payoneerTxId}) has been successfully submitted for review. Your account limits will upgrade as soon as the Admin approves your transaction!`);
    } catch (err: any) {
      alert(err.message || "Failed to submit Payoneer details.");
      setCheckoutStep("form");
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your premium subscription? Your workspace limits will immediately revert to the free tier.")) {
      return;
    }

    setLoadingPlan("cancel");
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      onUpdateSubscription(data.subscription);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const getPlanName = (p: string) => {
    switch (p) {
      case "starter": return "Workspace Starter";
      case "growth": return "Compliance Growth";
      case "enterprise": return "Enterprise SLA";
      default: return "Free Workspace Trial";
    }
  };

  // Standard Mock Invoice logs
  const mockInvoices = [
    { id: "inv_1290", date: "Jul 1, 2026", amount: "$79.00", status: "Paid", method: "Stripe Mastercard ending 4242" },
    { id: "inv_1021", date: "Jun 1, 2026", amount: "$79.00", status: "Paid", method: "Stripe Mastercard ending 4242" }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display text-slate-900">
          Subscription Billing
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your subscription plans, invoice logs, active limits, and payment credentials.
        </p>
      </div>

      {/* Subscription Active / Pending Banner */}
      {user?.subscription.status === "pending" ? (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl subtle-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 font-semibold uppercase">Subscription Status:</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 uppercase animate-pulse">
                PENDING REVIEW
              </span>
            </div>
            <h2 className="text-xl font-bold text-amber-900">
              Upgrade Request for {getPlanName(user?.subscription.plan)}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We are verifying your Payoneer payment (TxID: <span className="font-mono font-bold">{user?.subscription.transactionId}</span>) sent from <span className="font-semibold">{user?.subscription.payoneerEmail}</span>. Premium limits will activate automatically once approved by the administrator.
            </p>
            {user?.role === "admin" && (
              <div className="mt-3 p-3 bg-amber-100/60 border border-amber-200 rounded-lg text-xs text-amber-900 leading-normal max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <strong>💡 Admin Control Tip:</strong> Since you are logged in as an Administrator, you can manually approve this payment! You can go to the <strong>"Security Audit Logs"</strong> tab, or click the button on the right to instantly auto-approve this subscription yourself.
                </div>
                <button
                  disabled={approvingAdmin}
                  onClick={handleAdminApproveSelf}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition-all shrink-0 text-xs shadow-sm flex items-center gap-1"
                >
                  Instant Approve ✔
                </button>
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100 border border-amber-200/80 px-4 py-2 rounded-lg font-bold">
            <span className="animate-spin h-3.5 w-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span>Processing Verification</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 p-6 rounded-xl subtle-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial-glow opacity-35 pointer-events-none" />

          <div className="space-y-2 relative">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Active Agreement Plan:</span>
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200 uppercase">
                {user?.subscription.plan || "free"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{getPlanName(user?.subscription.plan || "free")}</h2>
            <p className="text-xs text-slate-500">
              {user?.subscription.plan !== "free"
                ? `Next verification date: ${new Date(user?.subscription.currentPeriodEnd || "").toLocaleDateString()} via manual Payoneer renewal`
                : "Reaching the 3-file review capacity triggers upgrade blocks. Expand workspace limitations now."}
            </p>
          </div>

          {user?.subscription.plan !== "free" && (
            <button
              onClick={handleCancelSubscription}
              disabled={loadingPlan === "cancel"}
              className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 rounded-lg cursor-pointer transition-all disabled:bg-rose-100"
            >
              {loadingPlan === "cancel" ? "Canceling..." : "Cancel Recurring Plan"}
            </button>
          )}
        </div>
      )}

      {/* Pricing Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((p) => {
          const isCurrent = user?.subscription.plan === p.id;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-6 subtle-shadow flex flex-col relative overflow-hidden ${
                p.popular ? "border-2 border-purple-600 ring-4 ring-purple-100" : "border border-slate-200"
              }`}
            >
              {p.popular && (
                <span className="absolute top-3 right-3 bg-purple-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {p.badge}
                </span>
              )}
              {!p.popular && (
                <span className="absolute top-3 right-3 bg-slate-100 text-slate-600 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {p.badge}
                </span>
              )}

              <div className="space-y-2">
                <h3 className="font-bold font-display text-slate-800 text-base">{p.name}</h3>
                <p className="text-xs text-slate-500 h-10 line-clamp-2">{p.desc}</p>
                <div className="pt-2">
                  <span className="text-4xl font-extrabold text-slate-900 font-display">${p.price}</span>
                  <span className="text-xs text-slate-500">/{p.period}</span>
                </div>
              </div>

              {/* Feature check list */}
              <ul className="space-y-3 mt-6 mb-8 flex-1">
                {p.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                    <Check className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full text-center py-2.5 bg-purple-50 text-purple-800 font-bold text-xs rounded-lg border border-purple-100">
                  {user?.subscription.status === "pending" ? "Pending Approval" : "Active Subscription plan"}
                </div>
              ) : (
                <button
                  onClick={() => initiateCheckout(p.id)}
                  disabled={loadingPlan !== null || user?.subscription.status === "pending"}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                    p.popular
                      ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/10"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {loadingPlan === p.id ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    `Upgrade to ${p.name}`
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Historical Invoices */}
      {user?.subscription.plan !== "free" && (
        <div className="bg-white border border-slate-200 rounded-xl subtle-shadow p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold text-slate-900">Receipt Invoice Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Invoice reference</th>
                  <th className="pb-3 font-semibold">Billing date</th>
                  <th className="pb-3 font-semibold">Tier details</th>
                  <th className="pb-3 font-semibold">Paid total</th>
                  <th className="pb-3 font-semibold">Clearing gateway</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {mockInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 font-mono text-purple-600 font-semibold">{inv.id}</td>
                    <td className="py-3">{inv.date}</td>
                    <td className="py-3 font-medium">{getPlanName(user?.subscription.plan || "growth")}</td>
                    <td className="py-3 text-emerald-600 font-bold">{inv.amount}</td>
                    <td className="py-3 text-slate-400">{inv.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive simulated stripe billing modal */}
      <AnimatePresence>
        {checkoutPlan && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl relative"
            >
              {checkoutStep !== "processing" && (
                <button
                  onClick={() => setCheckoutPlan(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}

              {checkoutStep === "form" && (
                <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center p-2.5 bg-purple-50 rounded-xl mb-2">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 font-display">Upgrade Subscription</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Unlock premium features for <span className="font-semibold text-purple-600">{getPlanName(checkoutPlan)}</span>
                    </p>
                  </div>

                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3.5 space-y-2">
                    <p className="font-bold text-purple-950 text-[10px] uppercase tracking-wider">
                      Payoneer Transfer Instructions
                    </p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Please send the subscription amount of <span className="font-bold text-slate-900">${plans.find(p => p.id === checkoutPlan)?.price || 0} USD</span> to our registered Payoneer email account:
                    </p>
                    <div className="bg-white px-3 py-2 rounded-lg border border-purple-200 font-mono text-center font-bold text-purple-700 select-all text-xs">
                      {payoneerEmail}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Tip: Log in to your Payoneer account, select "Make a Payment" in the menu, enter the email above, and input the exact amount. Once sent, paste your Sender Email and Transaction Reference ID below.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Your Payoneer Email or Customer ID</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. sender-payoneer@email.com or 5829104"
                        value={payoneerSenderEmail}
                        onChange={(e) => setPayoneerSenderEmail(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Transaction ID (TxID)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 102938472"
                        value={payoneerTxId}
                        onChange={(e) => setPayoneerTxId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-6 py-2.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Submit Payoneer Proof
                  </button>
                </form>
              )}

              {checkoutStep === "processing" && (
                <div className="p-12 text-center space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-100 border-t-purple-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 font-display">
                      Submitting Payment Reference
                    </h3>
                    <p className="text-xs text-slate-400">
                      Piping audit proof to verification queue...
                    </p>
                  </div>
                </div>
              )}

              {checkoutStep === "success" && (
                <div className="p-8 text-center space-y-6">
                  <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-full border border-emerald-100 mx-auto">
                    <FileCheck className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 text-base font-display">
                      Payment Details Submitted!
                    </h3>
                    <p className="text-xs text-slate-500">
                      Your Payoneer receipt (TxID: <span className="font-mono font-bold">{payoneerTxId}</span>) has been submitted for review. Your account will automatically unlock as <span className="font-semibold text-purple-600">{getPlanName(checkoutPlan)}</span> once the admin approves your transaction!
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCheckoutPlan(null);
                      setCheckoutStep("form");
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                  >
                    Return to Billing Suite
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

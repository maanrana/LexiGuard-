import React, { useState } from "react";
import { ArrowLeft, MessageSquare, AlertTriangle, ShieldAlert, Sparkles, Copy, Check, FileText, Bookmark, Calendar, User, CornerDownRight, Scale } from "lucide-react";
import { Contract, ContractComment } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ReportViewProps {
  contract: Contract;
  onBack: () => void;
  token: string | null;
  onUpdateContract: (updated: Contract) => void;
}

export default function ReportView({ contract, onBack, token, onUpdateContract }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "risks" | "missing" | "text">("risks");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800" };
    if (score >= 60) return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-800" };
    return { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-800" };
  };

  const colors = getScoreColor(contract.riskScore);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommenting(true);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ text: commentText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Comment posting failed.");
      }

      // Appending the comment locally and calling state update
      const updatedComments = [...contract.comments, data.comment];
      const updatedContract = { ...contract, comments: updatedComments };
      onUpdateContract(updatedContract);
      setCommentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setCommenting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-8">
      {/* Upper bar actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agreements catalog
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>ID: {contract.id}</span>
          <span>•</span>
          <span>COMPLIANCE VERIFIED</span>
        </div>
      </div>

      {/* Main summary header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 subtle-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-radial-glow opacity-30 pointer-events-none" />

        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colors.badge}`}>
              {contract.complianceRating}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Processed {new Date(contract.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold font-display text-slate-900">
            {contract.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              {contract.fileName}
            </span>
            <span>({contract.fileSize})</span>
          </div>
        </div>

        {/* Dynamic Compliance score wheel */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Risk Shield score</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Higher is safer</span>
          </div>
          <div className="relative flex items-center justify-center">
            {/* Dynamic visual ring */}
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="32" className="stroke-slate-100 fill-transparent" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="32"
                className={`fill-transparent transition-all duration-1000 ${
                  contract.riskScore >= 80 ? "stroke-emerald-500" : contract.riskScore >= 60 ? "stroke-amber-500" : "stroke-rose-500"
                }`}
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 32}
                strokeDashoffset={2 * Math.PI * 32 * (1 - contract.riskScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-bold text-slate-800">{contract.riskScore}%</span>
          </div>
        </div>
      </div>

      {/* Main dashboard tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Col: Tabs and Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border-b border-slate-200 flex gap-4">
            {[
              { id: "risks", label: `Clauses Risks (${contract.risks.length})` },
              { id: "missing", label: `Missing Protections (${contract.missingClauses.length})` },
              { id: "summary", label: "Executive Summary" },
              { id: "text", label: "Original Text" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-purple-600 text-purple-600 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {/* 1. Risks tab */}
            {activeTab === "risks" && (
              <div className="space-y-4">
                {contract.risks.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                    <Scale className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold">Zero risk clauses identified.</p>
                    <p className="text-xs text-slate-400">This agreement is structurally protective and ready to sign.</p>
                  </div>
                ) : (
                  contract.risks.map((risk) => (
                    <div key={risk.id} className="bg-white border border-slate-200/80 rounded-xl p-5 subtle-shadow space-y-4">
                      {/* Risk Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                            risk.severity === "high" ? "bg-rose-50 border border-rose-100 text-rose-700" :
                            risk.severity === "medium" ? "bg-amber-50 border border-amber-100 text-amber-700" :
                            "bg-blue-50 border border-blue-100 text-blue-700"
                          }`}>
                            {risk.severity} risk
                          </span>
                          <h3 className="font-semibold text-slate-900 text-sm">{risk.category}</h3>
                        </div>
                      </div>

                      {/* Problem Quote */}
                      <div className="p-3 bg-slate-50 border-l-4 border-slate-400 rounded-r-lg text-xs text-slate-600 font-mono leading-relaxed">
                        <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1 font-sans">Offending Clause Quote</div>
                        "{risk.clauseText}"
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Business Impact:</strong> {risk.description}
                      </p>

                      {/* Recommendation */}
                      <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/50 space-y-2">
                        <div className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          Redline Mitigation Proposal
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{risk.suggestion}</p>
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleCopy(risk.id, risk.suggestion)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 hover:text-purple-900 cursor-pointer hover:underline"
                          >
                            {copiedId === risk.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied Redline!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy Redline Proposal
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. Missing protections tab */}
            {activeTab === "missing" && (
              <div className="space-y-4">
                {contract.missingClauses.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                    <Scale className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold">All standard protective clauses present.</p>
                    <p className="text-xs text-slate-400">There are no major omissions or regulatory loopholes.</p>
                  </div>
                ) : (
                  contract.missingClauses.map((clause) => (
                    <div key={clause.id} className="bg-white border border-slate-200/80 rounded-xl p-5 subtle-shadow space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 text-sm">{clause.name}</h3>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          clause.importance === "high" ? "bg-rose-50 border border-rose-100 text-rose-700" :
                          clause.importance === "medium" ? "bg-amber-50 border border-amber-100 text-amber-700" :
                          "bg-slate-50 border border-slate-100 text-slate-600"
                        }`}>
                          {clause.importance} importance
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Omission Risk:</strong> {clause.description}
                      </p>

                      <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/60 space-y-2">
                        <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                          <Bookmark className="h-4 w-4 text-emerald-600" />
                          Recommended Clause Draft
                        </div>
                        <p className="text-xs text-slate-600 font-mono bg-white p-3 rounded-md border border-emerald-100 leading-relaxed">
                          {clause.suggestion}
                        </p>
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => handleCopy(clause.id, clause.suggestion)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer hover:underline"
                          >
                            {copiedId === clause.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied Draft!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy Clause Draft
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Executive Summary tab */}
            {activeTab === "summary" && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 subtle-shadow space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Scale className="h-5 w-5 text-purple-600" />
                  <h2 className="font-semibold text-slate-900">Legal Summary Outlook</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {contract.summary}
                </p>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 space-y-2 leading-relaxed">
                  <span className="font-semibold text-slate-700 block">General Risk Advice</span>
                  Our automated compliance scans review clause terms for lopsided indemnities, governing law liabilities, and missing standard covenants. If any High Severity items remain, we strongly recommend requesting redlines prior to formal execution.
                </div>
              </div>
            )}

            {/* 4. Original Text tab */}
            {activeTab === "text" && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 subtle-shadow">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h2 className="font-semibold text-slate-900 text-sm">Agreement Content</h2>
                  <button
                    onClick={() => handleCopy("full_text", contract.rawContent)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === "full_text" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Full Contract Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Full Text
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg overflow-y-auto max-h-[500px] border border-slate-100 leading-relaxed">
                  {contract.rawContent}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Collaboration, Notes, Workspace Members */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 subtle-shadow flex flex-col h-full">
            <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-purple-600" />
              Workspace redline notes
            </h2>

            {/* Comments List */}
            <div className="flex-1 space-y-4 mb-6 max-h-[350px] overflow-y-auto pr-1">
              {contract.comments.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-xs italic">
                  No notes logged. Add commentary or specific negotiation directives below.
                </div>
              ) : (
                contract.comments.map((cmt) => (
                  <div key={cmt.id} className="p-3.5 bg-slate-50/60 border border-slate-200/40 rounded-xl space-y-1.5 relative">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-bold text-slate-600 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {cmt.authorName}
                      </span>
                      <span>{new Date(cmt.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{cmt.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handlePostComment} className="border-t border-slate-100 pt-4 space-y-3">
              <textarea
                rows={3}
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type negotiation comments, redline instructions..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white resize-none"
              />
              <button
                type="submit"
                disabled={commenting}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-medium text-xs rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {commenting ? (
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <MessageSquare className="h-3.5 w-3.5" />
                    Add Workspace Note
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Sparkles, PenTool, Clipboard, Check, Scale, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

interface DraftingAssistantProps {
  token: string | null;
  onImportToAnalyze: (title: string, content: string) => void;
}

export default function DraftingAssistant({ token, onImportToAnalyze }: DraftingAssistantProps) {
  const [agreementType, setAgreementType] = useState("Mutual NDA");
  const [businessName, setBusinessName] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [industry, setIndustry] = useState("Software Engineering");
  const [specificRules, setSpecificRules] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft output state
  const [draftedText, setDraftedText] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const agreementTypes = [
    "Mutual NDA",
    "Independent Contractor Services Agreement",
    "SaaS Master Services Agreement (MSA)",
    "Software Development Statement of Work (SOW)",
    "Consulting Agreement",
    "Corporate IP Assignment Covenant"
  ];

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName) {
      setError("Please provide your business name to draft the agreement.");
      return;
    }

    setError(null);
    setLoading(true);
    setDraftedText(null);

    try {
      const response = await fetch("/api/contracts/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          agreementType,
          businessName,
          counterpartyName,
          industry,
          specificRules,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI Draft engine failed.");
      }

      setDraftedText(data.draftText);
      setSummary(data.briefSummary);
    } catch (err: any) {
      setError(err.message || "Failed to generate draft. Please check server status.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (draftedText) {
      navigator.clipboard.writeText(draftedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display text-slate-900">
          AI Legal Drafting Studio
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Draft highly protective commercial agreements compiled dynamically by Gemini intelligence according to your specific rules.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left 2 Col: Inputs form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleDraft} className="bg-white border border-slate-200 rounded-xl p-5 subtle-shadow space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
              <PenTool className="h-4 w-4 text-purple-600" />
              Drafting Parameters
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Agreement Type
              </label>
              <select
                value={agreementType}
                onChange={(e) => setAgreementType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"
              >
                {agreementTypes.map((type, i) => (
                  <option key={i} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                My Business Name (Disclosing Party)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Tech Solutions Inc."
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Counterparty Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Vertex Ventures, LLC"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Specific Industry Vertical
              </label>
              <input
                type="text"
                placeholder="e.g. AI SaaS, FinTech, Medical Devices"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Stipulations & custom clauses
              </label>
              <textarea
                rows={5}
                placeholder="e.g. Developer retains ownership of core libraries. Payment terms must be 14-days net. Indefinite trade secret protection."
                value={specificRules}
                onChange={(e) => setSpecificRules(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 text-white font-medium text-sm rounded-lg shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  AI compiling clauses...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Custom Draft
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 3 Col: Outputs */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center h-full flex flex-col justify-center items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-100 border-t-purple-600" />
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-800">Drafting Secure Agreement</h3>
                <p className="text-xs text-slate-400">Gemini model formulating standard commercial protective parameters...</p>
              </div>
            </div>
          ) : draftedText ? (
            <div className="bg-white border border-slate-200 rounded-xl subtle-shadow p-6 space-y-6 flex flex-col h-full">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                    Draft Complete
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">Agreement Preview</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied Agreement!
                      </>
                    ) : (
                      <>
                        <Clipboard className="h-3.5 w-3.5" />
                        Copy Agreement Draft
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onImportToAnalyze(agreementType, draftedText)}
                    className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-all"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    Scan Risk Score
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {summary && (
                <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-100/40 text-xs text-slate-600 leading-relaxed">
                  <strong className="text-purple-900 block font-semibold mb-1">Protections Summary:</strong>
                  {summary}
                </div>
              )}

              {/* Scrollable drafted preview text */}
              <div className="flex-1 overflow-y-auto max-h-[500px] border border-slate-100 rounded-lg p-5 bg-slate-50 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                {draftedText}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-12 text-center h-full flex flex-col justify-center items-center gap-3">
              <div className="p-3 bg-white rounded-full subtle-shadow">
                <PenTool className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Drafting Studio is idle</p>
                <p className="text-xs text-slate-400 mt-1">Configure parameters on the left and trigger compilation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

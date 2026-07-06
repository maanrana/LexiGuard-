import React, { useState, useRef } from "react";
import { Upload, FileText, ChevronRight, AlertCircle, Sparkles, Database, Info, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AnalyzerProps {
  onAnalysisComplete: (contract: any) => void;
  token: string | null;
}

export default function Analyzer({ onAnalysisComplete, token }: AnalyzerProps) {
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingSteps = [
    "Establishing secure payload channel...",
    "Extracting clause text and metadata...",
    "Running structural compliance heuristics...",
    "Contacting Gemini AI intelligence engines...",
    "Constructing risk classifications and mitigation suggestions...",
    "Compiling interactive redlines and drafting feedback...",
    "Writing immutable workspace records..."
  ];

  const simulateLoadingAnimation = () => {
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2200);
    return interval;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("File exceeds our 2MB limit. Please upload shorter contracts or copy-paste text below.");
      return;
    }

    setFileName(file.name);
    setFileSize(`${Math.round(file.size / 1024 * 10) / 10} KB`);
    if (!title) {
      // Auto-populate title
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
    };
    reader.onerror = () => {
      setError("Failed to read files. Please ensure it is a valid encoded text file.");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !rawText) {
      setError("Please input an agreement title and either upload a file or copy-paste contract content.");
      return;
    }

    setError(null);
    setLoading(true);
    const timer = simulateLoadingAnimation();

    try {
      const response = await fetch("/api/contracts/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          fileName: fileName || "manual_input.txt",
          fileSize: fileSize || `${Math.round(rawText.length / 1024 * 10) / 10} KB`,
          fileType: "text/plain",
          rawContent: rawText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Compliance scanning failed.");
      }

      onAnalysisComplete(data.contract);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display text-slate-900">
          AI Contract Risk Review
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload any text document or copy-paste legal terms to generate immediate risk audits, scores, and redlines.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-[2rem] text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <span className="font-semibold">Compliance Block:</span> {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center subtle-shadow relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-glow opacity-50" />
          <div className="relative space-y-6 max-w-lg mx-auto">
            {/* Spinning radar animation */}
            <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold font-display text-slate-900">Analyzing Contract Liability</h3>
              <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
                Step {loadingStep + 1} of {loadingSteps.length}
              </p>
            </div>

            {/* Steps text animation */}
            <div className="h-10 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm font-medium text-slate-600"
                >
                  {loadingSteps[loadingStep]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Loader bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-600"
                animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Disclaimer: LexiGuard provides smart compliance analysis. AI heuristics should supplement, not replace, certified professional legal counsel.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="bg-white border border-slate-200/60 subtle-shadow rounded-[2rem] p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Contract Reference Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mutual NDA with SaaSify, LLC"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* File Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer flex flex-col justify-center items-center gap-3 transition-all ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/40"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.doc,.docx,.json"
                  className="hidden"
                />
                <div className="p-3 bg-white rounded-full subtle-shadow">
                  <Upload className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {fileName ? "Replace file" : "Drag & drop agreement file"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts plain text, docx, json (Max 2MB)
                  </p>
                </div>
                {fileName && (
                  <div className="flex items-center gap-2 mt-2 bg-slate-100/60 px-3 py-1.5 rounded-lg border border-slate-200/40">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-semibold font-mono text-slate-700 truncate max-w-[180px]">
                      {fileName}
                    </span>
                    <span className="text-[10px] text-slate-400">({fileSize})</span>
                  </div>
                )}
              </div>

              {/* Tips list */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/40 space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                  Compliance Heuristic Indicators
                </h3>
                <ul className="space-y-3.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                    <span><strong>Unilateral Indemnity:</strong> Flags unbalanced clauses where only you bear liabilities and costs.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span><strong>Unfavourable Venues:</strong> Reviews jurisdiction settings to verify you aren't forced to arbitrate overseas.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span><strong>Silent Loopholes:</strong> Evaluates missing standard safeguards e.g., liability caps or IP reservations.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Direct copy-paste section */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Paste Raw Contract Clauses / Full Text
              </label>
              <textarea
                required
                rows={12}
                placeholder="Paste contract paragraphs, agreements text, or legal boilerplate statements here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md hover:shadow-indigo-500/10 cursor-pointer transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Analyze Contract Liability
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

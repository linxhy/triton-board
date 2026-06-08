import { useState } from "react";
import { Key, Eye, EyeOff, Check, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function TokenConfig() {
  const { token, setToken } = useAppStore();
  const [inputValue, setInputValue] = useState(token);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setToken(inputValue.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setInputValue("");
    setToken("");
    setSaved(false);
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-3">
        <Key className="w-4 h-4 text-sky-400" />
        <span className="text-sm font-medium text-slate-300">GitHub Token</span>
        <span className="text-xs text-slate-500 ml-1">（可选，提升 API 请求配额）</span>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showToken ? "text" : "password"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 pr-10 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all font-mono"
          />
          <button
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/30 transition-colors border border-sky-500/20"
        >
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? "已保存" : "保存"}
        </button>
        {token && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.08] transition-colors border border-white/[0.08]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

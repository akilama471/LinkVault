import React, { useEffect, useState } from 'react';
import { 
  Globe, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Camera, 
  CheckCircle2, 
  Cpu
} from 'lucide-react';

export const ScrapingSettings: React.FC = () => {
  const [spaFallbackEnabled, setSpaFallbackEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSetting() {
      try {
        if (window.electronAPI?.settings?.getSpaFallback) {
          const res = await window.electronAPI.settings.getSpaFallback();
          if (isMounted && res?.data !== undefined) {
            setSpaFallbackEnabled(Boolean(res.data));
          }
        }
      } catch (err) {
        console.error('Failed to load SPA fallback setting:', err);
      }
    }

    loadSetting();

    const cleanup = window.electronAPI?.events?.onSpaFallbackUpdated?.((enabled: boolean) => {
      if (isMounted) {
        setSpaFallbackEnabled(enabled);
      }
    });

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    setSpaFallbackEnabled(checked);
    try {
      if (window.electronAPI?.settings?.setSpaFallback) {
        await window.electronAPI.settings.setSpaFallback(checked);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
      }
    } catch (err) {
      console.error('Failed to update SPA fallback setting:', err);
      // Revert if failed
      setSpaFallbackEnabled(!checked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Web Scraping & Metadata Resilience</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Anti-Ban Active
              </span>
            </div>
            <p className="text-sm text-gray-500">Configure client-rendered SPA parsing and domain pacing</p>
          </div>
        </div>

        {savedNotice && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Preference Saved
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* SPA Headless Fallback Toggle */}
        <label
          htmlFor="spa-headless-fallback-checkbox"
          className="flex items-start justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">
                Headless Browser Fallback (SPA Support)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <Sparkles className="w-3 h-3" /> Recommended
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              When Cheerio cannot extract metadata from JavaScript-rendered SPAs (React, Vue, Next.js, Twitter/X) 
              or when preview images are missing, LinkVault automatically launches a hidden off-screen browser 
              to execute client-side scripts, extract dynamic meta tags, and capture high-resolution page preview thumbnails.
            </p>
          </div>
          <div className="pt-0.5">
            <input
              id="spa-headless-fallback-checkbox"
              type="checkbox"
              disabled={loading}
              checked={spaFallbackEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            />
          </div>
        </label>

        {/* Resilience Badges & Pacing Information */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            Active Scraping Safeguards
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Per-Domain Jitter
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Throttles repeated requests to the same domain (2.5s base + randomized jitter) to avoid rate limits during large imports.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                <Cpu className="w-3.5 h-3.5 text-amber-500" />
                Exponential Backoff
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Detects HTTP 429 Too Many Requests and automatically applies adaptive delays (10s – 120s) without halting unrelated domains.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                <Camera className="w-3.5 h-3.5 text-purple-500" />
                Screenshot Engine
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Off-screen page capture generates optimized WebP preview cards when websites don&apos;t provide OpenGraph image tags.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

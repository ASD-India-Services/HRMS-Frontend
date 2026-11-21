import { useState } from 'react';
import { useHRSettings } from '@/hooks/useHRSettings';
import { CheckIcon, CopyIcon, InfoIcon } from './SettingsIcons';

export function CareersWidgetTab() {
  const { data: settings } = useHRSettings();
  const [activeTab, setActiveTab] = useState<'widget' | 'iframe'>('widget');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8002';
  const tenantSlug = 'org_digihrms';
  const companyName = settings?.company_name || 'DigiHRMS';

  // Option 2: Lightweight Drop-in JavaScript Widget (Recommended)
  const widgetCodeSnippet = `<!-- Option 2: Drop-in JavaScript Widget for your existing blank careers page section -->
<div id="hrms-careers-widget" data-tenant="${tenantSlug}" data-api="${apiBaseUrl}" data-primary-color="${primaryColor}"></div>
<script src="${origin}/widget/careers.js" async></script>`;

  // Option 1: Responsive Iframe Embed
  const iframeCodeSnippet = `<!-- Option 1: Responsive iFrame Embed with auto-height resizing -->
<div id="hrms-careers-wrapper" style="width:100%;min-height:500px;">
  <iframe
    id="hrms-careers-frame"
    src="${origin}/careers/embed?hide_header=true&tenant=${tenantSlug}"
    width="100%"
    style="border:none;width:100%;min-height:500px;background:transparent;"
    scrolling="no"
    title="Careers at ${companyName}"
  ></iframe>
</div>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'HRMS_CAREERS_RESIZE') {
      var f = document.getElementById('hrms-careers-frame');
      if (f) f.style.height = (e.data.height + 20) + 'px';
    }
  });
</script>`;

  const currentSnippet = activeTab === 'widget' ? widgetCodeSnippet : iframeCodeSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 py-2">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Careers Website Integration</h2>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            Live Jobs Sync
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Embed your open job openings into your company website's existing careers page. Candidates apply directly from your website into the DigiHRMS recruitment pipeline.
        </p>
      </div>

      <hr className="border-gray-200" />

      {/* Integration Method Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('widget')}
          className={`relative rounded-xl border p-4 text-left transition-all ${
            activeTab === 'widget'
              ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-gray-900">Option 2: Drop-In JavaScript Widget</span>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              Recommended
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Lightweight 15 KB snippet that loads live job cards via AJAX and injects them directly into your blank section. 100% native look & feel without iframes or extra scrollbars.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('iframe')}
          className={`relative rounded-xl border p-4 text-left transition-all ${
            activeTab === 'iframe'
              ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-gray-900">Option 1: Responsive iFrame</span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              Sandboxed
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Seamless iframe with auto-height postMessage resizing. Ideal if your website builder restricts external JavaScript or requires an isolated iframe.
          </p>
        </button>
      </div>

      {/* Customization Options Bar */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Button & Accent Color:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer p-0.5 bg-white"
                title="Choose brand accent color"
              />
              <span className="text-xs font-mono font-medium text-gray-600 uppercase">{primaryColor}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/test-widget.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
            >
              <span>Test Widget Demo</span>
              <span className="text-gray-400">↗</span>
            </a>
            <a
              href={`/careers/embed?tenant=${tenantSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
            >
              <span>Full Portal View</span>
              <span className="text-gray-400">↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* Embed Code Snippet Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
            {activeTab === 'widget' ? 'Drop-In Widget Code Snippet' : 'Responsive iFrame Code Snippet'}
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-4 w-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <textarea
            readOnly
            rows={activeTab === 'widget' ? 4 : 12}
            value={currentSnippet}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full rounded-xl border border-gray-300 bg-slate-900 p-4 font-mono text-xs text-emerald-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/50 select-all leading-relaxed"
          />
        </div>
      </div>

      {/* 3-Step Setup Instructions */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 space-y-3">
        <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
          <InfoIcon className="h-4 w-4 text-blue-600 shrink-0" />
          <span>How to install into your website's blank careers section</span>
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-blue-950/80 leading-relaxed pl-1">
          <li>
            <strong>Open your website editor:</strong> In WordPress, Webflow, Squarespace, Wix, or your custom HTML, navigate to your existing careers page.
          </li>
          <li>
            <strong>Add a Custom HTML/Code block:</strong> Locate the blank/empty section where you want jobs to appear and insert a custom HTML block.
          </li>
          <li>
            <strong>Paste & Publish:</strong> Paste the copied snippet above into that block and publish your page. Live job openings and application forms will automatically appear inside that section!
          </li>
        </ol>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Real-Time Sync</div>
          <p className="text-xs text-gray-600">Whenever HR publishes or closes a job in HRMS, your website updates immediately without touching code.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Direct Pipeline Flow</div>
          <p className="text-xs text-gray-600">Candidate applications and resume uploads flow directly into the Recruitment Pipeline under the Applied stage.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Zero Style Conflicts</div>
          <p className="text-xs text-gray-600">Styles are isolated to the container, preserving your company website's original navbar, fonts, and footer.</p>
        </div>
      </div>
    </div>
  );
}



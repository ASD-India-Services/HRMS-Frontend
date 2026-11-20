import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function LiveCareersPortal() {
  const [activeTab, setActiveTab] = useState<'preview' | 'guide' | 'external'>('preview');
  const [selectedGuidePlatform, setSelectedGuidePlatform] = useState<'wordpress' | 'webflow' | 'squarespace' | 'html'>('wordpress');
  const [hideHeaderOption, setHideHeaderOption] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch HR Settings (company name, company website)
  const { data: hrSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['hr-settings-public'],
    queryFn: async () => {
      try {
        const res = await api.get<{ company_name?: string; company_website?: string }>('/api/v1/hr-settings/');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });

  // Fetch Public Openings Count
  const { data: publicJobs } = useQuery({
    queryKey: ['public-jobs-feed'],
    queryFn: async () => {
      try {
        const res = await api.get<{ total_openings: number; company_name?: string }>('/api/v1/recruitment/public/jobs/');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000,
  });

  const origin = window.location.origin;
  const embedUrl = `${origin}/careers/embed`;
  const activeEmbedUrl = hideHeaderOption ? `${embedUrl}?hide_header=true` : embedUrl;
  const directUrl = `${origin}/careers`;
  const companyWebsite = hrSettings?.company_website || '';
  const formattedWebsite = companyWebsite
    ? companyWebsite.startsWith('http://') || companyWebsite.startsWith('https://')
      ? companyWebsite
      : `https://${companyWebsite}`
    : '';

  // Ready-to-use Embed Code Snippet
  const embedCodeSnippet = `<!-- 1. Place this iframe on your existing Careers page where you want openings to display -->
<iframe
  id="hrms-careers-frame"
  src="${activeEmbedUrl}"
  width="100%"
  height="750"
  style="border:none;width:100%;min-height:700px;overflow:hidden;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);"
  scrolling="no"
  title="Careers Portal"
  allow="clipboard-write"
></iframe>

<!-- 2. Auto-resize script: expands the iframe dynamically to match content height -->
<script>
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'HRMS_CAREERS_RESIZE' && event.data.height) {
      var frame = document.getElementById('hrms-careers-frame');
      if (frame) {
        frame.style.height = (event.data.height + 24) + 'px';
      }
    }
  });
</script>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeEmbedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (isSettingsLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <div className="text-sm font-medium text-gray-500">Loading Careers Integration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Method 1 Header & Action Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 font-bold">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Careers Integration: Embed into Existing Website (Method 1)</h2>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active & Ready
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Embed live job openings and application forms directly into your company's existing website (WordPress, Webflow, Squarespace, or custom HTML).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyEmbed}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copiedEmbed ? 'Embed Code Copied!' : 'Copy Embed Code'}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {copiedLink ? 'Link Copied!' : 'Copy Public URL'}
          </button>

          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Standalone
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Live Active Positions</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{publicJobs?.total_openings ?? 0}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">Visible to candidates online</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Integration Architecture</div>
          <div className="mt-1 text-base font-semibold text-gray-900">Method 1: iFrame Widget</div>
          <div className="mt-1 text-xs text-gray-500">Seamless embed into existing website</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Candidate Pipeline Intake</div>
          <div className="mt-1 text-base font-semibold text-emerald-600">Instant Sync</div>
          <div className="mt-1 text-xs text-gray-500">Directly routes to Applicant Pipeline</div>
        </div>
      </div>

      {/* Embed Code Snippet Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 bg-gray-50 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Embed Snippet for Your Existing Website</h3>
            <p className="text-xs text-gray-500">Paste this HTML snippet inside your existing website's Careers page content area.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-2.5 py-1 shadow-2xs hover:bg-gray-50">
              <input
                type="checkbox"
                checked={hideHeaderOption}
                onChange={(e) => setHideHeaderOption(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
              />
              <span>Hide Widget Header (For sites with existing hero banner)</span>
            </label>
            <button
              type="button"
              onClick={handleCopyEmbed}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiedEmbed ? 'Copied to Clipboard!' : 'Copy Snippet'}
            </button>
          </div>
        </div>
        <div className="bg-slate-900 p-4 overflow-x-auto">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
            {embedCodeSnippet}
          </pre>
        </div>
      </div>

      {/* Main Container: Tab Switcher (Live Preview vs Installation Guide vs Company Site) */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white text-primary-700 shadow-xs border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Live Widget Preview
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'guide'
                  ? 'bg-white text-primary-700 shadow-xs border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              CMS Setup Guide
            </button>

            {formattedWebsite && (
              <button
                type="button"
                onClick={() => setActiveTab('external')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'external'
                    ? 'bg-white text-primary-700 shadow-xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Company Website
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500 truncate max-w-xs">{activeEmbedUrl}</span>
          </div>
        </div>

        {/* Tab 1: Live Embed Preview */}
        {activeTab === 'preview' && (
          <div>
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 text-xs text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <span>Interactive Embed Container (Simulates how it renders inside your existing website)</span>
              </span>
              <a
                href={activeEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:underline"
              >
                Open in Full Window &rarr;
              </a>
            </div>
            <div className="w-full bg-slate-50 min-h-[650px]">
              <iframe
                id="preview-hrms-careers-frame"
                src={activeEmbedUrl}
                title="Careers Widget Preview"
                className="w-full h-[700px] border-0"
              />
            </div>
          </div>
        )}

        {/* Tab 2: CMS Setup Guide */}
        {activeTab === 'guide' && (
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-base font-bold text-gray-900">How to Embed into Your Website CMS</h4>
              <p className="mt-1 text-xs text-gray-500">
                Choose your website platform below for step-by-step instructions.
              </p>
            </div>

            {/* Platform Selector Buttons */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
              {[
                { id: 'wordpress', name: 'WordPress' },
                { id: 'webflow', name: 'Webflow' },
                { id: 'squarespace', name: 'Squarespace / Wix' },
                { id: 'html', name: 'Custom HTML / React / Vue' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedGuidePlatform(p.id as any)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    selectedGuidePlatform === p.id
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Platform Instructions */}
            {selectedGuidePlatform === 'wordpress' && (
              <div className="space-y-4 rounded-xl bg-slate-50 p-5 border border-slate-200">
                <h5 className="font-bold text-sm text-slate-900">WordPress Installation</h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700">
                  <li>Log in to your WordPress Admin dashboard (`/wp-admin`).</li>
                  <li>Navigate to <strong>Pages &rarr; Add New</strong> (or open your existing Careers page).</li>
                  <li>In the Gutenberg block editor, click the <strong>(+) Add block</strong> button.</li>
                  <li>Search for and select the <strong>Custom HTML</strong> block.</li>
                  <li>Paste the copied Embed Code snippet into the block.</li>
                  <li>Click <strong>Preview</strong> or <strong>Publish / Update</strong>. The careers widget will render seamlessly!</li>
                </ol>
              </div>
            )}

            {selectedGuidePlatform === 'webflow' && (
              <div className="space-y-4 rounded-xl bg-slate-50 p-5 border border-slate-200">
                <h5 className="font-bold text-sm text-slate-900">Webflow / Framer Installation</h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700">
                  <li>Open your Webflow Designer and go to your Careers / Jobs page.</li>
                  <li>Open the <strong>Add Elements panel (A)</strong>.</li>
                  <li>Under the <em>Components</em> section, drag an <strong>Embed</strong> element onto your page canvas.</li>
                  <li>In the HTML Embed modal that appears, paste the copied snippet.</li>
                  <li>Click <strong>Save & Close</strong>, then <strong>Publish</strong> to your domain.</li>
                </ol>
              </div>
            )}

            {selectedGuidePlatform === 'squarespace' && (
              <div className="space-y-4 rounded-xl bg-slate-50 p-5 border border-slate-200">
                <h5 className="font-bold text-sm text-slate-900">Squarespace or Wix Installation</h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700">
                  <li>Edit your Careers page in the page editor.</li>
                  <li>Click <strong>Add Block</strong> and select <strong>Code</strong> (or <strong>Embed</strong> / <strong>HTML</strong>).</li>
                  <li>Ensure the display mode is set to <strong>HTML</strong> (not CSS or JS).</li>
                  <li>Paste the copied embed snippet into the box.</li>
                  <li>Save the section and publish changes.</li>
                </ol>
              </div>
            )}

            {selectedGuidePlatform === 'html' && (
              <div className="space-y-4 rounded-xl bg-slate-50 p-5 border border-slate-200">
                <h5 className="font-bold text-sm text-slate-900">Custom HTML / Next.js / React / Vue Site</h5>
                <p className="text-xs text-slate-600">
                  Simply paste the `&lt;iframe&gt;` element and the auto-resize `&lt;script&gt;` into your page template or component:
                </p>
                <div className="rounded-lg bg-slate-900 p-3 text-xs font-mono text-slate-200">
                  {`<div className="careers-section">\n  <iframe src="${embedUrl}" width="100%" height="750" style={{ border: 'none' }} />\n</div>`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: External Company Website */}
        {activeTab === 'external' && formattedWebsite && (
          <div className="relative min-h-[650px] w-full bg-gray-100">
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
              <span>Showing your configured company website: <strong>{formattedWebsite}</strong></span>
              <a
                href={formattedWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-amber-900 underline"
              >
                Open in Full Tab &rarr;
              </a>
            </div>
            <iframe
              src={formattedWebsite}
              title="Configured Company Website"
              className="h-[650px] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  );
}
export default LiveCareersPortal;

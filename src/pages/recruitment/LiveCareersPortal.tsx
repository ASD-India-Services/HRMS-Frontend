import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';
import { Card } from '@/components/ui/Card';

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
      <Card className="flex h-96 items-center justify-center">
        <div className="text-sm font-medium text-ink-secondary">Loading Careers Integration...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Method 1 Header & Action Toolbar */}
      <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-lighter text-primary-dark font-bold">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink-primary">Careers Integration: Embed into Existing Website (Method 1)</h2>
              <span className="inline-flex items-center rounded-full bg-success-lighter px-2.5 py-0.5 text-xs font-semibold text-success-dark border border-success-light">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success-main animate-pulse"></span>
                Active & Ready
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Embed live job openings and application forms directly into your company's existing website (WordPress, Webflow, Squarespace, or custom HTML).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button size="small" onClick={handleCopyEmbed} startIcon={<Iconify icon="copy" />}>
            {copiedEmbed ? 'Embed Code Copied!' : 'Copy Embed Code'}
          </Button>

          <Button variant="outlined" color="inherit" size="small" onClick={handleCopyLink} startIcon={<Iconify icon="link" />}>
            {copiedLink ? 'Link Copied!' : 'Copy Public URL'}
          </Button>

          <ButtonLink
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<Iconify icon="external" />}
          >
            Open Standalone
          </ButtonLink>
        </div>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-medium text-ink-secondary">Live Active Positions</div>
          <div className="mt-1 text-2xl font-bold text-ink-primary">{publicJobs?.total_openings ?? 0}</div>
          <div className="mt-1 text-xs text-success-main font-medium">Visible to candidates online</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-ink-secondary">Integration Architecture</div>
          <div className="mt-1 text-base font-semibold text-ink-primary">Method 1: iFrame Widget</div>
          <div className="mt-1 text-xs text-ink-secondary">Seamless embed into existing website</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-ink-secondary">Candidate Pipeline Intake</div>
          <div className="mt-1 text-base font-semibold text-success-main">Instant Sync</div>
          <div className="mt-1 text-xs text-ink-secondary">Directly routes to Applicant Pipeline</div>
        </Card>
      </div>

      {/* Embed Code Snippet Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-divider bg-surface-neutral px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">Embed Snippet for Your Existing Website</h3>
            <p className="text-xs text-ink-secondary">Paste this HTML snippet inside your existing website's Careers page content area.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-ink-primary bg-surface-paper border border-divider rounded-md px-2.5 py-1 shadow-2xs hover:bg-surface-neutral">
              <input
                type="checkbox"
                checked={hideHeaderOption}
                onChange={(e) => setHideHeaderOption(e.target.checked)}
                className="rounded text-primary-main focus:ring-primary-main h-3.5 w-3.5"
              />
              <span>Hide Widget Header (For sites with existing hero banner)</span>
            </label>
            <Button variant="outlined" color="inherit" size="small"
              type="button"
              onClick={handleCopyEmbed}
              className="self-start sm:self-auto"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiedEmbed ? 'Copied to Clipboard!' : 'Copy Snippet'}
            </Button>
          </div>
        </div>
        <div className="bg-grey-900 p-4 overflow-x-auto">
          <pre className="font-mono text-xs text-grey-200 leading-relaxed whitespace-pre">
            {embedCodeSnippet}
          </pre>
        </div>
      </Card>

      {/* Main Container: Tab Switcher (Live Preview vs Installation Guide vs Company Site) */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-divider bg-surface-neutral px-4 py-2">
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'preview' ? 'soft' : 'text'}
              color={activeTab === 'preview' ? 'primary' : 'inherit'}
              size="small"
              onClick={() => setActiveTab('preview')}
              startIcon={<Iconify icon="eye" />}
            >
              Live Widget Preview
            </Button>

            <Button
              variant={activeTab === 'guide' ? 'soft' : 'text'}
              color={activeTab === 'guide' ? 'primary' : 'inherit'}
              size="small"
              onClick={() => setActiveTab('guide')}
              startIcon={<Iconify icon="policies" />}
            >
              CMS Setup Guide
            </Button>

            {formattedWebsite && (
              <Button
              variant={activeTab === 'external' ? 'soft' : 'text'}
              color={activeTab === 'external' ? 'primary' : 'inherit'}
              size="small"
              onClick={() => setActiveTab('external')}
              startIcon={<Iconify icon="branches" />}
            >
              Company Website
            </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink-secondary truncate max-w-xs">{activeEmbedUrl}</span>
          </div>
        </div>

        {/* Tab 1: Live Embed Preview */}
        {activeTab === 'preview' && (
          <div>
            <div className="bg-surface-neutral border-b border-divider px-4 py-2 text-xs text-ink-secondary flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success-main"></span>
                <span>Interactive Embed Container (Simulates how it renders inside your existing website)</span>
              </span>
              <a
                href={activeEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-main hover:underline"
              >
                Open in Full Window
              </a>
            </div>
            <div className="w-full bg-surface-neutral min-h-[650px]">
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
              <h4 className="text-base font-bold text-ink-primary">How to Embed into Your Website CMS</h4>
              <p className="mt-1 text-xs text-ink-secondary">
                Choose your website platform below for step-by-step instructions.
              </p>
            </div>

            {/* Platform Selector Buttons */}
            <div className="flex flex-wrap gap-2 border-b border-divider pb-3">
              {[
                { id: 'wordpress', name: 'WordPress' },
                { id: 'webflow', name: 'Webflow' },
                { id: 'squarespace', name: 'Squarespace / Wix' },
                { id: 'html', name: 'Custom HTML / React / Vue' },
              ].map((p) => (
                <Button
                  key={p.id}
                  size="small"
                  variant={selectedGuidePlatform === p.id ? 'contained' : 'soft'}
                  color={selectedGuidePlatform === p.id ? 'primary' : 'inherit'}
                  onClick={() => setSelectedGuidePlatform(p.id as any)}
                >
                  {p.name}
                </Button>
              ))}
            </div>

            {/* Platform Instructions */}
            {selectedGuidePlatform === 'wordpress' && (
              <div className="space-y-4 rounded-xl bg-surface-neutral p-5 border border-divider">
                <h5 className="font-bold text-sm text-ink-primary">WordPress Installation</h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-ink-primary">
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
              <div className="space-y-4 rounded-xl bg-surface-neutral p-5 border border-divider">
                <h5 className="font-bold text-sm text-ink-primary">Webflow / Framer Installation</h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-ink-primary">
                  <li>Open your Webflow Designer and go to your Careers / Jobs page.</li>
                  <li>Open the <strong>Add Elements panel (A)</strong>.</li>
                  <li>Under the <em>Components</em> section, drag an <strong>Embed</strong> element onto your page canvas.</li>
                  <li>In the HTML Embed modal that appears, paste the copied snippet.</li>
                  <li>Click <strong>Save & Close</strong>, then <strong>Publish</strong> to your domain.</li>
                </ol>
              </div>
            )}

            {selectedGuidePlatform === 'squarespace' && (
              <div className="space-y-4 rounded-xl bg-surface-neutral p-5 border border-divider">
                <h5 className="font-bold text-sm text-ink-primary">Squarespace or Wix Installation</h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-ink-primary">
                  <li>Edit your Careers page in the page editor.</li>
                  <li>Click <strong>Add Block</strong> and select <strong>Code</strong> (or <strong>Embed</strong> / <strong>HTML</strong>).</li>
                  <li>Ensure the display mode is set to <strong>HTML</strong> (not CSS or JS).</li>
                  <li>Paste the copied embed snippet into the box.</li>
                  <li>Save the section and publish changes.</li>
                </ol>
              </div>
            )}

            {selectedGuidePlatform === 'html' && (
              <div className="space-y-4 rounded-xl bg-surface-neutral p-5 border border-divider">
                <h5 className="font-bold text-sm text-ink-primary">Custom HTML / Next.js / React / Vue Site</h5>
                <p className="text-xs text-ink-secondary">
                  Simply paste the `&lt;iframe&gt;` element and the auto-resize `&lt;script&gt;` into your page template or component:
                </p>
                <div className="rounded-lg bg-grey-900 p-3 text-xs font-mono text-grey-200">
                  {`<div className="careers-section">\n  <iframe src="${embedUrl}" width="100%" height="750" style={{ border: 'none' }} />\n</div>`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: External Company Website */}
        {activeTab === 'external' && formattedWebsite && (
          <div className="relative min-h-[650px] w-full bg-surface-neutral">
            <div className="bg-warning-lighter border-b border-warning-light px-4 py-2 text-xs text-warning-dark flex items-center justify-between">
              <span>Showing your configured company website: <strong>{formattedWebsite}</strong></span>
              <a
                href={formattedWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-warning-darker underline"
              >
                Open in Full Tab
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
      </Card>
    </div>
  );
}
export default LiveCareersPortal;

import { useState } from 'react';
import { useHRSettings } from '@/hooks/useHRSettings';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { CheckIcon, CopyIcon, ExternalLinkIcon, InfoIcon } from './SettingsIcons';

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
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-ink-primary">Careers Website Integration</h2>
          <span className="inline-flex items-center rounded-full bg-success-lighter px-2.5 py-0.5 text-xs font-semibold text-success-dark">
            Live Jobs Sync
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          Embed your open job openings into your company website's existing careers page. Candidates apply directly from your website into the DigiHRMS recruitment pipeline.
        </p>
      </div>

      {/* Integration Method Selector */}
      <div>
        <Tabs
          aria-label="Integration method"
          className="!mb-3"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'widget', label: 'Option 2: Drop-In JavaScript Widget' },
            { value: 'iframe', label: 'Option 1: Responsive iFrame' },
          ]}
        />
        <p className="text-sm text-ink-secondary">
          {activeTab === 'widget'
            ? 'Recommended. Lightweight 15 KB snippet that loads live job cards via AJAX and injects them directly into your blank section. Native look and feel without iframes or extra scrollbars.'
            : 'Sandboxed. Seamless iframe with auto-height postMessage resizing. Ideal if your website builder restricts external JavaScript or requires an isolated iframe.'}
        </p>
      </div>

      {/* Customization Options Bar */}
      <Card className="bg-surface-neutral p-4 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="careers-accent-color" className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Button & Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="careers-accent-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-grey-500/30 bg-surface-paper p-0.5"
                title="Choose brand accent color"
              />
              <span className="font-mono text-xs font-medium uppercase text-ink-secondary">{primaryColor}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ButtonLink
              href="/test-widget.html"
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="inherit"
              size="small"
              endIcon={<ExternalLinkIcon />}
            >
              Test Widget Demo
            </ButtonLink>
            <ButtonLink
              href={`/careers/embed?tenant=${tenantSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="inherit"
              size="small"
              endIcon={<ExternalLinkIcon />}
            >
              Full Portal View
            </ButtonLink>
          </div>
        </div>
      </Card>

      {/* Embed Code Snippet Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="careers-snippet" className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            {activeTab === 'widget' ? 'Drop-In Widget Code Snippet' : 'Responsive iFrame Code Snippet'}
          </label>
          <Button size="small" onClick={handleCopy} startIcon={copied ? <CheckIcon /> : <CopyIcon />}>
            {copied ? 'Copied to Clipboard!' : 'Copy Code'}
          </Button>
        </div>
        <textarea
          id="careers-snippet"
          readOnly
          rows={activeTab === 'widget' ? 4 : 12}
          value={currentSnippet}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          className="w-full select-all rounded-lg border border-grey-500/30 bg-surface-neutral p-4 font-mono text-xs leading-relaxed text-ink-primary focus:outline-none focus:ring-2 focus:ring-primary-main/40"
        />
      </div>

      {/* 3-Step Setup Instructions */}
      <div className="space-y-3 rounded-lg bg-info-lighter p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-info-darker">
          <InfoIcon className="h-4 w-4 shrink-0 text-info-dark" />
          <span>How to install into your website's blank careers section</span>
        </h3>
        <ol className="list-inside list-decimal space-y-2 pl-1 text-sm leading-relaxed text-ink-secondary">
          <li>
            <strong className="text-ink-primary">Open your website editor:</strong> In WordPress, Webflow, Squarespace, Wix, or your custom HTML, navigate to your existing careers page.
          </li>
          <li>
            <strong className="text-ink-primary">Add a Custom HTML/Code block:</strong> Locate the blank/empty section where you want jobs to appear and insert a custom HTML block.
          </li>
          <li>
            <strong className="text-ink-primary">Paste & Publish:</strong> Paste the copied snippet above into that block and publish your page. Live job openings and application forms will automatically appear inside that section!
          </li>
        </ol>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['Real-Time Sync', 'Whenever HR publishes or closes a job in HRMS, your website updates immediately without touching code.'],
          ['Direct Pipeline Flow', 'Candidate applications and resume uploads flow directly into the Recruitment Pipeline under the Applied stage.'],
          ['Zero Style Conflicts', "Styles are isolated to the container, preserving your company website's original navbar, fonts, and footer."],
        ].map(([title, text]) => (
          <Card key={title} className="p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-secondary">{title}</div>
            <p className="text-xs text-ink-secondary">{text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

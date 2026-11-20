(function () {
  'use strict';

  // Prevent multiple initializations if script is included twice
  if (window.__HRMS_CAREERS_WIDGET_INITIALIZED__) return;
  window.__HRMS_CAREERS_WIDGET_INITIALIZED__ = true;

  // Auto-detect current script tag and options
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src || '';
        if (src.indexOf('careers.js') > -1 || src.indexOf('careers-widget.js') > -1 || src.indexOf('widget.js') > -1) {
          return scripts[i];
        }
      }
      return scripts[scripts.length - 1];
    })();

  var targetSelector = (currentScript && currentScript.getAttribute('data-target')) || '#hrms-careers-widget';
  var targetContainer =
    document.querySelector(targetSelector) ||
    document.querySelector('#hrms-careers-widget') ||
    document.querySelector('#hrms-careers-container') ||
    document.querySelector('#hrms-careers') ||
    document.querySelector('[data-hrms-careers]');

  var tenant =
    (targetContainer && targetContainer.getAttribute('data-tenant')) ||
    (currentScript && currentScript.getAttribute('data-tenant')) ||
    'org_digihrms';

  var primaryColor =
    (targetContainer && targetContainer.getAttribute('data-primary-color')) ||
    (currentScript && currentScript.getAttribute('data-primary-color')) ||
    '#2563eb';

  // API base URL
  var scriptSrc = (currentScript && currentScript.src) || '';
  var scriptOrigin = '';
  try {
    if (scriptSrc) {
      var url = new URL(scriptSrc);
      scriptOrigin = url.origin;
    }
  } catch (e) {}

  var apiBase =
    (targetContainer && targetContainer.getAttribute('data-api')) ||
    (currentScript && currentScript.getAttribute('data-api')) ||
    '';

  if (!apiBase) {
    if (scriptOrigin && (scriptOrigin.indexOf('localhost') > -1 || scriptOrigin.indexOf('127.0.0.1') > -1)) {
      apiBase = 'http://localhost:8002';
    } else if (scriptOrigin) {
      apiBase = scriptOrigin;
    } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      apiBase = 'http://localhost:8002';
    } else if (typeof window !== 'undefined') {
      apiBase = window.location.origin;
    }
  }

  // Ensure local dev routes directly to HRMS backend on port 8002 (port 8000 is Identity Center)
  if (apiBase.indexOf(':8000') > -1) {
    apiBase = apiBase.replace(':8000', ':8002');
  }
  if (apiBase.indexOf(':3001') > -1 || apiBase.indexOf(':5173') > -1 || apiBase.indexOf(':3000') > -1) {
    apiBase = 'http://localhost:8002';
  }

  // Inject Scoped Stylesheet
  var styleId = 'hrms-careers-widget-styles';
  if (!document.getElementById(styleId)) {
    var styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      .hrms-cw-root {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1f2937;
        line-height: 1.5;
        box-sizing: border-box;
        margin: 2rem 0;
      }
      .hrms-cw-root *, .hrms-cw-root *::before, .hrms-cw-root *::after {
        box-sizing: border-box;
      }
      .hrms-cw-header {
        margin-bottom: 2rem;
      }
      .hrms-cw-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 0.5rem;
      }
      .hrms-cw-company-title {
        font-size: 1.875rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
      }
      .hrms-cw-subtitle {
        color: #6b7280;
        font-size: 0.975rem;
        margin: 0;
      }
      .hrms-cw-count-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.8125rem;
        font-weight: 600;
        background-color: #eff6ff;
        color: ${primaryColor};
        border: 1px solid #bfdbfe;
      }
      .hrms-cw-filter-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        background: #f9fafb;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
      }
      .hrms-cw-search-input {
        flex: 1 1 240px;
        padding: 0.625rem 0.875rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        background: #fff;
        color: #111827;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .hrms-cw-search-input:focus {
        border-color: ${primaryColor};
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
      }
      .hrms-cw-dept-select {
        flex: 0 1 200px;
        padding: 0.625rem 0.875rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        background: #fff;
        color: #111827;
        cursor: pointer;
        outline: none;
      }
      .hrms-cw-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.25rem;
      }
      .hrms-cw-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .hrms-cw-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.07);
        border-color: #cbd5e1;
      }
      .hrms-cw-card-header {
        margin-bottom: 0.75rem;
      }
      .hrms-cw-card-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 0.5rem 0;
      }
      .hrms-cw-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }
      .hrms-cw-meta-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.2rem 0.55rem;
        border-radius: 0.375rem;
        background: #f3f4f6;
        color: #4b5563;
      }
      .hrms-cw-meta-pill-primary {
        background: #eff6ff;
        color: ${primaryColor};
        font-weight: 600;
      }
      .hrms-cw-card-desc {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0 0 1.25rem 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.45;
      }
      .hrms-cw-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 1rem;
        border-top: 1px solid #f3f4f6;
      }
      .hrms-cw-vacancies {
        font-size: 0.8125rem;
        color: #6b7280;
      }
      .hrms-cw-btn-apply {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background-color: ${primaryColor};
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
      }
      .hrms-cw-btn-apply:hover {
        filter: brightness(0.92);
      }
      .hrms-cw-empty {
        text-align: center;
        padding: 3rem 1.5rem;
        background: #f9fafb;
        border-radius: 0.75rem;
        border: 1px dashed #d1d5db;
        color: #6b7280;
        grid-column: 1 / -1;
      }
      .hrms-cw-spinner {
        display: inline-block;
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: hrms-cw-spin 0.6s linear infinite;
      }
      @keyframes hrms-cw-spin {
        to { transform: rotate(360deg); }
      }

      /* Modal Overlay */
      .hrms-cw-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        padding: 1rem;
        animation: hrms-cw-fade 0.15s ease-out;
      }
      @keyframes hrms-cw-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .hrms-cw-modal {
        background: #ffffff;
        border-radius: 0.875rem;
        max-width: 640px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        padding: 1.75rem;
        position: relative;
      }
      .hrms-cw-modal-close {
        position: absolute;
        top: 1.25rem;
        right: 1.25rem;
        background: transparent;
        border: none;
        font-size: 1.5rem;
        line-height: 1;
        color: #9ca3af;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.375rem;
      }
      .hrms-cw-modal-close:hover {
        color: #111827;
        background: #f3f4f6;
      }
      .hrms-cw-form-group {
        margin-bottom: 1rem;
      }
      .hrms-cw-form-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.35rem;
      }
      .hrms-cw-form-input, .hrms-cw-form-textarea {
        width: 100%;
        padding: 0.55rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        color: #111827;
        outline: none;
        transition: border-color 0.2s;
      }
      .hrms-cw-form-input:focus, .hrms-cw-form-textarea:focus {
        border-color: ${primaryColor};
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
      }
      .hrms-cw-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      @media (max-width: 540px) {
        .hrms-cw-form-row {
          grid-template-columns: 1fr;
        }
      }
      .hrms-cw-success-card {
        text-align: center;
        padding: 2.5rem 1rem;
      }
      .hrms-cw-success-icon {
        width: 3.5rem;
        height: 3.5rem;
        margin: 0 auto 1rem;
        background: #dcfce7;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 1.75rem;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Find or create container element
  var container = targetContainer || document.querySelector(targetSelector);
  if (!container) {
    container = document.createElement('div');
    container.id = targetSelector.replace('#', '');
    if (currentScript && currentScript.parentNode) {
      currentScript.parentNode.insertBefore(container, currentScript.nextSibling);
    } else {
      document.body.appendChild(container);
    }
  }

  // Render Loading skeleton
  container.className = 'hrms-cw-root';
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem 1rem; color: #6b7280;">
      <div style="display: inline-block; width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-radius: 50%; border-top-color: ${primaryColor}; animation: hrms-cw-spin 0.8s linear infinite; margin-bottom: 0.75rem;"></div>
      <div style="font-size: 0.95rem; font-weight: 500;">Loading current career openings...</div>
    </div>
  `;

  // Fetch Openings from Public Recruitment API
  var apiUrl = apiBase + '/api/v1/recruitment/public/jobs/?tenant=' + encodeURIComponent(tenant);
  var openings = [];
  var companyName = 'Careers';

  function fetchOpenings() {
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Tenant-Id': tenant,
      },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load career openings (HTTP ' + res.status + ')');
        return res.json();
      })
      .then(function (data) {
        companyName = data.company_name || 'DigiHRMS';
        openings = data.results || [];
        renderWidget();
      })
      .catch(function (err) {
        container.innerHTML = `
          <div class="hrms-cw-empty" style="border-color: #fca5a5; background: #fef2f2; color: #991b1b;">
            <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem;">Unable to load job postings</div>
            <div style="font-size: 0.85rem; color: #b91c1c;">${err.message || 'Please check your connection and tenant configuration.'}</div>
          </div>
        `;
      });
  }

  // Render Widget UI
  function renderWidget() {
    var departments = [];
    openings.forEach(function (j) {
      var d = (j.department_name || (j.department && j.department.name) || 'General').trim();
      if (d && departments.indexOf(d) === -1) departments.push(d);
    });

    var html = `
      <div class="hrms-cw-header">
        <div class="hrms-cw-title-row">
          <h2 class="hrms-cw-company-title">Careers at ${escapeHtml(companyName)}</h2>
          <span class="hrms-cw-count-badge">${openings.length} Open Position${openings.length === 1 ? '' : 's'}</span>
        </div>
        <p class="hrms-cw-subtitle">Explore open vacancies, build great products, and grow your career with us.</p>
      </div>

      <div class="hrms-cw-filter-bar">
        <input type="text" id="hrms-cw-search" class="hrms-cw-search-input" placeholder="Search by job title, department, or keywords..." />
        <select id="hrms-cw-dept" class="hrms-cw-dept-select">
          <option value="">All Departments</option>
          ${departments
            .map(function (dept) {
              return '<option value="' + escapeHtml(dept) + '">' + escapeHtml(dept) + '</option>';
            })
            .join('')}
        </select>
      </div>

      <div id="hrms-cw-job-grid" class="hrms-cw-grid"></div>
    `;

    container.innerHTML = html;

    var searchInput = container.querySelector('#hrms-cw-search');
    var deptSelect = container.querySelector('#hrms-cw-dept');
    var gridEl = container.querySelector('#hrms-cw-job-grid');

    function filterAndRender() {
      var query = (searchInput.value || '').toLowerCase().trim();
      var selectedDept = (deptSelect.value || '').toLowerCase().trim();

      var filtered = openings.filter(function (job) {
        var title = (job.title || '').toLowerCase();
        var dept = (job.department_name || (job.department && job.department.name) || 'General').toLowerCase();
        var desc = (job.description || '').toLowerCase();

        var matchesQuery = !query || title.indexOf(query) > -1 || dept.indexOf(query) > -1 || desc.indexOf(query) > -1;
        var matchesDept = !selectedDept || dept === selectedDept;

        return matchesQuery && matchesDept;
      });

      if (filtered.length === 0) {
        gridEl.innerHTML = `
          <div class="hrms-cw-empty">
            <svg style="width: 2.5rem; height: 2.5rem; margin: 0 auto 0.75rem; color: #9ca3af;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem;">No job openings found</div>
            <div style="font-size: 0.85rem;">Try adjusting your search criteria or clearing filters.</div>
          </div>
        `;
        return;
      }

      gridEl.innerHTML = filtered
        .map(function (job) {
          var dept = job.department_name || (job.department && job.department.name) || 'General';
          var vacancies = job.vacancies || 1;
          var closesOn = job.closes_on ? 'Closes ' + job.closes_on : 'Immediate Joiners';

          return `
            <div class="hrms-cw-card" data-job-id="${escapeHtml(job.id)}">
              <div class="hrms-cw-card-header">
                <div class="hrms-cw-meta-row">
                  <span class="hrms-cw-meta-pill hrms-cw-meta-pill-primary">${escapeHtml(dept)}</span>
                  <span class="hrms-cw-meta-pill">${escapeHtml(job.job_type || 'Full-Time')}</span>
                </div>
                <h3 class="hrms-cw-card-title">${escapeHtml(job.title)}</h3>
                <p class="hrms-cw-card-desc">${escapeHtml(stripHtml(job.description || 'No description provided.'))}</p>
              </div>
              <div class="hrms-cw-card-footer">
                <div class="hrms-cw-vacancies">
                  <strong>${vacancies}</strong> open ${vacancies === 1 ? 'position' : 'positions'} &bull; <span style="color: #9ca3af;">${closesOn}</span>
                </div>
                <button type="button" class="hrms-cw-btn-apply" data-action="apply" data-job-id="${escapeHtml(job.id)}">
                  Apply Now &rarr;
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      // Attach click listeners to cards and apply buttons
      var applyButtons = gridEl.querySelectorAll('[data-action="apply"]');
      applyButtons.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var jobId = this.getAttribute('data-job-id');
          var targetJob = openings.find(function (j) {
            return String(j.id) === String(jobId);
          });
          if (targetJob) openApplicationModal(targetJob);
        });
      });
    }

    searchInput.addEventListener('input', filterAndRender);
    deptSelect.addEventListener('change', filterAndRender);

    filterAndRender();
  }

  // Open Application Modal
  function openApplicationModal(job) {
    var modalOverlay = document.createElement('div');
    modalOverlay.className = 'hrms-cw-modal-overlay';

    var dept = job.department_name || (job.department && job.department.name) || 'General';

    modalOverlay.innerHTML = `
      <div class="hrms-cw-modal">
        <button type="button" class="hrms-cw-modal-close" aria-label="Close modal">&times;</button>
        <div style="margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
          <span class="hrms-cw-meta-pill hrms-cw-meta-pill-primary" style="margin-bottom: 0.5rem;">${escapeHtml(dept)}</span>
          <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0.25rem 0 0.5rem; color: #111827;">${escapeHtml(job.title)}</h2>
          <div style="font-size: 0.8125rem; color: #6b7280;">Fill out the form below to submit your application directly to our hiring team.</div>
        </div>

        <form id="hrms-cw-apply-form">
          <input type="hidden" name="job_opening" value="${escapeHtml(job.id)}" />

          <div class="hrms-cw-form-row">
            <div class="hrms-cw-form-group">
              <label class="hrms-cw-form-label">Full Name *</label>
              <input type="text" name="name" class="hrms-cw-form-input" required placeholder="John Doe" />
            </div>
            <div class="hrms-cw-form-group">
              <label class="hrms-cw-form-label">Email Address *</label>
              <input type="email" name="email" class="hrms-cw-form-input" required placeholder="john@example.com" />
            </div>
          </div>

          <div class="hrms-cw-form-row">
            <div class="hrms-cw-form-group">
              <label class="hrms-cw-form-label">Phone Number *</label>
              <input type="tel" name="phone" class="hrms-cw-form-input" required placeholder="+1 555-0123" />
            </div>
            <div class="hrms-cw-form-group">
              <label class="hrms-cw-form-label">Total Experience (Years)</label>
              <input type="number" step="0.5" min="0" name="experience" class="hrms-cw-form-input" placeholder="e.g. 3.5" />
            </div>
          </div>

          <div class="hrms-cw-form-group">
            <label class="hrms-cw-form-label">Resume / CV (Upload PDF/DOC or provide Link) *</label>
            <input type="file" name="resume" accept=".pdf,.doc,.docx" class="hrms-cw-form-input" style="padding: 0.4rem;" />
            <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">Or paste resume URL (Google Drive, Dropbox, LinkedIn profile):</div>
            <input type="url" name="resume_url" class="hrms-cw-form-input" placeholder="https://..." style="margin-top: 0.35rem;" />
          </div>

          <div class="hrms-cw-form-group">
            <label class="hrms-cw-form-label">Cover Note / Additional Details</label>
            <textarea name="notes" rows="3" class="hrms-cw-form-textarea" placeholder="Briefly introduce yourself, your notice period, or expected CTC..."></textarea>
          </div>

          <div id="hrms-cw-form-error" style="display: none; padding: 0.75rem; border-radius: 0.5rem; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 0.8125rem; margin-bottom: 1rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" id="hrms-cw-modal-cancel" style="padding: 0.55rem 1rem; border: 1px solid #d1d5db; background: #fff; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; color: #4b5563; cursor: pointer;">
              Cancel
            </button>
            <button type="submit" id="hrms-cw-modal-submit" class="hrms-cw-btn-apply" style="padding: 0.55rem 1.25rem;">
              Submit Application
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    var closeBtn = modalOverlay.querySelector('.hrms-cw-modal-close');
    var cancelBtn = modalOverlay.querySelector('#hrms-cw-modal-cancel');
    var form = modalOverlay.querySelector('#hrms-cw-apply-form');
    var errorBox = modalOverlay.querySelector('#hrms-cw-form-error');
    var submitBtn = modalOverlay.querySelector('#hrms-cw-modal-submit');

    function closeModal() {
      if (modalOverlay && modalOverlay.parentNode) {
        modalOverlay.parentNode.removeChild(modalOverlay);
      }
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });

    // Form submission handler
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.style.display = 'none';

      var formData = new FormData(form);
      var resumeFileInput = form.querySelector('input[name="resume"]');
      var resumeFile = resumeFileInput && resumeFileInput.files ? resumeFileInput.files[0] : null;
      var resumeUrlInput = form.querySelector('input[name="resume_url"]');
      var resumeUrl = resumeUrlInput ? resumeUrlInput.value.trim() : '';

      if (!resumeFile && !resumeUrl) {
        errorBox.textContent = 'Please either upload your resume file or provide a link to your resume.';
        errorBox.style.display = 'block';
        return;
      }

      if (!resumeFile) {
        formData.delete('resume');
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="hrms-cw-spinner"></span> Submitting...';

      var postUrl = apiBase + '/api/v1/recruitment/public/apply/?tenant=' + encodeURIComponent(tenant);

      fetch(postUrl, {
        method: 'POST',
        headers: {
          'X-Tenant-Id': tenant,
        },
        body: formData,
      })
        .then(function (res) {
          if (!res.ok) {
            return res.json().then(function (errData) {
              var msg = 'Failed to submit application. ';
              if (typeof errData === 'object') {
                msg += Object.keys(errData)
                  .map(function (k) {
                    return k + ': ' + (Array.isArray(errData[k]) ? errData[k].join(', ') : errData[k]);
                  })
                  .join('; ');
              }
              throw new Error(msg);
            });
          }
          return res.json();
        })
        .then(function (resData) {
          // Success State
          var modalContent = modalOverlay.querySelector('.hrms-cw-modal');
          modalContent.innerHTML = `
            <div class="hrms-cw-success-card">
              <div class="hrms-cw-success-icon">&#10003;</div>
              <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Application Received!</h2>
              <p style="color: #4b5563; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
                Thank you for applying to the <strong>${escapeHtml(job.title)}</strong> position at <strong>${escapeHtml(companyName)}</strong>.
                Our talent acquisition team has received your profile and will review it shortly.
              </p>
              <button type="button" id="hrms-cw-success-done" class="hrms-cw-btn-apply" style="margin: 0 auto; padding: 0.65rem 1.5rem;">
                Done
              </button>
            </div>
          `;
          modalContent.querySelector('#hrms-cw-success-done').addEventListener('click', closeModal);
        })
        .catch(function (err) {
          errorBox.textContent = err.message || 'An unexpected error occurred. Please try again.';
          errorBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application';
        });
    });
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '');
  }

  // Kickoff
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchOpenings);
  } else {
    fetchOpenings();
  }
})();

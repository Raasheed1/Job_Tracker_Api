/* =============================================================
   JobTrackr — Frontend Application Logic
   ============================================================= */

// ── Environment Toggle ──────────────────────────────────────────
// Set IS_LOCAL_DEV = true when running the Flask backend locally.
// Set to false (or leave as-is) when using the deployed Render API.
const IS_LOCAL_DEV = false;
const BASE_URL = IS_LOCAL_DEV
  ? 'http://localhost:5000'
  : 'https://job-tracker-api-gjs9.onrender.com';

/* ===================== STATE ===================== */
let accessToken = localStorage.getItem('access_token') || null;
let refreshToken = localStorage.getItem('refresh_token') || null;
let currentUser  = localStorage.getItem('user_email') || null;

let currentPage  = 1;
let totalPages   = 1;
let currentJobId = null;  // for modal

let searchDebounceTimer = null;

/* ===================== INIT ===================== */
window.addEventListener('DOMContentLoaded', () => {
  if (accessToken) {
    initApp();
  }
  // Add sidebar overlay div
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  overlay.onclick = () => toggleSidebar();
  document.body.appendChild(overlay);
});

/* ===================== AUTH ===================== */
function showAuthTab(tab) {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
  clearAuthErrors();
}

function clearAuthErrors() {
  const ids = ['login-error', 'register-error', 'register-success'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('hidden');
    el.textContent = '';
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  errEl.classList.add('hidden');
  setButtonLoading(btn, true);

  try {
    const res = await apiFetch('/auth/login', 'POST', { email, password }, false);
    if (res.ok) {
      const json = await res.json();
      accessToken  = json.data.access_token;
      refreshToken = json.data.refresh_token;
      currentUser  = email;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user_email', email);
      initApp();
    } else {
      const json = await res.json();
      showError(errEl, json.error || 'Login failed. Please check your credentials.');
    }
  } catch (err) {
    showError(errEl, 'Could not connect to server. Make sure the backend is running.');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const btn       = document.getElementById('register-btn');
  const errEl     = document.getElementById('register-error');
  const successEl = document.getElementById('register-success');

  errEl.classList.add('hidden');
  successEl.classList.add('hidden');
  setButtonLoading(btn, true);

  try {
    const res = await apiFetch('/auth/register', 'POST', { email, password }, false);
    const json = await res.json();

    if (res.ok) {
      successEl.textContent = '🎉 Account created! You can now sign in.';
      successEl.classList.remove('hidden');
      document.getElementById('register-form').reset();
      setTimeout(() => showAuthTab('login'), 1800);
    } else {
      const msg = typeof json.error === 'object'
        ? Object.values(json.error).flat().join(', ')
        : json.error;
      showError(errEl, msg || 'Registration failed.');
    }
  } catch (err) {
    showError(errEl, 'Could not connect to server. Make sure the backend is running.');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleLogout() {
  try {
    await apiFetch('/auth/logout', 'POST', {}, true);
  } catch (_) { /* best effort */ }
  clearSession();
}

function clearSession() {
  accessToken = refreshToken = currentUser = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_email');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-overlay').classList.add('active');
  showAuthTab('login');
}

/* ===================== APP INIT ===================== */
function initApp() {
  document.getElementById('auth-overlay').classList.remove('active');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('app').style.display = 'flex';

  // Set user info
  document.getElementById('sidebar-user-email').textContent = currentUser || '';
  document.getElementById('topbar-user-email').textContent  = currentUser || '';

  // Load default page
  showPage('home', document.getElementById('nav-home'));
}

/* ===================== NAVIGATION ===================== */
function showPage(page, navEl) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('active');
  });
  // Remove active from all nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show selected page
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  // Update topbar title
  const titles = { home: 'Dashboard', jobs: 'My Jobs', 'add-job': 'Add Job', stale: 'Stale Jobs' };
  document.getElementById('topbar-title').textContent = titles[page] || 'JobTrackr';

  // Activate nav item
  if (navEl) navEl.classList.add('active');

  // Load data for the page
  if (page === 'home')     loadDashboard();
  if (page === 'jobs')     { currentPage = 1; fetchJobs(); }
  if (page === 'stale')    loadStaleJobs();
  if (page === 'add-job')  resetAddJobForm();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();
}

/* ===================== SIDEBAR ===================== */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

/* ===================== DASHBOARD ===================== */
async function loadDashboard() {
  const loading = document.getElementById('dashboard-loading');
  const errEl   = document.getElementById('dashboard-error');
  loading.style.display = 'flex';
  errEl.classList.add('hidden');

  // Reset stats
  ['total', 'applied', 'interview', 'offer', 'rejected', 'rate'].forEach(k => {
    document.getElementById(`stat-${k}-val`).textContent = '—';
  });

  try {
    const res  = await apiFetch('/dashboard', 'GET', null, true);
    const json = await res.json();

    if (res.ok) {
      const d = json.data;
      document.getElementById('stat-total-val').textContent     = d.total_jobs;
      document.getElementById('stat-applied-val').textContent   = d.applied;
      document.getElementById('stat-interview-val').textContent = d.interview;
      document.getElementById('stat-offer-val').textContent     = d.offer;
      document.getElementById('stat-rejected-val').textContent  = d.rejected;
      document.getElementById('stat-rate-val').textContent      = `${d.response_rate}%`;

      // Pipeline bars
      const total = d.total_jobs || 1;
      setPipelineBar('applied',   d.applied,   total);
      setPipelineBar('interview', d.interview, total);
      setPipelineBar('offer',     d.offer,     total);
      setPipelineBar('rejected',  d.rejected,  total);
    } else {
      if (res.status === 401) { await tryRefreshAndRetry(() => loadDashboard()); return; }
      showError(errEl, json.error || 'Failed to load dashboard.');
    }
  } catch (err) {
    showError(errEl, 'Could not connect to server.');
  } finally {
    loading.style.display = 'none';
  }
}

function setPipelineBar(key, val, total) {
  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
  setTimeout(() => {
    document.getElementById(`bar-${key}`).style.width = `${pct}%`;
    document.getElementById(`pct-${key}`).textContent  = `${pct}%`;
  }, 100);
}

/* ===================== JOBS LIST ===================== */
async function fetchJobs() {
  const loading = document.getElementById('jobs-loading');
  const errEl   = document.getElementById('jobs-error');
  const listEl  = document.getElementById('jobs-list');

  loading.classList.remove('hidden');
  errEl.classList.add('hidden');
  listEl.innerHTML = '';

  const status  = document.getElementById('filter-status').value;
  const company = document.getElementById('filter-company').value.trim();

  let url = `/jobs?page=${currentPage}&limit=9`;
  if (status)  url += `&status=${encodeURIComponent(status)}`;
  if (company) url += `&company=${encodeURIComponent(company)}`;

  try {
    const res  = await apiFetch(url, 'GET', null, true);
    const json = await res.json();

    if (res.ok) {
      const d = json.data;
      totalPages = d.pages || 1;

      updatePagination(d.page, d.pages, d.total);

      if (d.jobs.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📭</span>
            <p>No jobs found. Try adjusting filters or <strong>add a new job</strong>.</p>
          </div>`;
      } else {
        d.jobs.forEach((job, i) => {
          listEl.appendChild(createJobCard(job, i));
        });
      }
    } else {
      if (res.status === 401) { await tryRefreshAndRetry(() => fetchJobs()); return; }
      showError(errEl, json.error || 'Failed to load jobs.');
    }
  } catch (err) {
    showError(errEl, 'Could not connect to server.');
  } finally {
    loading.classList.add('hidden');
  }
}

function createJobCard(job, index) {
  const card = document.createElement('div');
  card.className = 'job-card';
  card.style.animationDelay = `${index * 0.05}s`;
  card.onclick = () => openJobModal(job.id);

  card.innerHTML = `
    <div class="job-card-header">
      <div>
        <div class="job-company">${escHtml(job.company)}</div>
        <div class="job-role">${escHtml(job.role)}</div>
      </div>
      <span class="status-badge ${escHtml(job.status)}">${escHtml(job.status)}</span>
    </div>
  `;
  return card;
}

function updatePagination(page, pages, total) {
  document.getElementById('page-info').textContent = `Page ${page} of ${pages || 1} (${total} total)`;
  document.getElementById('prev-page').disabled = page <= 1;
  document.getElementById('next-page').disabled = page >= pages;
}

function changePage(dir) {
  currentPage = Math.max(1, Math.min(totalPages, currentPage + dir));
  fetchJobs();
}

function debounceSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage = 1;
    fetchJobs();
  }, 420);
}

/* ===================== ADD JOB ===================== */
function resetAddJobForm() {
  document.getElementById('add-job-form').reset();
  const errEl = document.getElementById('add-job-error');
  const sucEl = document.getElementById('add-job-success');
  errEl.classList.add('hidden');
  sucEl.classList.add('hidden');
}

async function handleAddJob(e) {
  e.preventDefault();
  const btn    = document.getElementById('add-job-btn');
  const errEl  = document.getElementById('add-job-error');
  const sucEl  = document.getElementById('add-job-success');

  errEl.classList.add('hidden');
  sucEl.classList.add('hidden');
  setButtonLoading(btn, true);

  const payload = {
    company: document.getElementById('job-company').value.trim(),
    role:    document.getElementById('job-role').value.trim(),
  };
  const url  = document.getElementById('job-url').value.trim();
  const date = document.getElementById('job-date').value;
  const notes = document.getElementById('job-notes').value.trim();
  if (url)   payload.job_url = url;
  if (date)  payload.applied_date = date;
  if (notes) payload.notes = notes;

  try {
    const res  = await apiFetch('/jobs', 'POST', payload, true);
    const json = await res.json();

    if (res.ok) {
      sucEl.textContent = `✅ Job "${json.data.company} — ${json.data.role}" created!`;
      sucEl.classList.remove('hidden');
      document.getElementById('add-job-form').reset();
      showToast('Job added successfully!', 'success');
      setTimeout(() => showPage('jobs', document.getElementById('nav-jobs')), 1500);
    } else {
      if (res.status === 401) { await tryRefreshAndRetry(() => handleAddJob(e)); return; }
      const msg = typeof json.error === 'object'
        ? Object.values(json.error).flat().join(', ')
        : json.error;
      showError(errEl, msg || 'Failed to create job.');
    }
  } catch (err) {
    showError(errEl, 'Could not connect to server.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/* ===================== JOB DETAIL MODAL ===================== */
async function openJobModal(jobId) {
  currentJobId = jobId;
  const overlay = document.getElementById('job-modal-overlay');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Reset modal
  closeEditMode();
  document.getElementById('modal-title').textContent = 'Loading...';

  try {
    const [jobRes, histRes] = await Promise.all([
      apiFetch(`/jobs/${jobId}`, 'GET', null, true),
      apiFetch(`/jobs/${jobId}/history`, 'GET', null, true),
    ]);

    const jobJson  = await jobRes.json();
    const histJson = await histRes.json();

    if (jobRes.ok) {
      populateModal(jobJson.data);
    }
    if (histRes.ok) {
      populateHistory(histJson.data);
    }
  } catch (err) {
    showToast('Failed to load job details.', 'error');
  }
}

function populateModal(job) {
  document.getElementById('modal-title').textContent   = job.role;
  document.getElementById('modal-company').textContent  = job.company;
  document.getElementById('modal-role').textContent     = job.role;
  document.getElementById('modal-status').textContent   = job.status;
  document.getElementById('modal-created-at').textContent = job.created_at ? formatDate(job.created_at) : '—';
  document.getElementById('modal-applied-date').textContent = job.applied_date || '—';
  document.getElementById('modal-notes').textContent   = job.notes || '—';

  const urlEl = document.getElementById('modal-job-url');
  if (job.job_url) {
    urlEl.href = job.job_url;
    urlEl.textContent = 'Open Link ↗';
  } else {
    urlEl.href = '#';
    urlEl.textContent = '—';
  }

  const badge = document.getElementById('modal-status-badge');
  badge.textContent = job.status;
  badge.className   = `status-badge ${job.status}`;

  document.getElementById('modal-subtitle').textContent = job.company;

  // Pre-fill edit form
  document.getElementById('edit-company').value = job.company;
  document.getElementById('edit-role').value    = job.role;
  document.getElementById('edit-status').value  = job.status;
  document.getElementById('edit-date').value    = job.applied_date || '';
  document.getElementById('edit-url').value     = job.job_url || '';
  document.getElementById('edit-notes').value   = job.notes || '';
}

function populateHistory(history) {
  const el = document.getElementById('modal-history');
  if (!history || history.length === 0) {
    el.innerHTML = '<p class="history-empty">No status changes recorded yet.</p>';
    return;
  }
  el.innerHTML = history.map((h, i) => `
    <div class="history-item" style="animation-delay:${i*0.06}s">
      <span class="status-badge ${h.from}">${h.from}</span>
      <span class="history-arrow">→</span>
      <span class="status-badge ${h.to}">${h.to}</span>
      <span class="history-time">${h.time ? formatDate(h.time) : '—'}</span>
    </div>
  `).join('');
}

function closeJobModal(e) {
  if (e && e.target !== document.getElementById('job-modal-overlay')) return;
  document.getElementById('job-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  currentJobId = null;
}

function openEditMode() {
  document.getElementById('modal-view-mode').classList.add('hidden');
  document.getElementById('modal-edit-mode').classList.remove('hidden');
  document.getElementById('edit-error').classList.add('hidden');
}
function closeEditMode() {
  document.getElementById('modal-edit-mode').classList.add('hidden');
  document.getElementById('modal-view-mode').classList.remove('hidden');
}

async function handleUpdateJob(e) {
  e.preventDefault();
  const btn   = document.getElementById('edit-btn');
  const errEl = document.getElementById('edit-error');
  errEl.classList.add('hidden');
  setButtonLoading(btn, true);

  const payload = {
    company: document.getElementById('edit-company').value.trim(),
    role:    document.getElementById('edit-role').value.trim(),
    status:  document.getElementById('edit-status').value,
  };
  const url  = document.getElementById('edit-url').value.trim();
  const date = document.getElementById('edit-date').value;
  const notes = document.getElementById('edit-notes').value.trim();
  if (url)   payload.job_url = url;
  if (date)  payload.applied_date = date;
  if (notes) payload.notes = notes;

  try {
    const res  = await apiFetch(`/jobs/${currentJobId}`, 'PUT', payload, true);
    const json = await res.json();

    if (res.ok) {
      showToast('Job updated!', 'success');
      closeEditMode();
      populateModal(json.data);
      // If on jobs page, refresh
      if (!document.getElementById('page-jobs').classList.contains('hidden')) fetchJobs();
    } else {
      if (res.status === 401) { await tryRefreshAndRetry(() => handleUpdateJob(e)); return; }
      const msg = typeof json.error === 'object'
        ? Object.values(json.error).flat().join(', ')
        : json.error;
      showError(errEl, msg || 'Failed to update job.');
    }
  } catch (err) {
    showError(errEl, 'Could not connect to server.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/* ===================== DELETE ===================== */
function confirmDelete() {
  document.getElementById('delete-modal-overlay').classList.remove('hidden');
}
function closeDeleteModal(e) {
  if (e && e.target !== document.getElementById('delete-modal-overlay')) return;
  document.getElementById('delete-modal-overlay').classList.add('hidden');
}

async function executeDelete() {
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    const res = await apiFetch(`/jobs/${currentJobId}`, 'DELETE', null, true);
    if (res.ok) {
      showToast('Job deleted.', 'info');
      closeDeleteModal();
      document.getElementById('job-modal-overlay').classList.add('hidden');
      document.body.style.overflow = '';
      currentJobId = null;
      if (!document.getElementById('page-jobs').classList.contains('hidden')) fetchJobs();
      if (!document.getElementById('page-home').classList.contains('hidden')) loadDashboard();
    } else {
      if (res.status === 401) { await tryRefreshAndRetry(() => executeDelete()); return; }
      showToast('Failed to delete job.', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
  }
}

/* ===================== STALE JOBS ===================== */
async function loadStaleJobs() {
  const loading = document.getElementById('stale-loading');
  const errEl   = document.getElementById('stale-error');
  const listEl  = document.getElementById('stale-list');

  loading.classList.remove('hidden');
  errEl.classList.add('hidden');
  listEl.innerHTML = '';

  try {
    const res  = await apiFetch('/dashboard/stale', 'GET', null, true);
    const json = await res.json();

    if (res.ok) {
      const jobs = json.data;
      if (jobs.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">✅</span>
            <p>No stale jobs! All applications are active.</p>
          </div>`;
      } else {
        jobs.forEach((job, i) => {
          const card = document.createElement('div');
          card.className = 'job-card';
          card.style.animationDelay = `${i * 0.05}s`;
          card.onclick = () => openJobModal(job.id);
          card.innerHTML = `
            <div class="job-card-header">
              <div>
                <div class="job-company">${escHtml(job.company)}</div>
                <div class="job-role">${escHtml(job.role)}</div>
              </div>
              <span class="status-badge applied">applied</span>
            </div>
            <div style="margin-top:10px; font-size:12px; color:var(--accent-stale);">
              ⚠ Stale — no activity in 7+ days
            </div>
          `;
          listEl.appendChild(card);
        });
      }
    } else {
      if (res.status === 401) { await tryRefreshAndRetry(() => loadStaleJobs()); return; }
      showError(errEl, json.error || 'Failed to load stale jobs.');
    }
  } catch (err) {
    showError(errEl, 'Could not connect to server.');
  } finally {
    loading.classList.add('hidden');
  }
}

/* ===================== API HELPER ===================== */
async function apiFetch(endpoint, method = 'GET', body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const options = { method, headers };
  if (body && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(body);
  }

  return fetch(`${BASE_URL}${endpoint}`, options);
}

async function tryRefreshAndRetry(retryFn) {
  if (!refreshToken) { clearSession(); return; }

  try {
    const res  = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    });
    if (res.ok) {
      const json = await res.json();
      accessToken = json.data.access_token;
      localStorage.setItem('access_token', accessToken);
      retryFn();
    } else {
      clearSession();
    }
  } catch (_) {
    clearSession();
  }
}

/* ===================== UTILS ===================== */
function setButtonLoading(btn, isLoading) {
  const text    = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled  = isLoading;
  if (text)    text.classList.toggle('hidden', isLoading);
  if (spinner) spinner.classList.toggle('hidden', !isLoading);
}

function showError(el, msg) {
  el.textContent = `⚠ ${msg}`;
  el.classList.remove('hidden');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (_) { return iso; }
}

let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className   = `toast ${type}`;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

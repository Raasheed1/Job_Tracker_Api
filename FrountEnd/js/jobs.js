/**
 * jobs.js - Logic for jobs.html (user job browsing & application)
 */

let currentPage  = 1;
let currentJobId = null;

async function loadJobs(page = 1) {
    if (!requireUser()) return;
    currentPage = page;

    const title    = document.getElementById('searchTitle').value.trim();
    const company  = document.getElementById('searchCompany').value.trim();
    const location = document.getElementById('searchLocation').value.trim();
    const job_type = document.getElementById('searchType').value;

    const params = new URLSearchParams({ page, limit: 10 });
    if (title)    params.append('title', title);
    if (company)  params.append('company', company);
    if (location) params.append('location', location);
    if (job_type) params.append('job_type', job_type);

    const tbody = document.getElementById('jobsBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading...</td></tr>';

    try {
        const res  = await apiFetch(`/jobs?${params}`);
        if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to load jobs.'); return; }

        const jobs = data.data.jobs;
        if (!jobs.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No jobs found.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = jobs.map(j => `
            <tr>
                <td><a href="#" class="job-link" data-id="${j.id}">${esc(j.title)}</a></td>
                <td>${esc(j.company)}</td>
                <td>${esc(j.location || '-')}</td>
                <td>${esc(j.job_type || '-')}</td>
                <td>${esc(j.salary || '-')}</td>
                <td>${formatDate(j.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-primary apply-btn" data-id="${j.id}">Apply</button>
                </td>
            </tr>
        `).join('');

        renderPagination(data.data.pages, page);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading jobs.</td></tr>';
    }
}

function renderPagination(pages, current) {
    const el = document.getElementById('pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= pages; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="loadJobs(${i})">${i}</button>`;
    }
    el.innerHTML = html;
}

// Open detail modal
document.getElementById('jobsBody').addEventListener('click', async function (e) {
    if (e.target.classList.contains('job-link')) {
        e.preventDefault();
        openDetailModal(e.target.dataset.id);
    }
    if (e.target.classList.contains('apply-btn')) {
        applyToJob(e.target.dataset.id, e.target);
    }
});

async function openDetailModal(jobId) {
    currentJobId = jobId;
    try {
        const res  = await apiFetch(`/jobs/${jobId}`);
        const data = await res.json();
        if (!res.ok) return;
        const j = data.data;
        document.getElementById('modalTitle').textContent       = j.title;
        document.getElementById('modalCompany').textContent     = j.company;
        document.getElementById('modalLocation').textContent    = j.location || '-';
        document.getElementById('modalType').textContent        = j.job_type || '-';
        document.getElementById('modalSalary').textContent      = j.salary || '-';
        document.getElementById('modalDescription').textContent = j.description;
        document.getElementById('detailModal').classList.add('open');
    } catch (_) {}
}

document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('detailModal').classList.remove('open');
    currentJobId = null;
});

document.getElementById('modalApply').addEventListener('click', function () {
    if (currentJobId) {
        document.getElementById('detailModal').classList.remove('open');
        applyToJob(currentJobId, this);
    }
});

async function applyToJob(jobId, btn) {
    const original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Applying...'; }
    clearAlerts();
    try {
        const res  = await apiFetch(`/jobs/${jobId}/apply`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            showAlert(data.error || 'Failed to apply.');
        } else {
            showSuccess('Application submitted successfully!');
        }
    } catch (_) {
        showAlert('Unable to connect to server.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = original || 'Apply'; }
    }
}

document.getElementById('searchBtn').addEventListener('click', () => loadJobs(1));
document.getElementById('searchTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadJobs(1);
});

initLogout();
requireUser();
loadJobs();

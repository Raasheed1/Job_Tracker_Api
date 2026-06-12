/**
 * admin-jobs.js - Logic for admin-jobs.html
 */

let currentPage = 1;

async function loadJobs(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('jobsBody');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Loading...</td></tr>';

    try {
        const res  = await apiFetch(`/admin/jobs?page=${page}&limit=10`);
        if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to load jobs.'); return; }

        const jobs = data.data.jobs;
        if (!jobs.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No jobs posted yet.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = jobs.map((j, idx) => `
            <tr>
                <td>${(page - 1) * 10 + idx + 1}</td>
                <td>${esc(j.title)}</td>
                <td>${esc(j.company)}</td>
                <td>${esc(j.location || '-')}</td>
                <td>${esc(j.job_type || '-')}</td>
                <td>${j.is_active ? 'Yes' : 'No'}</td>
                <td>${j.application_count}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-sm edit-btn" data-job='${JSON.stringify(j).replace(/'/g,"&#39;")}'>Edit</button>
                    <button class="btn btn-sm applicants-btn" data-id="${j.id}" data-title="${esc(j.title)}">Applicants</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${j.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        renderPagination(data.data.pages, page);
    } catch (_) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Error loading jobs.</td></tr>';
    }
}

// ── Create/Edit modal ──
document.getElementById('createJobBtn').addEventListener('click', () => openJobModal(null));

function openJobModal(job) {
    document.getElementById('jobId').value            = job ? job.id : '';
    document.getElementById('modalTitle').textContent = job ? 'Edit Job' : 'Create Job';
    document.getElementById('fTitle').value           = job ? job.title : '';
    document.getElementById('fCompany').value         = job ? job.company : '';
    document.getElementById('fDescription').value     = job ? (job.description || '') : '';
    document.getElementById('fLocation').value        = job ? (job.location || '') : '';
    document.getElementById('fSalary').value          = job ? (job.salary || '') : '';
    document.getElementById('fType').value            = job ? (job.job_type || '') : '';
    document.getElementById('fActive').checked        = job ? job.is_active : true;
    document.getElementById('formAlert').style.display = 'none';
    document.getElementById('jobModal').classList.add('open');
}

document.getElementById('modalCancel').addEventListener('click', () => {
    document.getElementById('jobModal').classList.remove('open');
});

document.getElementById('jobForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const jobId   = document.getElementById('jobId').value;
    const isEdit  = !!jobId;
    const saveBtn = document.getElementById('modalSave');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving...';

    const payload = {
        title:       document.getElementById('fTitle').value.trim(),
        company:     document.getElementById('fCompany').value.trim(),
        description: document.getElementById('fDescription').value.trim(),
        location:    document.getElementById('fLocation').value.trim() || null,
        salary:      document.getElementById('fSalary').value.trim() || null,
        job_type:    document.getElementById('fType').value || null,
        is_active:   document.getElementById('fActive').checked
    };

    try {
        const res = await apiFetch(
            isEdit ? `/admin/jobs/${jobId}` : '/admin/jobs',
            { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }
        );
        const data = await res.json();
        if (!res.ok) {
            const errMsg = typeof data.error === 'object'
                ? Object.values(data.error).flat().join(' ')
                : (data.error || 'Failed.');
            document.getElementById('formAlert').textContent   = errMsg;
            document.getElementById('formAlert').style.display = 'block';
            return;
        }
        document.getElementById('jobModal').classList.remove('open');
        showSuccess(isEdit ? 'Job updated.' : 'Job created.');
        loadJobs(currentPage);
    } catch (_) {
        document.getElementById('formAlert').textContent   = 'Unable to connect to server.';
        document.getElementById('formAlert').style.display = 'block';
    } finally {
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Save';
    }
});

// ── Table row actions ──
document.getElementById('jobsBody').addEventListener('click', async function (e) {
    if (e.target.classList.contains('edit-btn')) {
        const job = JSON.parse(e.target.dataset.job);
        openJobModal(job);
    }
    if (e.target.classList.contains('delete-btn')) {
        const jobId = e.target.dataset.id;
        if (!confirm('Delete this job and all its applications?')) return;
        e.target.disabled = true;
        clearAlerts();
        try {
            const res  = await apiFetch(`/admin/jobs/${jobId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) { showAlert(data.error || 'Failed to delete.'); return; }
            showSuccess('Job deleted.');
            loadJobs(currentPage);
        } catch (_) { showAlert('Unable to connect.'); }
    }
    if (e.target.classList.contains('applicants-btn')) {
        openApplicantsModal(e.target.dataset.id, e.target.dataset.title);
    }
});

// ── Applicants modal ──
async function openApplicantsModal(jobId, title) {
    document.getElementById('applicantsTitle').textContent = `Applicants — ${title}`;
    document.getElementById('applicantsBody').innerHTML    = '<tr><td colspan="3" class="empty-state">Loading...</td></tr>';
    document.getElementById('applicantsModal').classList.add('open');

    try {
        const res  = await apiFetch(`/admin/jobs/${jobId}/applicants`);
        const data = await res.json();
        if (!res.ok) {
            document.getElementById('applicantsBody').innerHTML =
                `<tr><td colspan="3" class="empty-state">${data.error}</td></tr>`;
            return;
        }
        const applicants = data.data.applicants;
        if (!applicants.length) {
            document.getElementById('applicantsBody').innerHTML =
                '<tr><td colspan="3" class="empty-state">No applicants yet.</td></tr>';
            return;
        }
        document.getElementById('applicantsBody').innerHTML = applicants.map(a => `
            <tr>
                <td>${esc(a.email)}</td>
                <td><span class="badge badge-${a.status}">${esc(a.status)}</span></td>
                <td>${formatDate(a.applied_at)}</td>
            </tr>
        `).join('');
    } catch (_) {
        document.getElementById('applicantsBody').innerHTML =
            '<tr><td colspan="3" class="empty-state">Error.</td></tr>';
    }
}

document.getElementById('applicantsClose').addEventListener('click', () => {
    document.getElementById('applicantsModal').classList.remove('open');
});

function renderPagination(pages, current) {
    const el = document.getElementById('pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= pages; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="loadJobs(${i})">${i}</button>`;
    }
    el.innerHTML = html;
}

initLogout();
requireAdmin();
loadJobs();

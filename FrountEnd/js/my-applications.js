/**
 * my-applications.js - Logic for my-applications.html
 */

let currentPage = 1;

async function loadApplications(page = 1) {
    if (!requireUser()) return;
    currentPage = page;
    const tbody = document.getElementById('appsBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading...</td></tr>';

    try {
        const res  = await apiFetch(`/my-applications?page=${page}&limit=10`);
        if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to load applications.'); return; }

        const apps = data.data.applications;
        if (!apps.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No applications yet. <a href="jobs.html">Browse jobs</a>.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = apps.map((a, idx) => `
            <tr>
                <td>${(page - 1) * 10 + idx + 1}</td>
                <td>${esc(a.job_title)}</td>
                <td>${esc(a.company)}</td>
                <td><span class="badge badge-${a.status}">${esc(a.status)}</span></td>
                <td>${formatDate(a.applied_at)}</td>
                <td>${formatDate(a.updated_at)}</td>
                <td>
                    ${a.status === 'pending'
                        ? `<button class="btn btn-sm btn-danger withdraw-btn" data-id="${a.id}">Withdraw</button>`
                        : '-'}
                </td>
            </tr>
        `).join('');

        renderPagination(data.data.pages, page);
    } catch (_) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading applications.</td></tr>';
    }
}

document.getElementById('appsBody').addEventListener('click', async function (e) {
    if (!e.target.classList.contains('withdraw-btn')) return;
    const appId = e.target.dataset.id;
    if (!confirm('Withdraw this application?')) return;
    e.target.disabled     = true;
    e.target.textContent  = 'Withdrawing...';
    clearAlerts();
    try {
        const res  = await apiFetch(`/applications/${appId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to withdraw.'); return; }
        showSuccess('Application withdrawn.');
        loadApplications(currentPage);
    } catch (_) {
        showAlert('Unable to connect to server.');
    }
});

function renderPagination(pages, current) {
    const el = document.getElementById('pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= pages; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="loadApplications(${i})">${i}</button>`;
    }
    el.innerHTML = html;
}

initLogout();
requireUser();
loadApplications();

/**
 * admin-applications.js - Logic for admin-applications.html
 */

let currentPage = 1;

async function loadApplications(page = 1) {
    currentPage = page;
    const status = document.getElementById('filterStatus').value;
    const tbody  = document.getElementById('appsBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading...</td></tr>';

    const params = new URLSearchParams({ page, limit: 10 });
    if (status) params.append('status', status);

    try {
        const res  = await apiFetch(`/admin/applications?${params}`);
        if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to load applications.'); return; }

        const apps = data.data.applications;
        if (!apps.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No applications found.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = apps.map((a, idx) => `
            <tr>
                <td>${(page - 1) * 10 + idx + 1}</td>
                <td>${esc(a.email)}</td>
                <td>${esc(a.job_title)}</td>
                <td>${esc(a.company)}</td>
                <td><span class="badge badge-${a.status}" id="badge-${a.id}">${esc(a.status)}</span></td>
                <td>${formatDate(a.applied_at)}</td>
                <td style="white-space:nowrap;">
                    <select class="status-select" data-id="${a.id}" style="border:1px solid #ccc;padding:4px 6px;font-size:12px;margin-right:4px;">
                        <option value="pending"  ${a.status === 'pending'  ? 'selected' : ''}>Pending</option>
                        <option value="selected" ${a.status === 'selected' ? 'selected' : ''}>Selected</option>
                        <option value="rejected" ${a.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                    <button class="btn btn-sm update-btn" data-id="${a.id}">Update</button>
                </td>
            </tr>
        `).join('');

        renderPagination(data.data.pages, page);
    } catch (_) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading applications.</td></tr>';
    }
}

document.getElementById('appsBody').addEventListener('click', async function (e) {
    if (!e.target.classList.contains('update-btn')) return;
    const appId    = e.target.dataset.id;
    const select   = document.querySelector(`.status-select[data-id="${appId}"]`);
    const newStatus = select.value;
    clearAlerts();
    e.target.disabled    = true;
    e.target.textContent = '...';

    try {
        const res  = await apiFetch(`/admin/applications/${appId}`, {
            method: 'PATCH',
            body:   JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to update.'); return; }

        // Update badge in place
        const badge = document.getElementById(`badge-${appId}`);
        if (badge) {
            badge.textContent = newStatus;
            badge.className   = `badge badge-${newStatus}`;
        }
        showSuccess(`Status updated to "${newStatus}".`);
    } catch (_) {
        showAlert('Unable to connect to server.');
    } finally {
        e.target.disabled    = false;
        e.target.textContent = 'Update';
    }
});

document.getElementById('filterBtn').addEventListener('click', () => loadApplications(1));
document.getElementById('filterStatus').addEventListener('change', () => loadApplications(1));

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
requireAdmin();
loadApplications();

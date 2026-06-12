/**
 * user-dashboard.js - Logic for user-dashboard.html
 */

async function loadDashboard() {
    const token = requireUser();
    if (!token) return;

    document.getElementById('welcomeMsg').textContent =
        `Signed in as ${localStorage.getItem('email') || ''}`;

    try {
        const res = await apiFetch('/dashboard');
        if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!res.ok) {
            document.getElementById('alert').textContent  = data.error || 'Failed to load stats.';
            document.getElementById('alert').style.display = 'block';
            return;
        }
        const d = data.data;
        document.getElementById('statTotal').textContent    = d.total_applications;
        document.getElementById('statSelected').textContent = d.selected;
        document.getElementById('statRejected').textContent = d.rejected;
    } catch (err) {
        document.getElementById('alert').textContent  = 'Unable to connect to server.';
        document.getElementById('alert').style.display = 'block';
    }
}

initLogout();
loadDashboard();

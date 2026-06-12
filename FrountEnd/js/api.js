/**
 * api.js - Shared API utilities for all pages
 * Provides: API base URL, apiFetch helper, auth guards, and common utilities
 */

const API =
    location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : 'https://job-tracker-api-e1tv.onrender.com';

/**
 * Authenticated fetch wrapper – injects Authorization header automatically.
 */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('access_token');
    options.headers = Object.assign(
        { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        options.headers || {}
    );
    return fetch(`${API}${url}`, options);
}

/**
 * Redirect to login if not authenticated; redirect to user-dashboard if not admin.
 * Returns the token string if checks pass, otherwise null.
 */
function requireAdmin() {
    const token = localStorage.getItem('access_token');
    const role  = localStorage.getItem('role');
    if (!token) { window.location.href = 'login.html'; return null; }
    if (role !== 'admin') { window.location.href = 'user-dashboard.html'; return null; }
    return token;
}

/**
 * Redirect to login if not authenticated; redirect to admin-dashboard if admin.
 * Returns the token string if checks pass, otherwise null.
 */
function requireUser() {
    const token = localStorage.getItem('access_token');
    const role  = localStorage.getItem('role');
    if (!token) { window.location.href = 'login.html'; return null; }
    if (role === 'admin') { window.location.href = 'admin-dashboard.html'; return null; }
    return token;
}

/**
 * Escape a string for safe HTML insertion.
 */
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

/**
 * Format an ISO date string to a locale date string.
 */
function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString();
}

/**
 * Show an error alert element by id with a message.
 */
function showAlert(msg, alertId = 'alert') {
    const el = document.getElementById(alertId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

/**
 * Show a success alert element by id with a message.
 */
function showSuccess(msg, alertId = 'successAlert') {
    const el = document.getElementById(alertId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

/**
 * Hide both alert elements.
 */
function clearAlerts(errorId = 'alert', successId = 'successAlert') {
    const e = document.getElementById(errorId);
    const s = document.getElementById(successId);
    if (e) e.style.display = 'none';
    if (s) s.style.display = 'none';
}

/**
 * Wire up the logout button (expects element id="logoutBtn").
 */
function initLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', async function (e) {
        e.preventDefault();
        try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

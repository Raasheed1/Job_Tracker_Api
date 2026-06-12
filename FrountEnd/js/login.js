/**
 * login.js - Logic for login.html
 */

// Redirect if already logged in
if (localStorage.getItem('access_token')) {
    const role = localStorage.getItem('role');
    window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const alertEl  = document.getElementById('alert');
    const submitBtn = document.getElementById('submitBtn');
    alertEl.style.display = 'none';
    submitBtn.disabled   = true;
    submitBtn.textContent = 'Signing in...';

    const payload = {
        email:    document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };

    try {
        const res  = await fetch(`${API}/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            alertEl.textContent  = data.error || 'Login failed.';
            alertEl.style.display = 'block';
            return;
        }

        localStorage.setItem('access_token',  data.data.access_token);
        localStorage.setItem('refresh_token', data.data.refresh_token);
        localStorage.setItem('role',          data.data.role);
        localStorage.setItem('email',         data.data.email);

        window.location.href = data.data.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    } catch (err) {
        alertEl.textContent  = 'Unable to connect to server.';
        alertEl.style.display = 'block';
    } finally {
        submitBtn.disabled   = false;
        submitBtn.textContent = 'Sign In';
    }
});

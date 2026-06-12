/**
 * register.js - Logic for register.html
 */

// Redirect if already logged in
if (localStorage.getItem('access_token')) {
    const role = localStorage.getItem('role');
    window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
}

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const alertEl   = document.getElementById('alert');
    const submitBtn = document.getElementById('submitBtn');
    alertEl.style.display = 'none';
    alertEl.className      = 'alert';
    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Creating account...';

    const payload = {
        email:    document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };

    try {
        const res  = await fetch(`${API}/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            alertEl.textContent  = typeof data.error === 'object'
                ? Object.values(data.error).flat().join(' ')
                : (data.error || 'Registration failed.');
            alertEl.classList.add('alert-error');
            alertEl.style.display = 'block';
            return;
        }

        alertEl.textContent  = 'Account created! Redirecting to sign in...';
        alertEl.classList.add('alert-success');
        alertEl.style.display = 'block';
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch (err) {
        alertEl.textContent  = 'Unable to connect to server.';
        alertEl.classList.add('alert-error');
        alertEl.style.display = 'block';
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Create Account';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const authHeader = document.querySelector('.header-auth-actions');
    if (!authHeader) return;

    if (localStorage.getItem('token')) {
        authHeader.innerHTML = `<button id="logout-btn" class="header-play">Logout</button>`;
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    } else {
        authHeader.innerHTML = `
            <a href="login.html" class="btn-ghost" style="padding: 9px 20px;">Login</a>
            <a href="register.html" class="header-play">Sign Up →</a>
        `;
    }
});

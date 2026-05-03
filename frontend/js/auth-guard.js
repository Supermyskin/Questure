// Auth guard: redirect to login if no token found
if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
}

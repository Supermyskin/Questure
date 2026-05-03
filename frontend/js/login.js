const API_URL = 'http://127.0.0.1:3000';

document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('userID')) {
        window.location.href = './home.html';
        return;
    }

    const loginForm = document.querySelector('#login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('email_input').value;
            const password = document.getElementById('password').value;

            fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('userID', data.userId);
                        localStorage.setItem('userName', data.name);
                        alert('Login successful!');
                        window.location.href = './home.html';
                    } else {
                        alert(data.message || 'Login failed');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred during login.');
                });
        });
    }
});

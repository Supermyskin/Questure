const API_URL = 'http://127.0.0.1:3000';

document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('userID')) {
        window.location.href = './home.html';
        return;
    }

    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('name_input').value;
            const email = document.getElementById('email_input').value;
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm_password').value;

            if (password !== confirm) {
                alert('Passwords do not match!');
                return;
            }

            fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('userID', data.userId);
                        localStorage.setItem('userName', data.name);
                        alert('Registration successful!');
                        window.location.href = './home.html';
                    } else {
                        alert(data.message || 'Registration failed');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred during registration.');
                });
        });
    }
});

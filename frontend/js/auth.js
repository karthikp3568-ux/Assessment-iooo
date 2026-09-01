// AssessX Authentication Handler

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const alertMessage = document.getElementById('alertMessage');

    function showAlert(message, type = 'danger') {
        if (!alertMessage) return;
        alertMessage.textContent = message;
        alertMessage.className = `alert alert-${type}`;
        alertMessage.classList.remove('hidden');
    }

    function hideAlert() {
        if (!alertMessage) return;
        alertMessage.classList.add('hidden');
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const username = document.getElementById('username')?.value?.trim();
            const password = document.getElementById('password')?.value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!username || !password) {
                showAlert('Please enter both username and password.');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Signing in...';
                }

                const response = await ApiService.post('/auth/authenticate', {
                    username,
                    password
                });

                if (response.token) {
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('user', JSON.stringify({
                        name: response.name,
                        username: response.username,
                        role: response.role
                    }));

                    showAlert('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        // Redirect based on role or to dashboard
                        if (response.role === 'ADMIN') {
                            window.location.href = 'admin-dashboard.html';
                        } else {
                            window.location.href = 'student-dashboard.html';
                        }
                    }, 1000);
                } else {
                    showAlert('Authentication failed. Please check your credentials.');
                }
            } catch (error) {
                showAlert(error.message || 'Login failed. Invalid username or password.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                }
            }
        });
    }

    // Handle Registration
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const name = document.getElementById('name')?.value?.trim();
            const username = document.getElementById('username')?.value?.trim();
            const password = document.getElementById('password')?.value;
            const role = document.getElementById('role')?.value || 'student';
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            if (!name || !username || !password) {
                showAlert('Please fill in all fields.');
                return;
            }

            const endpoint = role === 'admin' ? '/auth/register/admin' : '/auth/register/student';

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Registering...';
                }

                const response = await ApiService.post(endpoint, {
                    name,
                    username,
                    password
                });

                if (response.token) {
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('user', JSON.stringify({
                        name: response.name,
                        username: response.username,
                        role: response.role
                    }));

                    showAlert('Account created successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showAlert('Registration failed. Please try again.');
                }
            } catch (error) {
                showAlert(error.message || 'Registration failed. Username might already be taken.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Register';
                }
            }
        });
    }
});

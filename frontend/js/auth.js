// AssessX Authentication Handler

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const alertMessage = document.getElementById('alertMessage');
    const quickStudentBtn = document.getElementById('quickStudentBtn');
    const quickAdminBtn = document.getElementById('quickAdminBtn');

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

    async function performLogin(username, password, submitBtn) {
        hideAlert();
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Signing in...';
            }

            const response = await ApiService.post('/auth/authenticate', {
                username,
                password
            });

            if (response && response.token) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify({
                    name: response.name,
                    username: response.username,
                    role: response.role
                }));

                showAlert('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    if (response.role === 'ADMIN') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'student-dashboard.html';
                    }
                }, 700);
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
    }

    // Handle Login Submit
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username')?.value?.trim();
            const password = document.getElementById('password')?.value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!username || !password) {
                showAlert('Please enter both username and password.');
                return;
            }
            performLogin(username, password, submitBtn);
        });
    }

    // Quick Login: Student
    if (quickStudentBtn) {
        quickStudentBtn.addEventListener('click', () => {
            const uInput = document.getElementById('username');
            const pInput = document.getElementById('password');
            if (uInput) uInput.value = 'student';
            if (pInput) pInput.value = 'student123';
            performLogin('student', 'student123', loginForm?.querySelector('button[type="submit"]'));
        });
    }

    // Quick Login: Admin
    if (quickAdminBtn) {
        quickAdminBtn.addEventListener('click', () => {
            const uInput = document.getElementById('username');
            const pInput = document.getElementById('password');
            if (uInput) uInput.value = 'admin';
            if (pInput) pInput.value = 'admin123';
            performLogin('admin', 'admin123', loginForm?.querySelector('button[type="submit"]'));
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
                    submitBtn.textContent = 'Creating Account...';
                }

                const response = await ApiService.post(endpoint, {
                    name,
                    username,
                    password
                });

                if (response && response.token) {
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('user', JSON.stringify({
                        name: response.name,
                        username: response.username,
                        role: response.role
                    }));

                    showAlert('Account created successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        if (response.role === 'ADMIN') {
                            window.location.href = 'admin-dashboard.html';
                        } else {
                            window.location.href = 'student-dashboard.html';
                        }
                    }, 1000);
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

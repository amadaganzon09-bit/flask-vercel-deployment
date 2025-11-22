// Use the Vercel backend URL for all environments
// Use relative path for backend URL to support both localhost and Vercel
// Use relative path for backend URL to support both localhost and Vercel
// But if running on Live Server (port 5500), point to Flask (port 5000)
const getBackendUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // If running on localhost/127.0.0.1 and NOT on port 5000 (Flask's port),
    // assume we are in dev mode (e.g., Live Server) and point to Flask.
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '5000') {
        return 'http://127.0.0.1:5000';
    }

    // Otherwise (Production Vercel or Flask serving frontend), use relative path
    return '';
};
const BASE_URL = getBackendUrl();

// Make BASE_URL available globally for other scripts
window.BASE_URL = BASE_URL;

window.showToast = function (message, type = 'info', duration = 3000) {
    let className = 'toastify-info';

    switch (type) {
        case 'success':
            className = 'toastify-success';
            break;
        case 'error':
            className = 'toastify-error';
            break;
        case 'warning':
            className = 'toastify-warning';
            break;
        case 'info':
            className = 'toastify-info';
            break;
    }

    // Set progress bar color - gray for all types
    const progressBg = '#808080';
    const progressBarBg = 'rgba(0,0,0,0.15)';
    const progressShadow = '0 0 8px rgba(128,128,128,0.4)';

    // Create Toastify toast
    const toast = Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        className: className,
        stopOnFocus: true,
        callback: function () {
            // Cleanup when toast is removed
        }
    });

    // Show the toast
    toast.showToast();

    // Add progress bar with improved detection
    setTimeout(() => {
        // Get all active toasts
        const allToasts = document.querySelectorAll('.toastify.on');

        // Find the newest toast with our className that doesn't have a progress bar yet
        for (let i = allToasts.length - 1; i >= 0; i--) {
            const toastElement = allToasts[i];

            if (toastElement.classList.contains(className) &&
                !toastElement.hasAttribute('data-progress-added')) {

                // Mark this toast as having progress bar
                toastElement.setAttribute('data-progress-added', 'true');

                // Ensure toast has proper positioning
                toastElement.style.position = 'relative';
                toastElement.style.overflow = 'hidden';

                // Create progress bar container
                const progressBar = document.createElement('div');
                progressBar.className = 'toast-progress-bar';
                progressBar.style.cssText = `
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 6px;
                    background: ${progressBarBg};
                    overflow: hidden;
                `;

                // Create progress fill
                const progressFill = document.createElement('div');
                progressFill.className = 'toast-progress-fill';
                progressFill.style.cssText = `
                    height: 100%;
                    background: ${progressBg};
                    width: 100%;
                    box-shadow: ${progressShadow};
                    transition: none;
                `;

                // Append elements
                progressBar.appendChild(progressFill);
                toastElement.appendChild(progressBar);

                // Start animation after a brief delay
                setTimeout(() => {
                    progressFill.style.transition = `width ${duration}ms linear`;
                    progressFill.style.width = '0%';
                }, 100);

                // Handle hover pause/resume
                let isPaused = false;
                let pauseTime = 0;
                let totalPausedTime = 0;

                toastElement.addEventListener('mouseenter', function () {
                    if (!isPaused) {
                        isPaused = true;
                        pauseTime = Date.now();

                        // Get current computed width
                        const computedStyle = window.getComputedStyle(progressFill);
                        const currentWidth = computedStyle.width;

                        // Stop transition and freeze at current position
                        progressFill.style.transition = 'none';
                        progressFill.style.width = currentWidth;
                    }
                });

                toastElement.addEventListener('mouseleave', function () {
                    if (isPaused) {
                        isPaused = false;
                        totalPausedTime += (Date.now() - pauseTime);

                        // Calculate remaining time
                        const elapsed = Date.now() - toastElement._startTime - totalPausedTime;
                        const remaining = duration - elapsed;

                        if (remaining > 0) {
                            // Resume animation with remaining time
                            progressFill.style.transition = `width ${remaining}ms linear`;
                            progressFill.style.width = '0%';
                        }
                    }
                });

                // Store start time
                toastElement._startTime = Date.now();

                // Only process the first matching toast
                break;
            }
        }
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutMessage = sessionStorage.getItem('logoutMessage');
    if (logoutMessage) {
        const type = logoutMessage.includes("Invalid token") ? "error" : "success";
        showToast(logoutMessage, type);
        sessionStorage.removeItem('logoutMessage');
    }

    // Fix aria-hidden focus issue for modals
    const modals = ['otpVerificationModal', 'forgotPasswordModal'];

    modals.forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.addEventListener('hide.bs.modal', function (e) {
                // Remove focus from any focused element within the modal before hiding
                const focusedElement = this.querySelector(':focus');
                if (focusedElement) {
                    focusedElement.blur();
                }
            });

            modalElement.addEventListener('hidden.bs.modal', function (e) {
                // Ensure focus is properly managed after modal closes
                setTimeout(() => {
                    if (document.activeElement === document.body || !document.activeElement) {
                        document.body.focus();
                    }
                }, 100);
            });
        }
    });
});

const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const passwordInput = document.getElementById('signup-password');
const strengthBar = document.querySelector('.strength-bar');
const strengthText = document.querySelector('.strength-text');
const otpCountdownElement = document.getElementById('otp-countdown');
const resendOtpButton = document.getElementById('resendOtpButton');
const otpInputSingle = document.getElementById('otp-input-single');
let otpVerificationModal;
if (document.getElementById('otpVerificationModal')) {
    otpVerificationModal = new bootstrap.Modal(document.getElementById('otpVerificationModal'));
}
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
let forgotPasswordModal;
if (document.getElementById('forgotPasswordModal')) {
    forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
}
const forgotPasswordRequestOtpForm = document.getElementById('forgotPasswordRequestOtpForm');
const forgotPasswordVerifyOtpForm = document.getElementById('forgotPasswordVerifyOtpForm');
const forgotPasswordResetForm = document.getElementById('forgotPasswordResetForm');
const forgotEmailInput = document.getElementById('forgot-email');
const forgotOtpCountdownElement = document.getElementById('forgot-otp-countdown');
const forgotResendOtpButton = document.getElementById('forgotResendOtpButton');
const forgotOtpInputSingle = document.getElementById('forgot-otp-input-single');
const forgotNewPasswordInput = document.getElementById('forgot-new-password');
const forgotConfirmNewPasswordInput = document.getElementById('forgot-confirm-new-password');
const forgotBackToEmailButton = document.getElementById('forgotBackToEmailButton');
const forgotPasswordBreadcrumbs = document.getElementById('forgotPasswordBreadcrumbs');

let registrationData = {};
let countdownInterval;
let forgotPasswordCountdownInterval;
let forgotPasswordEmail = '';
let currentForgotPasswordStep = 'email';

if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        container.classList.add("active");
        document.getElementById('signupForm').style.display = 'block';
        if (otpVerificationModal) {
            otpVerificationModal.hide();
        }

        document.getElementById('signupForm').reset();
        strengthBar.style.width = '0%';
        strengthText.textContent = '';

        if (otpInputSingle) otpInputSingle.value = '';

        resendOtpButton.style.display = 'none';
        clearInterval(countdownInterval);
        otpCountdownElement.textContent = '5:00';
    });
}

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        container.classList.remove("active");
    });
}

if (passwordInput) {
    const checkPasswordStrength = (password) => {
        let strength = 0;
        if (password.match(/[a-z]+/)) {
            strength += 1;
        }
        if (password.match(/[A-Z]+/)) {
            strength += 1;
        }
        if (password.match(/[0-9]+/)) {
            strength += 1;
        }
        if (password.match(/[$@#&!]+/)) {
            strength += 1;
        }

        switch (strength) {
            case 0:
                strengthBar.style.width = '0%';
                strengthText.textContent = '';
                break;
            case 1:
                strengthBar.style.width = '25%';
                strengthBar.style.background = '#f00';
                strengthText.textContent = 'Weak';
                break;
            case 2:
                strengthBar.style.width = '50%';
                strengthBar.style.background = 'orange';
                strengthText.textContent = 'Medium';
                break;
            case 3:
                strengthBar.style.width = '75%';
                strengthBar.style.background = '#ff0';
                strengthText.textContent = 'Strong';
                break;
            case 4:
                strengthBar.style.width = '100%';
                strengthBar.style.background = '#0f0';
                strengthText.textContent = 'Very Strong';
                break;
        }
    };

    passwordInput.addEventListener('input', () => {
        checkPasswordStrength(passwordInput.value);
    });
}

const toggleSpinner = (form, show) => {
    const button = form.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.spinner-border');

    if (!button) return;

    if (show) {
        buttonText.style.display = 'none';
        spinner.style.display = 'inline-block';
        button.disabled = true;
    } else {
        buttonText.style.display = 'inline-block';
        spinner.style.display = 'none';
        button.disabled = false;
    }
};

if (document.getElementById('requestOtpButton')) {
    document.getElementById('requestOtpButton').addEventListener('click', async function (event) {
        event.preventDefault();
        const signupForm = document.getElementById('signupForm');
        toggleSpinner(signupForm, true);

        const firstname = document.getElementById('signup-firstname').value;
        const middlename = document.getElementById('signup-middlename').value;
        const lastname = document.getElementById('signup-lastname').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirmPassword').value;

        if (password !== confirmPassword) {
            showToast("Passwords do not match!", "error");
            toggleSpinner(signupForm, false);
            return;
        }

        registrationData = { firstname, middlename, lastname, email, password };

        try {
            const response = await fetch(`${BASE_URL}/request-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            showToast(data.message, data.success ? "success" : "error");

            if (data.success) {
                otpVerificationModal.show();
                startCountdown(5 * 60, otpCountdownElement, resendOtpButton);
            }
        } catch (error) {
            console.error('Error requesting OTP:', error);
            showToast("An error occurred while requesting OTP.", "error");
        } finally {
            toggleSpinner(signupForm, false);
        }
    });
}

function startCountdown(duration, displayElement, resendButton) {
    let timer = duration;
    let minutes, seconds;

    resendButton.disabled = true;
    resendButton.style.display = 'none';

    if (displayElement === otpCountdownElement) {
        clearInterval(countdownInterval);
    } else if (displayElement === forgotOtpCountdownElement) {
        clearInterval(forgotPasswordCountdownInterval);
    }

    const intervalId = setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        displayElement.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(intervalId);
            displayElement.textContent = "0:00";
            showToast("OTP has expired. Please resend.", "error");
            resendButton.disabled = false;
            resendButton.style.display = 'block';
        }
    }, 1000);

    if (displayElement === otpCountdownElement) {
        countdownInterval = intervalId;
    } else if (displayElement === forgotOtpCountdownElement) {
        forgotPasswordCountdownInterval = intervalId;
    }
}

if (resendOtpButton) {
    resendOtpButton.addEventListener('click', async () => {
        const email = document.getElementById('signup-email').value;

        if (!email) {
            showToast("Please enter your email to resend OTP.", "error");
            return;
        }

        resendOtpButton.disabled = true;
        resendOtpButton.style.display = 'none';

        try {
            const response = await fetch(`${BASE_URL}/request-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            showToast(data.message, data.success ? "success" : "error");

            if (data.success) {
                startCountdown(5 * 60, otpCountdownElement, resendOtpButton);
            } else {
                resendOtpButton.disabled = false;
                resendOtpButton.style.display = 'block';
            }
        } catch (error) {
            console.error('Error resending OTP:', error);
            showToast("An error occurred while resending OTP.", "error");
            resendOtpButton.disabled = false;
            resendOtpButton.style.display = 'block';
        }
    });
}

if (document.getElementById('verifyOtpButton')) {
    document.getElementById('verifyOtpButton').addEventListener('click', async function (event) {
        event.preventDefault();
        const otpVerificationForm = document.getElementById('otpVerificationForm');
        toggleSpinner(otpVerificationForm, true);

        const otp = otpInputSingle ? otpInputSingle.value.trim() : '';

        if (otp.length !== 6) {
            showToast("Please enter the complete 6-digit OTP.", "error");
            toggleSpinner(otpVerificationForm, false);
            return;
        }

        const finalRegistrationData = { ...registrationData, otp };

        try {
            const response = await fetch(`${BASE_URL}/verify-otp-and-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(finalRegistrationData)
            });
            const data = await response.json();

            showToast(data.message, data.success ? "success" : "error");

            if (data.success) {
                if (data.token) {
                    localStorage.setItem('authToken', data.token);
                }
                document.getElementById('signupForm').reset();
                document.getElementById('otpVerificationForm').reset();
                strengthBar.style.width = '0%';
                strengthText.textContent = '';
                registrationData = {};
                otpVerificationModal.hide();
                setTimeout(() => {
                    container.classList.remove("active");
                    document.getElementById('signupForm').style.display = 'block';
                }, 1000);
            } else {
                if (otpInputSingle) otpInputSingle.value = '';
            }
        } catch (error) {
            console.error('Error verifying OTP and registering:', error);
            showToast("An error occurred during OTP verification or registration.", "error");
        } finally {
            toggleSpinner(otpVerificationForm, false);
        }
    });
}

if (document.getElementById('backToSignupButton')) {
    document.getElementById('backToSignupButton').addEventListener('click', () => {
        otpVerificationModal.hide();

        document.getElementById('signupForm').reset();
        strengthBar.style.width = '0%';
        strengthText.textContent = '';

        if (otpInputSingle) otpInputSingle.value = '';

        clearInterval(countdownInterval);
        otpCountdownElement.textContent = '5:00';
        resendOtpButton.style.display = 'none';
        registrationData = {};
    });
}

// Single OTP Input Field Validation
if (otpInputSingle) {
    otpInputSingle.addEventListener('input', (event) => {
        // Only allow numeric input
        otpInputSingle.value = otpInputSingle.value.replace(/[^0-9]/g, '');

        // Limit to 6 digits
        if (otpInputSingle.value.length > 6) {
            otpInputSingle.value = otpInputSingle.value.slice(0, 6);
        }
    });

    otpInputSingle.addEventListener('paste', (event) => {
        event.preventDefault();
        const pastedData = (event.clipboardData || window.clipboardData).getData('text');
        const numericData = pastedData.replace(/[^0-9]/g, '').slice(0, 6);
        otpInputSingle.value = numericData;
    });
}

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function (event) {
        event.preventDefault();
        toggleSpinner(this, true);

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const passwordField = document.getElementById('login-password');

        fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
            .then(response => response.json())
            .then(data => {
                showToast(data.message, data.success ? "success" : "error");
                if (data.success) {
                    localStorage.setItem('authToken', data.token);
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    passwordField.value = '';
                }
            })
            .finally(() => {
                toggleSpinner(this, false);
            });
    });
}

if (forgotPasswordBreadcrumbs) {
    const updateForgotPasswordBreadcrumbs = (step) => {
        const breadcrumbItems = forgotPasswordBreadcrumbs.querySelectorAll('.breadcrumb-item');
        breadcrumbItems.forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
            if (item.dataset.step === step) {
                item.classList.add('active');
                item.setAttribute('aria-current', 'page');
            }
        });
    };

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', () => {
            forgotPasswordRequestOtpForm.style.display = 'block';
            forgotPasswordVerifyOtpForm.style.display = 'none';
            forgotPasswordResetForm.style.display = 'none';
            forgotEmailInput.value = '';
            if (forgotOtpInputSingle) forgotOtpInputSingle.value = '';
            forgotNewPasswordInput.value = '';
            forgotConfirmNewPasswordInput.value = '';
            clearInterval(forgotPasswordCountdownInterval);
            forgotOtpCountdownElement.textContent = '5:00';
            forgotResendOtpButton.style.display = 'none';
            currentForgotPasswordStep = 'email';
            updateForgotPasswordBreadcrumbs(currentForgotPasswordStep);
        });
    }

    if (forgotPasswordRequestOtpForm) {
        forgotPasswordRequestOtpForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            toggleSpinner(forgotPasswordRequestOtpForm, true);

            const email = forgotEmailInput.value;
            forgotPasswordEmail = email;

            try {
                const response = await fetch(`${BASE_URL}/forgot-password/request-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();

                showToast(data.message, data.success ? "success" : "error");

                if (data.success) {
                    forgotPasswordRequestOtpForm.style.display = 'none';
                    forgotPasswordVerifyOtpForm.style.display = 'block';
                    currentForgotPasswordStep = 'otp';
                    updateForgotPasswordBreadcrumbs(currentForgotPasswordStep);
                    startCountdown(5 * 60, forgotOtpCountdownElement, forgotResendOtpButton);
                }
            } catch (error) {
                console.error('Error requesting OTP for forgot password:', error);
                showToast("An error occurred while requesting OTP for password reset.", "error");
            } finally {
                toggleSpinner(forgotPasswordRequestOtpForm, false);
            }
        });
    }

    if (forgotPasswordVerifyOtpForm) {
        forgotPasswordVerifyOtpForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            toggleSpinner(forgotPasswordVerifyOtpForm, true);

            const otp = forgotOtpInputSingle ? forgotOtpInputSingle.value.trim() : '';

            if (otp.length !== 6) {
                showToast("Please enter the complete 6-digit OTP.", "error");
                toggleSpinner(forgotPasswordVerifyOtpForm, false);
                return;
            }

            try {
                const response = await fetch(`${BASE_URL}/forgot-password/verify-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: forgotPasswordEmail, otp })
                });
                const data = await response.json();

                showToast(data.message, data.success ? "success" : "error");

                if (data.success) {
                    forgotPasswordVerifyOtpForm.style.display = 'none';
                    forgotPasswordResetForm.style.display = 'block';
                    document.getElementById('forgot-username-email').value = forgotPasswordEmail;
                    currentForgotPasswordStep = 'reset';
                    updateForgotPasswordBreadcrumbs(currentForgotPasswordStep);
                    clearInterval(forgotPasswordCountdownInterval);
                    forgotOtpCountdownElement.textContent = '5:00';
                    forgotResendOtpButton.style.display = 'none';
                } else {
                    if (forgotOtpInputSingle) forgotOtpInputSingle.value = '';
                }
            } catch (error) {
                console.error('Error verifying OTP for forgot password:', error);
                showToast("An error occurred during OTP verification.", "error");
            } finally {
                toggleSpinner(forgotPasswordVerifyOtpForm, false);
            }
        });
    }

    if (forgotResendOtpButton) {
        forgotResendOtpButton.addEventListener('click', async () => {
            if (!forgotPasswordEmail) {
                showToast("Please enter your email to resend OTP.", "error");
                return;
            }

            forgotResendOtpButton.disabled = true;
            forgotResendOtpButton.style.display = 'none';

            try {
                const response = await fetch(`${BASE_URL}/forgot-password/request-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: forgotPasswordEmail })
                });
                const data = await response.json();

                showToast(data.message, data.success ? "success" : "error");

                if (data.success) {
                    startCountdown(5 * 60, forgotOtpCountdownElement, forgotResendOtpButton);
                } else {
                    forgotResendOtpButton.disabled = false;
                    forgotResendOtpButton.style.display = 'block';
                }
            } catch (error) {
                console.error('Error resending forgot password OTP:', error);
                showToast("An error occurred while resending OTP.", "error");
                forgotResendOtpButton.disabled = false;
                forgotResendOtpButton.style.display = 'block';
            }
        });
    }

    if (forgotPasswordResetForm) {
        forgotPasswordResetForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            toggleSpinner(forgotPasswordResetForm, true);

            const newPassword = forgotNewPasswordInput.value;
            const confirmNewPassword = forgotConfirmNewPasswordInput.value;

            if (newPassword !== confirmNewPassword) {
                Toastify({
                    text: "New password and confirm password do not match.",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    className: "toastify-error",
                    stopOnFocus: true,
                }).showToast();
                toggleSpinner(forgotPasswordResetForm, false);
                return;
            }

            try {
                const response = await fetch(`${BASE_URL}/forgot-password/reset`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: forgotPasswordEmail, newPassword, confirmNewPassword })
                });
                const data = await response.json();

                Toastify({
                    text: data.message,
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    className: data.success ? "toastify-success" : "toastify-error",
                    stopOnFocus: true,
                }).showToast();

                if (data.success) {
                    forgotPasswordModal.hide();
                }
            } catch (error) {
                console.error('Error resetting password:', error);
                Toastify({
                    text: "An error occurred while resetting password.",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    className: "toastify-error",
                    stopOnFocus: true,
                }).showToast();
            } finally {
                toggleSpinner(forgotPasswordResetForm, false);
            }
        });
    }

    if (forgotBackToEmailButton) {
        forgotBackToEmailButton.addEventListener('click', () => {
            if (currentForgotPasswordStep === 'otp') {
                forgotPasswordVerifyOtpForm.style.display = 'none';
                forgotPasswordRequestOtpForm.style.display = 'block';
                currentForgotPasswordStep = 'email';
                updateForgotPasswordBreadcrumbs(currentForgotPasswordStep);
                clearInterval(forgotPasswordCountdownInterval);
                forgotOtpCountdownElement.textContent = '5:00';
                forgotResendOtpButton.style.display = 'none';
                forgotEmailInput.value = '';
            } else if (currentForgotPasswordStep === 'reset') {
                forgotPasswordResetForm.style.display = 'none';
                forgotPasswordVerifyOtpForm.style.display = 'block';
                currentForgotPasswordStep = 'otp';
                updateForgotPasswordBreadcrumbs(currentForgotPasswordStep);
                forgotNewPasswordInput.value = '';
                forgotConfirmNewPasswordInput.value = '';
                startCountdown(5 * 60, forgotOtpCountdownElement, forgotResendOtpButton);
            }
            if (forgotOtpInputSingle) forgotOtpInputSingle.value = '';
        });
    }

    // Single Forgot Password OTP Input Field Validation
    if (forgotOtpInputSingle) {
        forgotOtpInputSingle.addEventListener('input', (event) => {
            // Only allow numeric input
            forgotOtpInputSingle.value = forgotOtpInputSingle.value.replace(/[^0-9]/g, '');

            // Limit to 6 digits
            if (forgotOtpInputSingle.value.length > 6) {
                forgotOtpInputSingle.value = forgotOtpInputSingle.value.slice(0, 6);
            }
        });

        forgotOtpInputSingle.addEventListener('paste', (event) => {
            event.preventDefault();
            const pastedData = (event.clipboardData || window.clipboardData).getData('text');
            const numericData = pastedData.replace(/[^0-9]/g, '').slice(0, 6);
            forgotOtpInputSingle.value = numericData;
        });
    }
}

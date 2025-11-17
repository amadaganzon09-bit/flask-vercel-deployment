// Try to get BASE_URL from script.js, otherwise define it here
if (typeof BASE_URL === 'undefined') {
    const BASE_URL = window.BASE_URL || (() => {
        // If we're in a browser environment
        if (typeof window !== 'undefined') {
            // For development, use localhost:5000
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:5000';
            }
            // For production, use the current domain
            return window.location.origin;
        }
        // Defa for server-side or other environments
        return 'http://localhost:5000';
    })();
    
    // Make BASE_URL available globally for other scripts
    window.BASE_URL = BASE_URL;
}

$(document).ready(function() {
    if (!localStorage.getItem('authToken')) {
        sessionStorage.setItem('logoutMessage', 'Please log in to access the dashboard.');
        window.location.href = 'index.html';
        return;
    }

    const body = $('body');
    const sidebarToggleBtns = $('.toggle-btn'); 
    const sidebarOverlay = $('.sidebar-overlay');
    const sidebarLinks = $('.sidebar-link');

    // Toggle sidebar on button click
    sidebarToggleBtns.on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if ($(window).width() <= 768) {
            body.toggleClass('sidebar-open'); 
        } else {
            body.toggleClass('sidebar-collapsed'); 
        }
    });

    // Close sidebar when clicking overlay
    sidebarOverlay.on('click', function() {
        body.removeClass('sidebar-open'); 
    });

    // Close sidebar when clicking a sidebar link on mobile
    sidebarLinks.on('click', function() {
        if ($(window).width() <= 768) {
            body.removeClass('sidebar-open');
        }
    });

    // Handle window resize
    let resizeTimer;
    $(window).on('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const windowWidth = $(window).width();
            
            if (windowWidth > 768) {
                // Desktop mode - remove mobile sidebar state
                body.removeClass('sidebar-open');
            } else {
                // Mobile mode - remove desktop sidebar state
                body.removeClass('sidebar-collapsed');
                // Ensure sidebar is closed on mobile by default
                body.removeClass('sidebar-open');
            }
        }, 250); // Debounce resize event
    });

    // Initialize sidebar state on page load
    if ($(window).width() <= 768) {
        body.removeClass('sidebar-open sidebar-collapsed');
    }

    // Prevent body scroll when sidebar is open on mobile
    body.on('sidebar-open', function() {
        if ($(window).width() <= 768 && body.hasClass('sidebar-open')) {
            body.css('overflow', 'hidden');
        }
    });

    // Restore body scroll when sidebar is closed
    $(document).on('click', function(e) {
        if (body.hasClass('sidebar-open')) {
            const $sidebar = $('#sidebar');
            const $toggleBtn = $('.toggle-btn');
            
            // Check if click is outside sidebar and toggle button
            if (!$sidebar.is(e.target) && $sidebar.has(e.target).length === 0 &&
                !$toggleBtn.is(e.target) && $toggleBtn.has(e.target).length === 0) {
                body.removeClass('sidebar-open');
                body.css('overflow', '');
            }
        }
    });

    // Handle escape key to close sidebar on mobile
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && body.hasClass('sidebar-open')) {
            body.removeClass('sidebar-open');
            body.css('overflow', '');
        }
    }); 

    const logout = async () => {
        const data = await fetchData(`${BASE_URL}/logout`, 'POST');
        if (data && data.success) {
            localStorage.removeItem('authToken');
            sessionStorage.setItem('logoutMessage', 'You have been successfully logged out.');
            window.location.href = 'index.html';
        } else {
            showToast('Logout failed. Please try again.', 'error');
        }
    };

    $('#logout-button, #logout-dropdown-button').on('click', function(e) {
        e.preventDefault();
        $('#logoutConfirmModal').modal('show');
    });

    $('#confirmLogoutBtn').on('click', logout);

    const fetchData = async (url, method = 'GET', body = null, isFormData = false, bypassAuthRedirect = false) => {
        const currentAuthToken = localStorage.getItem('authToken'); 
        const headers = {
            'Authorization': `Bearer ${currentAuthToken}`
        };

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const options = {
            method: method,
            headers: headers,
        };

        if (body) {
            options.body = isFormData ? body : JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (!response.ok) {
                    if ((response.status === 401 || response.status === 403) && !bypassAuthRedirect) {
                        localStorage.removeItem('authToken');
                        sessionStorage.setItem('logoutMessage', data.message || 'Your session has expired. Please log in again.');
                        window.location.href = 'index.html';
                        return; 
                    }
                    return { ...data, status: response.status }; 
                }
                return data;
            } else {
                // Handle non-JSON responses (like HTML error pages)
                const text = await response.text();
                console.error('Server returned non-JSON response:', text);
                showToast('Server error. Please try again.', 'error');
                return { success: false, message: 'Server error. Please try again.' };
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Network error or server unreachable.', 'error');
            return { success: false, message: 'Network error or server unreachable.' };
        }
    };

    const contentSections = $('.content-section');
    const sidebarNavLinks = $('.sidebar-link[data-section]');
    const currentSectionTitle = $('#current-section-title');

    const showSection = (sectionId) => {
        contentSections.addClass('d-none');
        $(sectionId).removeClass('d-none');
        sidebarNavLinks.removeClass('active');
        $(`.sidebar-link[data-section="${sectionId.substring(1)}"]`).addClass('active');
        currentSectionTitle.text($(sectionId).find('.card-title').text().replace('CRUD', '').trim());
        if (sectionId === '#home-section') {
            currentSectionTitle.text('Home');
            if (siteAccountsTable && typeof siteAccountsTable.columns === 'function' && typeof siteAccountsTable.responsive === 'object' && typeof siteAccountsTable.responsive.recalc === 'function') {
                siteAccountsTable.columns.adjust().responsive.recalc();
            }
        } else if (sectionId === '#accounts-section') {
            currentSectionTitle.text('Accounts');
            loadUserAccountInfo(); 
        }
    };

    sidebarNavLinks.on('click', function(e) {
        e.preventDefault();
        const section = $(this).data('section');
        showSection(`#${section}-section`);
    });

    $('.dropdown-item[data-section="accounts"]').on('click', function(e) {
        e.preventDefault();
        showSection('#accounts-section');
    });

    let siteAccountsTable; 

    const loadUserAccountInfo = async () => {
        const data = await fetchData(`${BASE_URL}/user-info`, 'GET');
        if (data && data.success) {
            $('#userId').val(data.user.id);
            $('#firstName').val(data.user.firstname);
            $('#middleName').val(data.user.middlename);
            $('#lastName').val(data.user.lastname);
            $('#email').val(data.user.email);
            $('#username').val(data.user.email);
        } else if (data) {
            showToast(data.message, 'error');
        }
    };

    $('#updateAccountInfoForm').on('submit', function(event) {
        event.preventDefault();
        $('#updateAccountInfoConfirmModal').modal('show');
    });

    $('#accountInfoUpdateConfirmationInput').on('input', function() {
        $('#confirmAccountInfoUpdateBtn').prop('disabled', $(this).val().toLowerCase() !== 'confirm');
    });

    $('#confirmAccountInfoUpdateBtn').on('click', async function() {
        const userId = $('#userId').val();
        const firstname = $('#firstName').val();
        const middlename = $('#middleName').val();
        const lastname = $('#lastName').val();
        const email = $('#email').val();

        const data = await fetchData(`${BASE_URL}/users/${userId}`, 'PUT', { firstname, middlename, lastname, email });
        if (data && data.success) {
            showToast(data.message, 'success');
            $('#updateAccountInfoConfirmModal').modal('hide');
            $('#accountInfoUpdateConfirmationInput').val('');
            loadUserAccountInfo(); 
        } else if (data) {
            showToast(data.message, 'error');
        }
    });

    siteAccountsTable = $('#siteAccountsTable').DataTable({
        ajax: {
            url: `${BASE_URL}/accounts`,
            type: 'GET',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
            },
            dataSrc: 'accounts'
        },
        columns: [
            { data: 'id', visible: false },
            { data: 'site' },
            { data: 'username' },
            {
                data: 'password',
                render: function(data, type, row) {
                    return '********'; 
                }
            },
            {
                data: 'image',
                render: function(data, type, row) {
                    // Use BASE_URL for default images to avoid mixed content issues
                    const imageUrl = data ? `${BASE_URL}/${data}` : `${BASE_URL}/images/default.png`;
                    return `<img src="${imageUrl}" alt="Account Image" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover;">`;
                }
            },
            {
                data: null,
                render: function(data, type, row) {
                    return `
                        <button class="btn btn-sm btn-info edit-btn" data-id="${row.id}" data-site="${row.site}" data-username="${row.username}" data-password="${row.password}" data-image="${row.image ? `${BASE_URL}/${row.image}` : `${BASE_URL}/images/default.png`}" data-bs-toggle="modal" data-bs-target="#editAccountModal">Edit</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-bs-toggle="modal" data-bs-target="#deleteAccountModal">Delete</button>
                    `;
                }
            }
        ],
        responsive: true
    });

    $(document).on('click', '.toggle-password', function() {
        const targetId = $(this).data('target');
        const passwordInput = $(`#${targetId}`);
        const icon = $(this).find('i');

        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });

    $('#addAccountForm').on('submit', async function(event) {
        event.preventDefault();
        const site = $('#addSite').val();
        const username = $('#addUsername').val();
        const password = $('#addPassword').val();
        const imageFile = $('#addAccountImage')[0].files[0];

        const formData = new FormData();
        formData.append('site', site);
        formData.append('username', username);
        formData.append('password', password);
        if (imageFile) {
            formData.append('image', imageFile);
        } else {
            formData.append('image', 'images/default.png'); 
        }

        const data = await fetchData(`${BASE_URL}/accounts`, 'POST', formData, true);
        if (data && data.success) {
            showToast(data.message, 'success');
            $('#addAccountModal').modal('hide');
            $('#addAccountForm')[0].reset();
            siteAccountsTable.ajax.reload(); 
        } else if (data) {
            showToast(data.message, 'error');
        }
    });

    $('#siteAccountsTable tbody').on('click', '.edit-btn', function() {
        const id = $(this).data('id');
        const site = $(this).data('site');
        const username = $(this).data('username');
        const password = $(this).data('password');
        const image = $(this).data('image');

        $('#editAccountId').val(id);
        $('#editSite').val(site);
        $('#editUsername').val(username);
        $('#editPassword').val(password);
        $('#currentAccountImage').attr('src', image ? `${BASE_URL}/${image}` : `${BASE_URL}/images/default.png`).show();
        // Store the current image path in a hidden field
        $('#editAccountForm').data('currentImage', image);
    });

    $('#editAccountForm').on('submit', function(event) {
        event.preventDefault();
        $('#editConfirmationInput').val('');
        $('#confirmEditBtn').prop('disabled', true);
        $('#editAccountConfirmModal').modal('show');
    });

    $('#editConfirmationInput').on('input', function() {
        $('#confirmEditBtn').prop('disabled', $(this).val().toLowerCase() !== 'confirm');
    });

    $('#confirmEditBtn').on('click', async function() {
        const id = $('#editAccountId').val();
        const site = $('#editSite').val();
        const username = $('#editUsername').val();
        const password = $('#editPassword').val();
        const imageFile = $('#editAccountImage')[0].files[0];

        const formData = new FormData();
        formData.append('site', site);
        formData.append('username', username);
        formData.append('password', password);
        // Add the current image path
        formData.append('currentImage', $('#editAccountForm').data('currentImage'));
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const data = await fetchData(`${BASE_URL}/accounts/${id}`, 'PUT', formData, true);
        if (data && data.success) {
            showToast(data.message, 'success');
            $('#editAccountModal').modal('hide');
            $('#editAccountConfirmModal').modal('hide');
            $('#editConfirmationInput').val('');
            $('#editAccountImage').val(''); 
            $('#currentAccountImage').hide(); 
            siteAccountsTable.ajax.reload(); 
        } else if (data) {
            showToast(data.message, 'error');
        }
    });

    $('#siteAccountsTable tbody').on('click', '.delete-btn', function() {
        const id = $(this).data('id');
        $('#deleteAccountIdConfirm').val(id);
        $('#deleteConfirmationInput').val('');
        $('#confirmDeleteBtn').prop('disabled', true);
    });

    $('#deleteConfirmationInput').on('input', function() {
        $('#confirmDeleteBtn').prop('disabled', $(this).val().toLowerCase() !== 'delete');
    });

    $('#confirmDeleteBtn').on('click', async function() {
        const id = $('#deleteAccountIdConfirm').val();
        const data = await fetchData(`${BASE_URL}/accounts/${id}`, 'DELETE');
        if (data && data.success) {
            showToast(data.message, 'success');
            $('#deleteAccountModal').modal('hide');
            $('#deleteConfirmationInput').val('');
            siteAccountsTable.ajax.reload();
        } else if (data) {
            showToast(data.message, 'error');
        }
    });

    const validatePasswordFields = () => {
        const currentPassword = $('#currentPassword').val();
        const newPassword = $('#newPassword').val();
        const confirmNewPassword = $('#confirmNewPassword').val();

        let allFieldsFilled = true;
        if (!currentPassword) {
            allFieldsFilled = false;
        }

        if (!newPassword) {
            allFieldsFilled = false;
        }

        if (!confirmNewPassword) {
            allFieldsFilled = false;
        }

        if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
            allFieldsFilled = false;
        }

        $('#changePasswordForm button[type="submit"]').prop('disabled', !allFieldsFilled);
        return allFieldsFilled;
    };

    $('#newPassword, #confirmNewPassword').on('input', validatePasswordFields);

    $('#currentPassword').on('input', async function() {
        const currentPassword = $(this).val();
        if (currentPassword.length > 0) {
            const data = await fetchData(`${BASE_URL}/verify-current-password`, 'POST', { currentPassword }, false, true);
            if (data && !data.success) {

            }
        } else {
            
        }
        validatePasswordFields(); 
    });

    $('#changePasswordForm').on('submit', function(event) {
        event.preventDefault();
        if (!validatePasswordFields()) {
            return;
        }
        $('#changePasswordConfirmModal').modal('show');
    });

    $('#passwordUpdateConfirmationInput').on('input', function() {
        $('#confirmPasswordUpdateBtn').prop('disabled', $(this).val().toLowerCase() !== 'confirm');
    });

    $('#confirmPasswordUpdateBtn').on('click', async function() {
        const currentPassword = $('#currentPassword').val();
        const newPassword = $('#newPassword').val();
        const confirmNewPassword = $('#confirmNewPassword').val();

        const data = await fetchData(`${BASE_URL}/change-password`, 'POST', { currentPassword, newPassword, confirmNewPassword }, false, true); // bypassAuthRedirect = true
        if (data && data.success) {
            showToast(data.message, 'success');
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            $('#changePasswordForm')[0].reset();
            $('#changePasswordConfirmModal').modal('hide');
            $('#passwordUpdateConfirmationInput').val('');
            $('#changePasswordForm button[type="submit"]').prop('disabled', true); 
            setTimeout(() => {
                window.location.reload();
            }, 500); 
        } else if (data) {
            showToast(data.message, 'error');
        }
    });

    $('#changeProfilePictureForm').on('submit', async function(event) {
        event.preventDefault();
        const fileInput = $('#profilePicture')[0];
        if (fileInput.files.length === 0) {
            showToast('Please select a file to upload.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', fileInput.files[0]);

        const data = await fetchData(`${BASE_URL}/upload-profile-picture`, 'POST', formData, true);
        if (data && data.success) {
            showToast('Profile picture updated successfully!', 'success');
            $('#userProfilePicture').attr('src', data.profilepicture);
            $('#changeProfilePictureForm')[0].reset();
        } else if (data) {
            showToast(data.message, 'error');
        }
    });

    const loadUserProfilePicture = async () => {
        const data = await fetchData(`${BASE_URL}/profile-picture`);
        if (data && data.success && data.profilepicture) {
            $('#userProfilePicture').attr('src', data.profilepicture);
        } else {
            $('#userProfilePicture').attr('src', 'images/default-profile.png');
        }
    };
    loadUserProfilePicture();

    const initialHash = window.location.hash;
    if (initialHash && $(initialHash).hasClass('content-section')) {
        showSection(initialHash);
    } else {
        showSection('#home-section');
    }

    if ($(window).width() <= 768) {
        body.removeClass('sidebar-open'); 
    } else {
        body.removeClass('sidebar-collapsed'); 
    }

    // Fix aria-hidden focus issue for all modals
    const modals = ['#addAccountModal', '#editAccountModal', '#deleteAccountModal', 
                    '#editAccountConfirmModal', '#updateAccountInfoConfirmModal', 
                    '#changePasswordConfirmModal', '#logoutConfirmModal'];
    
    modals.forEach(modalId => {
        $(modalId).on('hide.bs.modal', function(e) {
            // Remove focus from any focused element within the modal before hiding
            const focusedElement = $(this).find(':focus');
            if (focusedElement.length) {
                focusedElement.blur();
            }
        });

        $(modalId).on('hidden.bs.modal', function(e) {
            // Ensure focus is properly managed after modal closes
            setTimeout(() => {
                if (document.activeElement === document.body || !document.activeElement) {
                    document.body.focus();
                }
            }, 100);
        });
    });
});

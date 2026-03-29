// ==========================================
// AUTH SYSTEM (Backend Integration)
// ==========================================
// Ce système utilise API.js pour communiquer avec le Backend Node.js
// Il gère l'UI et le stockage local des infos utilisateur

// ==========================================
// CORE AUTH FUNCTIONS
// ==========================================

// Helper to get initials
function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

/**
 * Get current user from localStorage
 */
function getCurrentUser() {
    // Priority to stored user info from API login
    const userStr = localStorage.getItem('voyagedz_user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Set current user in localStorage (Wrapper for API compatibility)
 */
function setCurrentUser(user) {
    if (user) {
        localStorage.setItem('voyagedz_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('voyagedz_user');
    }
}

/**
 * Login function (Delegates to API.js)
 */
async function login(email, password) {
    if (!window.API) {
        console.error("API client not loaded");
        throw new Error("Erreur système: API non chargée");
    }

    try {
        console.log('🔄 Auth.js calling API.auth.login...');
        // API.auth.login handles the request and token storage
        const user = await API.auth.login(email, password);
        console.log('✅ Auth.js login success, user:', user);
        return user;
    } catch (error) {
        console.error('❌ Auth.js login error:', error);
        throw error;
    }
}

/**
 * Register new user (Delegates to API.js)
 */
async function register(name, email, password) {
    if (!window.API) {
        throw new Error("Erreur système: API non chargée");
    }

    try {
        const user = await API.auth.register({ name, email, password });
        return user;
    } catch (error) {
        throw error;
    }
}

/**
 * Logout function
 */
function logout() {
    if (window.API) {
        API.auth.logout(); // Clears token and user info
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('voyagedz_user');
    }
    updateAuthUI();
    showNotification('👋 Déconnexion réussie', 'info');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    if (window.API && API.auth && API.auth.isAuthenticated) {
        return API.auth.isAuthenticated();
    }
    return !!localStorage.getItem('token');
}

/**
 * Handle logout action
 */
function handleLogout() {
    logout();

    // Redirect to home if on protected page
    if (typeof navigateTo === 'function') {
        navigateTo('home');
    }
}

/**
 * Become a host - Upgrade user to host status
 */
function becomeHost() {
    const user = getCurrentUser();
    if (!user) {
        showNotification('❌ Vous devez être connecté', 'error');
        return;
    }

    if (user.isHost) {
        showNotification('ℹ️ Vous êtes déjà hôte', 'info');
        return;
    }

    // Update user in localStorage
    user.isHost = true;
    localStorage.setItem('voyagedz_user', JSON.stringify(user));

    // Also update in users database
    const users = JSON.parse(localStorage.getItem('voyagedz_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id || u.email === user.email);
    if (userIndex !== -1) {
        users[userIndex].isHost = true;
        localStorage.setItem('voyagedz_users', JSON.stringify(users));
    }

    // Refresh UI
    updateAuthUI();

    showNotification('🎉 Félicitations ! Vous êtes maintenant hôte. Vous pouvez créer des annonces.', 'success');

    // Navigate to host dashboard
    if (typeof navigateTo === 'function') {
        setTimeout(() => navigateTo('host-dashboard'), 1000);
    }

    console.log('✅ User upgraded to host:', user.email);
}

// Expose globally
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.login = login;
window.register = register;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.handleLogout = handleLogout;
window.becomeHost = becomeHost;

// ==========================================
// SUPABASE AUTH REMOVED
// ==========================================

// Show login modal
function openLoginModal() {
    document.getElementById('login-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close login modal
function closeLoginModal() {
    document.getElementById('login-modal').classList.remove('active');
    document.body.style.overflow = '';
}
// Update Auth UI
function updateAuthUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const hostNavTab = document.getElementById('host-nav-tab');

    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            // Update header avatar
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                if (user.avatar && user.avatar.includes('http')) {
                    avatar.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                } else {
                    avatar.textContent = user.name ? getInitials(user.name) : 'U';
                }
            }

            // Update dropdown user info
            const dropdownAvatar = document.getElementById('dropdown-avatar');
            const dropdownName = document.getElementById('dropdown-name');
            const dropdownEmail = document.getElementById('dropdown-email');

            if (dropdownName) dropdownName.textContent = user.name;
            if (dropdownEmail) dropdownEmail.textContent = user.email;
            if (dropdownAvatar) {
                if (user.avatar && user.avatar.includes('http')) {
                    dropdownAvatar.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                } else {
                    dropdownAvatar.textContent = user.name ? getInitials(user.name) : 'U';
                }
            }
        }

        // Show host nav tab if user is a host
        if (user.isHost && hostNavTab) {
            hostNavTab.style.display = 'flex';
        } else if (hostNavTab) {
            hostNavTab.style.display = 'none';
        }

        // Profile Menu Items Visibility
        const bookingsItem = document.getElementById('bookings-profile-item');
        const myListingsItem = document.getElementById('my-listings-profile-item');

        console.log('🔍 updateAuthUI: Checking profile items:', {
            bookings: !!bookingsItem,
            listings: !!myListingsItem,
            isHost: user.isHost
        });

        if (bookingsItem) {
            bookingsItem.style.display = 'flex';
            bookingsItem.style.removeProperty('display'); // Reset to default CSS
            if (getComputedStyle(bookingsItem).display === 'none') bookingsItem.style.display = 'flex';
        }
        if (myListingsItem) myListingsItem.style.display = user.isHost ? 'flex' : 'none';

        // Become Host button - only show for non-host users (DROPDOWN)
        const becomeHostItem = document.getElementById('become-host-item');
        if (becomeHostItem) {
            becomeHostItem.style.display = user.isHost ? 'none' : 'flex';
        }

        // Become Host button - only show for non-host users (PROFILE PAGE)
        const becomeHostProfilePageItem = document.getElementById('become-host-profile-page-item');
        if (becomeHostProfilePageItem) {
            becomeHostProfilePageItem.style.display = user.isHost ? 'none' : 'block';
        }

        // Mes annonces - Profile Page item (unique ID)
        const myListingsProfilePageItem = document.getElementById('my-listings-profile-page-item');
        if (myListingsProfilePageItem) {
            myListingsProfilePageItem.style.display = user.isHost ? 'block' : 'none';
        }

    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (hostNavTab) hostNavTab.style.display = 'none';

        // Hide profile menu items if not logged in
        const bookingsItem = document.getElementById('bookings-profile-item');
        const myListingsItem = document.getElementById('my-listings-profile-item');
        if (bookingsItem) bookingsItem.style.display = 'none';
        if (myListingsItem) myListingsItem.style.display = 'none';
    }

    // Handle Profile Footer Button Visual State
    const profileFooterBtn = document.getElementById('nav-profile-btn');
    if (profileFooterBtn) {
        if (user) {
            profileFooterBtn.style.opacity = '1';
            profileFooterBtn.style.pointerEvents = 'auto';
            profileFooterBtn.style.filter = 'none';
        } else {
            profileFooterBtn.style.opacity = '0.5';
            profileFooterBtn.style.pointerEvents = 'none';
            profileFooterBtn.style.filter = 'grayscale(100%)';
        }
    }
}

// Handle login form submission
function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = form.querySelector('button[type="submit"]');

            const originalText = btn.textContent;
            btn.textContent = 'Connexion...';
            btn.disabled = true;

            try {
                const user = await login(email, password);
                closeLoginModal();
                updateAuthUI();

                if (typeof checkHostStatus === 'function') {
                    checkHostStatus();
                }

                showNotification(`🎉 Bienvenue ${user.name} !`, 'success');

                // Show different message based on role
                if (user.role === 'admin') {
                    showNotification('👑 Connecté en tant qu\'Admin', 'info');
                } else if (user.isHost) {
                    showNotification('🏠 Connecté en tant qu\'Hôte', 'info');
                }
            } catch (error) {
                showNotification('❌ ' + error.message, 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notif = document.getElementById('notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notification';
        document.body.appendChild(notif);
    }

    notif.textContent = message;
    notif.className = `notification ${type} show`;

    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// Login with Google (simulation)
function loginWithGoogle() {
    try {
        // Simuler la connexion Google
        const googleUser = {
            id: 10,
            name: 'Utilisateur Google',
            email: 'google.user@gmail.com',
            role: 'user',
            isHost: false,
            provider: 'google'
        };

        setCurrentUser(googleUser);
        closeLoginModal();
        updateAuthUI();
        showNotification(`🎉 Bienvenue ${googleUser.name} !`, 'success');
        showNotification('✅ Connecté via Google', 'info');
    } catch (error) {
        showNotification('❌ Erreur de connexion Google', 'error');
    }
}

// Login with Facebook (simulation)
function loginWithFacebook() {
    try {
        const facebookUser = {
            id: 11,
            name: 'Utilisateur Facebook',
            email: 'facebook.user@facebook.com',
            role: 'user',
            isHost: false,
            provider: 'facebook'
        };

        setCurrentUser(facebookUser);
        closeLoginModal();
        updateAuthUI();
        showNotification(`🎉 Bienvenue ${facebookUser.name} !`, 'success');
        showNotification('✅ Connecté via Facebook', 'info');
    } catch (error) {
        showNotification('❌ Erreur de connexion Facebook', 'error');
    }
}

// Export for global use
window.authSystem = {
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    isAdmin: function () {
        const user = getCurrentUser();
        return user && user.role === 'admin';
    },
    openLoginModal,
    closeLoginModal,
    updateAuthUI,
    setupLoginForm,
    updateAuthUI,
    setupLoginForm,
    showNotification,
    loginWithGoogle,
    loginWithFacebook,
    register
};

// Expose login function globally for inline onclick handlers
window.handleLogin = async function (event) {
    if (event) event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    // Fix selector to match type="button"
    const btn = document.querySelector('#login-form button');


    if (btn) {
        btn.textContent = 'Connexion...';
        btn.disabled = true;
    }

    try {
        const user = await login(email, password);
        closeLoginModal();
        updateAuthUI();

        if (typeof checkHostStatus === 'function') {
            checkHostStatus();
        }

        showNotification(`🎉 Bienvenue ${user.name} !`, 'success');

        if (user.role === 'admin') {
            showNotification('👑 Connecté en tant qu\'Admin', 'info');
        } else if (user.isHost) {
            showNotification('🏠 Connecté en tant qu\'Hôte', 'info');
        }

        // Handle Redirect Intent (Smart Redirect)
        const redirectAction = localStorage.getItem('redirect_after_login');
        if (redirectAction) {
            localStorage.removeItem('redirect_after_login');

            // Format: "listing:123" -> Booking flow
            if (redirectAction.startsWith('listing:')) {
                const listingId = redirectAction.split(':')[1];
                // Navigate back to listing and open payment
                if (window.showDetail) {
                    // We need to wait for the modal to close and the page to update
                    setTimeout(() => {
                        window.showDetail(parseInt(listingId));
                        // Small delay to let detail page render, then trigger payment
                        setTimeout(() => {
                            if (window.openPaymentModal) window.openPaymentModal();
                        }, 800);
                    }, 500);
                }
            }
        }

        const redirect = localStorage.getItem('authRedirect');
        if (redirect === 'become-host') {
            localStorage.removeItem('authRedirect');

            // Wait a moment for UI to update
            setTimeout(() => {
                if (user.isHost) {
                    // Navigate to Host Dashboard
                    if (window.navigateTo) window.navigateTo('host-dashboard');
                } else {
                    // Open Become Host Modal (or Create Listing if logic assumes upgrade first)
                    if (window.openBecomeHostModal) window.openBecomeHostModal();
                }
            }, 500);
        }

    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.textContent = 'Se connecter';
            btn.disabled = false;
        }
    }
};

// Handle Registration
window.handleRegister = async function (event) {
    if (event) event.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const btn = document.querySelector('#register-form button');

    if (btn) {
        btn.textContent = 'Création...';
        btn.disabled = true;
    }

    try {
        const user = await register(name, email, password);
        closeLoginModal(); // Same modal container
        updateAuthUI();

        showNotification(`🎉 Compte créé ! Bienvenue ${user.name}`, 'success');

    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.textContent = 'Créer mon compte';
            btn.disabled = false;
        }
    }
};

// Toggle Login / Register forms
window.toggleAuthMode = function (mode) {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const title = document.querySelector('#login-modal h2');

    if (mode === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        if (title) title.textContent = 'Créer un compte';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        if (title) title.textContent = 'Bienvenue';
    }
};

// Expose modal functions globally for direct access (HTML onclick)
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;

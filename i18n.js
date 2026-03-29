// ==========================================
// I18N - Multi-Language System (FR/AR/EN)
// ==========================================

const I18n = {
    currentLang: 'fr',
    translations: {},

    // French - Default
    fr: {
        // Navigation
        nav_home: 'Accueil',
        nav_search: 'Explorer',
        nav_bookings: 'Réservations',
        nav_favorites: 'Favoris',
        nav_profile: 'Profil',
        nav_messages: 'Messages',

        // Auth
        auth_login: 'Connexion',
        auth_register: 'Inscription',
        auth_logout: 'Déconnexion',
        auth_email: 'Email',
        auth_password: 'Mot de passe',
        auth_name: 'Nom complet',
        auth_welcome: 'Bienvenue',

        // Search
        search_title: 'Où voulez-vous aller ?',
        search_placeholder: 'Rechercher une destination...',
        search_dates: 'Dates',
        search_guests: 'Voyageurs',
        search_filters: 'Filtres',
        search_price_range: 'Fourchette de prix',
        search_amenities: 'Équipements',
        search_type: 'Type de logement',
        search_sort: 'Trier par',
        search_sort_price_asc: 'Prix croissant',
        search_sort_price_desc: 'Prix décroissant',
        search_sort_rating: 'Meilleures notes',
        search_results: 'résultats',

        // Listings
        listing_per_night: '/nuit',
        listing_reviews: 'avis',
        listing_amenities: 'Équipements',
        listing_description: 'Description',
        listing_location: 'Localisation',
        listing_host: 'Votre hôte',
        listing_book: 'Réserver',
        listing_contact_host: 'Contacter l\'hôte',

        // Booking
        booking_dates: 'Dates du séjour',
        booking_checkin: 'Arrivée',
        booking_checkout: 'Départ',
        booking_nights: 'nuits',
        booking_total: 'Total',
        booking_confirm: 'Confirmer la réservation',
        booking_success: 'Réservation confirmée !',
        booking_code: 'Code de confirmation',

        // Reviews
        review_title: 'Avis des voyageurs',
        review_write: 'Laisser un avis',
        review_rating: 'Note',
        review_comment: 'Votre commentaire',
        review_photos: 'Ajouter des photos',
        review_submit: 'Publier l\'avis',

        // Messages
        messages_title: 'Messages',
        messages_empty: 'Aucun message',
        messages_send: 'Envoyer',
        messages_placeholder: 'Écrire un message...',

        // Misc
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
        cancel: 'Annuler',
        save: 'Enregistrer',
        delete: 'Supprimer',
        edit: 'Modifier',
        close: 'Fermer',
        see_all: 'Voir tout',
        no_results: 'Aucun résultat',
        currency: 'DA'
    },

    // Arabic
    ar: {
        // Navigation
        nav_home: 'الرئيسية',
        nav_search: 'استكشف',
        nav_bookings: 'الحجوزات',
        nav_favorites: 'المفضلة',
        nav_profile: 'الملف الشخصي',
        nav_messages: 'الرسائل',

        // Auth
        auth_login: 'تسجيل الدخول',
        auth_register: 'إنشاء حساب',
        auth_logout: 'تسجيل الخروج',
        auth_email: 'البريد الإلكتروني',
        auth_password: 'كلمة المرور',
        auth_name: 'الاسم الكامل',
        auth_welcome: 'مرحباً',

        // Search
        search_title: 'إلى أين تريد الذهاب؟',
        search_placeholder: 'ابحث عن وجهة...',
        search_dates: 'التواريخ',
        search_guests: 'المسافرون',
        search_filters: 'الفلاتر',
        search_price_range: 'نطاق السعر',
        search_amenities: 'المرافق',
        search_type: 'نوع السكن',
        search_sort: 'ترتيب حسب',
        search_sort_price_asc: 'السعر تصاعدياً',
        search_sort_price_desc: 'السعر تنازلياً',
        search_sort_rating: 'أفضل التقييمات',
        search_results: 'نتيجة',

        // Listings
        listing_per_night: '/ليلة',
        listing_reviews: 'تقييمات',
        listing_amenities: 'المرافق',
        listing_description: 'الوصف',
        listing_location: 'الموقع',
        listing_host: 'المضيف',
        listing_book: 'احجز الآن',
        listing_contact_host: 'تواصل مع المضيف',

        // Booking
        booking_dates: 'تواريخ الإقامة',
        booking_checkin: 'الوصول',
        booking_checkout: 'المغادرة',
        booking_nights: 'ليالي',
        booking_total: 'المجموع',
        booking_confirm: 'تأكيد الحجز',
        booking_success: 'تم تأكيد الحجز!',
        booking_code: 'رمز التأكيد',

        // Reviews
        review_title: 'آراء المسافرين',
        review_write: 'اكتب تقييماً',
        review_rating: 'التقييم',
        review_comment: 'تعليقك',
        review_photos: 'إضافة صور',
        review_submit: 'نشر التقييم',

        // Messages
        messages_title: 'الرسائل',
        messages_empty: 'لا توجد رسائل',
        messages_send: 'إرسال',
        messages_placeholder: 'اكتب رسالة...',

        // Misc
        loading: 'جاري التحميل...',
        error: 'خطأ',
        success: 'نجاح',
        cancel: 'إلغاء',
        save: 'حفظ',
        delete: 'حذف',
        edit: 'تعديل',
        close: 'إغلاق',
        see_all: 'عرض الكل',
        no_results: 'لا توجد نتائج',
        currency: 'دج'
    },

    // English
    en: {
        // Navigation
        nav_home: 'Home',
        nav_search: 'Explore',
        nav_bookings: 'Bookings',
        nav_favorites: 'Favorites',
        nav_profile: 'Profile',
        nav_messages: 'Messages',

        // Auth
        auth_login: 'Login',
        auth_register: 'Sign Up',
        auth_logout: 'Logout',
        auth_email: 'Email',
        auth_password: 'Password',
        auth_name: 'Full Name',
        auth_welcome: 'Welcome',

        // Search
        search_title: 'Where do you want to go?',
        search_placeholder: 'Search a destination...',
        search_dates: 'Dates',
        search_guests: 'Guests',
        search_filters: 'Filters',
        search_price_range: 'Price Range',
        search_amenities: 'Amenities',
        search_type: 'Property Type',
        search_sort: 'Sort by',
        search_sort_price_asc: 'Price: Low to High',
        search_sort_price_desc: 'Price: High to Low',
        search_sort_rating: 'Top Rated',
        search_results: 'results',

        // Listings
        listing_per_night: '/night',
        listing_reviews: 'reviews',
        listing_amenities: 'Amenities',
        listing_description: 'Description',
        listing_location: 'Location',
        listing_host: 'Your Host',
        listing_book: 'Book Now',
        listing_contact_host: 'Contact Host',

        // Booking
        booking_dates: 'Stay Dates',
        booking_checkin: 'Check-in',
        booking_checkout: 'Check-out',
        booking_nights: 'nights',
        booking_total: 'Total',
        booking_confirm: 'Confirm Booking',
        booking_success: 'Booking Confirmed!',
        booking_code: 'Confirmation Code',

        // Reviews
        review_title: 'Guest Reviews',
        review_write: 'Write a Review',
        review_rating: 'Rating',
        review_comment: 'Your Comment',
        review_photos: 'Add Photos',
        review_submit: 'Submit Review',

        // Messages
        messages_title: 'Messages',
        messages_empty: 'No messages',
        messages_send: 'Send',
        messages_placeholder: 'Type a message...',

        // Misc
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        see_all: 'See All',
        no_results: 'No results',
        currency: 'DZD'
    },

    // ==========================================
    // Core Functions
    // ==========================================

    init() {
        // Load saved language
        const saved = localStorage.getItem('voyagedz_lang');
        if (saved && this[saved]) {
            this.currentLang = saved;
        }

        // Set RTL for Arabic
        this.updateDirection();

        // Apply translations
        this.applyTranslations();

        console.log(`🌍 I18n initialized: ${this.currentLang.toUpperCase()}`);
    },

    // Get translation
    t(key) {
        return this[this.currentLang][key] || this.fr[key] || key;
    },

    // Change language
    setLanguage(lang) {
        if (!this[lang]) return false;

        this.currentLang = lang;
        localStorage.setItem('voyagedz_lang', lang);

        this.updateDirection();
        this.applyTranslations();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));

        return true;
    },

    // Update RTL/LTR direction
    updateDirection() {
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.currentLang;

        // Add RTL class
        if (this.currentLang === 'ar') {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    },

    // Apply translations to DOM
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = this.t(key);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            el.title = this.t(key);
        });
    },

    // ==========================================
    // Language Selector Component
    // ==========================================

    renderSelector(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="language-selector">
                <button class="lang-btn ${this.currentLang === 'fr' ? 'active' : ''}" 
                        onclick="I18n.setLanguage('fr')">🇫🇷 FR</button>
                <button class="lang-btn ${this.currentLang === 'ar' ? 'active' : ''}" 
                        onclick="I18n.setLanguage('ar')">🇩🇿 عربي</button>
                <button class="lang-btn ${this.currentLang === 'en' ? 'active' : ''}" 
                        onclick="I18n.setLanguage('en')">🇬🇧 EN</button>
            </div>
        `;
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});

// Expose globally
window.I18n = I18n;

console.log('✅ I18n module loaded');

// ==========================================
// ACTIVITY MANAGER - Host Activity Management
// ==========================================
// GetYourGuide-style activity management for hosts
// ==========================================

const ActivityManager = {
    currentListingId: null,
    calendarInstance: null,
    slots: [],

    // ==========================================
    // Initialize Activity Manager
    // ==========================================
    async init(listingId, containerId) {
        this.currentListingId = listingId;
        this.container = document.getElementById(containerId);

        if (!this.container) {
            console.error('ActivityManager: Container not found:', containerId);
            return;
        }

        await this.loadData();
        this.render();
    },

    // ==========================================
    // Load Activity Data
    // ==========================================
    async loadData() {
        try {
            const [slots, languages, inclusions, itinerary, departures] = await Promise.all([
                this.fetchSlots(),
                this.fetchLanguages(),
                this.fetchInclusions(),
                this.fetchItinerary(),
                this.fetchDepartureCities()
            ]);

            this.slots = slots;
            this.languages = languages;
            this.inclusions = inclusions;
            this.itinerary = itinerary;
            this.departureCities = departures;
        } catch (error) {
            console.error('ActivityManager: Error loading data:', error);
        }
    },

    async fetchSlots() {
        const res = await fetch(`/api/listings/${this.currentListingId}/slots`);
        return res.ok ? await res.json() : [];
    },

    async fetchLanguages() {
        const res = await fetch(`/api/listings/${this.currentListingId}/languages`);
        return res.ok ? await res.json() : [];
    },

    async fetchInclusions() {
        const res = await fetch(`/api/listings/${this.currentListingId}/inclusions`);
        return res.ok ? await res.json() : [];
    },

    async fetchItinerary() {
        const res = await fetch(`/api/listings/${this.currentListingId}/itinerary`);
        return res.ok ? await res.json() : [];
    },

    async fetchDepartureCities() {
        const res = await fetch(`/api/listings/${this.currentListingId}/departure-cities`);
        return res.ok ? await res.json() : [];
    },

    // ==========================================
    // Render Activity Manager UI
    // ==========================================
    render() {
        this.container.innerHTML = `
            <div class="activity-manager">
                <!-- Tabs -->
                <div class="am-tabs">
                    <button class="am-tab active" data-tab="slots">
                        📅 Créneaux
                        <span class="badge">${this.slots.length}</span>
                    </button>
                    <button class="am-tab" data-tab="languages">
                        🗣️ Langues
                        <span class="badge">${this.languages.length}</span>
                    </button>
                    <button class="am-tab" data-tab="inclusions">
                        ✔️ Inclus/Exclus
                        <span class="badge">${this.inclusions.length}</span>
                    </button>
                    <button class="am-tab" data-tab="itinerary">
                        🗺️ Itinéraire
                        <span class="badge">${this.itinerary.length}</span>
                    </button>
                    <button class="am-tab" data-tab="departures">
                        🚐 Villes de départ
                        <span class="badge">${this.departureCities.length}</span>
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="am-content">
                    <div class="am-panel active" id="panel-slots">
                        ${this.renderSlotsPanel()}
                    </div>
                    <div class="am-panel" id="panel-languages">
                        ${this.renderLanguagesPanel()}
                    </div>
                    <div class="am-panel" id="panel-inclusions">
                        ${this.renderInclusionsPanel()}
                    </div>
                    <div class="am-panel" id="panel-itinerary">
                        ${this.renderItineraryPanel()}
                    </div>
                    <div class="am-panel" id="panel-departures">
                        ${this.renderDeparturesPanel()}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.initSlotCalendar();
    },

    // ==========================================
    // Render Slots Panel
    // ==========================================
    renderSlotsPanel() {
        return `
            <div class="slots-panel">
                <div class="slots-header">
                    <h3>Gestion des créneaux</h3>
                    <button class="btn btn-primary" onclick="ActivityManager.showAddSlotModal()">
                        + Ajouter un créneau
                    </button>
                </div>

                <div class="slots-calendar-container">
                    <div class="slots-calendar" id="slots-calendar"></div>
                    <div class="slots-list" id="slots-list">
                        <h4>Créneaux à venir</h4>
                        ${this.renderSlotsList()}
                    </div>
                </div>

                <!-- Add Slot Modal -->
                <div class="modal" id="add-slot-modal" style="display:none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Ajouter un créneau</h3>
                            <button class="close-btn" onclick="ActivityManager.hideModal('add-slot-modal')">&times;</button>
                        </div>
                        <form id="add-slot-form" onsubmit="ActivityManager.handleAddSlot(event)">
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" name="date" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Heure de début</label>
                                    <input type="time" name="start_time" required>
                                </div>
                                <div class="form-group">
                                    <label>Heure de fin (optionnel)</label>
                                    <input type="time" name="end_time">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Capacité</label>
                                    <input type="number" name="capacity" value="10" min="1" max="100">
                                </div>
                                <div class="form-group">
                                    <label>Prix spécial (optionnel)</label>
                                    <input type="number" name="price_override" placeholder="Laisser vide = prix normal">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Niveau de demande</label>
                                <select name="demand_level">
                                    <option value="normal">Normal</option>
                                    <option value="high">Forte demande (%)</option>
                                    <option value="low">Faible demande</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="ActivityManager.hideModal('add-slot-modal')">Annuler</button>
                                <button type="submit" class="btn btn-primary">Créer le créneau</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Bulk Add Modal -->
                <div class="modal" id="bulk-slots-modal" style="display:none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Créer des créneaux récurrents</h3>
                            <button class="close-btn" onclick="ActivityManager.hideModal('bulk-slots-modal')">&times;</button>
                        </div>
                        <form id="bulk-slots-form" onsubmit="ActivityManager.handleBulkSlots(event)">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Du</label>
                                    <input type="date" name="from_date" required>
                                </div>
                                <div class="form-group">
                                    <label>Au</label>
                                    <input type="date" name="to_date" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Jours de la semaine</label>
                                <div class="weekdays-selector">
                                    <label><input type="checkbox" name="days" value="0"> Dim</label>
                                    <label><input type="checkbox" name="days" value="1" checked> Lun</label>
                                    <label><input type="checkbox" name="days" value="2" checked> Mar</label>
                                    <label><input type="checkbox" name="days" value="3" checked> Mer</label>
                                    <label><input type="checkbox" name="days" value="4" checked> Jeu</label>
                                    <label><input type="checkbox" name="days" value="5" checked> Ven</label>
                                    <label><input type="checkbox" name="days" value="6"> Sam</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Heures de départ</label>
                                <div class="time-slots-input" id="time-slots-input">
                                    <div class="time-slot-row">
                                        <input type="time" name="times[]" value="09:00">
                                        <button type="button" class="btn-icon" onclick="ActivityManager.addTimeSlot()">+</button>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Capacité par créneau</label>
                                <input type="number" name="capacity" value="10" min="1">
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="ActivityManager.hideModal('bulk-slots-modal')">Annuler</button>
                                <button type="submit" class="btn btn-primary">Créer les créneaux</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    renderSlotsList() {
        if (this.slots.length === 0) {
            return '<p class="empty-state">Aucun créneau configuré. Ajoutez vos premiers créneaux !</p>';
        }

        // Group by date
        const grouped = {};
        this.slots.forEach(slot => {
            if (!grouped[slot.date]) grouped[slot.date] = [];
            grouped[slot.date].push(slot);
        });

        return Object.entries(grouped).slice(0, 7).map(([date, slots]) => `
            <div class="slot-date-group">
                <div class="slot-date-header">
                    ${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
                ${slots.map(slot => `
                    <div class="slot-item ${slot.demand_level === 'high' ? 'high-demand' : ''}">
                        <div class="slot-time">
                            <strong>${slot.start_time}</strong>
                            ${slot.end_time ? ` - ${slot.end_time}` : ''}
                        </div>
                        <div class="slot-capacity">
                            <span class="${slot.available_spots <= 2 ? 'low' : ''}">${slot.available_spots}</span>/${slot.capacity} places
                        </div>
                        ${slot.demand_level === 'high' ? '<span class="demand-badge">%</span>' : ''}
                        <div class="slot-actions">
                            <button class="btn-icon" onclick="ActivityManager.editSlot(${slot.id})" title="Modifier">✏️</button>
                            <button class="btn-icon danger" onclick="ActivityManager.deleteSlot(${slot.id})" title="Supprimer">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    },

    // ==========================================
    // Render Languages Panel
    // ==========================================
    renderLanguagesPanel() {
        return `
            <div class="languages-panel">
                <h3>Langues parlées par le guide</h3>
                <p class="panel-description">Sélectionnez les langues dans lesquelles vous pouvez animer cette activité.</p>
                
                <form id="languages-form" onsubmit="ActivityManager.handleSaveLanguages(event)">
                    <div class="languages-grid" id="languages-grid">
                        <!-- Will be populated dynamically -->
                        <p class="loading">Chargement des langues...</p>
                    </div>
                    
                    <div class="form-group">
                        <label>Langue principale</label>
                        <select name="primary_language" id="primary-language-select">
                            <!-- Will be populated -->
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Enregistrer les langues</button>
                    </div>
                </form>
            </div>
        `;
    },

    async loadAllLanguages() {
        const res = await fetch('/api/languages');
        const allLanguages = res.ok ? await res.json() : [];

        const grid = document.getElementById('languages-grid');
        const select = document.getElementById('primary-language-select');

        if (grid) {
            grid.innerHTML = allLanguages.map(lang => {
                const isSelected = this.languages.some(l => l.id === lang.id);
                return `
                    <label class="language-checkbox ${isSelected ? 'selected' : ''}">
                        <input type="checkbox" name="languages" value="${lang.id}" ${isSelected ? 'checked' : ''}>
                        <span class="flag">${lang.flag}</span>
                        <span class="name">${lang.name}</span>
                    </label>
                `;
            }).join('');
        }

        if (select) {
            const primaryLang = this.languages.find(l => l.is_primary);
            select.innerHTML = allLanguages.map(lang => `
                <option value="${lang.id}" ${primaryLang && primaryLang.id === lang.id ? 'selected' : ''}>${lang.flag} ${lang.name}</option>
            `).join('');
        }
    },

    // ==========================================
    // Render Inclusions Panel
    // ==========================================
    renderInclusionsPanel() {
        const included = this.inclusions.filter(i => i.is_included);
        const excluded = this.inclusions.filter(i => !i.is_included);

        return `
            <div class="inclusions-panel">
                <h3>Ce qui est inclus / non inclus</h3>
                
                <div class="inclusions-grid">
                    <div class="inclusion-column included">
                        <h4>✔️ Inclus</h4>
                        <div class="inclusion-list" id="included-list">
                            ${included.map(i => this.renderInclusionItem(i, true)).join('')}
                        </div>
                        <button class="btn btn-outline" onclick="ActivityManager.addInclusion(true)">+ Ajouter</button>
                    </div>
                    
                    <div class="inclusion-column excluded">
                        <h4>✗ Non inclus</h4>
                        <div class="inclusion-list" id="excluded-list">
                            ${excluded.map(i => this.renderInclusionItem(i, false)).join('')}
                        </div>
                        <button class="btn btn-outline" onclick="ActivityManager.addInclusion(false)">+ Ajouter</button>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="ActivityManager.saveInclusions()">Enregistrer</button>
                </div>
            </div>
        `;
    },

    renderInclusionItem(item, isIncluded) {
        return `
            <div class="inclusion-item" data-id="${item.id}">
                <span class="icon">${item.icon || (isIncluded ? '✔️' : '✗')}</span>
                <input type="text" value="${item.item}" class="inclusion-text">
                <button class="btn-icon danger" onclick="ActivityManager.removeInclusion(${item.id})">🗑️</button>
            </div>
        `;
    },

    // ==========================================
    // Render Itinerary Panel
    // ==========================================
    renderItineraryPanel() {
        return `
            <div class="itinerary-panel">
                <h3>Itinéraire de l'activité</h3>
                <p class="panel-description">Définissez les étapes de votre visite ou activité.</p>
                
                <div class="itinerary-timeline" id="itinerary-timeline">
                    ${this.itinerary.map((stop, index) => `
                        <div class="itinerary-stop" data-id="${stop.id}" data-order="${stop.stop_order}">
                            <div class="stop-marker">${index + 1}</div>
                            <div class="stop-content">
                                <input type="text" class="stop-name" value="${stop.name}" placeholder="Nom de l'étape">
                                <textarea class="stop-description" placeholder="Description">${stop.description || ''}</textarea>
                                <div class="stop-duration">
                                    <label>Durée: </label>
                                    <input type="number" class="stop-duration-input" value="${stop.duration_minutes || ''}" placeholder="min"> min
                                </div>
                            </div>
                            <div class="stop-actions">
                                <button class="btn-icon" onclick="ActivityManager.moveStop(${stop.id}, -1)" title="Monter">⬆️</button>
                                <button class="btn-icon" onclick="ActivityManager.moveStop(${stop.id}, 1)" title="Descendre">⬇️</button>
                                <button class="btn-icon danger" onclick="ActivityManager.removeStop(${stop.id})" title="Supprimer">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <button class="btn btn-outline" onclick="ActivityManager.addItineraryStop()">+ Ajouter une étape</button>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="ActivityManager.saveItinerary()">Enregistrer l'itinéraire</button>
                </div>
            </div>
        `;
    },

    // ==========================================
    // Render Departures Panel
    // ==========================================
    renderDeparturesPanel() {
        return `
            <div class="departures-panel">
                <h3>Villes de départ</h3>
                <p class="panel-description">Configurez les points de prise en charge pour les participants venant d'autres villes.</p>
                
                <div class="departures-list" id="departures-list">
                    ${this.departureCities.map(dep => `
                        <div class="departure-item" data-city-id="${dep.city_id}">
                            <div class="departure-city">
                                <strong>${dep.city_name}</strong>
                            </div>
                            <div class="departure-details">
                                <input type="text" class="pickup-point" value="${dep.pickup_point || ''}" placeholder="Point de prise en charge">
                                <input type="time" class="pickup-time" value="${dep.pickup_time || ''}">
                                <input type="number" class="extra-price" value="${dep.extra_price || 0}" placeholder="Supplément DZD">
                            </div>
                            <button class="btn-icon danger" onclick="ActivityManager.removeDeparture(${dep.city_id})">🗑️</button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="add-departure">
                    <select id="add-departure-city">
                        <option value="">Ajouter une ville...</option>
                    </select>
                    <button class="btn btn-outline" onclick="ActivityManager.addDepartureCity()">Ajouter</button>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="ActivityManager.saveDepartures()">Enregistrer</button>
                </div>
            </div>
        `;
    },

    // ==========================================
    // Event Bindings
    // ==========================================
    bindEvents() {
        // Tab switching
        this.container.querySelectorAll('.am-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    switchTab(tabName) {
        // Update tabs
        this.container.querySelectorAll('.am-tab').forEach(t => t.classList.remove('active'));
        this.container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update panels
        this.container.querySelectorAll('.am-panel').forEach(p => p.classList.remove('active'));
        this.container.querySelector(`#panel-${tabName}`).classList.add('active');

        // Load data if needed
        if (tabName === 'languages') {
            this.loadAllLanguages();
        } else if (tabName === 'departures') {
            this.loadCitiesForDeparture();
        }
    },

    // ==========================================
    // Slots Calendar
    // ==========================================
    initSlotCalendar() {
        const calendarEl = document.getElementById('slots-calendar');
        if (!calendarEl || !window.flatpickr) return;

        // Get dates with slots
        const datesWithSlots = [...new Set(this.slots.map(s => s.date))];
        const highDemandDates = [...new Set(this.slots.filter(s => s.demand_level === 'high').map(s => s.date))];

        this.calendarInstance = flatpickr(calendarEl, {
            inline: true,
            mode: 'single',
            dateFormat: 'Y-m-d',
            locale: 'fr',
            onDayCreate: (dObj, dStr, fp, dayElem) => {
                const dateStr = dayElem.dateObj.toISOString().split('T')[0];
                if (datesWithSlots.includes(dateStr)) {
                    dayElem.classList.add('has-slots');
                    if (highDemandDates.includes(dateStr)) {
                        dayElem.classList.add('high-demand');
                    }
                }
            },
            onChange: (selectedDates) => {
                if (selectedDates[0]) {
                    this.showSlotsForDate(selectedDates[0].toISOString().split('T')[0]);
                }
            }
        });
    },

    showSlotsForDate(date) {
        const daySlots = this.slots.filter(s => s.date === date);
        const listEl = document.getElementById('slots-list');

        if (listEl) {
            listEl.innerHTML = `
                <h4>Créneaux du ${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                ${daySlots.length > 0 ? daySlots.map(slot => `
                    <div class="slot-item ${slot.demand_level === 'high' ? 'high-demand' : ''}">
                        <div class="slot-time">
                            <strong>${slot.start_time}</strong>
                            ${slot.end_time ? ` - ${slot.end_time}` : ''}
                        </div>
                        <div class="slot-capacity">
                            ${slot.available_spots}/${slot.capacity} places
                        </div>
                        <div class="slot-actions">
                            <button class="btn-icon" onclick="ActivityManager.editSlot(${slot.id})">✏️</button>
                            <button class="btn-icon danger" onclick="ActivityManager.deleteSlot(${slot.id})">🗑️</button>
                        </div>
                    </div>
                `).join('') : '<p class="empty-state">Aucun créneau ce jour. <a href="#" onclick="ActivityManager.showAddSlotModal()">Ajouter</a></p>'}
                <button class="btn btn-primary btn-block" onclick="ActivityManager.showAddSlotModalForDate('${date}')">
                    + Ajouter un créneau
                </button>
            `;
        }
    },

    // ==========================================
    // Slot Actions
    // ==========================================
    showAddSlotModal() {
        document.getElementById('add-slot-modal').style.display = 'flex';
    },

    showAddSlotModalForDate(date) {
        const modal = document.getElementById('add-slot-modal');
        modal.querySelector('input[name="date"]').value = date;
        modal.style.display = 'flex';
    },

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },

    async handleAddSlot(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Vous devez être connecté');
            return;
        }

        try {
            const res = await fetch(`/api/listings/${this.currentListingId}/slots`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: formData.get('date'),
                    start_time: formData.get('start_time'),
                    end_time: formData.get('end_time') || null,
                    capacity: parseInt(formData.get('capacity')) || 10,
                    price_override: formData.get('price_override') ? parseFloat(formData.get('price_override')) : null,
                    demand_level: formData.get('demand_level')
                })
            });

            if (res.ok) {
                this.hideModal('add-slot-modal');
                form.reset();
                await this.loadData();
                this.render();
            } else {
                const err = await res.json();
                alert(err.error || 'Erreur lors de la création');
            }
        } catch (error) {
            console.error('Add slot error:', error);
            alert('Erreur réseau');
        }
    },

    async deleteSlot(slotId) {
        if (!confirm('Supprimer ce créneau ?')) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/listings/${this.currentListingId}/slots/${slotId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                await this.loadData();
                this.render();
            } else {
                const err = await res.json();
                alert(err.error || 'Erreur');
            }
        } catch (error) {
            console.error('Delete slot error:', error);
        }
    },

    // ==========================================
    // Languages Actions
    // ==========================================
    async handleSaveLanguages(event) {
        event.preventDefault();

        const form = event.target;
        const checkedLanguages = Array.from(form.querySelectorAll('input[name="languages"]:checked')).map(cb => parseInt(cb.value));
        const primaryLanguage = parseInt(form.querySelector('#primary-language-select').value);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/listings/${this.currentListingId}/languages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    languages: checkedLanguages,
                    primaryLanguage: primaryLanguage
                })
            });

            if (res.ok) {
                alert('Langues enregistrées !');
                await this.loadData();
            } else {
                const err = await res.json();
                alert(err.error || 'Erreur');
            }
        } catch (error) {
            console.error('Save languages error:', error);
        }
    },

    // ==========================================
    // Inclusions Actions
    // ==========================================
    addInclusion(isIncluded) {
        const listId = isIncluded ? 'included-list' : 'excluded-list';
        const list = document.getElementById(listId);
        const tempId = 'new-' + Date.now();

        const html = `
            <div class="inclusion-item" data-id="${tempId}" data-included="${isIncluded ? 1 : 0}">
                <span class="icon">${isIncluded ? '✔️' : '✗'}</span>
                <input type="text" class="inclusion-text" placeholder="Nouveau...">
                <button class="btn-icon danger" onclick="this.parentElement.remove()">🗑️</button>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    },

    removeInclusion(id) {
        const item = this.container.querySelector(`.inclusion-item[data-id="${id}"]`);
        if (item) item.remove();
    },

    async saveInclusions() {
        const items = Array.from(this.container.querySelectorAll('.inclusion-item')).map(el => ({
            item: el.querySelector('.inclusion-text').value,
            is_included: el.closest('.included') !== null,
            icon: el.querySelector('.icon').textContent
        })).filter(i => i.item.trim());

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/listings/${this.currentListingId}/inclusions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ inclusions: items })
            });

            if (res.ok) {
                alert('Éléments enregistrés !');
                await this.loadData();
            }
        } catch (error) {
            console.error('Save inclusions error:', error);
        }
    },

    // ==========================================
    // Itinerary Actions
    // ==========================================
    addItineraryStop() {
        const timeline = document.getElementById('itinerary-timeline');
        const order = timeline.children.length + 1;
        const tempId = 'new-' + Date.now();

        const html = `
            <div class="itinerary-stop" data-id="${tempId}" data-order="${order}">
                <div class="stop-marker">${order}</div>
                <div class="stop-content">
                    <input type="text" class="stop-name" placeholder="Nom de l'étape">
                    <textarea class="stop-description" placeholder="Description"></textarea>
                    <div class="stop-duration">
                        <label>Durée: </label>
                        <input type="number" class="stop-duration-input" placeholder="min"> min
                    </div>
                </div>
                <div class="stop-actions">
                    <button class="btn-icon" onclick="ActivityManager.moveStop('${tempId}', -1)">⬆️</button>
                    <button class="btn-icon" onclick="ActivityManager.moveStop('${tempId}', 1)">⬇️</button>
                    <button class="btn-icon danger" onclick="this.closest('.itinerary-stop').remove()">🗑️</button>
                </div>
            </div>
        `;
        timeline.insertAdjacentHTML('beforeend', html);
    },

    async saveItinerary() {
        const stops = Array.from(document.querySelectorAll('.itinerary-stop')).map((el, index) => ({
            name: el.querySelector('.stop-name').value,
            description: el.querySelector('.stop-description').value,
            duration_minutes: parseInt(el.querySelector('.stop-duration-input').value) || null
        })).filter(s => s.name.trim());

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/listings/${this.currentListingId}/itinerary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ stops })
            });

            if (res.ok) {
                alert('Itinéraire enregistré !');
                await this.loadData();
            }
        } catch (error) {
            console.error('Save itinerary error:', error);
        }
    },

    // ==========================================
    // Departure Cities Actions
    // ==========================================
    async loadCitiesForDeparture() {
        const res = await fetch('/api/cities');
        const cities = res.ok ? await res.json() : [];

        const select = document.getElementById('add-departure-city');
        if (select) {
            const existingIds = this.departureCities.map(d => d.city_id);
            select.innerHTML = '<option value="">Ajouter une ville...</option>' +
                cities.filter(c => !existingIds.includes(c.id))
                    .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    },

    addDepartureCity() {
        const select = document.getElementById('add-departure-city');
        const cityId = select.value;
        const cityName = select.options[select.selectedIndex].text;

        if (!cityId) return;

        const list = document.getElementById('departures-list');
        const html = `
            <div class="departure-item" data-city-id="${cityId}">
                <div class="departure-city"><strong>${cityName}</strong></div>
                <div class="departure-details">
                    <input type="text" class="pickup-point" placeholder="Point de prise en charge">
                    <input type="time" class="pickup-time">
                    <input type="number" class="extra-price" value="0" placeholder="Supplément DZD">
                </div>
                <button class="btn-icon danger" onclick="this.parentElement.remove()">🗑️</button>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', html);

        // Remove from select
        select.querySelector(`option[value="${cityId}"]`).remove();
        select.value = '';
    },

    removeDeparture(cityId) {
        const item = document.querySelector(`.departure-item[data-city-id="${cityId}"]`);
        if (item) item.remove();
    },

    async saveDepartures() {
        const departures = Array.from(document.querySelectorAll('.departure-item')).map(el => ({
            city_id: parseInt(el.dataset.cityId),
            pickup_point: el.querySelector('.pickup-point').value,
            pickup_time: el.querySelector('.pickup-time').value || null,
            extra_price: parseFloat(el.querySelector('.extra-price').value) || 0
        }));

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/listings/${this.currentListingId}/departure-cities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ departures })
            });

            if (res.ok) {
                alert('Villes de départ enregistrées !');
                await this.loadData();
            }
        } catch (error) {
            console.error('Save departures error:', error);
        }
    }
};

// Expose globally
window.ActivityManager = ActivityManager;

console.log('✅ Activity Manager loaded');

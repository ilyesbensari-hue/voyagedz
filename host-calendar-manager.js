// ==========================================
// HOST CALENDAR MANAGER - Availability & Pricing
// ==========================================

const HostCalendarManager = {
    /**
     * Block dates for a listing
     * @param {number|string} listingId
     * @param {string} fromDate - ISO date string
     * @param {string} toDate - ISO date string
     * @param {string} reason - Why dates are blocked
     */
    blockDates(listingId, fromDate, toDate, reason = 'Indisponible') {
        const blocked = {
            id: Date.now(),
            listingId,
            fromDate,
            toDate,
            reason,
            createdAt: new Date().toISOString()
        };

        const blockedDates = this.getBlockedDates(listingId);
        blockedDates.push(blocked);
        localStorage.setItem(`blocked_dates_${listingId}`, JSON.stringify(blockedDates));

        console.log(`📅 Blocked dates for listing ${listingId}:`, fromDate, 'to', toDate);
        return blocked;
    },

    /**
     * Get all blocked dates for a listing
     */
    getBlockedDates(listingId) {
        const data = localStorage.getItem(`blocked_dates_${listingId}`);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Unblock specific dates
     */
    unblockDates(listingId, blockId) {
        let blockedDates = this.getBlockedDates(listingId);
        blockedDates = blockedDates.filter(b => b.id !== blockId);
        localStorage.setItem(`blocked_dates_${listingId}`, JSON.stringify(blockedDates));

        console.log(`✅ Unblocked dates ${blockId} for listing ${listingId}`);
    },

    /**
     * Set seasonal pricing rules
     * @param {number|string} listingId
     * @param {Array} rules - [{fromDate, toDate, multiplier}]
     */
    setSeasonalPricing(listingId, rules) {
        localStorage.setItem(`seasonal_pricing_${listingId}`, JSON.stringify(rules));
        console.log(`💰 Seasonal pricing set for listing ${listingId}:`, rules);
    },

    /**
     * Get seasonal pricing for a listing
     */
    getSeasonalPricing(listingId) {
        const data = localStorage.getItem(`seasonal_pricing_${listingId}`);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Get availability for a listing in a specific month
     */
    getAvailability(listingId, month, year) {
        const bookings = this.getBookingsForListing(listingId);
        const blocked = this.getBlockedDates(listingId);

        // Get all dates in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const availability = {};

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];

            availability[dateStr] = {
                date: dateStr,
                available: true,
                reason: null,
                bookingId: null
            };

            // Check if booked
            const booking = bookings.find(b => this.isDateInRange(date, b.dateFrom, b.dateTo));
            if (booking) {
                availability[dateStr].available = false;
                availability[dateStr].reason = 'Réservé';
                availability[dateStr].bookingId = booking.id;
                continue;
            }

            // Check if blocked
            const block = blocked.find(b => this.isDateInRange(date, b.fromDate, b.toDate));
            if (block) {
                availability[dateStr].available = false;
                availability[dateStr].reason = block.reason;
                availability[dateStr].blockId = block.id;
            }
        }

        return availability;
    },

    /**
     * Check if a date is in a range
     */
    isDateInRange(date, fromStr, toStr) {
        const check = new Date(date);
        const from = new Date(fromStr);
        const to = new Date(toStr);

        check.setHours(0, 0, 0, 0);
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);

        return check >= from && check <= to;
    },

    /**
     * Get bookings for a specific listing
     */
    getBookingsForListing(listingId) {
        const allBookings = JSON.parse(localStorage.getItem('voyagedz_bookings') || '[]');
        return allBookings.filter(b => b.listingId == listingId);
    },

    /**
     * Get price for specific dates (applying seasonal pricing)
     */
    getPriceForDates(listing, fromDate, toDate) {
        const basePrice = parseInt(listing.price?.toString().replace(/[^0-9]/g, '')) || 0;
        const seasonalRules = this.getSeasonalPricing(listing.id);

        let totalPrice = 0;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const nights = Math.ceil((to - from) / (1000 * 60 * 60 * 24));

        for (let i = 0; i < nights; i++) {
            const currentDate = new Date(from);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];

            // Find applicable seasonal rule
            const rule = seasonalRules.find(r =>
                this.isDateInRange(currentDate, r.fromDate, r.toDate)
            );

            const multiplier = rule ? rule.multiplier : 1.0;
            const nightPrice = basePrice * multiplier;
            totalPrice += nightPrice;
        }

        return {
            totalPrice: Math.round(totalPrice),
            basePrice,
            nights,
            pricePerNight: Math.round(totalPrice / nights)
        };
    },

    /**
     * Initialize Flatpickr calendar for host dashboard
     */
    initHostCalendar(elementId, listingId, onDateSelect) {
        if (typeof flatpickr === 'undefined') {
            console.error('Flatpickr not loaded');
            return null;
        }

        const element = document.getElementById(elementId);
        if (!element) {
            console.error('Calendar element not found:', elementId);
            return null;
        }

        // Get current availability
        const today = new Date();
        const availability = this.getAvailability(listingId, today.getMonth(), today.getFullYear());

        // Get disabled dates
        const disabledDates = Object.keys(availability)
            .filter(dateStr => !availability[dateStr].available)
            .map(dateStr => new Date(dateStr));

        const fp = flatpickr(element, {
            mode: 'range',
            inline: true,
            minDate: 'today',
            disable: disabledDates,
            onDayCreate: (dObj, dStr, fp, dayElem) => {
                const dateStr = dayElem.dateObj.toISOString().split('T')[0];
                const info = availability[dateStr];

                if (info && !info.available) {
                    dayElem.classList.add(info.bookingId ? 'booked' : 'blocked');
                    dayElem.title = info.reason || 'Indisponible';
                }
            },
            onChange: (selectedDates) => {
                if (selectedDates.length === 2 && onDateSelect) {
                    onDateSelect(selectedDates[0], selectedDates[1]);
                }
            }
        });

        return fp;
    },

    /**
     * Get occupancy rate for a listing in a date range
     */
    getOccupancyRate(listingId, fromDate, toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const totalDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));

        const bookings = this.getBookingsForListing(listingId);
        let bookedDays = 0;

        for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(from);
            currentDate.setDate(currentDate.getDate() + i);

            const isBooked = bookings.some(b =>
                this.isDateInRange(currentDate, b.dateFrom, b.dateTo)
            );

            if (isBooked) bookedDays++;
        }

        return Math.round((bookedDays / totalDays) * 100);
    },

    /**
     * Get revenue for a listing in a date range
     */
    getRevenue(listingId, fromDate, toDate) {
        const bookings = this.getBookingsForListing(listingId);

        const relevantBookings = bookings.filter(b => {
            const checkIn = new Date(b.dateFrom);
            const from = new Date(fromDate);
            const to = new Date(toDate);

            return checkIn >= from && checkIn <= to;
        });

        const totalRevenue = relevantBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        return {
            total: totalRevenue,
            bookings: relevantBookings.length,
            average: relevantBookings.length > 0 ? totalRevenue / relevantBookings.length : 0
        };
    },

    /**
     * Get calendar events for a listing (for displaying in calendar UI)
     */
    getCalendarEvents(listingId, month, year) {
        const bookings = this.getBookingsForListing(listingId);
        const blocked = this.getBlockedDates(listingId);
        const events = [];

        // Add booking events
        bookings.forEach(booking => {
            events.push({
                type: 'booking',
                id: booking.id,
                title: `Réservation ${booking.confirmationCode || ''}`,
                start: booking.dateFrom,
                end: booking.dateTo,
                color: '#4caf50',
                details: booking
            });
        });

        // Add blocked events
        blocked.forEach(block => {
            events.push({
                type: 'blocked',
                id: block.id,
                title: block.reason,
                start: block.fromDate,
                end: block.toDate,
                color: '#f44336',
                details: block
            });
        });

        return events;
    }
};

// Expose globally
window.HostCalendarManager = HostCalendarManager;

console.log('✅ Host Calendar Manager loaded');

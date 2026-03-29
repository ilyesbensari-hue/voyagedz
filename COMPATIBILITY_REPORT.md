# Frontend-Backend Compatibility Report
**Date:** December 21, 2024
**Status:** ⚠️ Critical Mismatches Found

## 1. Summary
A static analysis of `api-client.js` (Frontend) and `server.js` (Backend) reveals that while the endpoints align, there are significant **JSON Field Naming Mismatches**. The frontend uses **camelCase** while the backend expects **snake_case**.

## 2. Critical Mismatches

### 2.1 Booking Creation (`POST /api/bookings`)
The booking flow will fail because the backend cannot read the parameters sent by the frontend.

| Field | Frontend sends (`booking-system-v2.js`) | Backend expects (`server.js`) | Status |
| :--- | :--- | :--- | :--- |
| **Listing ID** | `listingId` | `listing_id` | ❌ **FAIL** |
| **Start Date** | `dateFrom` | `date_from` | ❌ **FAIL** |
| **End Date** | `dateTo` | `date_to` | ❌ **FAIL** |
| **Payment** | `paymentMethod` | `payment_method` | ❌ **FAIL** |
| **Guests** | `guests` | `guests` | ✅ OK |

### 2.2 Host Listings (`POST /api/listings`)
Potential mismatch in Image Upload handling.
- **Frontend**: Needs to verify if `FormData` appends images as `'images'` key.
- **Backend**: Expects `upload.array('images', 5)`.

## 3. Recommended Fix
We should implement a **Mapper Layer** in `api-client.js` to translate requests and responses. This is cleaner than rewriting variables all over the application.

### Proposed Fix in `api-client.js`
Modify `bookings.create` to:
```javascript
async create(data) {
    // Map camelCase to snake_case for Backend
    const payload = {
        listing_id: data.listingId,
        date_from: data.dateFrom,
        date_to: data.dateTo,
        guests: data.guests,
        payment_method: data.paymentMethod
    };
    return fetchAPI('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}
```

## 4. Next Steps
1.  **Install Node.js** (Prerequisite).
2.  **Apply Fixes**: Update `api-client.js` with mappers.
3.  **Run Server**: Start `npm start`.
4.  **Test**: Verify the booking flow works.

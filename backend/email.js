// ==========================================
// EMAIL NOTIFICATIONS - Backend Service
// ==========================================

const nodemailer = require('nodemailer');

// Email Templates
const templates = {
    // Booking Confirmation
    bookingConfirmation: (data) => ({
        subject: `✅ Réservation confirmée - ${data.confirmationCode}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #E07B53, #1E3A5F); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .booking-details { background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .detail-row:last-child { border-bottom: none; }
                    .code { font-size: 24px; font-weight: bold; color: #E07B53; text-align: center; padding: 20px; background: #fff5f2; border-radius: 8px; }
                    .footer { background: #1E3A5F; color: white; padding: 20px; text-align: center; font-size: 14px; }
                    .btn { display: inline-block; background: #E07B53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Réservation Confirmée!</h1>
                        <p>Merci pour votre confiance</p>
                    </div>
                    <div class="content">
                        <p>Bonjour <strong>${data.userName}</strong>,</p>
                        <p>Votre réservation a été confirmée avec succès!</p>
                        
                        <div class="code">${data.confirmationCode}</div>
                        
                        <div class="booking-details">
                            <h3>📋 Détails de la réservation</h3>
                            <div class="detail-row">
                                <span>🏠 Hébergement</span>
                                <strong>${data.listingTitle}</strong>
                            </div>
                            <div class="detail-row">
                                <span>📅 Arrivée</span>
                                <strong>${data.dateFrom}</strong>
                            </div>
                            <div class="detail-row">
                                <span>📅 Départ</span>
                                <strong>${data.dateTo}</strong>
                            </div>
                            <div class="detail-row">
                                <span>👥 Voyageurs</span>
                                <strong>${data.guests} personne(s)</strong>
                            </div>
                            <div class="detail-row">
                                <span>💰 Total payé</span>
                                <strong>${data.totalPrice} DA</strong>
                            </div>
                        </div>
                        
                        <p>L'hôte vous contactera bientôt avec les instructions d'arrivée.</p>
                        
                        <center>
                            <a href="${data.appUrl}/bookings" class="btn">Voir ma réservation</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>Voyage DZ - Découvrez l'Algérie 🇩🇿</p>
                        <p>© 2024 Tous droits réservés</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    // Host New Booking Notification
    hostNewBooking: (data) => ({
        subject: `🆕 Nouvelle réservation - ${data.listingTitle}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
                    .header { background: #2EC4B6; color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .guest-info { background: #f0f9f8; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .btn { display: inline-block; background: #E07B53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎊 Nouvelle Réservation!</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour <strong>${data.hostName}</strong>,</p>
                        <p>Bonne nouvelle! Vous avez une nouvelle réservation pour <strong>${data.listingTitle}</strong>.</p>
                        
                        <div class="guest-info">
                            <h3>👤 Informations du voyageur</h3>
                            <p><strong>Nom:</strong> ${data.guestName}</p>
                            <p><strong>Email:</strong> ${data.guestEmail}</p>
                            <p><strong>Dates:</strong> ${data.dateFrom} → ${data.dateTo}</p>
                            <p><strong>Voyageurs:</strong> ${data.guests}</p>
                            <p><strong>Montant:</strong> ${data.totalPrice} DA</p>
                        </div>
                        
                        <p>Contactez le voyageur pour lui donner les instructions d'arrivée.</p>
                        
                        <center>
                            <a href="${data.appUrl}/host-dashboard" class="btn">Gérer mes réservations</a>
                        </center>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    // Booking Cancelled
    bookingCancelled: (data) => ({
        subject: `❌ Réservation annulée - ${data.confirmationCode}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
                    .header { background: #DC3545; color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Réservation Annulée</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour <strong>${data.userName}</strong>,</p>
                        <p>Votre réservation <strong>${data.confirmationCode}</strong> a été annulée.</p>
                        <p><strong>Hébergement:</strong> ${data.listingTitle}</p>
                        <p><strong>Dates:</strong> ${data.dateFrom} → ${data.dateTo}</p>
                        ${data.refundAmount ? `<p><strong>Remboursement:</strong> ${data.refundAmount} DA</p>` : ''}
                        <p>Si vous avez des questions, contactez notre support.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    // Review Request
    reviewRequest: (data) => ({
        subject: `⭐ Comment s'est passé votre séjour à ${data.listingTitle}?`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
                    .header { background: #FFB703; color: #333; padding: 30px; text-align: center; }
                    .content { padding: 30px; text-align: center; }
                    .stars { font-size: 36px; margin: 20px 0; }
                    .btn { display: inline-block; background: #E07B53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⭐ Partagez votre expérience!</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour <strong>${data.userName}</strong>,</p>
                        <p>Votre séjour à <strong>${data.listingTitle}</strong> est terminé!</p>
                        <p>Prenez un moment pour partager votre avis avec la communauté.</p>
                        <div class="stars">⭐⭐⭐⭐⭐</div>
                        <a href="${data.appUrl}/listings/${data.listingId}#reviews" class="btn">Laisser un avis</a>
                    </div>
                </div>
            </body>
            </html>
        `
    })
};

// Email Service
class EmailService {
    constructor() {
        this.transporter = null;
        this.init();
    }

    init() {
        // Configure transporter (use env variables in production)
        const config = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            }
        };

        // Only create transporter if credentials are provided
        if (config.auth.user && config.auth.pass) {
            this.transporter = nodemailer.createTransport(config);
            console.log('📧 Email service initialized');
        } else {
            console.log('⚠️ Email service disabled (no SMTP credentials)');
        }
    }

    async send(to, templateName, data) {
        if (!this.transporter) {
            console.log(`📧 [MOCK] Would send ${templateName} to ${to}`);
            return { success: true, mock: true };
        }

        const template = templates[templateName];
        if (!template) {
            throw new Error(`Template ${templateName} not found`);
        }

        const { subject, html } = template(data);

        try {
            const result = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"Voyage DZ" <noreply@voyagedz.com>',
                to,
                subject,
                html
            });

            console.log(`📧 Email sent to ${to}: ${subject}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('📧 Email error:', error);
            throw error;
        }
    }

    // Convenience methods
    async sendBookingConfirmation(booking, user, listing) {
        return this.send(user.email, 'bookingConfirmation', {
            userName: user.name,
            confirmationCode: booking.confirmation_code,
            listingTitle: listing.title,
            dateFrom: booking.date_from,
            dateTo: booking.date_to,
            guests: booking.guests,
            totalPrice: booking.total_price,
            appUrl: process.env.APP_URL || 'http://localhost:3000'
        });
    }

    async sendHostNotification(booking, guest, host, listing) {
        return this.send(host.email, 'hostNewBooking', {
            hostName: host.name,
            guestName: guest.name,
            guestEmail: guest.email,
            listingTitle: listing.title,
            dateFrom: booking.date_from,
            dateTo: booking.date_to,
            guests: booking.guests,
            totalPrice: booking.total_price,
            appUrl: process.env.APP_URL || 'http://localhost:3000'
        });
    }

    async sendCancellation(booking, user, listing) {
        return this.send(user.email, 'bookingCancelled', {
            userName: user.name,
            confirmationCode: booking.confirmation_code,
            listingTitle: listing.title,
            dateFrom: booking.date_from,
            dateTo: booking.date_to,
            refundAmount: booking.refund_amount,
            appUrl: process.env.APP_URL || 'http://localhost:3000'
        });
    }

    async sendReviewRequest(booking, user, listing) {
        return this.send(user.email, 'reviewRequest', {
            userName: user.name,
            listingTitle: listing.title,
            listingId: listing.id,
            appUrl: process.env.APP_URL || 'http://localhost:3000'
        });
    }
}

module.exports = new EmailService();

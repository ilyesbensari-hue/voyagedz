// ==========================================
// MESSAGING SYSTEM - Chat UI
// ==========================================
// NOTE: The main messaging UI (page, conversations list, chat view) is
// now handled directly in app.js (renderConversations, openChat, etc.)
// This file is kept for:
//   - MessagingSystem.startConversation() — used by listing detail pages
//   - CSS styles for the message modal
// ==========================================

const MessagingSystem = {
    conversations: [],
    currentConversation: null,
    messages: [],
    pollingInterval: null,

    // Disabled: handled by app.js updateMessagesBadge()
    async init() {
        console.log('💬 MessagingSystem: init delegated to app.js');
    },

    // ==========================================
    // Load Conversations
    // ==========================================
    async loadConversations() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                this.conversations = await res.json();
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    },

    // ==========================================
    // Update Unread Badge
    // ==========================================
    async updateBadge() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/messages/unread/count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                const badge = document.getElementById('messages-badge');

                if (badge) {
                    if (data.unread > 0) {
                        badge.textContent = data.unread > 99 ? '99+' : data.unread;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            // Silent fail
        }
    },

    // ==========================================
    // Render Inbox Page
    // ==========================================
    renderInbox(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="messaging-container">
                <div class="conversations-list" id="conversations-list">
                    <div class="conv-header">
                        <h2>💬 Messages</h2>
                    </div>
                    ${this.conversations.length > 0 ?
                this.conversations.map(c => this.renderConversationItem(c)).join('') :
                '<div class="empty-state">Aucune conversation</div>'
            }
                </div>
                <div class="chat-area" id="chat-area">
                    <div class="chat-placeholder">
                        <span>💬</span>
                        <p>Sélectionnez une conversation</p>
                    </div>
                </div>
            </div>
        `;
    },

    renderConversationItem(conv) {
        const unreadClass = conv.unread_count > 0 ? 'has-unread' : '';
        const timeAgo = this.formatTimeAgo(conv.last_message_at);

        return `
            <div class="conv-item ${unreadClass}" onclick="MessagingSystem.openConversation(${conv.id})">
                <img src="${conv.listing_image || 'https://via.placeholder.com/60'}" class="conv-image">
                <div class="conv-info">
                    <div class="conv-top">
                        <span class="conv-name">${conv.other_user_name}</span>
                        <span class="conv-time">${timeAgo}</span>
                    </div>
                    <div class="conv-listing">${conv.listing_title}</div>
                    <div class="conv-preview">${conv.last_message || 'Nouvelle conversation'}</div>
                </div>
                ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
            </div>
        `;
    },

    // ==========================================
    // Open Conversation
    // ==========================================
    async openConversation(conversationId) {
        const token = localStorage.getItem('token');
        if (!token) return;

        this.currentConversation = conversationId;

        try {
            const res = await fetch(`/api/messages/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                this.messages = await res.json();
                this.renderChat();
                this.updateBadge();

                // Mark active
                document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
                document.querySelector(`.conv-item[onclick*="${conversationId}"]`)?.classList.add('active');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    },

    // ==========================================
    // Render Chat
    // ==========================================
    renderChat() {
        const chatArea = document.getElementById('chat-area');
        if (!chatArea) return;

        const conv = this.conversations.find(c => c.id === this.currentConversation);
        const userId = JSON.parse(localStorage.getItem('voyagedz_user') || '{}').id;

        chatArea.innerHTML = `
            <div class="chat-header">
                <button class="back-btn" onclick="MessagingSystem.closeChat()">←</button>
                <img src="${conv?.listing_image || 'https://via.placeholder.com/40'}" class="chat-listing-img">
                <div class="chat-header-info">
                    <span class="chat-name">${conv?.other_user_name || 'Utilisateur'}</span>
                    <span class="chat-listing">${conv?.listing_title || ''}</span>
                </div>
            </div>
            
            <div class="messages-container" id="messages-container">
                ${this.messages.map(m => this.renderMessage(m, m.sender_id === userId)).join('')}
            </div>
            
            <div class="chat-input-area">
                <input type="text" id="message-input" placeholder="Écrire un message..." 
                       onkeypress="if(event.key==='Enter') MessagingSystem.sendMessage()">
                <button class="send-btn" onclick="MessagingSystem.sendMessage()">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        `;

        // Scroll to bottom
        const container = document.getElementById('messages-container');
        if (container) container.scrollTop = container.scrollHeight;
    },

    renderMessage(msg, isOwn) {
        return `
            <div class="message ${isOwn ? 'own' : 'other'}">
                <div class="message-bubble">
                    ${msg.content}
                    <span class="message-time">${this.formatTime(msg.created_at)}</span>
                </div>
            </div>
        `;
    },

    // ==========================================
    // Send Message
    // ==========================================
    async sendMessage() {
        const input = document.getElementById('message-input');
        const content = input?.value?.trim();

        if (!content || !this.currentConversation) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        input.value = '';

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    conversationId: this.currentConversation,
                    content
                })
            });

            if (res.ok) {
                // Add message to UI immediately
                const userId = JSON.parse(localStorage.getItem('voyagedz_user') || '{}').id;
                this.messages.push({
                    id: Date.now(),
                    sender_id: userId,
                    content,
                    created_at: new Date().toISOString()
                });
                this.renderChat();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    },

    // ==========================================
    // Start Conversation (from listing page)
    // ==========================================
    async startConversation(listingId, hostId) {
        const token = localStorage.getItem('token');
        if (!token) {
            if (window.openLoginModal) openLoginModal();
            return;
        }

        // Open modal
        const modal = document.createElement('div');
        modal.className = 'message-modal';
        modal.innerHTML = `
            <div class="message-modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="message-modal-content">
                <h3>💬 Contacter l'hôte</h3>
                <textarea id="new-message-content" rows="4" placeholder="Bonjour, je suis intéressé(e) par votre annonce..."></textarea>
                <div class="modal-buttons">
                    <button class="btn-secondary" onclick="this.closest('.message-modal').remove()">Annuler</button>
                    <button class="btn-primary" onclick="MessagingSystem.sendFirstMessage(${listingId}, ${hostId})">Envoyer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async sendFirstMessage(listingId, hostId) {
        const content = document.getElementById('new-message-content')?.value?.trim();
        if (!content) return;

        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    listingId,
                    recipientId: hostId,
                    content
                })
            });

            if (res.ok) {
                document.querySelector('.message-modal')?.remove();
                if (window.authSystem?.showNotification) {
                    authSystem.showNotification('✅ Message envoyé !', 'success');
                }
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    },

    // ==========================================
    // Utilities
    // ==========================================

    closeChat() {
        this.currentConversation = null;
        const chatArea = document.getElementById('chat-area');
        if (chatArea) {
            chatArea.innerHTML = `
                <div class="chat-placeholder">
                    <span>💬</span>
                    <p>Sélectionnez une conversation</p>
                </div>
            `;
        }
    },

    formatTimeAgo(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = (now - date) / 1000;

        if (diff < 60) return 'à l\'instant';
        if (diff < 3600) return `${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} j`;
        return date.toLocaleDateString('fr-FR');
    },

    formatTime(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    },

    startPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.updateBadge(), 30000);
    },

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
};

// Add CSS
const messagingStyles = document.createElement('style');
messagingStyles.textContent = `
    .messaging-container {
        display: flex;
        height: calc(100vh - 120px);
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        overflow: hidden;
    }
    
    .conversations-list {
        width: 350px;
        border-right: 1px solid rgba(255,255,255,0.1);
        overflow-y: auto;
    }
    
    .conv-header {
        padding: 1rem;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .conv-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.2s;
        border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    
    .conv-item:hover, .conv-item.active {
        background: rgba(255,255,255,0.05);
    }
    
    .conv-item.has-unread {
        background: rgba(224, 123, 83, 0.1);
    }
    
    .conv-image {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        object-fit: cover;
    }
    
    .conv-info {
        flex: 1;
        min-width: 0;
    }
    
    .conv-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2px;
    }
    
    .conv-name {
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .conv-time {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    
    .conv-listing {
        font-size: 0.8rem;
        color: var(--primary);
    }
    
    .conv-preview {
        font-size: 0.85rem;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .unread-badge {
        background: var(--primary);
        color: white;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 10px;
    }
    
    .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    
    .chat-placeholder {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
    }
    
    .chat-placeholder span {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    
    .chat-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        background: var(--bg-tertiary);
    }
    
    .back-btn {
        display: none;
        background: none;
        border: none;
        color: var(--text-primary);
        font-size: 1.5rem;
        cursor: pointer;
    }
    
    .chat-listing-img {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        object-fit: cover;
    }
    
    .chat-header-info {
        display: flex;
        flex-direction: column;
    }
    
    .chat-name {
        font-weight: 600;
    }
    
    .chat-listing {
        font-size: 0.8rem;
        color: var(--text-secondary);
    }
    
    .messages-container {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .message {
        display: flex;
        max-width: 70%;
    }
    
    .message.own {
        align-self: flex-end;
    }
    
    .message.other {
        align-self: flex-start;
    }
    
    .message-bubble {
        padding: 10px 14px;
        border-radius: 16px;
        position: relative;
    }
    
    .message.own .message-bubble {
        background: var(--primary);
        color: white;
        border-bottom-right-radius: 4px;
    }
    
    .message.other .message-bubble {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border-bottom-left-radius: 4px;
    }
    
    .message-time {
        display: block;
        font-size: 0.65rem;
        opacity: 0.7;
        margin-top: 4px;
        text-align: right;
    }
    
    .chat-input-area {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
        background: var(--bg-tertiary);
    }
    
    .chat-input-area input {
        flex: 1;
        padding: 12px 16px;
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.1);
        background: var(--bg-secondary);
        color: var(--text-primary);
    }
    
    .send-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--primary);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .send-btn svg {
        width: 20px;
        height: 20px;
    }
    
    .message-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .message-modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.8);
    }
    
    .message-modal-content {
        position: relative;
        background: var(--bg-secondary);
        padding: 24px;
        border-radius: 16px;
        width: 90%;
        max-width: 400px;
    }
    
    .message-modal-content h3 {
        margin-bottom: 16px;
    }
    
    .message-modal-content textarea {
        width: 100%;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        resize: none;
        margin-bottom: 16px;
    }
    
    .modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    }
    
    #messages-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: var(--error);
        color: white;
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 10px;
        display: none;
    }
    
    @media (max-width: 768px) {
        .conversations-list {
            width: 100%;
        }
        .chat-area:not(:has(.chat-placeholder)) ~ .conversations-list {
            display: none;
        }
        .back-btn {
            display: block;
        }
    }
`;
document.head.appendChild(messagingStyles);

// Expose globally
window.MessagingSystem = MessagingSystem;

console.log('✅ Messaging System loaded');

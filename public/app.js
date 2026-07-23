const API_BASE_URL = 'http://localhost:3000/api/v1';
let allTickets = [];
let currentTicket = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadTickets();
});

// Load all tickets
async function loadTickets() {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets`);
        if (!response.ok) throw new Error('Failed to fetch tickets');
        
        allTickets = await response.json();
        renderTickets(allTickets);
        updateStats(allTickets);
    } catch (error) {
        console.error('Error loading tickets:', error);
        showError('Failed to load tickets. Make sure the API is running.');
    }
}

// Render tickets list
function renderTickets(tickets) {
    const ticketsList = document.getElementById('ticketsList');
    
    if (tickets.length === 0) {
        ticketsList.innerHTML = '<div class="loading">No tickets found. Create your first ticket!</div>';
        return;
    }
    
    ticketsList.innerHTML = tickets.map(ticket => `
        <div class="ticket-card" onclick="viewTicket('${ticket.id}')">
            <div class="ticket-header">
                <div class="ticket-title">${escapeHtml(ticket.title)}</div>
                <div class="ticket-badges">
                    <span class="badge status-${ticket.status}">${formatStatus(ticket.status)}</span>
                    <span class="badge priority-${ticket.priority}">${ticket.priority.toUpperCase()}</span>
                </div>
            </div>
            <div class="ticket-meta">
                <span>ID: ${ticket.id.substring(0, 8)}</span>
                <span>Reporter: ${escapeHtml(ticket.reported_by)}</span>
                ${ticket.assignee ? `<span>Assignee: ${escapeHtml(ticket.assignee)}</span>` : ''}
                <span>${formatDate(ticket.created_at)}</span>
            </div>
        </div>
    `).join('');
}

// View ticket details
async function viewTicket(ticketId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`);
        if (!response.ok) throw new Error('Failed to fetch ticket details');
        
        currentTicket = await response.json();
        renderTicketDetail(currentTicket);
        
        document.getElementById('ticketsList').style.display = 'none';
        document.getElementById('ticketDetail').style.display = 'block';
    } catch (error) {
        console.error('Error loading ticket:', error);
        showError('Failed to load ticket details');
    }
}

// Render ticket detail view
function renderTicketDetail(ticket) {
    const detailContainer = document.getElementById('ticketDetail');
    
    detailContainer.innerHTML = `
        <div class="detail-header">
            <div>
                <h2>${escapeHtml(ticket.title)}</h2>
                <div class="ticket-badges" style="margin-top: 10px;">
                    <span class="badge status-${ticket.status}">${formatStatus(ticket.status)}</span>
                    <span class="badge priority-${ticket.priority}">${ticket.priority.toUpperCase()}</span>
                </div>
            </div>
            <div class="detail-actions">
                <button class="btn btn-secondary" onclick="backToList()">← Back</button>
                <button class="btn btn-primary" onclick="showActionMenu('${ticket.id}')">Actions</button>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Details</h3>
            <div class="info-grid">
                <div class="info-item">
                    <label>Ticket ID</label>
                    <value>${ticket.id}</value>
                </div>
                <div class="info-item">
                    <label>Status</label>
                    <value>${formatStatus(ticket.status)}</value>
                </div>
                <div class="info-item">
                    <label>Priority</label>
                    <value>${ticket.priority.toUpperCase()}</value>
                </div>
                <div class="info-item">
                    <label>Category</label>
                    <value>${ticket.category || 'N/A'}</value>
                </div>
                <div class="info-item">
                    <label>Reported By</label>
                    <value>${escapeHtml(ticket.reported_by)}</value>
                </div>
                <div class="info-item">
                    <label>Assignee</label>
                    <value>${ticket.assignee ? escapeHtml(ticket.assignee) : 'Unassigned'}</value>
                </div>
                <div class="info-item">
                    <label>Created</label>
                    <value>${formatDate(ticket.created_at)}</value>
                </div>
                <div class="info-item">
                    <label>Updated</label>
                    <value>${formatDate(ticket.updated_at)}</value>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Description</h3>
            <p>${escapeHtml(ticket.description)}</p>
        </div>
        
        <div class="detail-section comments-section">
            <h3>Comments (${ticket.comments ? ticket.comments.length : 0})</h3>
            <div id="commentsList">
                ${ticket.comments && ticket.comments.length > 0 
                    ? ticket.comments.map(comment => `
                        <div class="comment">
                            <div class="comment-header">
                                <span class="comment-author">${escapeHtml(comment.author)}</span>
                                <span class="comment-time">${formatDate(comment.created_at)}</span>
                            </div>
                            <div class="comment-text">${escapeHtml(comment.text)}</div>
                        </div>
                    `).join('')
                    : '<p style="color: #999;">No comments yet</p>'
                }
            </div>
            <button class="btn btn-primary" onclick="addComment('${ticket.id}')" style="margin-top: 15px;">Add Comment</button>
        </div>
    `;
}

// Back to tickets list
function backToList() {
    document.getElementById('ticketDetail').style.display = 'none';
    document.getElementById('ticketsList').style.display = 'block';
    currentTicket = null;
    loadTickets();
}

// Show create ticket form
function showCreateForm() {
    document.getElementById('modalTitle').textContent = 'Create New Ticket';
    document.getElementById('ticketForm').reset();
    document.getElementById('ticketModal').classList.add('show');
}

// Close modal
function closeModal() {
    document.getElementById('ticketModal').classList.remove('show');
}

// Submit ticket form
async function submitTicket(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value,
        category: document.getElementById('category').value || null,
        reported_by: document.getElementById('reportedBy').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create ticket');
        }
        
        closeModal();
        loadTickets();
        showSuccess('Ticket created successfully!');
    } catch (error) {
        console.error('Error creating ticket:', error);
        showError(error.message);
    }
}

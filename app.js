// API Configuration
// Use current origin for API calls (works in both dev and production)
const API_BASE = (() => {
    const origin = window.location.origin;
    // Safety check - should never be file:// in production
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
        console.error('Invalid origin detected:', origin);
        // In production, this should never happen, but provide a fallback
        // Return empty string so the error handler can catch it
        return '';
    }
    return origin;
})();

// Authentication
const TOKEN_KEY = 'spreaderTracker_token';
const USER_KEY = 'spreaderTracker_user';

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token, user) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
}

function getUser() {
    const userStr = sessionStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
}

// API Helper Functions
async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        // Ensure we have a valid API base
        if (!API_BASE || API_BASE.startsWith('file://')) {
            throw new Error('Invalid API base URL. Make sure you are accessing the app through a web server (not opening the file directly).');
        }
        
        const url = `${API_BASE}${endpoint}`;
        console.log('API call to:', url); // Debug log
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            // Unauthorized - clear auth and show login
            clearAuth();
            showLogin();
            throw new Error('Session expired. Please login again.');
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server error: ${text || response.statusText}`);
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API call error:', error);
        // If it's a network error, provide helpful message
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
            const isFileProtocol = window.location.protocol === 'file:';
            if (isFileProtocol) {
                throw new Error('Cannot connect to server. You are opening the file directly. Please run "vercel dev" or test on the deployed URL.');
            } else {
                throw new Error('Cannot connect to server. Make sure the API is deployed or you are running "vercel dev".');
            }
        }
        throw error;
    }
}

async function login(username, password) {
    const data = await apiCall('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    setToken(data.token, data.user);
    return data;
}

async function loadState() {
    try {
        const data = await apiCall('/api/data', {
            method: 'GET'
        });
        
        // Merge with defaults to ensure all fields exist
        state = { ...defaultState, ...data };
        
        // Ensure history is an array
        if (!Array.isArray(state.history)) {
            state.history = [];
        }
        
        return state;
    } catch (error) {
        console.error('Error loading state:', error);
        // Return defaults on error
        state = { ...defaultState };
        return state;
    }
}

async function saveState() {
    try {
        await apiCall('/api/data', {
            method: 'POST',
            body: JSON.stringify({
                topTotal: state.topTotal,
                bottomTotal: state.bottomTotal,
                topDone: state.topDone,
                bottomDone: state.bottomDone,
                intervalDays: state.intervalDays,
                installDate: state.installDate,
                lastTurnDate: state.lastTurnDate,
                lastTopTurnDate: state.lastTopTurnDate,
                lastBottomTurnDate: state.lastBottomTurnDate,
                childName: state.childName,
                logTogether: state.logTogether,
                history: state.history
            })
        });
    } catch (error) {
        console.error('Error saving state:', error);
        alert('Failed to save data: ' + error.message);
    }
}

// Default state
const defaultState = {
    topTotal: 27,
    bottomTotal: 23,
    topDone: 1,
    bottomDone: 1,
    intervalDays: 2,
    installDate: null,
    lastTurnDate: null,
    lastTopTurnDate: null,
    lastBottomTurnDate: null,
    childName: 'Child',
    logTogether: true,
    history: []
};

// Current state
let state = { ...defaultState };

// Date Utility Functions
function todayMidnight() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function formatDate(date) {
    if (!date) return 'Never';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid';
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString(undefined, options);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function isSameDay(a, b) {
    if (!a || !b) return false;
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getFullYear() === dateB.getFullYear() &&
           dateA.getMonth() === dateB.getMonth() &&
           dateA.getDate() === dateB.getDate();
}

function daysBetween(a, b) {
    if (!a || !b) return null;
    const dateA = new Date(a);
    const dateB = new Date(b);
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    const diffTime = dateB - dateA;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function dateToISOString(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

// Core Logic Functions
function canLogTurn(arch) {
    if (arch === 'both') {
        // Check if both are complete
        if (state.topDone >= state.topTotal && state.bottomDone >= state.bottomTotal) {
            return { canLog: false, reason: 'complete' };
        }
        
        // If logging together, check lastTurnDate
        if (state.logTogether) {
            if (!state.lastTurnDate) {
                return { canLog: true };
            }
            const today = todayMidnight();
            const lastTurn = new Date(state.lastTurnDate);
            lastTurn.setHours(0, 0, 0, 0);
            const daysSince = daysBetween(lastTurn, today);
            
            if (daysSince < state.intervalDays) {
                return { canLog: false, reason: 'wait', daysRemaining: state.intervalDays - daysSince };
            }
            return { canLog: true };
        } else {
            // Separate tracking - check both
            const topCan = canLogTurn('top');
            const bottomCan = canLogTurn('bottom');
            if (!topCan.canLog && !bottomCan.canLog) {
                return topCan; // Return one of the reasons
            }
            return { canLog: true };
        }
    } else {
        // Single arch check
        const isTop = arch === 'top';
        const done = isTop ? state.topDone : state.bottomDone;
        const total = isTop ? state.topTotal : state.bottomTotal;
        const lastDate = isTop ? state.lastTopTurnDate : state.lastBottomTurnDate;
        
        if (done >= total) {
            return { canLog: false, reason: 'complete' };
        }
        
        if (!lastDate) {
            return { canLog: true };
        }
        
        const today = todayMidnight();
        const lastTurn = new Date(lastDate);
        lastTurn.setHours(0, 0, 0, 0);
        const daysSince = daysBetween(lastTurn, today);
        
        if (daysSince < state.intervalDays) {
            return { canLog: false, reason: 'wait', daysRemaining: state.intervalDays - daysSince };
        }
        return { canLog: true };
    }
}

async function logTurn(arch, note) {
    const today = dateToISOString(todayMidnight());
    const historyEntry = {
        timestamp: new Date().toISOString(),
        date: today,
        note: note || null,
        topDoneAfter: state.topDone,
        bottomDoneAfter: state.bottomDone
    };
    
    if (arch === 'both' || arch === 'top') {
        if (state.topDone < state.topTotal) {
            state.topDone++;
            state.lastTopTurnDate = today;
        }
    }
    
    if (arch === 'both' || arch === 'bottom') {
        if (state.bottomDone < state.bottomTotal) {
            state.bottomDone++;
            state.lastBottomTurnDate = today;
            
            // If bottom just completed and we're logging together, switch to separate tracking
            // so the UI clearly shows only top turns can be logged
            if (state.bottomDone >= state.bottomTotal && state.logTogether && state.topDone < state.topTotal) {
                state.logTogether = false;
            }
        }
    }
    
    if (arch === 'both' || state.logTogether) {
        state.lastTurnDate = today;
    }
    
    // Update history entry with final counts
    historyEntry.topDoneAfter = state.topDone;
    historyEntry.bottomDoneAfter = state.bottomDone;
    state.history.unshift(historyEntry);
    
    // Keep only last 50 entries
    if (state.history.length > 50) {
        state.history = state.history.slice(0, 50);
    }
    
    await saveState();
}

async function undoLastLog() {
    if (state.history.length === 0) {
        return false;
    }
    
    const lastEntry = state.history[0];
    state.history.shift();
    
    // Restore previous state
    if (state.history.length > 0) {
        const prevEntry = state.history[0];
        state.topDone = prevEntry.topDoneAfter;
        state.bottomDone = prevEntry.bottomDoneAfter;
        
        // Find the most recent date for each arch
        let lastTopDate = null;
        let lastBottomDate = null;
        let lastBothDate = null;
        
        for (const entry of state.history) {
            const entryTop = entry.topDoneAfter;
            const entryBottom = entry.bottomDoneAfter;
            
            // Check if this entry represents a top turn
            const prevTop = state.history.find(e => e.date === lastTopDate);
            if (!lastTopDate || entryTop > (prevTop?.topDoneAfter || 0)) {
                lastTopDate = entry.date;
            }
            
            // Check if this entry represents a bottom turn
            const prevBottom = state.history.find(e => e.date === lastBottomDate);
            if (!lastBottomDate || entryBottom > (prevBottom?.bottomDoneAfter || 0)) {
                lastBottomDate = entry.date;
            }
            
            lastBothDate = entry.date;
        }
        
        state.lastTopTurnDate = lastTopDate;
        state.lastBottomTurnDate = lastBottomDate;
        state.lastTurnDate = lastBothDate;
    } else {
        // No history left, reset to initial state
        state.topDone = 1;
        state.bottomDone = 1;
        state.lastTurnDate = null;
        state.lastTopTurnDate = null;
        state.lastBottomTurnDate = null;
    }
    
    await saveState();
    return true;
}

async function reset() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        state = { ...defaultState };
        await saveState();
        render();
    }
}

function getNextDueDate(arch) {
    if (arch === 'both') {
        if (state.logTogether) {
            if (!state.lastTurnDate) {
                return state.installDate ? addDays(new Date(state.installDate), state.intervalDays) : null;
            }
            return addDays(new Date(state.lastTurnDate), state.intervalDays);
        } else {
            // Return the earlier of the two
            const topNext = getNextDueDate('top');
            const bottomNext = getNextDueDate('bottom');
            if (!topNext) return bottomNext;
            if (!bottomNext) return topNext;
            return topNext < bottomNext ? topNext : bottomNext;
        }
    } else {
        const isTop = arch === 'top';
        const done = isTop ? state.topDone : state.bottomDone;
        const total = isTop ? state.topTotal : state.bottomTotal;
        const lastDate = isTop ? state.lastTopTurnDate : state.lastBottomTurnDate;
        
        if (done >= total) {
            return null; // Complete
        }
        
        if (!lastDate) {
            return state.installDate ? addDays(new Date(state.installDate), state.intervalDays) : null;
        }
        
        return addDays(new Date(lastDate), state.intervalDays);
    }
}

function getStatus(arch) {
    if (arch === 'both') {
        const topStatus = getStatus('top');
        const bottomStatus = getStatus('bottom');
        
        if (topStatus === 'complete' && bottomStatus === 'complete') {
            return 'complete';
        }
        
        if (topStatus === 'complete' || bottomStatus === 'complete') {
            // One is complete, check the other
            return topStatus === 'complete' ? bottomStatus : topStatus;
        }
        
        // Check if we can log
        const canLog = canLogTurn('both');
        if (!canLog.canLog) {
            return canLog.reason === 'complete' ? 'complete' : 'wait';
        }
        return 'ready';
    } else {
        const isTop = arch === 'top';
        const done = isTop ? state.topDone : state.bottomDone;
        const total = isTop ? state.topTotal : state.bottomTotal;
        
        if (done >= total) {
            return 'complete';
        }
        
        const canLog = canLogTurn(arch);
        if (!canLog.canLog) {
            return canLog.reason;
        }
        return 'ready';
    }
}

// Login UI Functions
function showLogin() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.remove('hidden');
    document.getElementById('loginUsername').focus();
}

function hideLogin() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');
}

// UI Rendering and Event Handlers
function render() {
    // Update child name
    const childNameEl = document.getElementById('childName');
    if (childNameEl) {
        childNameEl.textContent = state.childName;
    }
    
    // Update progress cards
    document.getElementById('topDone').textContent = state.topDone;
    document.getElementById('topTotal').textContent = state.topTotal;
    document.getElementById('topRemaining').textContent = Math.max(0, state.topTotal - state.topDone);
    document.getElementById('bottomDone').textContent = state.bottomDone;
    document.getElementById('bottomTotal').textContent = state.bottomTotal;
    document.getElementById('bottomRemaining').textContent = Math.max(0, state.bottomTotal - state.bottomDone);
    
    // Update progress bars
    const topProgress = (state.topDone / state.topTotal) * 100;
    const bottomProgress = (state.bottomDone / state.bottomTotal) * 100;
    document.getElementById('topProgress').style.width = `${topProgress}%`;
    document.getElementById('bottomProgress').style.width = `${bottomProgress}%`;
    
    // Update status strip
    const lastLogged = state.history.length > 0 ? state.history[0].date : null;
    document.getElementById('lastLoggedDate').textContent = formatDate(lastLogged);
    
    const nextDue = getNextDueDate('both');
    document.getElementById('nextDueDate').textContent = formatDate(nextDue);
    
    const status = getStatus('both');
    const statusEl = document.getElementById('statusIndicator');
    statusEl.textContent = status === 'ready' ? 'Ready' : status === 'wait' ? 'Wait' : 'Complete 🎉';
    statusEl.className = 'status-badge ' + status;
    
    // Update log buttons
    const logButtonsContainer = document.getElementById('logButtons');
    const canLog = canLogTurn('both');
    const warningEl = document.getElementById('warningMessage');
    
    if (status === 'complete') {
        logButtonsContainer.innerHTML = '<button class="btn btn-primary" disabled>Complete 🎉</button>';
        warningEl.classList.add('hidden');
    } else if (state.logTogether) {
        logButtonsContainer.innerHTML = '<button id="logTurnBtn" class="btn btn-primary">Log today\'s turn</button>';
        if (!canLog.canLog && canLog.reason === 'wait') {
            warningEl.textContent = `Please wait ${canLog.daysRemaining} more day(s) before logging the next turn.`;
            warningEl.classList.remove('hidden');
        } else {
            warningEl.classList.add('hidden');
        }
    } else {
        const topCan = canLogTurn('top');
        const bottomCan = canLogTurn('bottom');
        let buttonsHTML = '';
        
        if (topCan.canLog && state.topDone < state.topTotal) {
            buttonsHTML += '<button id="logTopBtn" class="btn btn-primary">Log Top Turn</button>';
        } else if (state.topDone >= state.topTotal) {
            buttonsHTML += '<button class="btn btn-primary" disabled>Top Complete</button>';
        } else {
            buttonsHTML += `<button class="btn btn-primary" disabled>Top: Wait ${topCan.daysRemaining} day(s)</button>`;
        }
        
        if (bottomCan.canLog && state.bottomDone < state.bottomTotal) {
            buttonsHTML += '<button id="logBottomBtn" class="btn btn-primary">Log Bottom Turn</button>';
        } else if (state.bottomDone >= state.bottomTotal) {
            buttonsHTML += '<button class="btn btn-primary" disabled>Bottom Complete</button>';
        } else {
            buttonsHTML += `<button class="btn btn-primary" disabled>Bottom: Wait ${bottomCan.daysRemaining} day(s)</button>`;
        }
        
        logButtonsContainer.innerHTML = buttonsHTML;
        
        // Show warning if both are waiting
        if (!topCan.canLog && !bottomCan.canLog && topCan.reason === 'wait') {
            warningEl.textContent = `Please wait before logging the next turn.`;
            warningEl.classList.remove('hidden');
        } else {
            warningEl.classList.add('hidden');
        }
    }
    
    // Update undo button
    const undoBtn = document.getElementById('undoBtn');
    undoBtn.disabled = state.history.length === 0;
    
    // Update history
    const historyList = document.getElementById('historyList');
    if (state.history.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No turns logged yet.</p>';
    } else {
        const recentHistory = state.history.slice(0, 10);
        historyList.innerHTML = recentHistory.map(entry => {
            const noteHtml = entry.note ? `<div class="history-note">"${entry.note}"</div>` : '';
            return `
                <div class="history-item">
                    <div class="history-date">${formatDate(entry.date)}</div>
                    ${noteHtml}
                    <div class="history-counters">Top: ${entry.topDoneAfter}/${state.topTotal}, Bottom: ${entry.bottomDoneAfter}/${state.bottomTotal}</div>
                </div>
            `;
        }).join('');
    }
    
    // Re-attach event listeners for dynamically created buttons
    attachEventListeners();
}

function attachEventListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && !loginBtn.dataset.listenerAttached) {
        loginBtn.dataset.listenerAttached = 'true';
        loginBtn.onclick = async () => {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            const loadingEl = document.getElementById('loginLoading');
            
            if (!username || !password) {
                errorEl.textContent = 'Please enter username and password';
                errorEl.classList.remove('hidden');
                return;
            }
            
            errorEl.classList.add('hidden');
            loadingEl.classList.remove('hidden');
            loginBtn.disabled = true;
            
            try {
                await login(username, password);
                hideLogin();
                // Show main app content
                const container = document.querySelector('.container');
                if (container) {
                    container.style.display = '';
                }
                await loadState();
                render();
            } catch (error) {
                errorEl.textContent = error.message || 'Login failed';
                errorEl.classList.remove('hidden');
            } finally {
                loadingEl.classList.add('hidden');
                loginBtn.disabled = false;
            }
        };
    }
    
    // Log turn button(s)
    const logTurnBtn = document.getElementById('logTurnBtn');
    if (logTurnBtn && !logTurnBtn.dataset.listenerAttached) {
        logTurnBtn.dataset.listenerAttached = 'true';
        logTurnBtn.onclick = () => {
            const noteModal = document.getElementById('noteModal');
            noteModal.classList.remove('hidden');
            document.getElementById('noteInput').value = '';
        };
    }
    
    const logTopBtn = document.getElementById('logTopBtn');
    if (logTopBtn && !logTopBtn.dataset.listenerAttached) {
        logTopBtn.dataset.listenerAttached = 'true';
        logTopBtn.onclick = async () => {
            const canLog = canLogTurn('top');
            if (canLog.canLog) {
                await logTurn('top', '');
                render();
            }
        };
    }
    
    const logBottomBtn = document.getElementById('logBottomBtn');
    if (logBottomBtn && !logBottomBtn.dataset.listenerAttached) {
        logBottomBtn.dataset.listenerAttached = 'true';
        logBottomBtn.onclick = async () => {
            const canLog = canLogTurn('bottom');
            if (canLog.canLog) {
                await logTurn('bottom', '');
                render();
            }
        };
    }
    
    // Note modal buttons
    const confirmNoteBtn = document.getElementById('confirmNoteBtn');
    if (confirmNoteBtn && !confirmNoteBtn.dataset.listenerAttached) {
        confirmNoteBtn.dataset.listenerAttached = 'true';
        confirmNoteBtn.onclick = async () => {
            const note = document.getElementById('noteInput').value.trim();
            const noteModal = document.getElementById('noteModal');
            noteModal.classList.add('hidden');
            
            const canLog = canLogTurn('both');
            if (canLog.canLog) {
                await logTurn('both', note);
                render();
            }
        };
    }
    
    const cancelNoteBtn = document.getElementById('cancelNoteBtn');
    if (cancelNoteBtn && !cancelNoteBtn.dataset.listenerAttached) {
        cancelNoteBtn.dataset.listenerAttached = 'true';
        cancelNoteBtn.onclick = () => {
            document.getElementById('noteModal').classList.add('hidden');
        };
    }
    
    // Undo button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn && !undoBtn.dataset.listenerAttached) {
        undoBtn.dataset.listenerAttached = 'true';
        undoBtn.onclick = async () => {
            if (await undoLastLog()) {
                render();
            }
        };
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn && !resetBtn.dataset.listenerAttached) {
        resetBtn.dataset.listenerAttached = 'true';
        resetBtn.onclick = () => {
            const resetModal = document.getElementById('resetModal');
            resetModal.classList.remove('hidden');
        };
    }
    
    // Reset modal buttons
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    if (confirmResetBtn && !confirmResetBtn.dataset.listenerAttached) {
        confirmResetBtn.dataset.listenerAttached = 'true';
        confirmResetBtn.onclick = async () => {
            state = { ...defaultState };
            await saveState();
            render();
            document.getElementById('resetModal').classList.add('hidden');
        };
    }
    
    const cancelResetBtn = document.getElementById('cancelResetBtn');
    if (cancelResetBtn && !cancelResetBtn.dataset.listenerAttached) {
        cancelResetBtn.dataset.listenerAttached = 'true';
        cancelResetBtn.onclick = () => {
            document.getElementById('resetModal').classList.add('hidden');
        };
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn && !settingsBtn.dataset.listenerAttached) {
        settingsBtn.dataset.listenerAttached = 'true';
        settingsBtn.onclick = () => {
            const panel = document.getElementById('settingsPanel');
            panel.classList.remove('hidden');
            updateSettingsForm();
            // Setup form listeners when panel opens (only once)
            setupSettingsForm();
        };
    }
    
    // Close settings button
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn && !closeSettingsBtn.dataset.listenerAttached) {
        closeSettingsBtn.dataset.listenerAttached = 'true';
        closeSettingsBtn.onclick = () => {
            document.getElementById('settingsPanel').classList.add('hidden');
        };
    }
    
    // Child name editing
    const childNameEl = document.getElementById('childName');
    if (childNameEl && !childNameEl.dataset.listenerAttached) {
        childNameEl.dataset.listenerAttached = 'true';
        childNameEl.onblur = async () => {
            state.childName = childNameEl.textContent.trim() || 'Child';
            await saveState();
        };
    }
    
    // Settings form inputs - only setup once, not on every render
    // setupSettingsForm() is called separately when settings panel opens
}

function updateSettingsForm() {
    // Only update if inputs don't have focus (user isn't actively typing)
    const childNameInput = document.getElementById('settingsChildName');
    if (childNameInput && document.activeElement !== childNameInput) {
        childNameInput.value = state.childName;
    }
    
    const installDateInput = document.getElementById('settingsInstallDate');
    if (installDateInput && document.activeElement !== installDateInput) {
        installDateInput.value = state.installDate || '';
    }
    
    const intervalInput = document.getElementById('settingsIntervalDays');
    if (intervalInput && document.activeElement !== intervalInput) {
        intervalInput.value = state.intervalDays;
    }
    
    const topTotalInput = document.getElementById('settingsTopTotal');
    if (topTotalInput && document.activeElement !== topTotalInput) {
        topTotalInput.value = state.topTotal;
    }
    
    const bottomTotalInput = document.getElementById('settingsBottomTotal');
    if (bottomTotalInput && document.activeElement !== bottomTotalInput) {
        bottomTotalInput.value = state.bottomTotal;
    }
    
    const topDoneInput = document.getElementById('settingsTopDone');
    if (topDoneInput && document.activeElement !== topDoneInput) {
        topDoneInput.value = state.topDone;
    }
    
    const bottomDoneInput = document.getElementById('settingsBottomDone');
    if (bottomDoneInput && document.activeElement !== bottomDoneInput) {
        bottomDoneInput.value = state.bottomDone;
    }
    
    const logTogetherInput = document.getElementById('settingsLogTogether');
    if (logTogetherInput && document.activeElement !== logTogetherInput) {
        logTogetherInput.checked = state.logTogether;
    }
}

function setupSettingsForm() {
    // Child name - use onblur instead of oninput to avoid issues while typing
    const childNameInput = document.getElementById('settingsChildName');
    if (childNameInput && !childNameInput.dataset.listenerAttached) {
        childNameInput.dataset.listenerAttached = 'true';
        childNameInput.onblur = async () => {
            state.childName = childNameInput.value.trim() || 'Child';
            await saveState();
            // Don't call render() here to avoid interfering with other inputs
        };
    }
    
    // Install date
    const installDateInput = document.getElementById('settingsInstallDate');
    if (installDateInput && !installDateInput.dataset.listenerAttached) {
        installDateInput.dataset.listenerAttached = 'true';
        installDateInput.onchange = async () => {
            state.installDate = installDateInput.value || null;
            await saveState();
            render();
        };
    }
    
    // Interval days
    const intervalInput = document.getElementById('settingsIntervalDays');
    if (intervalInput && !intervalInput.dataset.listenerAttached) {
        intervalInput.dataset.listenerAttached = 'true';
        intervalInput.onchange = async () => {
            state.intervalDays = Math.max(1, parseInt(intervalInput.value) || 2);
            await saveState();
            render();
        };
    }
    
    // Totals
    const topTotalInput = document.getElementById('settingsTopTotal');
    if (topTotalInput && !topTotalInput.dataset.listenerAttached) {
        topTotalInput.dataset.listenerAttached = 'true';
        topTotalInput.onchange = async () => {
            const newTotal = Math.max(1, parseInt(topTotalInput.value) || 27);
            state.topTotal = newTotal;
            if (state.topDone > newTotal) {
                state.topDone = newTotal;
            }
            await saveState();
            render();
        };
    }
    
    const bottomTotalInput = document.getElementById('settingsBottomTotal');
    if (bottomTotalInput && !bottomTotalInput.dataset.listenerAttached) {
        bottomTotalInput.dataset.listenerAttached = 'true';
        bottomTotalInput.onchange = async () => {
            const newTotal = Math.max(1, parseInt(bottomTotalInput.value) || 23);
            state.bottomTotal = newTotal;
            if (state.bottomDone > newTotal) {
                state.bottomDone = newTotal;
            }
            await saveState();
            render();
        };
    }
    
    // Done counts
    const topDoneInput = document.getElementById('settingsTopDone');
    if (topDoneInput && !topDoneInput.dataset.listenerAttached) {
        topDoneInput.dataset.listenerAttached = 'true';
        topDoneInput.onchange = async () => {
            const newDone = Math.max(0, Math.min(parseInt(topDoneInput.value) || 1, state.topTotal));
            state.topDone = newDone;
            await saveState();
            render();
        };
    }
    
    const bottomDoneInput = document.getElementById('settingsBottomDone');
    if (bottomDoneInput && !bottomDoneInput.dataset.listenerAttached) {
        bottomDoneInput.dataset.listenerAttached = 'true';
        bottomDoneInput.onchange = async () => {
            const newDone = Math.max(0, Math.min(parseInt(bottomDoneInput.value) || 1, state.bottomTotal));
            state.bottomDone = newDone;
            await saveState();
            render();
        };
    }
    
    // Log together toggle
    const logTogetherInput = document.getElementById('settingsLogTogether');
    if (logTogetherInput && !logTogetherInput.dataset.listenerAttached) {
        logTogetherInput.dataset.listenerAttached = 'true';
        logTogetherInput.onchange = async () => {
            state.logTogether = logTogetherInput.checked;
            await saveState();
            render();
        };
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    const resetModal = document.getElementById('resetModal');
    if (resetModal && !resetModal.classList.contains('hidden')) {
        if (e.target === resetModal) {
            resetModal.classList.add('hidden');
        }
    }
    
    const noteModal = document.getElementById('noteModal');
    if (noteModal && !noteModal.classList.contains('hidden')) {
        if (e.target === noteModal) {
            noteModal.classList.add('hidden');
        }
    }
    
    const loginModal = document.getElementById('loginModal');
    if (loginModal && !loginModal.classList.contains('hidden')) {
        if (e.target === loginModal) {
            // Don't close login modal on outside click - require login
        }
    }
});

// Enter key on login form
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const loginModal = document.getElementById('loginModal');
        if (!loginModal.classList.contains('hidden')) {
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.click();
            }
        }
    }
});

// Initialize app
(async function init() {
    // Attach login button listener immediately (before checking auth)
    attachEventListeners();
    
    // Check if user is logged in
    const token = getToken();
    const user = getUser();
    
    if (!token || !user) {
        // No auth - show login and prevent access
        showLogin();
        // Hide main app content
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
        }
        return;
    }
    
    // Hide login, show app, load data, and render
    hideLogin();
    const container = document.querySelector('.container');
    if (container) {
        container.style.display = '';
    }
    try {
        await loadState();
        render();
    } catch (error) {
        console.error('Failed to load state:', error);
        // If load fails, might be auth issue - show login
        showLogin();
        if (container) {
            container.style.display = 'none';
        }
    }
})();

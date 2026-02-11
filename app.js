// API Configuration
const API_BASE = (() => {
    const origin = window.location.origin;
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
        console.error('Invalid origin detected:', origin);
        return '';
    }
    return origin;
})();

// Authentication
const TOKEN_KEY = 'expanderTracker_token';
const USER_KEY = 'expanderTracker_user';

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
        if (!API_BASE || API_BASE.startsWith('file://')) {
            throw new Error('Invalid API base URL. Make sure you are accessing the app through a web server.');
        }
        
        const url = `${API_BASE}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            clearAuth();
            showLogin();
            throw new Error('Session expired. Please login again.');
        }
        
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
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
            const isFileProtocol = window.location.protocol === 'file:';
            if (isFileProtocol) {
                throw new Error('Cannot connect to server. Please run "vercel dev" or test on the deployed URL.');
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

// State Management
const defaultState = {
    settings: {
        topTotal: 27,
        bottomTotal: 23,
        installDate: null,
        scheduleType: 'every_n_days',
        intervalDays: 2,
        childName: 'Child'
    },
    turns: [],
    treatmentNotes: [],
    counts: {
        topDone: 0,
        bottomDone: 0
    },
    lastDates: {
        top: null,
        bottom: null
    }
};

let state = { ...defaultState };

// Date Utility Functions
function todayMidnight() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function formatDate(date) {
    if (!date) return 'Never';
    
    let d;
    if (date instanceof Date) {
        d = date;
    } else if (typeof date === 'string') {
        const parts = date.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            d = new Date(year, month, day);
        } else {
            d = new Date(date);
        }
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return 'Invalid';
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString(undefined, options);
}

function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    if (typeof dateStr === 'string') {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    }
    
    return new Date(dateStr);
}

function dateToISOString(date) {
    if (!date) return null;
    const d = parseLocalDate(date);
    if (!d || isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function daysBetween(a, b) {
    if (!a || !b) return null;
    const dateA = parseLocalDate(a);
    const dateB = parseLocalDate(b);
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    const diffTime = dateB - dateA;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getWeekStart(date) {
    const d = parseLocalDate(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
    return new Date(d.setDate(diff));
}

function getTurnsThisWeek(arch) {
    const today = todayMidnight();
    const weekStart = getWeekStart(today);
    const weekEnd = addDays(weekStart, 6);
    
    return state.turns.filter(turn => {
        const turnDate = parseLocalDate(turn.date);
        return turn.arch === arch && 
               turnDate >= weekStart && 
               turnDate <= weekEnd;
    }).length;
}

// Install turn: orthodontist did first turn at install, so displayed count = logged turns + 1
const INSTALL_TURN = 1;

// Data Loading
async function loadData() {
    try {
        // Load settings, turns, and treatment notes in parallel
        const [settings, turns, treatmentNotes] = await Promise.all([
            apiCall('/api/settings', { method: 'GET' }),
            apiCall('/api/turns', { method: 'GET' }),
            apiCall('/api/treatment-notes', { method: 'GET' })
        ]);
        
        // Update state
        state.settings = { ...defaultState.settings, ...settings };
        state.turns = turns || [];
        state.treatmentNotes = treatmentNotes || [];
        
        // Calculate counts from turns (logged turns only; display adds INSTALL_TURN)
        state.counts.topDone = state.turns.filter(t => t.arch === 'top').length;
        state.counts.bottomDone = state.turns.filter(t => t.arch === 'bottom').length;
        
        // Calculate last dates from turns
        const topTurns = state.turns.filter(t => t.arch === 'top');
        const bottomTurns = state.turns.filter(t => t.arch === 'bottom');
        
        state.lastDates.top = topTurns.length > 0 
            ? topTurns.reduce((latest, turn) => {
                const turnDate = parseLocalDate(turn.date);
                const latestDate = parseLocalDate(latest);
                return turnDate > latestDate ? turn.date : latest;
            }, topTurns[0].date)
            : null;
            
        state.lastDates.bottom = bottomTurns.length > 0
            ? bottomTurns.reduce((latest, turn) => {
                const turnDate = parseLocalDate(turn.date);
                const latestDate = parseLocalDate(latest);
                return turnDate > latestDate ? turn.date : latest;
            }, bottomTurns[0].date)
            : null;
        
        return state;
    } catch (error) {
        console.error('Error loading data:', error);
        state = { ...defaultState };
        throw error;
    }
}

// Turn Operations
async function logTurn(arch, note) {
    const today = dateToISOString(todayMidnight());
    
    // Determine which turns to create
    const turnsToCreate = [];
    if (arch === 'both' || arch === 'top') {
        turnsToCreate.push({ date: today, arch: 'top', note: arch === 'both' ? note : note });
    }
    if (arch === 'both' || arch === 'bottom') {
        turnsToCreate.push({ date: today, arch: 'bottom', note: arch === 'both' ? note : note });
    }
    
    if (turnsToCreate.length === 0) {
        throw new Error('Invalid arch specified');
    }
    
    // Create turns via API
    await apiCall('/api/turns', {
        method: 'POST',
        body: JSON.stringify({ turns: turnsToCreate })
    });
    
    // Reload data to get updated counts
    await loadData();
}

async function undoTurn(turnId) {
    await apiCall(`/api/turns?id=${turnId}`, {
        method: 'DELETE'
    });
    
    // Reload data to get updated counts
    await loadData();
}

// Schedule Checking (displayed done = logged turns + install turn)
function canLogTurn(arch) {
    const isTop = arch === 'top';
    const logged = isTop ? state.counts.topDone : state.counts.bottomDone;
    const done = logged + INSTALL_TURN; // include install turn
    const total = isTop ? state.settings.topTotal : state.settings.bottomTotal;
    const lastDate = isTop ? state.lastDates.top : state.lastDates.bottom;
    
    // Check if complete
    if (done >= total) {
        return { canLog: false, reason: 'complete' };
    }
    
    // Check schedule
    if (state.settings.scheduleType === 'twice_per_week') {
        const turnsThisWeek = getTurnsThisWeek(arch);
        if (turnsThisWeek >= 2) {
            return { canLog: false, reason: 'wait', message: 'Already logged 2 turns this week' };
        }
        return { canLog: true };
    } else {
        // every_n_days schedule
        if (!lastDate) {
            return { canLog: true };
        }
        
        const today = todayMidnight();
        const lastTurn = parseLocalDate(lastDate);
        lastTurn.setHours(0, 0, 0, 0);
        const daysSince = daysBetween(lastTurn, today);
        
        if (daysSince < state.settings.intervalDays) {
            return { 
                canLog: false, 
                reason: 'wait', 
                daysRemaining: state.settings.intervalDays - daysSince 
            };
        }
        return { canLog: true };
    }
}

function getNextDueDate(arch) {
    const isTop = arch === 'top';
    const logged = isTop ? state.counts.topDone : state.counts.bottomDone;
    const done = logged + INSTALL_TURN;
    const total = isTop ? state.settings.topTotal : state.settings.bottomTotal;
    const lastDate = isTop ? state.lastDates.top : state.lastDates.bottom;
    
    if (done >= total) {
        return null; // Complete
    }
    
    if (state.settings.scheduleType === 'twice_per_week') {
        const turnsThisWeek = getTurnsThisWeek(arch);
        if (turnsThisWeek < 2) {
            // Can still turn this week
            return todayMidnight();
        } else {
            // Next turn is next week
            const today = todayMidnight();
            const weekStart = getWeekStart(today);
            const nextWeekStart = addDays(weekStart, 7);
            return nextWeekStart;
        }
    } else {
        // every_n_days schedule
        if (!lastDate) {
            return state.settings.installDate 
                ? addDays(parseLocalDate(state.settings.installDate), state.settings.intervalDays)
                : null;
        }
        return addDays(parseLocalDate(lastDate), state.settings.intervalDays);
    }
}

function getStatus(arch) {
    const isTop = arch === 'top';
    const done = (isTop ? state.counts.topDone : state.counts.bottomDone) + INSTALL_TURN;
    const total = isTop ? state.settings.topTotal : state.settings.bottomTotal;
    
    if (done >= total) {
        return 'complete';
    }
    
    const canLog = canLogTurn(arch);
    if (!canLog.canLog) {
        return canLog.reason;
    }
    return 'ready';
}

// Treatment Notes Operations
async function createTreatmentNote(date, note) {
    await apiCall('/api/treatment-notes', {
        method: 'POST',
        body: JSON.stringify({ date, note })
    });
    
    await loadData();
}

async function updateTreatmentNote(id, date, note) {
    await apiCall('/api/treatment-notes', {
        method: 'PUT',
        body: JSON.stringify({ id, date, note })
    });
    
    await loadData();
}

async function deleteTreatmentNote(id) {
    await apiCall(`/api/treatment-notes?id=${id}`, {
        method: 'DELETE'
    });
    
    await loadData();
}

// Settings Operations
async function saveSettings() {
    await apiCall('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(state.settings)
    });
}

// UI Rendering
function render() {
    // Update child name
    const childNameEl = document.getElementById('childName');
    if (childNameEl) {
        childNameEl.textContent = state.settings.childName;
    }
    
    // Update progress cards (display = logged + install turn)
    const topDoneDisplay = state.counts.topDone + INSTALL_TURN;
    const bottomDoneDisplay = state.counts.bottomDone + INSTALL_TURN;
    
    document.getElementById('topDone').textContent = topDoneDisplay;
    document.getElementById('topTotal').textContent = state.settings.topTotal;
    document.getElementById('topRemaining').textContent = Math.max(0, state.settings.topTotal - topDoneDisplay);
    const topPercentage = state.settings.topTotal > 0 
        ? Math.round((topDoneDisplay / state.settings.topTotal) * 100) 
        : 0;
    document.getElementById('topPercentage').textContent = `${topPercentage}%`;
    document.getElementById('topProgress').style.width = `${topPercentage}%`;
    
    document.getElementById('bottomDone').textContent = bottomDoneDisplay;
    document.getElementById('bottomTotal').textContent = state.settings.bottomTotal;
    document.getElementById('bottomRemaining').textContent = Math.max(0, state.settings.bottomTotal - bottomDoneDisplay);
    const bottomPercentage = state.settings.bottomTotal > 0 
        ? Math.round((bottomDoneDisplay / state.settings.bottomTotal) * 100) 
        : 0;
    document.getElementById('bottomPercentage').textContent = `${bottomPercentage}%`;
    document.getElementById('bottomProgress').style.width = `${bottomPercentage}%`;
    
    // Update status strip
    const topStatus = getStatus('top');
    const bottomStatus = getStatus('bottom');
    const lastLogged = state.lastDates.top && state.lastDates.bottom
        ? (parseLocalDate(state.lastDates.top) > parseLocalDate(state.lastDates.bottom) 
            ? state.lastDates.top 
            : state.lastDates.bottom)
        : (state.lastDates.top || state.lastDates.bottom);
    
    document.getElementById('lastLoggedDate').textContent = formatDate(lastLogged);
    
    const topNext = getNextDueDate('top');
    const bottomNext = getNextDueDate('bottom');
    let nextDue = topNext && bottomNext
        ? (topNext < bottomNext ? topNext : bottomNext)
        : (topNext || bottomNext);
    // If next due is today or in the past, show "Today" so we never show a date before last logged
    const today = todayMidnight();
    if (nextDue) {
        const nextDueDay = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
        if (nextDueDay.getTime() <= today.getTime()) {
            nextDue = today;
        }
    }
    document.getElementById('nextDueDate').textContent = nextDue ? formatDate(nextDue) : '-';
    
    // Show schedule hint so it's clear Next due uses the interval from settings
    const scheduleHint = document.getElementById('nextDueScheduleHint');
    if (scheduleHint) {
        if (state.settings.scheduleType === 'twice_per_week') {
            scheduleHint.textContent = 'twice per week';
        } else {
            const n = state.settings.intervalDays;
            scheduleHint.textContent = n === 1 ? 'every day' : `every ${n} days`;
        }
    }
    
    const overallStatus = topStatus === 'complete' && bottomStatus === 'complete' 
        ? 'complete'
        : (topStatus === 'ready' || bottomStatus === 'ready' ? 'ready' : 'wait');
    const statusEl = document.getElementById('statusIndicator');
    statusEl.textContent = overallStatus.toUpperCase();
    statusEl.className = `status-badge ${overallStatus}`;
    
    // Update log buttons: always show tandem when both can log, and always show individual options
    const logButtonsContainer = document.getElementById('logButtons');
    const topCan = canLogTurn('top');
    const bottomCan = canLogTurn('bottom');
    const bothCanLog = topCan.canLog && bottomCan.canLog;
    const topComplete = topStatus === 'complete';
    const bottomComplete = bottomStatus === 'complete';
    
    let buttonsHTML = '';
    
    if (topComplete && bottomComplete) {
        buttonsHTML += '<button class="btn btn-primary" disabled>All Complete!</button>';
    } else {
        // Primary: Log both when both are due (tandem preferred)
        if (bothCanLog) {
            buttonsHTML += '<button id="logTurnBtn" class="btn btn-primary">Log Today\'s Turn</button>';
        }
        
        // Individual options: Log Top and Log Bottom (enabled when due, disabled with reason when not)
        if (!topComplete) {
            if (topCan.canLog) {
                const cls = bothCanLog ? 'btn btn-secondary' : 'btn btn-primary';
                buttonsHTML += `<button id="logTopBtn" class="${cls}">Log Top Only</button>`;
            } else {
                const waitMsg = topCan.reason === 'wait' && topCan.daysRemaining != null
                    ? `Top: Wait ${topCan.daysRemaining} day(s)`
                    : 'Top: Not due yet';
                buttonsHTML += `<button class="btn btn-secondary" disabled>${waitMsg}</button>`;
            }
        }
        if (!bottomComplete) {
            if (bottomCan.canLog) {
                const cls = bothCanLog ? 'btn btn-secondary' : 'btn btn-primary';
                buttonsHTML += `<button id="logBottomBtn" class="${cls}">Log Bottom Only</button>`;
            } else {
                const waitMsg = bottomCan.reason === 'wait' && bottomCan.daysRemaining != null
                    ? `Bottom: Wait ${bottomCan.daysRemaining} day(s)`
                    : 'Bottom: Not due yet';
                buttonsHTML += `<button class="btn btn-secondary" disabled>${waitMsg}</button>`;
            }
        }
    }
    
    logButtonsContainer.innerHTML = buttonsHTML;
    
    // Update undo button
    const undoBtn = document.getElementById('undoBtn');
    undoBtn.disabled = state.turns.length === 0;
    
    // Update history
    const historyList = document.getElementById('historyList');
    if (state.turns.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No turns logged yet.</p>';
    } else {
        // Group turns by date
        const turnsByDate = {};
        state.turns.forEach(turn => {
            if (!turnsByDate[turn.date]) {
                turnsByDate[turn.date] = [];
            }
            turnsByDate[turn.date].push(turn);
        });
        
        const sortedDates = Object.keys(turnsByDate).sort((a, b) => {
            return parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
        });
        
        historyList.innerHTML = sortedDates.slice(0, 20).map(date => {
            const dateTurns = turnsByDate[date];
            const topTurn = dateTurns.find(t => t.arch === 'top');
            const bottomTurn = dateTurns.find(t => t.arch === 'bottom');
            const note = topTurn?.note || bottomTurn?.note;
            
            const noteHtml = note ? `<div class="history-note">"${note}"</div>` : '';
            const topHtml = topTurn 
                ? `<div class="history-turn-item">
                    <span>Top</span>
                    <button class="btn-icon btn-undo-turn" data-turn-id="${topTurn.id}" title="Undo top turn">↩️</button>
                   </div>`
                : '';
            const bottomHtml = bottomTurn
                ? `<div class="history-turn-item">
                    <span>Bottom</span>
                    <button class="btn-icon btn-undo-turn" data-turn-id="${bottomTurn.id}" title="Undo bottom turn">↩️</button>
                   </div>`
                : '';
            
            return `
                <div class="history-item">
                    <div class="history-item-content">
                        <div class="history-date">${formatDate(date)}</div>
                        ${noteHtml}
                        <div class="history-turns">${topHtml}${bottomHtml}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update treatment notes
    const treatmentNotesList = document.getElementById('treatmentNotesList');
    if (state.treatmentNotes.length === 0) {
        treatmentNotesList.innerHTML = '<p class="empty-state">No treatment notes yet.</p>';
    } else {
        treatmentNotesList.innerHTML = state.treatmentNotes.slice(0, 20).map(note => {
            return `
                <div class="treatment-note-item">
                    <div class="treatment-note-content">
                        <div class="treatment-note-date">${formatDate(note.date)}</div>
                        <div class="treatment-note-text">${note.note}</div>
                    </div>
                    <div class="treatment-note-actions">
                        <button class="btn-icon btn-edit-note" data-note-id="${note.id}" title="Edit note">✏️</button>
                        <button class="btn-icon btn-delete-note" data-note-id="${note.id}" title="Delete note">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Re-attach event listeners
    attachEventListeners();
}

// Event Listeners
function attachEventListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && !loginBtn.dataset.listenerAttached) {
        loginBtn.dataset.listenerAttached = 'true';
        loginBtn.onclick = async () => {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            const loadingEl = document.getElementById('loginLoading');
            
            if (!username || !password) {
                errorEl.textContent = 'Please enter username and password';
                errorEl.classList.remove('hidden');
                return;
            }
            
            loginBtn.disabled = true;
            loadingEl.classList.remove('hidden');
            errorEl.classList.add('hidden');
            
            try {
                await login(username, password);
                hideLogin();
                document.querySelector('.container').style.display = '';
                await loadData();
                render();
            } catch (error) {
                errorEl.textContent = error.message || 'Login failed';
                errorEl.classList.remove('hidden');
            } finally {
                loginBtn.disabled = false;
                loadingEl.classList.add('hidden');
            }
        };
    }
    
    // Log turn buttons
    const logTurnBtn = document.getElementById('logTurnBtn');
    if (logTurnBtn && !logTurnBtn.dataset.listenerAttached) {
        logTurnBtn.dataset.listenerAttached = 'true';
        logTurnBtn.onclick = () => {
            const noteModal = document.getElementById('noteModal');
            noteModal.dataset.arch = 'both';
            noteModal.classList.remove('hidden');
        };
    }
    
    const logTopBtn = document.getElementById('logTopBtn');
    if (logTopBtn && !logTopBtn.dataset.listenerAttached) {
        logTopBtn.dataset.listenerAttached = 'true';
        logTopBtn.onclick = () => {
            const noteModal = document.getElementById('noteModal');
            noteModal.dataset.arch = 'top';
            noteModal.classList.remove('hidden');
        };
    }
    
    const logBottomBtn = document.getElementById('logBottomBtn');
    if (logBottomBtn && !logBottomBtn.dataset.listenerAttached) {
        logBottomBtn.dataset.listenerAttached = 'true';
        logBottomBtn.onclick = () => {
            const noteModal = document.getElementById('noteModal');
            noteModal.dataset.arch = 'bottom';
            noteModal.classList.remove('hidden');
        };
    }
    
    // Note modal
    const confirmNoteBtn = document.getElementById('confirmNoteBtn');
    if (confirmNoteBtn && !confirmNoteBtn.dataset.listenerAttached) {
        confirmNoteBtn.dataset.listenerAttached = 'true';
        confirmNoteBtn.onclick = async () => {
            const noteModal = document.getElementById('noteModal');
            const noteInput = document.getElementById('noteInput');
            const arch = noteModal.dataset.arch || 'both';
            const note = noteInput.value.trim() || null;
            
            noteInput.value = '';
            noteModal.classList.add('hidden');
            
            try {
                await logTurn(arch, note);
                render();
            } catch (error) {
                alert('Failed to log turn: ' + error.message);
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
    
    // Undo turn buttons
    document.querySelectorAll('.btn-undo-turn').forEach(btn => {
        if (!btn.dataset.listenerAttached) {
            btn.dataset.listenerAttached = 'true';
            btn.onclick = async () => {
                const turnId = btn.dataset.turnId;
                if (confirm('Are you sure you want to undo this turn?')) {
                    try {
                        await undoTurn(turnId);
                        render();
                    } catch (error) {
                        alert('Failed to undo turn: ' + error.message);
                    }
                }
            };
        }
    });
    
    // Undo last button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn && !undoBtn.dataset.listenerAttached) {
        undoBtn.dataset.listenerAttached = 'true';
        undoBtn.onclick = async () => {
            if (state.turns.length === 0) return;
            
            // Get most recent turn
            const mostRecent = state.turns[0];
            if (confirm('Are you sure you want to undo the most recent turn?')) {
                try {
                    await undoTurn(mostRecent.id);
                    render();
                } catch (error) {
                    alert('Failed to undo turn: ' + error.message);
                }
            }
        };
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn && !resetBtn.dataset.listenerAttached) {
        resetBtn.dataset.listenerAttached = 'true';
        resetBtn.onclick = () => {
            document.getElementById('resetModal').classList.remove('hidden');
        };
    }
    
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    if (confirmResetBtn && !confirmResetBtn.dataset.listenerAttached) {
        confirmResetBtn.dataset.listenerAttached = 'true';
        confirmResetBtn.onclick = async () => {
            // Delete all turns
            for (const turn of state.turns) {
                try {
                    await apiCall(`/api/turns?id=${turn.id}`, { method: 'DELETE' });
                } catch (error) {
                    console.error('Error deleting turn:', error);
                }
            }
            
            await loadData();
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
            setupSettingsForm();
        };
    }
    
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
            state.settings.childName = childNameEl.textContent.trim() || 'Child';
            await saveSettings();
        };
    }
    
    // Treatment notes
    const addTreatmentNoteBtn = document.getElementById('addTreatmentNoteBtn');
    if (addTreatmentNoteBtn && !addTreatmentNoteBtn.dataset.listenerAttached) {
        addTreatmentNoteBtn.dataset.listenerAttached = 'true';
        addTreatmentNoteBtn.onclick = () => {
            const modal = document.getElementById('treatmentNoteModal');
            modal.dataset.noteId = '';
            document.getElementById('treatmentNoteDateInput').value = dateToISOString(todayMidnight());
            document.getElementById('treatmentNoteTextInput').value = '';
            modal.classList.remove('hidden');
        };
    }
    
    const saveTreatmentNoteBtn = document.getElementById('saveTreatmentNoteBtn');
    if (saveTreatmentNoteBtn && !saveTreatmentNoteBtn.dataset.listenerAttached) {
        saveTreatmentNoteBtn.dataset.listenerAttached = 'true';
        saveTreatmentNoteBtn.onclick = async () => {
            const modal = document.getElementById('treatmentNoteModal');
            const noteId = modal.dataset.noteId;
            const date = document.getElementById('treatmentNoteDateInput').value;
            const note = document.getElementById('treatmentNoteTextInput').value.trim();
            
            if (!date || !note) {
                alert('Please enter both date and note');
                return;
            }
            
            try {
                if (noteId) {
                    await updateTreatmentNote(noteId, date, note);
                } else {
                    await createTreatmentNote(date, note);
                }
                modal.classList.add('hidden');
                render();
            } catch (error) {
                alert('Failed to save treatment note: ' + error.message);
            }
        };
    }
    
    const cancelTreatmentNoteBtn = document.getElementById('cancelTreatmentNoteBtn');
    if (cancelTreatmentNoteBtn && !cancelTreatmentNoteBtn.dataset.listenerAttached) {
        cancelTreatmentNoteBtn.dataset.listenerAttached = 'true';
        cancelTreatmentNoteBtn.onclick = () => {
            document.getElementById('treatmentNoteModal').classList.add('hidden');
        };
    }
    
    document.querySelectorAll('.btn-edit-note').forEach(btn => {
        if (!btn.dataset.listenerAttached) {
            btn.dataset.listenerAttached = 'true';
            btn.onclick = () => {
                const noteId = btn.dataset.noteId;
                const note = state.treatmentNotes.find(n => n.id === noteId);
                if (note) {
                    const modal = document.getElementById('treatmentNoteModal');
                    modal.dataset.noteId = noteId;
                    document.getElementById('treatmentNoteDateInput').value = note.date;
                    document.getElementById('treatmentNoteTextInput').value = note.note;
                    modal.classList.remove('hidden');
                }
            };
        }
    });
    
    document.querySelectorAll('.btn-delete-note').forEach(btn => {
        if (!btn.dataset.listenerAttached) {
            btn.dataset.listenerAttached = 'true';
            btn.onclick = async () => {
                const noteId = btn.dataset.noteId;
                if (confirm('Are you sure you want to delete this treatment note?')) {
                    try {
                        await deleteTreatmentNote(noteId);
                        render();
                    } catch (error) {
                        alert('Failed to delete treatment note: ' + error.message);
                    }
                }
            };
        }
    });
}

function updateSettingsForm() {
    const childNameInput = document.getElementById('settingsChildName');
    if (childNameInput && document.activeElement !== childNameInput) {
        childNameInput.value = state.settings.childName;
    }
    
    const installDateInput = document.getElementById('settingsInstallDate');
    if (installDateInput && document.activeElement !== installDateInput) {
        installDateInput.value = state.settings.installDate || '';
    }
    
    const scheduleTypeInputs = document.querySelectorAll('input[name="scheduleType"]');
    scheduleTypeInputs.forEach(input => {
        if (input.value === state.settings.scheduleType) {
            input.checked = true;
        }
    });
    
    const intervalInput = document.getElementById('settingsIntervalDays');
    if (intervalInput && document.activeElement !== intervalInput) {
        intervalInput.value = state.settings.intervalDays;
        intervalInput.style.display = state.settings.scheduleType === 'twice_per_week' ? 'none' : 'block';
    }
    
    const topTotalInput = document.getElementById('settingsTopTotal');
    if (topTotalInput && document.activeElement !== topTotalInput) {
        topTotalInput.value = state.settings.topTotal;
    }
    
    const bottomTotalInput = document.getElementById('settingsBottomTotal');
    if (bottomTotalInput && document.activeElement !== bottomTotalInput) {
        bottomTotalInput.value = state.settings.bottomTotal;
    }
}

function setupSettingsForm() {
    const childNameInput = document.getElementById('settingsChildName');
    if (childNameInput && !childNameInput.dataset.listenerAttached) {
        childNameInput.dataset.listenerAttached = 'true';
        childNameInput.onblur = async () => {
            state.settings.childName = childNameInput.value.trim() || 'Child';
            await saveSettings();
        };
    }
    
    const installDateInput = document.getElementById('settingsInstallDate');
    if (installDateInput && !installDateInput.dataset.listenerAttached) {
        installDateInput.dataset.listenerAttached = 'true';
        installDateInput.onchange = async () => {
            state.settings.installDate = installDateInput.value || null;
            await saveSettings();
            render();
        };
    }
    
    const scheduleTypeInputs = document.querySelectorAll('input[name="scheduleType"]');
    scheduleTypeInputs.forEach(input => {
        if (!input.dataset.listenerAttached) {
            input.dataset.listenerAttached = 'true';
            input.onchange = async () => {
                state.settings.scheduleType = input.value;
                await saveSettings();
                updateSettingsForm();
                render();
            };
        }
    });
    
    const intervalInput = document.getElementById('settingsIntervalDays');
    if (intervalInput && !intervalInput.dataset.listenerAttached) {
        intervalInput.dataset.listenerAttached = 'true';
        intervalInput.onchange = async () => {
            state.settings.intervalDays = Math.max(1, parseInt(intervalInput.value) || 2);
            await saveSettings();
            render();
        };
    }
    
    const topTotalInput = document.getElementById('settingsTopTotal');
    if (topTotalInput && !topTotalInput.dataset.listenerAttached) {
        topTotalInput.dataset.listenerAttached = 'true';
        topTotalInput.onchange = async () => {
            state.settings.topTotal = Math.max(1, parseInt(topTotalInput.value) || 27);
            await saveSettings();
            render();
        };
    }
    
    const bottomTotalInput = document.getElementById('settingsBottomTotal');
    if (bottomTotalInput && !bottomTotalInput.dataset.listenerAttached) {
        bottomTotalInput.dataset.listenerAttached = 'true';
        bottomTotalInput.onchange = async () => {
            state.settings.bottomTotal = Math.max(1, parseInt(bottomTotalInput.value) || 23);
            await saveSettings();
            render();
        };
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    ['resetModal', 'noteModal', 'treatmentNoteModal', 'settingsPanel'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && !modal.classList.contains('hidden')) {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        }
    });
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
    attachEventListeners();
    
    const token = getToken();
    const user = getUser();
    
    if (!token || !user) {
        showLogin();
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
        }
        return;
    }
    
    hideLogin();
    const container = document.querySelector('.container');
    if (container) {
        container.style.display = '';
    }
    try {
        await loadData();
        render();
    } catch (error) {
        console.error('Failed to load data:', error);
        showLogin();
        if (container) {
            container.style.display = 'none';
        }
    }
})();

// Login UI Functions
function showLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.remove('hidden');
        document.getElementById('loginUsername').focus();
    }
}

function hideLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.add('hidden');
        document.getElementById('loginError').classList.add('hidden');
    }
}

// State Management
const STORAGE_KEY = 'spreaderTracker:v1';

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

// Load state from localStorage
function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle missing fields
            state = { ...defaultState, ...parsed };
            // Ensure history is an array
            if (!Array.isArray(state.history)) {
                state.history = [];
            }
        } else {
            state = { ...defaultState };
        }
    } catch (error) {
        console.error('Error loading state:', error);
        state = { ...defaultState };
    }
    return state;
}

// Save state to localStorage
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving state:', error);
        alert('Failed to save data. Please check browser storage settings.');
    }
}

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

function logTurn(arch, note) {
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
    
    saveState();
}

function undoLastLog() {
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
            const entryDate = new Date(entry.date);
            const entryTop = entry.topDoneAfter;
            const entryBottom = entry.bottomDoneAfter;
            
            // Check if this entry represents a top turn
            if (entryTop > (lastTopDate ? state.history.find(e => e.date === lastTopDate)?.topDoneAfter || 0 : 0)) {
                lastTopDate = entry.date;
            }
            
            // Check if this entry represents a bottom turn
            if (entryBottom > (lastBottomDate ? state.history.find(e => e.date === lastBottomDate)?.bottomDoneAfter || 0 : 0)) {
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
    
    saveState();
    return true;
}

function reset() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        state = { ...defaultState };
        saveState();
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
    // Log turn button(s)
    const logTurnBtn = document.getElementById('logTurnBtn');
    if (logTurnBtn) {
        logTurnBtn.onclick = () => {
            const noteModal = document.getElementById('noteModal');
            noteModal.classList.remove('hidden');
            document.getElementById('noteInput').value = '';
        };
    }
    
    const logTopBtn = document.getElementById('logTopBtn');
    if (logTopBtn) {
        logTopBtn.onclick = () => {
            const canLog = canLogTurn('top');
            if (canLog.canLog) {
                logTurn('top', '');
                render();
            }
        };
    }
    
    const logBottomBtn = document.getElementById('logBottomBtn');
    if (logBottomBtn) {
        logBottomBtn.onclick = () => {
            const canLog = canLogTurn('bottom');
            if (canLog.canLog) {
                logTurn('bottom', '');
                render();
            }
        };
    }
    
    // Note modal buttons
    const confirmNoteBtn = document.getElementById('confirmNoteBtn');
    if (confirmNoteBtn) {
        confirmNoteBtn.onclick = () => {
            const note = document.getElementById('noteInput').value.trim();
            const noteModal = document.getElementById('noteModal');
            noteModal.classList.add('hidden');
            
            const canLog = canLogTurn('both');
            if (canLog.canLog) {
                logTurn('both', note);
                render();
            }
        };
    }
    
    const cancelNoteBtn = document.getElementById('cancelNoteBtn');
    if (cancelNoteBtn) {
        cancelNoteBtn.onclick = () => {
            document.getElementById('noteModal').classList.add('hidden');
        };
    }
    
    // Undo button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn && !undoBtn.onclick) {
        undoBtn.onclick = () => {
            if (undoLastLog()) {
                render();
            }
        };
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn && !resetBtn.onclick) {
        resetBtn.onclick = () => {
            const resetModal = document.getElementById('resetModal');
            resetModal.classList.remove('hidden');
        };
    }
    
    // Reset modal buttons
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    if (confirmResetBtn && !confirmResetBtn.onclick) {
        confirmResetBtn.onclick = () => {
            state = { ...defaultState };
            saveState();
            render();
            document.getElementById('resetModal').classList.add('hidden');
        };
    }
    
    const cancelResetBtn = document.getElementById('cancelResetBtn');
    if (cancelResetBtn && !cancelResetBtn.onclick) {
        cancelResetBtn.onclick = () => {
            document.getElementById('resetModal').classList.add('hidden');
        };
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn && !settingsBtn.onclick) {
        settingsBtn.onclick = () => {
            const panel = document.getElementById('settingsPanel');
            panel.classList.remove('hidden');
            updateSettingsForm();
        };
    }
    
    // Close settings button
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn && !closeSettingsBtn.onclick) {
        closeSettingsBtn.onclick = () => {
            document.getElementById('settingsPanel').classList.add('hidden');
        };
    }
    
    // Child name editing
    const childNameEl = document.getElementById('childName');
    if (childNameEl) {
        childNameEl.onblur = () => {
            state.childName = childNameEl.textContent.trim() || 'Child';
            saveState();
        };
    }
    
    // Settings form inputs
    setupSettingsForm();
}

function updateSettingsForm() {
    document.getElementById('settingsChildName').value = state.childName;
    document.getElementById('settingsInstallDate').value = state.installDate || '';
    document.getElementById('settingsIntervalDays').value = state.intervalDays;
    document.getElementById('settingsTopTotal').value = state.topTotal;
    document.getElementById('settingsBottomTotal').value = state.bottomTotal;
    document.getElementById('settingsTopDone').value = state.topDone;
    document.getElementById('settingsBottomDone').value = state.bottomDone;
    document.getElementById('settingsLogTogether').checked = state.logTogether;
}

function setupSettingsForm() {
    const form = document.querySelector('.settings-content');
    if (!form) return;
    
    // Remove existing listeners by cloning
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Child name
    const childNameInput = document.getElementById('settingsChildName');
    if (childNameInput) {
        childNameInput.oninput = () => {
            state.childName = childNameInput.value.trim() || 'Child';
            saveState();
            render();
        };
    }
    
    // Install date
    const installDateInput = document.getElementById('settingsInstallDate');
    if (installDateInput) {
        installDateInput.onchange = () => {
            state.installDate = installDateInput.value || null;
            saveState();
            render();
        };
    }
    
    // Interval days
    const intervalInput = document.getElementById('settingsIntervalDays');
    if (intervalInput) {
        intervalInput.onchange = () => {
            state.intervalDays = Math.max(1, parseInt(intervalInput.value) || 2);
            saveState();
            render();
        };
    }
    
    // Totals
    const topTotalInput = document.getElementById('settingsTopTotal');
    if (topTotalInput) {
        topTotalInput.onchange = () => {
            const newTotal = Math.max(1, parseInt(topTotalInput.value) || 27);
            state.topTotal = newTotal;
            if (state.topDone > newTotal) {
                state.topDone = newTotal;
            }
            saveState();
            render();
        };
    }
    
    const bottomTotalInput = document.getElementById('settingsBottomTotal');
    if (bottomTotalInput) {
        bottomTotalInput.onchange = () => {
            const newTotal = Math.max(1, parseInt(bottomTotalInput.value) || 23);
            state.bottomTotal = newTotal;
            if (state.bottomDone > newTotal) {
                state.bottomDone = newTotal;
            }
            saveState();
            render();
        };
    }
    
    // Done counts
    const topDoneInput = document.getElementById('settingsTopDone');
    if (topDoneInput) {
        topDoneInput.onchange = () => {
            const newDone = Math.max(0, Math.min(parseInt(topDoneInput.value) || 1, state.topTotal));
            state.topDone = newDone;
            saveState();
            render();
        };
    }
    
    const bottomDoneInput = document.getElementById('settingsBottomDone');
    if (bottomDoneInput) {
        bottomDoneInput.onchange = () => {
            const newDone = Math.max(0, Math.min(parseInt(bottomDoneInput.value) || 1, state.bottomTotal));
            state.bottomDone = newDone;
            saveState();
            render();
        };
    }
    
    // Log together toggle
    const logTogetherInput = document.getElementById('settingsLogTogether');
    if (logTogetherInput) {
        logTogetherInput.onchange = () => {
            state.logTogether = logTogetherInput.checked;
            saveState();
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
});

// Initialize app
loadState();
render();

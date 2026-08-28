// Attendance Tracker - Main Application Logic

// State variables
let appState = null;
let settings = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let timerInterval = null;
let dbInitialized = false;
let liveUpdateInterval = null;

// 31 motivational quotes (one for each day) - kept to 2-3 lines
const MOTIVATIONAL_QUOTES = [
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "The only way to do great work is to love what you do.",
    "Believe you can and you're halfway there.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future depends on what you do today.",
    "It always seems impossible until it's done.",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Success doesn't just find you. You have to go out and get it.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Dream bigger. Do bigger.",
    "Don't stop when you're tired. Stop when you're done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Little things make big days.",
    "It's going to be hard, but hard does not mean impossible.",
    "Don't wait for opportunity. Create it.",
    "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
    "The key to success is to start before you are ready.",
    "You don't have to be great to start, but you have to start to be great.",
    "A little progress each day adds up to big results.",
    "Motivation is what gets you started. Habit is what keeps you going.",
    "Don't limit your challenges. Challenge your limits.",
    "The only person you should try to be better than is who you were yesterday.",
    "Every accomplishment starts with the decision to try.",
    "Opportunities don't happen, you create them.",
    "Your only limit is your mind.",
    "If it was easy, everybody would do it.",
    "Work hard in silence, let success make the noise."
];

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize database storage
    dbInitialized = await Storage.init();
    
    if (!dbInitialized) {
        console.warn('Database initialization failed, using fallback mode');
    }
    
    appState = await Storage.getData();
    settings = await Storage.getSettings();
    
    // Check if punch-in is from a previous day - reset if so
    checkNewDayReset();
    
    // Update greeting with user name
    document.getElementById('greeting').textContent = `Hey ${settings.name}`;
    
    // Display daily quote
    displayDailyQuote();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial render
    renderUI();
    
    // Start timer if punched in
    if (appState.punchIn) {
        startTimer();
        startLiveUpdates();
    }
});

async function checkNewDayReset() {
    const todayKey = Utils.formatDateKey(new Date());
    const lastPunchIn = appState.punchIn;
    
    if (lastPunchIn) {
        const punchInDate = new Date(lastPunchIn).toDateString();
        const today = new Date().toDateString();
        
        // If punch-in was on a different day, clear it
        if (punchInDate !== today) {
            appState.punchIn = null;
            await Storage.saveData(appState);
        }
    }
}

function displayDailyQuote() {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const quote = Utils.getDailyQuote(dayOfMonth, MOTIVATIONAL_QUOTES);
    document.getElementById('dailyQuote').textContent = quote;
}

function setupEventListeners() {
    const punchBtn = document.getElementById('punchBtn');
    if (punchBtn) punchBtn.addEventListener('click', handlePunch);
    
    const punchOutBtn = document.getElementById('punchOutBtn');
    if (punchOutBtn) punchOutBtn.addEventListener('click', handlePunch);
    
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', handleSaveSettings);
    
    const cancelSettingsBtn = document.getElementById('cancelSettings');
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeModal);
    
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', openModal);
    
    const prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    
    const nextMonthBtn = document.getElementById('nextMonth');
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeMonth(1));
    
    const saveEditBtn = document.getElementById('saveEditBtn');
    if (saveEditBtn) saveEditBtn.addEventListener('click', handleEditTime);
    
    // Edit attendance button delegation
    document.getElementById('attendanceList').addEventListener('click', handleEditAttendanceClick);
}

async function handlePunch() {
    const now = new Date().toISOString();
    const todayKey = Utils.formatDateKey(new Date());
    
    if (!appState.punchIn) {
        // Punch In
        appState.punchIn = now;
        await Storage.saveData(appState);
        showToast(`Punched In at ${Utils.formatTime12(now)}`, 'success');
        startTimer();
        startLiveUpdates();
    } else {
        // Punch Out
        if (!appState.records[todayKey]) {
            appState.records[todayKey] = {};
        }
        
        appState.records[todayKey].in = appState.punchIn;
        appState.records[todayKey].out = now;
        appState.punchIn = null;
        
        await Storage.saveData(appState);
        showToast(`Punched Out at ${Utils.formatTime12(now)}`, 'success');
        stopLiveUpdates();
    }
    
    renderUI();
}

async function handleEditTime() {
    const timeInput = document.getElementById('editTimeInput');
    const timeValue = timeInput.value;
    
    if (!timeValue || !appState.punchIn) return;
    
    const today = new Date();
    const [hours, minutes] = timeValue.split(':');
    const newPunchIn = new Date(today);
    newPunchIn.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    appState.punchIn = newPunchIn.toISOString();
    await Storage.saveData(appState);
    renderUI();
    startLiveUpdates();
    showToast('Start time updated', 'success');
}

// Handle edit attendance button click
async function handleEditAttendanceClick(e) {
    const editBtn = e.target.closest('.edit-att-btn');
    if (!editBtn) return;
    
    const dateStr = editBtn.getAttribute('data-date');
    if (!dateStr) return;
    
    openEditAttendanceModal(dateStr);
}

// Open edit attendance modal
async function openEditAttendanceModal(dateStr) {
    const record = appState.records[dateStr];
    const isToday = dateStr === Utils.formatDateKey(new Date());
    const isPunchedIn = isToday && appState.punchIn !== null;
    
    // Create or reuse edit modal
    let modal = document.getElementById('editAttendanceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editAttendanceModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
            <div class="modal">
                <h3>Edit Attendance</h3>
                <div class="edit-date-info" style="margin-bottom: 16px; font-size: 14px; color: var(--text-gray);"></div>
                
                <div class="edit-type-selector">
                    <label style="display: block; font-size: 13px; color: var(--text-gray); margin-bottom: 8px;">Day Type</label>
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="edit-type-btn active" data-type="working">Working Day</button>
                        <button type="button" class="edit-type-btn" data-type="leave">Leave</button>
                        <button type="button" class="edit-type-btn" data-type="holiday">Holiday</button>
                    </div>
                </div>
                
                <div id="workingDayFields">
                    <label>Punch In Time</label>
                    <input type="time" id="editPunchInTime">
                    <label>Punch Out Time</label>
                    <input type="time" id="editPunchOutTime">
                </div>
                
                <div id="leaveHolidayFields" class="hidden" style="padding: 20px 0; text-align: center; color: var(--text-gray);">
                    <p>Marked as <span class="edit-type-label">Leave</span></p>
                </div>
                
                <div class="modal-actions">
                    <button id="cancelEditAttendance">Cancel</button>
                    <button id="saveEditAttendance">Save Changes</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Setup event listeners for the modal
        document.getElementById('cancelEditAttendance').addEventListener('click', closeEditAttendanceModal);
        
        // Type selector buttons
        modal.querySelectorAll('.edit-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.edit-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const type = e.target.getAttribute('data-type');
                const workingFields = document.getElementById('workingDayFields');
                const leaveHolidayFields = document.getElementById('leaveHolidayFields');
                const typeLabel = leaveHolidayFields.querySelector('.edit-type-label');
                
                if (type === 'working') {
                    workingFields.classList.remove('hidden');
                    leaveHolidayFields.classList.add('hidden');
                } else {
                    workingFields.classList.add('hidden');
                    leaveHolidayFields.classList.remove('hidden');
                    typeLabel.textContent = type === 'leave' ? 'Leave' : 'Holiday';
                }
            });
        });
        
        document.getElementById('saveEditAttendance').addEventListener('click', saveEditedAttendance);
    }
    
    // Populate modal with existing data
    const dateInfo = modal.querySelector('.edit-date-info');
    const dateObj = new Date(dateStr);
    dateInfo.textContent = `${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
    
    const punchInInput = document.getElementById('editPunchInTime');
    const punchOutInput = document.getElementById('editPunchOutTime');
    
    // Determine current type and times
    let currentType = 'working';
    if (record) {
        if (record.type === 'leave') {
            currentType = 'leave';
        } else if (record.type === 'holiday') {
            currentType = 'holiday';
        }
    }
    
    // Set type buttons
    modal.querySelectorAll('.edit-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === currentType);
    });
    
    // Show/hide fields based on type
    const workingFields = document.getElementById('workingDayFields');
    const leaveHolidayFields = document.getElementById('leaveHolidayFields');
    const typeLabel = leaveHolidayFields.querySelector('.edit-type-label');
    
    if (currentType === 'working') {
        workingFields.classList.remove('hidden');
        leaveHolidayFields.classList.add('hidden');
    } else {
        workingFields.classList.add('hidden');
        leaveHolidayFields.classList.remove('hidden');
        typeLabel.textContent = currentType === 'leave' ? 'Leave' : 'Holiday';
    }
    
    // Set time values if available
    if (record && record.in) {
        punchInInput.value = new Date(record.in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).slice(0, 5);
    } else {
        punchInInput.value = '09:00';
    }
    
    if (record && record.out) {
        punchOutInput.value = new Date(record.out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).slice(0, 5);
    } else {
        punchOutInput.value = '18:00';
    }
    
    // Store the date being edited
    modal.dataset.editDate = dateStr;
    modal.dataset.editType = currentType;
    
    // Show modal
    modal.classList.remove('hidden');
}

function closeEditAttendanceModal() {
    const modal = document.getElementById('editAttendanceModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function saveEditedAttendance() {
    const modal = document.getElementById('editAttendanceModal');
    if (!modal) return;
    
    const dateStr = modal.dataset.editDate;
    const selectedType = modal.querySelector('.edit-type-btn.active')?.getAttribute('data-type') || 'working';
    
    const punchInInput = document.getElementById('editPunchInTime');
    const punchOutInput = document.getElementById('editPunchOutTime');
    
    const today = new Date(dateStr);
    
    let newRecord = { type: selectedType };
    
    if (selectedType === 'working') {
        const [inHours, inMinutes] = punchInInput.value.split(':').map(Number);
        const [outHours, outMinutes] = punchOutInput.value.split(':').map(Number);
        
        const punchIn = new Date(today);
        punchIn.setHours(inHours, inMinutes, 0, 0);
        
        const punchOut = new Date(today);
        punchOut.setHours(outHours, outMinutes, 0, 0);
        
        newRecord.in = punchIn.toISOString();
        newRecord.out = punchOut.toISOString();
    } else {
        // For leave/holiday, clear in/out times
        newRecord.in = null;
        newRecord.out = null;
    }
    
    // Update the record
    appState.records[dateStr] = newRecord;
    await Storage.saveData(appState);
    
    closeEditAttendanceModal();
    renderUI();
    showToast('Attendance updated', 'success');
}

function startLiveUpdates() {
    if (liveUpdateInterval) clearInterval(liveUpdateInterval);
    
    liveUpdateInterval = setInterval(() => {
        updateTimerDisplay();
        updateChart();
        updateCurrentDayInList();
    }, 1000);
}

function stopLiveUpdates() {
    if (liveUpdateInterval) {
        clearInterval(liveUpdateInterval);
        liveUpdateInterval = null;
    }
}

function updateCurrentDayInList() {
    const todayKey = Utils.formatDateKey(new Date());
    const listContainer = document.getElementById('attendanceList');
    const todayItem = listContainer.querySelector('.attendance-item.today');
    
    if (!todayItem || !appState.punchIn) return;
    
    // Calculate current duration
    const duration = Utils.calculateDuration(appState.punchIn, new Date());
    const hours = String(duration.hours).padStart(2, '0');
    const minutes = String(duration.minutes).padStart(2, '0');
    
    // Update the hours display
    const hoursEl = todayItem.querySelector('.att-hours');
    if (hoursEl) {
        hoursEl.textContent = `${hours}:${minutes}`;
        hoursEl.className = 'att-hours'; // Reset classes
        
        const targetMinutes = (settings.targetHours || 8.5) * 60;
        if (duration.totalMinutes >= targetMinutes) {
            hoursEl.classList.add('green');
        } else if (duration.totalMinutes > 480 && duration.totalMinutes < targetMinutes) {
            hoursEl.classList.add('yellow');
        } else {
            hoursEl.classList.add('red');
        }
    }
    
    // Update the times display
    const timesEl = todayItem.querySelector('.att-times');
    if (timesEl && appState.punchIn) {
        // Calculate expected logout time
        const targetMinutes = (settings.targetHours || 8.5) * 60;
        const punchIn = new Date(appState.punchIn);
        const expectedLogout = new Date(punchIn.getTime() + targetMinutes * 60 * 1000);
        const expectedLogoutStr = Utils.formatTime12(expectedLogout.toISOString());
        
        // Check if target reached
        const displayLogout = duration.totalMinutes >= targetMinutes 
            ? 'Target Reached!' 
            : Utils.formatTime12(expectedLogout.toISOString());
        
        timesEl.innerHTML = `Login: ${Utils.formatTime12(appState.punchIn)} | Expected Logout: ${displayLogout}`;
    }
}

async function handleSaveSettings() {
    const usernameInput = document.getElementById('usernameInput');
    const targetHoursInput = document.getElementById('targetHoursInput');
    const username = usernameInput.value.trim();
    const targetHours = parseFloat(targetHoursInput.value);
    
    if (username && username.length > 0) {
        settings.name = username;
    }
    
    if (targetHours && targetHours > 0 && targetHours <= 24) {
        settings.targetHours = targetHours;
    }
    
    await Storage.saveSettings(settings);
    closeModal();
    renderUI();
    // If currently punched in, restart live updates to reflect new target
    if (appState.punchIn) {
        startLiveUpdates();
    }
    showToast('Settings saved', 'success');
}

function openModal() {
    const modal = document.getElementById('settingsModal');
    const usernameInput = document.getElementById('usernameInput');
    const targetHoursInput = document.getElementById('targetHoursInput');
    
    if (modal && usernameInput && targetHoursInput) {
        usernameInput.value = settings.name || 'User';
        targetHoursInput.value = settings.targetHours || 8;
        modal.classList.remove('hidden');
    }
}

function closeModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    updateMonthInfo();
    renderAttendanceList();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        updateTimerDisplay();
        updateChart();
    }, 1000);
}

function updateTimerDisplay() {
    if (!appState.punchIn) {
        document.getElementById('timerDisplay').textContent = '00:00';
        return;
    }
    
    const duration = Utils.calculateDuration(appState.punchIn, new Date());
    const hours = String(duration.hours).padStart(2, '0');
    const minutes = String(duration.minutes).padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${hours}:${minutes}`;
}

function renderUI() {
    // Update greeting
    document.getElementById('greeting').textContent = `Hey ${settings.name}`;
    
    // Update punch button states
    const punchBtn = document.getElementById('punchBtn');
    const punchOutBtn = document.getElementById('punchOutBtn');
    const punchStatus = document.getElementById('punchStatus');
    const editSection = document.getElementById('editPunchSection');
    const expectedLogoutSection = document.getElementById('expectedLogoutSection');
    
    if (appState.punchIn) {
        punchBtn.classList.add('hidden');
        punchOutBtn.classList.remove('hidden');
        // Show punch in time alongside status
        const punchInTime = Utils.formatTime12(appState.punchIn);
        punchStatus.innerHTML = `Punched In<br><span style="font-size: 12px; font-weight: 400; opacity: 0.8;">${punchInTime}</span>`;
        punchStatus.className = 'status-badge';
        editSection.classList.remove('hidden');
        expectedLogoutSection.classList.remove('hidden');
        startTimer();
        startLiveUpdates();
    } else {
        punchBtn.classList.remove('hidden');
        punchOutBtn.classList.add('hidden');
        punchStatus.textContent = 'Punched Out';
        punchStatus.className = 'status-badge out';
        editSection.classList.add('hidden');
        expectedLogoutSection.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
        stopLiveUpdates();
    }
    
    // Update chart
    updateChart();
    
    // Update month info
    updateMonthInfo();
    
    // Render attendance list
    renderAttendanceList();
}

function updateChart() {
    const todayKey = Utils.formatDateKey(new Date());
    const todayRecord = appState.records[todayKey];
    
    let percentage = 0;
    let color = '#B4FE61';
    
    // Use settings target hours for calculation
    const targetHours = settings.targetHours || 8.5;
    const targetMinutes = targetHours * 60;
    
    if (appState.punchIn) {
        // Currently punched in - calculate from punch-in time
        const duration = Utils.calculateDuration(appState.punchIn, new Date());
        percentage = (duration.totalMinutes / targetMinutes) * 100;
        
        // Calculate and display expected logout time
        updateExpectedLogoutTime(appState.punchIn, targetMinutes);
    } else if (todayRecord && todayRecord.in) {
        // Already punched out today - use recorded duration
        const duration = Utils.calculateDuration(todayRecord.in, todayRecord.out);
        percentage = (duration.totalMinutes / targetMinutes) * 100;
    }
    
    // Cap percentage at 100 for visual display
    const displayPercentage = Math.min(percentage, 100);
    
    ChartRenderer.draw('doughnutChart', displayPercentage, color);
}

function updateExpectedLogoutTime(punchInTime, targetMinutes) {
    const punchIn = new Date(punchInTime);
    const expectedLogout = new Date(punchIn.getTime() + targetMinutes * 60 * 1000);
    const expectedLogoutStr = Utils.formatTime12(expectedLogout.toISOString());
    
    const expectedLogoutEl = document.getElementById('expectedLogoutTime');
    const expectedLogoutSection = document.getElementById('expectedLogoutSection');
    
    if (expectedLogoutEl && expectedLogoutSection) {
        expectedLogoutEl.textContent = expectedLogoutStr;
        
        // Check if target has been reached
        const now = new Date();
        const duration = Utils.calculateDuration(punchInTime, now);
        if (duration.totalMinutes >= targetMinutes) {
            expectedLogoutEl.textContent = 'Target Reached!';
            expectedLogoutEl.classList.add('target-reached');
        } else {
            expectedLogoutEl.classList.remove('target-reached');
        }
    }
}

function updateMonthInfo() {
    document.getElementById('monthTitle').textContent = Utils.getMonthName(currentMonth);
    
    // Calculate monthly average
    const daysInMonth = Utils.getDaysInMonth(currentYear, currentMonth);
    const today = new Date();
    const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
    
    let totalMinutes = 0;
    let daysWithRecords = 0;
    
    for (let day = 1; day <= maxDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateKey = Utils.formatDateKey(date);
        
        if (appState.records[dateKey] && appState.records[dateKey].in && appState.records[dateKey].out) {
            const duration = Utils.calculateDuration(appState.records[dateKey].in, appState.records[dateKey].out);
            totalMinutes += duration.totalMinutes;
            daysWithRecords++;
        }
    }
    
    const avgMinutes = daysWithRecords > 0 ? Math.round(totalMinutes / daysWithRecords) : 0;
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    
    const avgValueEl = document.getElementById('avgValue');
    avgValueEl.textContent = Utils.formatDuration(avgHours, avgMins);
    
    // Apply color based on average
    avgValueEl.classList.remove('green', 'yellow', 'red');
    const targetMinutes = (settings.targetHours || 8) * 60;
    
    if (avgMinutes >= targetMinutes) {
        avgValueEl.classList.add('green');
    } else if (avgMinutes > 480) {
        avgValueEl.classList.add('yellow');
    } else {
        avgValueEl.classList.add('red');
    }
}

function renderAttendanceList() {
    const listContainer = document.getElementById('attendanceList');
    listContainer.innerHTML = '';
    
    const daysInMonth = Utils.getDaysInMonth(currentYear, currentMonth);
    const today = new Date();
    const todayKey = Utils.formatDateKey(today);
    const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
    
    // Collect weekdays and weekends separately
    const weekdayEntries = [];
    const weekendEntries = [];
    
    for (let day = 1; day <= maxDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateKey = Utils.formatDateKey(date);
        const isToday = dateKey === todayKey;
        const isWeekend = Utils.isWeekend(dateKey);
        const record = appState.records[dateKey];
        
        // Only include days that have attendance records OR are today
        const hasRecord = record && (record.in || record.out);
        
        if (isCurrentMonth && day > today.getDate()) {
            // Skip future dates in current month
            continue;
        }
        
        if (isWeekend) {
            if (hasRecord || isToday) {
                weekendEntries.push({ dateKey, record, isToday, date });
            }
        } else {
            if (hasRecord || isToday) {
                weekdayEntries.push({ dateKey, record, isToday, date });
            }
        }
    }
    
    // Render weekdays first
    weekdayEntries.forEach(entry => {
        listContainer.appendChild(AttendanceRow.create(entry.dateKey, entry.record, entry.isToday, settings.targetHours, appState.punchIn));
    });
    
    // Add weekend separator if there are weekend entries
    if (weekendEntries.length > 0) {
        listContainer.appendChild(AttendanceRow.createWeekendSeparator());
        
        // Render weekend entries
        weekendEntries.forEach(entry => {
            listContainer.appendChild(AttendanceRow.create(entry.dateKey, entry.record, entry.isToday, settings.targetHours, appState.punchIn));
        });
    }
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

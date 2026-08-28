// Attendance Tracker - Main Application Logic

// State variables
let appState = null;
let settings = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let timerInterval = null;

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

document.addEventListener('DOMContentLoaded', () => {
    appState = Storage.getData();
    settings = Storage.getSettings();
    
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
    }
});

function checkNewDayReset() {
    const todayKey = Utils.formatDateKey(new Date());
    const lastPunchIn = appState.punchIn;
    
    if (lastPunchIn) {
        const punchInDate = new Date(lastPunchIn).toDateString();
        const today = new Date().toDateString();
        
        // If punch-in was on a different day, clear it
        if (punchInDate !== today) {
            appState.punchIn = null;
            Storage.saveData(appState);
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
}

function handlePunch() {
    const now = new Date().toISOString();
    const todayKey = Utils.formatDateKey(new Date());
    
    if (!appState.punchIn) {
        // Punch In
        appState.punchIn = now;
        showToast(`Punched In at ${Utils.formatTime12(now)}`, 'success');
    } else {
        // Punch Out
        if (!appState.records[todayKey]) {
            appState.records[todayKey] = {};
        }
        
        appState.records[todayKey].in = appState.punchIn;
        appState.records[todayKey].out = now;
        appState.punchIn = null;
        
        showToast(`Punched Out at ${Utils.formatTime12(now)}`, 'success');
    }
    
    Storage.saveData(appState);
    renderUI();
}

function handleEditTime() {
    const timeInput = document.getElementById('editTimeInput');
    const timeValue = timeInput.value;
    
    if (!timeValue || !appState.punchIn) return;
    
    const today = new Date();
    const [hours, minutes] = timeValue.split(':');
    const newPunchIn = new Date(today);
    newPunchIn.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    appState.punchIn = newPunchIn.toISOString();
    Storage.saveData(appState);
    renderUI();
    showToast('Start time updated', 'success');
}

function handleSaveSettings() {
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
    
    Storage.saveSettings(settings);
    closeModal();
    renderUI();
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
    const settings = Storage.getSettings();
    
    // Update greeting
    document.getElementById('greeting').textContent = `Hey ${settings.name}`;
    
    // Update punch button states
    const punchBtn = document.getElementById('punchBtn');
    const punchOutBtn = document.getElementById('punchOutBtn');
    const punchStatus = document.getElementById('punchStatus');
    const editSection = document.getElementById('editPunchSection');
    
    if (appState.punchIn) {
        punchBtn.classList.add('hidden');
        punchOutBtn.classList.remove('hidden');
        punchStatus.textContent = 'Punched In';
        punchStatus.className = 'status-badge';
        editSection.classList.remove('hidden');
        startTimer();
    } else {
        punchBtn.classList.remove('hidden');
        punchOutBtn.classList.add('hidden');
        punchStatus.textContent = 'Punched Out';
        punchStatus.className = 'status-badge out';
        editSection.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
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
    
    // Target is 8 hours 30 minutes = 510 minutes
    const targetMinutes = 510;
    
    if (appState.punchIn) {
        // Currently punched in - calculate from punch-in time
        const duration = Utils.calculateDuration(appState.punchIn, new Date());
        percentage = (duration.totalMinutes / targetMinutes) * 100;
    } else if (todayRecord && todayRecord.in) {
        // Already punched out today - use recorded duration
        const duration = Utils.calculateDuration(todayRecord.in, todayRecord.out);
        percentage = (duration.totalMinutes / targetMinutes) * 100;
    }
    
    // Cap percentage at 100 for visual display
    const displayPercentage = Math.min(percentage, 100);
    
    ChartRenderer.draw('doughnutChart', displayPercentage, color);
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
        listContainer.appendChild(AttendanceRow.create(entry.dateKey, entry.record, entry.isToday, settings.targetHours));
    });
    
    // Add weekend separator if there are weekend entries
    if (weekendEntries.length > 0) {
        listContainer.appendChild(AttendanceRow.createWeekendSeparator());
        
        // Render weekend entries
        weekendEntries.forEach(entry => {
            listContainer.appendChild(AttendanceRow.create(entry.dateKey, entry.record, entry.isToday, settings.targetHours));
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

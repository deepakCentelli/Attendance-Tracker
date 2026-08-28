// AttendanceRow Component - Reference Implementation
const AttendanceRow = {
    create(dateStr, record, isToday, targetHours, punchInTime) {
        const dateObj = new Date(dateStr);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const dateBadge = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const isWeekend = Utils.isWeekend(dateStr);
        
        const div = document.createElement('div');
        div.className = `attendance-item${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}`;
        
        const inTime = record ? record.in : null;
        const outTime = record ? record.out : null;
        const duration = Utils.calculateDuration(inTime, outTime);
        
        // Build times HTML
        let timesHtml = '';
        if (inTime && outTime) {
            timesHtml = `Login: ${Utils.formatTime12(inTime)} | Logout: ${Utils.formatTime12(outTime)}`;
        } else if (inTime && !outTime) {
            // Currently punched in - show expected logout
            const targetMinutes = (targetHours || 8.5) * 60;
            const punchIn = new Date(inTime);
            const expectedLogout = new Date(punchIn.getTime() + targetMinutes * 60 * 1000);
            const expectedLogoutStr = Utils.formatTime12(expectedLogout.toISOString());
            timesHtml = `Login: ${Utils.formatTime12(inTime)} | Expected: ${expectedLogoutStr}`;
        } else {
            timesHtml = '<span class="no-attendance">No attendance</span>';
        }
        
        // Determine duration color class
        let hoursClass = '';
        let hoursDisplay = '--';
        let minsDisplay = '--';
        const targetMinutes = (targetHours || 8) * 60;
        
        if (duration.totalMinutes > 0) {
            hoursDisplay = duration.hours;
            minsDisplay = String(duration.minutes).padStart(2, '0');
            
            if (duration.totalMinutes >= targetMinutes) {
                hoursClass = 'green';
            } else if (duration.totalMinutes > 480 && duration.totalMinutes < targetMinutes) {
                // Between 8 hours and target - yellow
                hoursClass = 'yellow';
            } else {
                // Below 8 hours - red
                hoursClass = 'red';
            }
        } else {
            // No duration - show dashes
            hoursDisplay = '--';
            minsDisplay = '--';
        }
        
        // Edit button HTML
        const editButtonHtml = `<button class="edit-att-btn" data-date="${dateStr}" aria-label="Edit attendance">✏️</button>`;
        
        div.innerHTML = `
            <div class="att-left">
                <span class="att-date-badge">${dateBadge}</span>
                <span class="att-day-name">${dayName}</span>
                <span class="att-times">${timesHtml}</span>
            </div>
            <div class="att-divider"></div>
            <div class="att-right">
                <span class="att-hours ${hoursClass}">${hoursDisplay}:${minsDisplay}</span>
                <span class="att-hrs-label">hrs</span>
                ${editButtonHtml}
            </div>
        `;
        
        return div;
    },
    
    createWeekendSeparator() {
        const div = document.createElement('div');
        div.className = 'weekend-separator';
        div.innerHTML = '<span class="weekend-label">Weekends</span>';
        return div;
    }
};

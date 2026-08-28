const Utils = {
    // Format ISO time to 12-hour format (e.g., "9:24 AM")
    formatTime12(isoString) {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    },
    
    // Format ISO time to 24-hour format
    formatTime(isoString) {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    },
    
    // Calculate duration between two timestamps
    calculateDuration(startISO, endISO) {
        if (!startISO) return { hours: 0, minutes: 0, totalMinutes: 0 };
        
        const start = new Date(startISO);
        const end = endISO ? new Date(endISO) : new Date();
        
        const diffMs = end - start;
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return { hours, minutes, totalMinutes };
    },
    
    // Get number of days in a month
    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    },
    
    // Check if a date is weekend (Saturday or Sunday)
    isWeekend(dateStr) {
        const date = new Date(dateStr);
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    },
    
    // Format date as YYYY-MM-DD key for storage
    formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    // Get day name from date string
    getDayName(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    },
    
    // Get full month name from month index
    getMonthName(monthIndex) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[monthIndex] || '';
    },
    
    // Format duration as H:MM
    formatDuration(hours, minutes) {
        return `${hours}:${String(minutes).padStart(2, '0')}`;
    },
    
    // Get quote for a specific day (deterministic based on day of month)
    getDailyQuote(dayOfMonth, quotes) {
        if (!quotes || quotes.length === 0) return '';
        // Use day of month (1-31) to select quote, cycling if needed
        const index = (dayOfMonth - 1) % quotes.length;
        return quotes[index];
    }
};

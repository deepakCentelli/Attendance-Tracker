const Storage = {
    KEYS: { DATA: 'att_data', SETTINGS: 'att_settings' },
    
    getData() {
        return JSON.parse(localStorage.getItem(this.KEYS.DATA)) || { records: {}, punchIn: null };
    },
    
    saveData(data) {
        localStorage.setItem(this.KEYS.DATA, JSON.stringify(data));
    },
    
    getSettings() {
        return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || { targetHours: 8, name: 'User' };
    },
    
    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    }
};

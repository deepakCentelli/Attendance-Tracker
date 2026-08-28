// Browser Storage Module - Uses localStorage for client-side storage
// This replaces the database module which only works in Node.js environments

const Storage = {
    KEYS: { DATA: 'att_data', SETTINGS: 'att_settings' },
    
    async init() {
        try {
            // Initialize with default data if not exists
            const existingData = localStorage.getItem(this.KEYS.DATA);
            if (!existingData) {
                localStorage.setItem(this.KEYS.DATA, JSON.stringify({ records: {}, punchIn: null }));
            }
            
            const existingSettings = localStorage.getItem(this.KEYS.SETTINGS);
            if (!existingSettings) {
                localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify({ name: 'User', targetHours: 8 }));
            }
            
            // Clear stale punch-in on initialization
            await this.clearStalePunchIn();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            return false;
        }
    },
    
    async getData() {
        try {
            const dataStr = localStorage.getItem(this.KEYS.DATA);
            if (dataStr) {
                return JSON.parse(dataStr);
            }
            return { records: {}, punchIn: null };
        } catch (error) {
            console.error('Error getting data:', error);
            return { records: {}, punchIn: null };
        }
    },
    
    async saveData(data) {
        try {
            localStorage.setItem(this.KEYS.DATA, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    },
    
    async getSettings() {
        try {
            const settingsStr = localStorage.getItem(this.KEYS.SETTINGS);
            if (settingsStr) {
                return JSON.parse(settingsStr);
            }
            return { name: 'User', targetHours: 8 };
        } catch (error) {
            console.error('Error getting settings:', error);
            return { name: 'User', targetHours: 8 };
        }
    },
    
    async saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    },
    
    async clearStalePunchIn() {
        try {
            const data = await this.getData();
            const today = new Date().toDateString();
            
            if (data.punchIn) {
                const punchInDate = new Date(data.punchIn).toDateString();
                if (punchInDate !== today) {
                    // Clear stale punch-in
                    data.punchIn = null;
                    await this.saveData(data);
                    console.log('Cleared stale punch-in');
                }
            }
        } catch (error) {
            console.error('Error clearing stale punch-in:', error);
        }
    }
};

// Database Storage Module - Replaces localStorage with PostgreSQL

let dbModule = null;
let isInitialized = false;

// Dynamically import the database module (ESM)
async function getDB() {
    if (!dbModule) {
        try {
            dbModule = await import('../../database.js');
        } catch (error) {
            console.error('Failed to load database module:', error);
            throw error;
        }
    }
    return dbModule;
}

const Storage = {
    KEYS: { DATA: 'att_data', SETTINGS: 'att_settings' },
    
    async init() {
        if (isInitialized) return true;
        try {
            const db = await getDB();
            await db.initializeDatabase();
            await db.clearStalePunchIn();
            isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize database storage:', error);
            return false;
        }
    },
    
    async getData() {
        try {
            const db = await getDB();
            const records = await db.getAttendanceRecords();
            const punchIn = await db.getCurrentPunchIn();
            return { records, punchIn };
        } catch (error) {
            console.error('Error getting data from database:', error);
            // Fallback to empty data
            return { records: {}, punchIn: null };
        }
    },
    
    async saveData(data) {
        try {
            const db = await getDB();
            // Save each record
            for (const [dateKey, record] of Object.entries(data.records)) {
                if (record.in || record.out) {
                    await db.saveAttendanceRecord(dateKey, record.in, record.out);
                }
            }
            // If there's a current punchIn without a record, save it
            if (data.punchIn) {
                const todayKey = new Date().toISOString().split('T')[0];
                if (!data.records[todayKey]) {
                    await db.saveAttendanceRecord(todayKey, data.punchIn, null);
                }
            }
        } catch (error) {
            console.error('Error saving data to database:', error);
            throw error;
        }
    },
    
    async getSettings() {
        try {
            const db = await getDB();
            return await db.getSettings();
        } catch (error) {
            console.error('Error getting settings from database:', error);
            // Fallback to default settings
            return { targetHours: 8, name: 'User' };
        }
    },
    
    async saveSettings(settings) {
        try {
            const db = await getDB();
            await db.saveSettings(settings);
        } catch (error) {
            console.error('Error saving settings to database:', error);
            throw error;
        }
    }
};

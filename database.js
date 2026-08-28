// Database connection and operations for Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Xbfh93YiSmag@ep-polished-flower-awexjg84-pooler.c-12.us-east-1.aws.neon.tech/attendance_tracker?sslmode=require&channel_binding=require';

export const sql = neon(connectionString);

// Initialize the database schema
export async function initializeDatabase() {
    try {
        // Create settings table
        await sql`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(255) DEFAULT 'User',
                target_hours DECIMAL(3,1) DEFAULT 8.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create attendance_records table
        await sql`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id SERIAL PRIMARY KEY,
                date_key VARCHAR(20) UNIQUE NOT NULL,
                punch_in TIMESTAMP,
                punch_out TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Insert default settings if not exists
        await sql`
            INSERT INTO settings (user_name, target_hours)
            SELECT 'User', 8.0
            WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1)
        `;

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Settings operations
export async function getSettings() {
    try {
        const result = await sql`SELECT * FROM settings ORDER BY id DESC LIMIT 1`;
        if (result.length > 0) {
            return {
                name: result[0].user_name,
                targetHours: parseFloat(result[0].target_hours)
            };
        }
        return { name: 'User', targetHours: 8 };
    } catch (error) {
        console.error('Error getting settings:', error);
        return { name: 'User', targetHours: 8 };
    }
}

export async function saveSettings(settings) {
    try {
        const existing = await sql`SELECT id FROM settings ORDER BY id DESC LIMIT 1`;
        
        if (existing.length > 0) {
            await sql`
                UPDATE settings 
                SET user_name = ${settings.name},
                    target_hours = ${settings.targetHours},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${existing[0].id}
            `;
        } else {
            await sql`
                INSERT INTO settings (user_name, target_hours)
                VALUES (${settings.name}, ${settings.targetHours})
            `;
        }
        console.log('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// Attendance records operations
export async function getAttendanceRecords() {
    try {
        const result = await sql`SELECT * FROM attendance_records ORDER BY date_key DESC`;
        const records = {};
        result.forEach(row => {
            records[row.date_key] = {
                in: row.punch_in ? row.punch_in.toISOString() : null,
                out: row.punch_out ? row.punch_out.toISOString() : null
            };
        });
        return records;
    } catch (error) {
        console.error('Error getting attendance records:', error);
        return {};
    }
}

export async function saveAttendanceRecord(dateKey, punchIn, punchOut) {
    try {
        await sql`
            INSERT INTO attendance_records (date_key, punch_in, punch_out)
            VALUES (${dateKey}, ${punchIn ? new Date(punchIn) : null}, ${punchOut ? new Date(punchOut) : null})
            ON CONFLICT (date_key) DO UPDATE SET
                punch_in = EXCLUDED.punch_in,
                punch_out = EXCLUDED.punch_out,
                updated_at = CURRENT_TIMESTAMP
        `;
        console.log(`Attendance record saved for ${dateKey}`);
    } catch (error) {
        console.error('Error saving attendance record:', error);
        throw error;
    }
}

export async function getCurrentPunchIn() {
    try {
        const todayKey = new Date().toISOString().split('T')[0];
        const result = await sql`
            SELECT punch_in FROM attendance_records 
            WHERE date_key = ${todayKey} AND punch_in IS NOT NULL AND punch_out IS NULL
            LIMIT 1
        `;
        if (result.length > 0 && result[0].punch_in) {
            return result[0].punch_in.toISOString();
        }
        return null;
    } catch (error) {
        console.error('Error getting current punch in:', error);
        return null;
    }
}

export async function clearStalePunchIn() {
    try {
        const today = new Date().toDateString();
        const result = await sql`
            SELECT date_key, punch_in FROM attendance_records 
            WHERE punch_in IS NOT NULL AND punch_out IS NULL
        `;
        
        for (const row of result) {
            const punchInDate = new Date(row.punch_in).toDateString();
            if (punchInDate !== today) {
                await sql`
                    UPDATE attendance_records 
                    SET punch_out = punch_in, updated_at = CURRENT_TIMESTAMP
                    WHERE date_key = ${row.date_key}
                `;
                console.log(`Cleared stale punch-in for ${row.date_key}`);
            }
        }
    } catch (error) {
        console.error('Error clearing stale punch in:', error);
    }
}

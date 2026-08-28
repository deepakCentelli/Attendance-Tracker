// Server-side API for Attendance Tracker
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { neon } from '@neondatabase/serverless';

const app = new Hono();

// Enable CORS for browser requests
app.use('*', cors());

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Xbfh93YiSmag@ep-polished-flower-awexjg84-pooler.c-12.us-east-1.aws.neon.tech/attendance_tracker?sslmode=require&channel_binding=require';
const sql = neon(connectionString);

// Initialize database schema
async function initializeDatabase() {
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

// Initialize on startup
initializeDatabase();

// GET /api/settings - Get current settings
app.get('/api/settings', async (c) => {
    try {
        const result = await sql`SELECT * FROM settings ORDER BY id DESC LIMIT 1`;
        if (result.length > 0) {
            return c.json({
                name: result[0].user_name,
                targetHours: parseFloat(result[0].target_hours)
            });
        }
        return c.json({ name: 'User', targetHours: 8 });
    } catch (error) {
        console.error('Error getting settings:', error);
        return c.json({ name: 'User', targetHours: 8 });
    }
});

// POST /api/settings - Save settings
app.post('/api/settings', async (c) => {
    try {
        const body = await c.req.json();
        const { name, targetHours } = body;
        
        const existing = await sql`SELECT id FROM settings ORDER BY id DESC LIMIT 1`;
        
        if (existing.length > 0) {
            await sql`
                UPDATE settings 
                SET user_name = ${name},
                    target_hours = ${targetHours},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${existing[0].id}
            `;
        } else {
            await sql`
                INSERT INTO settings (user_name, target_hours)
                VALUES (${name}, ${targetHours})
            `;
        }
        
        return c.json({ success: true });
    } catch (error) {
        console.error('Error saving settings:', error);
        return c.json({ error: 'Failed to save settings' }, 500);
    }
});

// GET /api/attendance - Get all attendance records
app.get('/api/attendance', async (c) => {
    try {
        const result = await sql`SELECT * FROM attendance_records ORDER BY date_key DESC`;
        const records = {};
        result.forEach(row => {
            records[row.date_key] = {
                in: row.punch_in ? row.punch_in.toISOString() : null,
                out: row.punch_out ? row.punch_out.toISOString() : null
            };
        });
        return c.json(records);
    } catch (error) {
        console.error('Error getting attendance records:', error);
        return c.json({});
    }
});

// POST /api/attendance - Save attendance record
app.post('/api/attendance', async (c) => {
    try {
        const body = await c.req.json();
        const { dateKey, punchIn, punchOut } = body;
        
        await sql`
            INSERT INTO attendance_records (date_key, punch_in, punch_out)
            VALUES (${dateKey}, ${punchIn ? new Date(punchIn) : null}, ${punchOut ? new Date(punchOut) : null})
            ON CONFLICT (date_key) DO UPDATE SET
                punch_in = EXCLUDED.punch_in,
                punch_out = EXCLUDED.punch_out,
                updated_at = CURRENT_TIMESTAMP
        `;
        
        return c.json({ success: true });
    } catch (error) {
        console.error('Error saving attendance record:', error);
        return c.json({ error: 'Failed to save attendance' }, 500);
    }
});

// GET /api/punch-in - Get current punch-in status
app.get('/api/punch-in', async (c) => {
    try {
        const todayKey = new Date().toISOString().split('T')[0];
        const result = await sql`
            SELECT punch_in FROM attendance_records 
            WHERE date_key = ${todayKey} AND punch_in IS NOT NULL AND punch_out IS NULL
            LIMIT 1
        `;
        if (result.length > 0 && result[0].punch_in) {
            return c.json({ punchIn: result[0].punch_in.toISOString() });
        }
        return c.json({ punchIn: null });
    } catch (error) {
        console.error('Error getting punch-in:', error);
        return c.json({ punchIn: null });
    }
});

// Clear stale punch-ins (run periodically)
app.post('/api/clear-stale', async (c) => {
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
            }
        }
        return c.json({ success: true });
    } catch (error) {
        console.error('Error clearing stale punch-ins:', error);
        return c.json({ error: 'Failed to clear stale punch-ins' }, 500);
    }
});

export default app;

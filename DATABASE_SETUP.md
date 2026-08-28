# Attendance Tracker - PostgreSQL Integration

This project has been updated to use **Neon PostgreSQL** database instead of localStorage for persistent data storage.

## Changes Made

### 1. Database Module (`database.js`)
- Created a new module that connects to your Neon PostgreSQL database
- Implements CRUD operations for:
  - **Settings**: User name and target hours
  - **Attendance Records**: Punch-in/punch-out times organized by date

### 2. Updated Storage Module (`assets/js/storage.js`)
- Replaced localStorage operations with async database calls
- All methods are now `async` and return Promises
- Maintains the same API interface for backward compatibility

### 3. Updated Main Application (`assets/js/main.js`)
- Modified all event handlers to be `async` functions
- Added database initialization on page load
- Handles stale punch-in records from previous days

### 4. Package Configuration (`package.json`)
- Added `"type": "module"` to support ES6 imports/exports
- Installed dependencies:
  - `@neondatabase/serverless`
  - `neon`

## Database Schema

### Settings Table
```sql
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) DEFAULT 'User',
    target_hours DECIMAL(3,1) DEFAULT 8.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Attendance Records Table
```sql
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    date_key VARCHAR(20) UNIQUE NOT NULL,
    punch_in TIMESTAMP,
    punch_out TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Configuration

The database connection string is configured in `database.js`:
```javascript
const connectionString = process.env.DATABASE_URL || 'postgresql://...';
```

For production deployments, set the `DATABASE_URL` environment variable.

## Testing

The database integration has been tested successfully:
- ✅ Database initialization
- ✅ Settings save/retrieve
- ✅ Attendance record save/retrieve

## Usage

Simply open `index.html` in a browser. The application will automatically:
1. Initialize the database connection
2. Load settings and attendance records from PostgreSQL
3. Clear any stale punch-in records from previous days
4. Display the attendance tracker interface

All data operations now persist to your Neon PostgreSQL database instead of browser localStorage.

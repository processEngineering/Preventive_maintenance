# PostgreSQL → MySQL/MariaDB Migration Guide

## 🔄 What Changed

Your AKG Maintenance Checklist app has been migrated from **Supabase (PostgreSQL)** to **MySQL/MariaDB** database with a custom Flask backend for authentication and data management.

### Key Changes:

1. **Backend Database**: PostgreSQL → MySQL/MariaDB
2. **Authentication**: Supabase Auth → JWT-based custom auth
3. **API Client**: Supabase SDK → Custom Flask API client
4. **Dependencies**: psycopg2 → mysql-connector-python

---

## 📋 Setup Instructions

### Step 1: Create MySQL Database

Create a new database in MariaDB/MySQL and import your exported data:

```sql
-- 1. Create database
CREATE DATABASE preventive_maintenance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Create users table (NEW - for auth)
USE preventive_maintenance;
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Import your data
-- Use phpmyadmin or command line to import your CSV/SQL backup
```

### Step 2: Configure Environment Variables

Create `.env` file in `mtc-checklist/backend/`:

```bash
# Copy from .env.example
cp .env.example .env
```

Edit `.env` with your MariaDB credentials:

```env
# MySQL Configuration
DB_HOST=localhost
DB_NAME=preventive_maintenance
DB_USER=root
DB_PASSWORD=your_password_here
DB_PORT=3306

# Flask Configuration
FLASK_ENV=development
DEBUG=True

# Security Keys (Change in production!)
SECRET_KEY=your-super-secret-key-here
JWT_SECRET=your-jwt-secret-here
```

### Step 3: Install Dependencies

```bash
cd mtc-checklist/backend
pip install -r requirements.txt
```

### Step 4: Test the Server

Run the backend server:

```bash
python server.py
```

Expected output:
```
🚀 Server Lokal AKG Maintenance AKTIF!
Environment: development
Database: localhost:3306/preventive_maintenance
Pintu akses terbuka di Port 5000...
Auth endpoints available at /api/auth/*
```

### Step 5: Update Frontend (Optional)

The frontend code now uses the new API client automatically. If you make any custom API calls, make sure they point to `http://localhost:5000/api/`.

---

## 🔐 Authentication

### New Auth System

The app now uses **JWT tokens** for authentication instead of Supabase Auth.

#### API Endpoints:

```
POST /api/auth/signup     - Register new user
POST /api/auth/login      - Login user
GET  /api/auth/user       - Get current user (requires token)
POST /api/auth/logout     - Logout
```

#### How It Works:

1. User signs up/logs in
2. Server returns JWT token
3. Token stored in `localStorage` as `auth_token`
4. All API requests include token in `Authorization` header
5. Token expires after 24 hours (configurable)

#### Frontend Usage:

```javascript
// Sign up
const { data, error } = await supabaseClient.auth.signUp(
    'user@email.com',
    'password',
    'Full Name'
);

// Login
const { data, error } = await supabaseClient.auth.signInWithPassword(
    'user@email.com',
    'password'
);

// Get current session
const { data, error } = await supabaseClient.auth.getSession();

// Logout
await supabaseClient.auth.signOut();
```

---

## 📊 Data API Endpoints

```
GET  /api/machines           - Get all machines
GET  /api/report/monthly     - Get monthly report by machine/month/year
GET  /api/items              - Get checklist items
POST /api/submit             - Submit checklist report (requires auth)
GET  /api/health             - Health check
```

### Example Queries:

```javascript
// Get machines
const { data: machines } = await supabaseClient.getMachines();

// Get monthly report
const { data: report } = await supabaseClient.getMonthlyReport(
    machineId, 
    'January', 
    '2024'
);

// Get items
const { data: items } = await supabaseClient.getItems();

// Submit report
const { data } = await supabaseClient.submitLaporan({
    nama_pelaksana: 'John Doe',
    mesin: 'Machine 1',
    // ... other data
});
```

---

## 🛠️ Utility Scripts

### bulk_import.py

Import CSV data from backup folder to MySQL:

```bash
python backend/bulk_import.py
```

**Prerequisites:**
- CSV files in `C:\Maintenance App\Backup Data Base`
- MySQL must be running
- Database credentials in `.env`

---

### generate_query.py

Generate SQL CREATE TABLE from CSV header:

```bash
python backend/generate_query.py
```

Edit `file_path` variable to analyze different CSV files.

---

### migrate_sig.py

Migrate Base64 signatures to Supabase storage:

```bash
python backend/migrate_sig.py
```

Still uses Supabase for file storage (optional - you can migrate this later).

---

## 🚀 Running with PM2

```bash
# From root folder (MTC CHECK LIST)
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs mtc-server

# Stop
pm2 stop mtc-server
```

---

## 🐛 Troubleshooting

### "Can't connect to MySQL server"
- Check MySQL/MariaDB is running
- Verify `.env` credentials are correct
- Check `DB_HOST`, `DB_PORT`, `DB_NAME`

### "Authentication failed"
- Make sure `users` table exists in database
- Check `JWT_SECRET` is set in `.env`
- Clear browser cache and localStorage if needed

### "Table not found"
- Import your database backup
- Verify table names match API queries

### "Port 5000 already in use"
- Find process: `lsof -i :5000` (Linux/Mac) or `netstat -ano | findstr :5000` (Windows)
- Kill it or use different port (update in `server.py`)

---

## 📝 File Structure Changes

```
backend/
├── server.py              ← Updated for MySQL + JWT auth
├── config.py              ← Updated for MySQL config
├── requirements.txt       ← MySQL driver instead of psycopg2
├── bulk_import.py         ← Updated for MySQL
├── migrate_sig.py         ← Updated for MySQL
├── .env.example           ← MySQL credentials template
└── .env                   ← Your local config (create this)

src/
└── supabase/
    └── supabase-client.js ← Now uses Flask API instead of Supabase
```

---

## 🔐 Security Recommendations

For **production**, you should:

1. **Change SECRET_KEY and JWT_SECRET** in `.env`
   ```env
   SECRET_KEY=your-new-random-string-minimum-32-chars
   JWT_SECRET=another-new-random-string-minimum-32-chars
   ```

2. **Use environment variables** for sensitive data (never commit `.env`)

3. **Enable HTTPS** for API calls in production

4. **Hash passwords properly** - Current implementation uses SHA256 (use bcrypt for better security)

5. **Add rate limiting** to prevent brute force attacks

6. **Set `DEBUG=False`** in production

---

## ✅ Verification Checklist

After setup, verify:

- [ ] MySQL/MariaDB is installed and running
- [ ] Database `preventive_maintenance` created
- [ ] Users table created in database
- [ ] `.env` file created with correct credentials
- [ ] `pip install -r requirements.txt` completed
- [ ] Server runs without errors: `python server.py`
- [ ] Health check passes: `GET http://localhost:5000/api/health`
- [ ] Can sign up/login from frontend

---

## 📞 Support

If you encounter issues:

1. Check server logs: `python server.py` (run directly to see errors)
2. Check browser console for API errors
3. Verify database connection: Use MySQL client directly
4. Check network tab in browser to see API requests

---

## 🎉 You're Ready!

Your app is now running on MySQL/MariaDB instead of Supabase. All the functionality remains the same, but with more control over your database and auth system!

Happy coding! 🚀

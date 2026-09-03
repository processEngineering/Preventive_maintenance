# PostgreSQL Setup Guide - Path A

Using your existing **PostgreSQL server** with Supabase database export.

---

## 📋 Step 1: Export Supabase Database

### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Get your PostgreSQL connection string from:
# https://app.supabase.com/project/[YOUR_PROJECT_ID]/settings/database
# Look for: Connection string → Connection pooling → Passworded URI

# Export database
supabase db dump \
  --db-url "postgresql://postgres:PASSWORD@db.YOUR_REGION.supabase.co:5432/postgres" \
  > backup.sql
```

### Option B: Using pgAdmin (UI Method)

1. Open pgAdmin from your Supabase project
2. Right-click database → **Backup**
3. Save as `backup.sql`

### Option C: Using Command Line (psql)

```bash
# Direct export from Supabase
pg_dump -h db.YOUR_REGION.supabase.co \
        -U postgres \
        -d postgres > backup.sql

# Enter password when prompted (Supabase password)
```

---

## 🔌 Step 2: Get Your PostgreSQL Server Connection Details

You need:
- **Host** (IP or domain)
- **Port** (usually 5432)
- **Username** (usually postgres)
- **Password**
- **Database name** (preventive_maintenance)

**Find these via SSH:**

```bash
# SSH into your server
ssh username@your_server_ip

# Check PostgreSQL connection details
sudo -u postgres psql -c "SELECT current_user;"

# Get PostgreSQL version
psql --version

# List databases
sudo -u postgres psql -l
```

---

## 📥 Step 3: Create Database on Your PostgreSQL Server

```bash
# SSH into your server
ssh username@your_server_ip

# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE preventive_maintenance ENCODING 'UTF8';

# Exit
\q
```

---

## 💾 Step 4: Import Backup to Your PostgreSQL Server

### Method A: From Local Machine

```bash
# Copy backup to server first
scp backup.sql username@your_server_ip:/home/username/

# SSH into server
ssh username@your_server_ip

# Import
psql -U postgres -d preventive_maintenance < ~/backup.sql
```

### Method B: Direct Import (if server accessible)

```bash
# From your local machine, directly to remote server
psql -h your_server_ip -U postgres -d preventive_maintenance < backup.sql

# OR
pg_restore -h your_server_ip -U postgres -d preventive_maintenance backup.dump
```

### Method C: Using pgAdmin

1. Open pgAdmin
2. Select database → **Restore**
3. Upload `backup.sql`
4. Click **Restore**

---

## ✅ Step 5: Verify Import Success

```bash
# Connect to your PostgreSQL server
psql -h your_server_ip -U postgres -d preventive_maintenance

# Check if tables exist
\dt

# Count rows in main table (example)
SELECT COUNT(*) FROM clhmi;

# Exit
\q
```

Should show all your Supabase tables!

---

## ⚙️ Step 6: Configure Backend

### 1. Create `.env` file

```bash
cd mtc-checklist/backend
cp .env.example .env
```

### 2. Edit `.env` with your PostgreSQL server details

```env
# PostgreSQL Database Configuration
DB_HOST=your_server_ip          # e.g., 192.168.1.100 or domain.com
DB_NAME=preventive_maintenance
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# Flask Configuration
FLASK_ENV=development
DEBUG=True

# Security Keys (Change in production!)
SECRET_KEY=your-flask-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-change-in-production
```

---

## 📦 Step 7: Install Dependencies

```bash
cd mtc-checklist/backend

# Install Python dependencies
pip install -r requirements.txt

# Expected to install:
# - flask
# - flask-cors
# - psycopg2-binary (PostgreSQL driver)
# - python-dotenv
# - PyJWT
# - werkzeug
```

---

## 🚀 Step 8: Start Backend Server

```bash
cd mtc-checklist/backend

# Run server
python server.py

# Expected output:
# 🚀 Server Lokal AKG Maintenance AKTIF!
# Environment: development
# Database: your_server_ip:5432/preventive_maintenance
# Pintu akses terbuka di Port 5000...
```

---

## ✅ Step 9: Test Connection

### A. Test Health Check

```bash
# In another terminal
curl http://localhost:5000/api/health

# Expected response:
# {"status": "ok", "message": "Server and database are running"}
```

### B. Test Signup

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# Should return user with token
```

### C. Test Get Machines

```bash
curl http://localhost:5000/api/machines

# Should return list of machines from database
```

---

## 🎉 Step 10: Done!

Your backend is now running with:
✅ PostgreSQL database (your server)
✅ Supabase data (imported)
✅ Flask API server
✅ JWT authentication
✅ Port 5000 open

The frontend will automatically use this API! 🚀

---

## 🐛 Troubleshooting

### Issue: "psycopg2.OperationalError: could not connect to server"

```bash
# Check if server is accessible
ping your_server_ip

# Check PostgreSQL is running on server
ssh username@your_server_ip
sudo service postgresql status

# If not running:
sudo service postgresql start

# Check if port 5432 is open
sudo ufw allow 5432
```

### Issue: "FATAL: Ident authentication failed"

PostgreSQL on server might require password auth:

```bash
# SSH into server
ssh username@your_server_ip

# Edit PostgreSQL config
sudo nano /etc/postgresql/12/main/pg_hba.conf

# Change "ident" to "md5" or "password":
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# local   all             postgres                                password

# Restart PostgreSQL
sudo service postgresql restart
```

### Issue: "Database preventive_maintenance does not exist"

```bash
# Verify database was created
psql -h your_server_ip -U postgres -l

# If not, create it:
psql -h your_server_ip -U postgres -c "CREATE DATABASE preventive_maintenance;"

# Then import backup
psql -h your_server_ip -U postgres -d preventive_maintenance < backup.sql
```

### Issue: "permission denied" on import

```bash
# Make sure PostgreSQL user has permissions
psql -h your_server_ip -U postgres

# Run this:
ALTER DATABASE preventive_maintenance OWNER TO postgres;

# Exit and retry import
\q
```

### Issue: Frontend can't reach API

Make sure:
- [ ] Flask server is running: `python server.py`
- [ ] Port 5000 is open: `netstat -an | grep 5000`
- [ ] No firewall blocking: `sudo ufw allow 5000`
- [ ] API_URL in frontend points to `http://localhost:5000/api`

---

## 🚀 Running with PM2

```bash
# From root folder
pm2 start ecosystem.config.js

# Check status
pm2 logs mtc-server
```

---

## 📚 Next Steps

1. **Import your Supabase users table** (if it exists)
   ```sql
   -- Check if auth.users table exists in Supabase
   SELECT * FROM auth.users;
   
   -- You may need to recreate the users table for authentication
   CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       email VARCHAR(255) UNIQUE NOT NULL,
       password VARCHAR(255) NOT NULL,
       full_name VARCHAR(255),
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Test all API endpoints** (see API_REFERENCE.md)

3. **Deploy to production** (see README.md)

---

## ✨ Complete!

You now have:
✅ Supabase data in PostgreSQL
✅ PostgreSQL server on your machine
✅ Flask backend for API
✅ JWT authentication
✅ Frontend working with local API

Happy coding! 🎉

# AKG Maintenance Checklist - Backend Server

Flask REST API server powered by MySQL/MariaDB database.

## Quick Start

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Database

Copy and edit `.env`:

```bash
cp .env.example .env
```

**Edit `.env` with your MariaDB credentials:**

```env
DB_HOST=localhost
DB_NAME=preventive_maintenance
DB_USER=root
DB_PASSWORD=your_password
DB_PORT=3306
```

### 3. Create Database & User Table

```sql
-- Create database
CREATE DATABASE preventive_maintenance CHARACTER SET utf8mb4;

-- Create users table
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

-- Import your backup data
-- Use phpmyadmin or: mysql preventive_maintenance < backup.sql
```

### 4. Run Server

```bash
python server.py
```

Expected output:
```
🚀 Server Lokal AKG Maintenance AKTIF!
Environment: development
Database: localhost:3306/preventive_maintenance
Pintu akses terbuka di Port 5000...
```

Visit: http://localhost:5000/api/health

---

## Documentation

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - PostgreSQL → MySQL migration guide
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Frontend API client reference
- **[UTILITIES.md](./UTILITIES.md)** - Data import/migration tools

---

## API Endpoints

### Authentication
```
POST   /api/auth/signup        - Register new user
POST   /api/auth/login         - Login with credentials
GET    /api/auth/user          - Get current user (requires token)
POST   /api/auth/logout        - Logout
```

### Data
```
GET    /api/machines           - Get all machines
GET    /api/report/monthly     - Get report by machine/month/year
GET    /api/items              - Get checklist items
POST   /api/submit             - Submit checklist (requires token)
```

### System
```
GET    /api/health             - Server & database health check
```

---

## Running with PM2

```bash
# From root folder (MTC CHECK LIST)
pm2 start ecosystem.config.js

# Development mode
pm2 start ecosystem.config.js --env development

# Production mode
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs mtc-server

# Stop server
pm2 stop mtc-server

# Auto-start on reboot
pm2 save
pm2 startup
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | MySQL host |
| DB_NAME | preventive_maintenance | Database name |
| DB_USER | root | Database user |
| DB_PASSWORD | (empty) | Database password |
| DB_PORT | 3306 | Database port |
| FLASK_ENV | development | Environment (development/production) |
| DEBUG | True | Debug mode (set to False in production) |
| SECRET_KEY | - | Flask secret (CHANGE in production!) |
| JWT_SECRET | - | JWT signing secret (CHANGE in production!) |

---

## Database Setup

### Import from PostgreSQL

If migrating from Supabase:

```bash
# 1. Export from PostgreSQL
pg_dump preventive_maintenance > backup.sql

# 2. Adapt schema for MySQL (if needed)
# - Replace `CREATE SCHEMA public` → remove
# - Replace `jsonb` → `JSON`
# - Replace `uuid` → `CHAR(36)`

# 3. Import to MySQL
mysql preventive_maintenance < backup.sql
```

### Using Bulk Import

```bash
python backend/bulk_import.py
```

Imports CSV files from `C:\Maintenance App\Backup Data Base` to MySQL.

---

## Troubleshooting

### "Can't connect to MySQL server"
```bash
# Check MySQL is running
mysql -u root -p

# Check port 3306 is open
netstat -an | grep 3306

# Update .env with correct credentials
```

### "Access denied for user 'root'@'localhost'"
```bash
# Check password in .env is correct
# Verify user has privileges:
mysql -u root -p
GRANT ALL ON preventive_maintenance.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### "Table doesn't exist"
```bash
# Import database backup first
mysql preventive_maintenance < backup.sql

# Or create tables manually
# Then run bulk_import.py to load data
```

### "Token expired/invalid"
```javascript
// Token expires after 24 hours (configurable)
// User needs to login again
// Check JWT_SECRET in .env is set correctly
```

### Port 5000 already in use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill it or update server.py to use different port
# Then restart: python server.py
```

---

## Performance Tips

1. **Add database indexes** on frequently queried columns
2. **Use connection pooling** for production (update mysql.connector config)
3. **Enable caching** for API responses that don't change often
4. **Use SELECT fields** you need, not SELECT *
5. **Paginate large result sets**

---

## Security

⚠️ **Production Checklist:**

- [ ] Change `SECRET_KEY` and `JWT_SECRET` in `.env`
- [ ] Set `DEBUG=False` in `.env`
- [ ] Set `FLASK_ENV=production` in `.env`
- [ ] Use strong database password
- [ ] Enable HTTPS for API
- [ ] Add rate limiting
- [ ] Use bcrypt for password hashing (not SHA256)
- [ ] Enable CORS properly (not wildcard `*`)
- [ ] Add input validation
- [ ] Monitor error logs
- [ ] Regular backups

---

## Development

### File Structure

```
backend/
├── server.py           # Main Flask app
├── config.py           # Configuration & database setup
├── requirements.txt    # Python dependencies
├── bulk_import.py      # CSV import utility
├── generate_query.py   # SQL schema generator
├── migrate_sig.py      # Signature migration tool
├── .env                # Local configuration (don't commit)
├── .env.example        # Template for .env
├── .gitignore          # Git ignore rules
├── README.md           # This file
├── MIGRATION_GUIDE.md  # Migration instructions
├── API_REFERENCE.md    # Frontend API docs
└── UTILITIES.md        # Utility scripts guide
```

### Adding New Endpoints

1. Add route in `server.py`:
```python
@app.route('/api/new-endpoint', methods=['GET', 'POST'])
@token_required  # If auth required
def new_endpoint():
    # Your logic
    return jsonify(result), 200
```

2. Update frontend client in `src/supabase/supabase-client.js`

3. Add documentation in `API_REFERENCE.md`

---

## Testing

```bash
# Test health check
curl http://localhost:5000/api/health

# Test signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","full_name":"Test User"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'

# Test protected endpoint (add your token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/machines
```

---

## Deployment

For production deployment:

1. **Use production database** (not localhost)
2. **Set all environment variables** securely
3. **Enable HTTPS** (use reverse proxy like Nginx)
4. **Use process manager** (PM2, Gunicorn, etc.)
5. **Add monitoring** (logging, error tracking)
6. **Regular backups** of database
7. **Rate limiting** to prevent abuse
8. **CORS configuration** for specific domains

---

## Support & Issues

- Check `MIGRATION_GUIDE.md` for migration help
- Check `API_REFERENCE.md` for API usage
- Check `UTILITIES.md` for data tools
- Run server directly to see error messages
- Check browser console for frontend errors

---

**Last Updated**: 2024
**MySQL Version**: 5.7+
**Python Version**: 3.8+
**Flask Version**: 2.3.2


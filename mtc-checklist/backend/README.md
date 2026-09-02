# AKG Maintenance Checklist - Backend Server

Flask API server untuk aplikasi MTC Check List.

## Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Database Connection

Copy `.env.example` ke `.env` dan sesuaikan nilai:

```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi database Anda:

```env
DB_HOST=localhost
DB_NAME=preventive_maintenance
DB_USER=postgres
DB_PASSWORD=utility123
DB_PORT=5432
FLASK_ENV=development
DEBUG=True
```

### 3. Run Server Locally

```bash
python server.py
```

Server akan berjalan di `http://localhost:5000`

## Running with PM2

### Install PM2 (global)

```bash
npm install -g pm2
```

### Start Server

Dari root folder (`MTC CHECK LIST`):

```bash
# Development
pm2 start ecosystem.config.js

# Production
pm2 start ecosystem.config.js --env production
```

### Manage Server

```bash
# Check status
pm2 status

# View logs
pm2 logs mtc-server

# Stop server
pm2 stop mtc-server

# Restart server
pm2 restart mtc-server

# Delete from PM2
pm2 delete mtc-server

# Auto-start on reboot
pm2 save
pm2 startup
```

## API Endpoints

- `GET /api/machines` - Get all machines
- `GET /api/report/monthly` - Get monthly report
- `GET /api/items` - Get checklist items
- `POST /api/submit` - Submit checklist report
- `GET /api/health` - Health check

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | PostgreSQL host |
| DB_NAME | preventive_maintenance | Database name |
| DB_USER | postgres | Database user |
| DB_PASSWORD | utility123 | Database password |
| DB_PORT | 5432 | Database port |
| FLASK_ENV | development | Environment (development/production) |
| DEBUG | True | Debug mode |

## Folder Structure

```
backend/
├── server.py          # Main Flask application
├── config.py          # Configuration manager
├── requirements.txt   # Python dependencies
├── .env              # Environment variables (local)
├── .env.example      # Environment variables template
├── .gitignore        # Git ignore file
└── README.md         # This file
```

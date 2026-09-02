# Utility Scripts Guide

All utility scripts for data management are in this folder.

## 1. **bulk_import.py** - CSV Bulk Import to PostgreSQL

Imports CSV files from a backup folder directly into PostgreSQL database with deduplication.

### Usage:
```bash
python bulk_import.py
```

### What it does:
- Reads all CSV files from `C:\Maintenance App\Backup Data Base`
- Detects table names from filename
- Truncates existing data in the table
- Filters out duplicates (based on `id`, `no_seri`, `nama_mesin`)
- Cleans JSON/array formatting from Supabase exports
- Performs bulk COPY operation for speed

### Prerequisites:
- PostgreSQL must be running
- Backup CSV files in `C:\Maintenance App\Backup Data Base`
- psycopg2-binary installed: `pip install -r requirements.txt`

---

## 2. **generate_query.py** - SQL Schema Generator

Reads a CSV file header and automatically generates a PostgreSQL CREATE TABLE statement.

### Usage:
```bash
python generate_query.py
```

### What it does:
- Analyzes the first row of CSV
- Infers data types (UUID, BIGINT, BOOLEAN, TIMESTAMP, TEXT)
- Marks `id` column as PRIMARY KEY
- Outputs ready-to-paste SQL query

### Customize:
Edit `file_path` variable to point to your CSV file:
```python
file_path = r"C:\Your\Path\to\file.csv"
```

---

## 3. **migrate_sig.py** - Signature Migration to Supabase Storage

Converts Base64-encoded signatures from database to image files in Supabase cloud storage.

### Usage:
```bash
python migrate_sig.py
```

### What it does:
- Searches for signatures with "base64" text in DB
- Decodes Base64 to PNG image
- Uploads to Supabase bucket `signatures`
- Replaces Base64 with simple filename reference
- Saves ~486MB of storage space
- Processes in batches of 500 to avoid memory issues

### Prerequisites:
- Supabase project configured in code
- Internet connection for uploads
- supabase package: `pip install -r requirements.txt`

---

## 4. **server.py** - Flask REST API Server

Main backend server for the MTC Checklist app. See [README.md](./README.md) for details.

---

## Installation

```bash
# Install all dependencies at once
pip install -r requirements.txt
```

---

## Tips

- **Before running bulk_import.py**: Make sure your CSV files are in the correct folder
- **Before running migrate_sig.py**: Backup your database first!
- **For generate_query.py**: Test with one CSV first, then run on larger files
- All scripts use PostgreSQL and Supabase configs defined in their code


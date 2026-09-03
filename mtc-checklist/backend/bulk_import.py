import os
import psycopg2
import csv
from io import StringIO
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 1. PostgreSQL Configuration
DB_CONFIG = {
    "host": os.getenv('DB_HOST', 'localhost'),
    "database": os.getenv('DB_NAME', 'preventive_maintenance'),
    "user": os.getenv('DB_USER', 'postgres'),
    "password": os.getenv('DB_PASSWORD', 'postgres'),
    "port": int(os.getenv('DB_PORT', '5432'))
}

# 2. Lokasi folder
FOLDER_CSV = r"C:\Maintenance App\Backup Data Base" 

def get_table_columns(cur, table_name):
    """Get column names from PostgreSQL table"""
    try:
        cur.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        """, (table_name.lower(),))
        return [row[0] for row in cur.fetchall()]
    except Exception as e:
        print(f"Error getting columns: {e}")
        return []

def format_pg_array(val):
    """Format array for PostgreSQL"""
    if isinstance(val, str) and val.startswith('[') and val.endswith(']'):
        try:
            arr = json.loads(val)
            if isinstance(arr, list):
                items = [f'"{item}"' if ' ' in str(item) else str(item) for item in arr]
                return '{' + ','.join(items) + '}'
        except:
            return val
    return val

def format_pg_json(val):
    """Format JSON for PostgreSQL"""
    if not isinstance(val, str) or not val: 
        return val
        
    # Fix masalah Array JSON Supabase yang dibungkus format aneh dan kelebihan kutip
    # Contoh dari CSV: {"{'no': 1, 'qty': '1'}","{'no': 2, 'qty': '2'}"}
    if val.startswith('{"{') and val.endswith('}"}'):
        # 1. Buka kurung kurawal paling luar
        inner = val[1:-1] # Hasilnya: "{...}","{...}"
        
        # 2. Hapus kutip pemisah antar objek
        inner = inner.replace('","', ',') # Hasilnya: "{...},{...}"
        
        # 3. Hapus kutip di ujung-ujung
        if inner.startswith('"'): inner = inner[1:]
        if inner.endswith('"'): inner = inner[:-1]
        
        # 4. Kalau ada escaped backslash ( \" ), bersihkan
        inner = inner.replace('\\"', '"')
        
        # 5. Bungkus dengan format Array JSON standar
        val = '[' + inner + ']'

    # Terakhir, pastikan semua kutip tunggal diubah jadi kutip ganda
    if "'" in val and '{' in val:
        val = val.replace("'", '"')
        
    return val

def bulk_import():
    """Import CSV files to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("✅ Berhasil nyambung ke PostgreSQL Database.")

        files = [f for f in os.listdir(FOLDER_CSV) if f.endswith('.csv')]
        
        for file_name in files:
            raw_name = file_name.replace('.csv', '').lower()
            if ' (' in raw_name:
                raw_name = raw_name.split(' (')[0]
            table_name = raw_name.replace('_rows', '')
            
            file_path = os.path.join(FOLDER_CSV, file_name)

            print(f"⏳ Memproses: {file_name} -> Tabel: {table_name}")

            try:
                db_columns = get_table_columns(cur, table_name)
                if not db_columns:
                    print(f"   ❌ Gagal: Tabel '{table_name}' tidak ditemukan di database.")
                    continue

                # Truncate table
                cur.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE")
                conn.commit()

                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    csv_header = next(reader)
                    csv_header = [h.strip().lower() for h in csv_header]

                    matched_columns = [col for col in csv_header if col in db_columns]
                    if not matched_columns:
                        print(f"   ❌ Gagal: Tidak ada kolom yang cocok.")
                        continue

                    indices = [csv_header.index(col) for col in matched_columns]
                    col_string = ", ".join(matched_columns)
                    
                    # Kolom-kolom sakti buat mendeteksi duplikat data
                    unique_cols = ['id', 'no_seri', 'nama_mesin']
                    unique_cols = [col for col in unique_cols if col in matched_columns]
                    
                    def filtered_csv_generator():
                        seen_keys = {col: set() for col in unique_cols}
                        
                        with open(file_path, 'r', encoding='utf-8') as csvfile:
                            r = csv.reader(csvfile)
                            next(r) # skip header
                            for row in r:
                                if not row: continue 
                                
                                # Check for duplicates
                                is_duplicate = False
                                for col in unique_cols:
                                    val = row[csv_header.index(col)]
                                    if val != '' and val in seen_keys[col]:
                                        is_duplicate = True
                                        break
                                
                                if is_duplicate:
                                    continue
                                
                                # Register values as seen
                                for col in unique_cols:
                                    val = row[csv_header.index(col)]
                                    if val != '':
                                        seen_keys[col].add(val)
                                
                                # Format row
                                filtered_row = []
                                for i, col_name in zip(indices, matched_columns):
                                    val = row[i] if i < len(row) else ''
                                    val = format_pg_array(val)
                                    val = format_pg_json(val)
                                    
                                    if col_name == 'nama_item' and val == '':
                                        val = '-' 
                                        
                                    filtered_row.append(val)
                                    
                                yield "\t".join(filtered_row).replace('\n', '\\n') + "\n"

                    cur.copy_expert(f"COPY {table_name} ({col_string}) FROM STDIN WITH (FORMAT text, NULL '')", 
                                   StringIO("".join(filtered_csv_generator())))
                    
                    conn.commit()
                    print(f"   ✅ SUKSES!")

            except Exception as e:
                conn.rollback()
                print(f"   ⚠️ Gagal: {e}")

        cur.close()
        conn.close()
        print("\n🏆 SELESAI SEMUA! SELAMAT!")

    except Exception as e:
        print(f"❌ Error Koneksi: {e}")

if __name__ == "__main__":
    bulk_import()


def format_value_for_mysql(col_name, val):
    """Format value for MySQL insertion"""
    if not val or val == '':
        return None
    
    # Handle special columns
    if col_name == 'nama_item' and val == '':
        return '-'
    
    # Handle JSON/Array fields
    if isinstance(val, str):
        if val.startswith('[') and val.endswith(']'):
            try:
                arr = json.loads(val)
                if isinstance(arr, list):
                    return json.dumps(arr)
            except:
                pass
        
        if val.startswith('{') and val.endswith('}'):
            try:
                obj = json.loads(val)
                return json.dumps(obj)
            except:
                pass
    
    return val

def bulk_import():
    """Import CSV files to MySQL database"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("✅ Berhasil nyambung ke MySQL Database.")

        files = [f for f in os.listdir(FOLDER_CSV) if f.endswith('.csv')]
        
        for file_name in files:
            raw_name = file_name.replace('.csv', '').lower()
            if ' (' in raw_name:
                raw_name = raw_name.split(' (')[0]
            table_name = raw_name.replace('_rows', '')
            
            file_path = os.path.join(FOLDER_CSV, file_name)

            print(f"⏳ Memproses: {file_name} -> Tabel: {table_name}")

            try:
                db_columns = get_table_columns(cur, table_name)
                if not db_columns:
                    print(f"   ❌ Gagal: Tabel '{table_name}' tidak ditemukan di database.")
                    continue

                # Truncate table
                cur.execute(f"DELETE FROM {table_name}")
                conn.commit()

                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    csv_header = next(reader)
                    csv_header = [h.strip().lower() for h in csv_header]

                    matched_columns = [col for col in csv_header if col in db_columns]
                    if not matched_columns:
                        print(f"   ❌ Gagal: Tidak ada kolom yang cocok.")
                        continue

                    indices = [csv_header.index(col) for col in matched_columns]
                    
                    # Kolom-kolom sakti buat mendeteksi duplikat data
                    unique_cols = ['id', 'no_seri', 'nama_mesin']
                    unique_cols = [col for col in unique_cols if col in matched_columns]
                    
                    seen_keys = {col: set() for col in unique_cols}
                    rows_inserted = 0
                    rows_skipped = 0
                    
                    for row in reader:
                        if not row: 
                            continue 
                        
                        # Check for duplicates
                        is_duplicate = False
                        for col in unique_cols:
                            val = row[csv_header.index(col)] if csv_header.index(col) < len(row) else ''
                            if val and val in seen_keys[col]:
                                is_duplicate = True
                                break
                        
                        if is_duplicate:
                            rows_skipped += 1
                            continue
                        
                        # Register values as seen
                        for col in unique_cols:
                            val = row[csv_header.index(col)] if csv_header.index(col) < len(row) else ''
                            if val:
                                seen_keys[col].add(val)
                        
                        # Prepare values
                        values = []
                        for i, col_name in zip(indices, matched_columns):
                            val = row[i] if i < len(row) else ''
                            val = format_value_for_mysql(col_name, val)
                            values.append(val)
                        
                        # Build INSERT statement
                        col_string = ", ".join([f"`{col}`" for col in matched_columns])
                        placeholders = ", ".join(["%s"] * len(matched_columns))
                        insert_query = f"INSERT INTO `{table_name}` ({col_string}) VALUES ({placeholders})"
                        
                        try:
                            cur.execute(insert_query, values)
                            rows_inserted += 1
                        except Error as e:
                            print(f"   ⚠️ Error inserting row: {e}")
                    
                    conn.commit()
                    print(f"   ✅ SUKSES! {rows_inserted} baris dimasukkan, {rows_skipped} duplikat dilewati")

            except Error as e:
                conn.rollback()
                print(f"   ⚠️ Gagal: {e}")

        cur.close()
        conn.close()
        print("\n🏆 SELESAI SEMUA! SELAMAT!")

    except Error as e:
        print(f"❌ Error Koneksi: {e}")

if __name__ == "__main__":
    bulk_import()


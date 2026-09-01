import os
import psycopg2
import csv
from io import StringIO
import json

# 1. Konfigurasi Database
DB_CONFIG = {
    "host": "localhost",
    "database": "preventive_maintenance",
    "user": "postgres",
    "password": "utility123", # <-- Password lu udah otomatis
    "port": "5432"
}

# 2. Lokasi folder
FOLDER_CSV = r"C:\Maintenance App\Backup Data Base" 

def get_table_columns(cur, table_name):
    cur.execute(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
    """, (table_name.lower(),))
    return [row[0] for row in cur.fetchall()]

def format_pg_array(val):
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
        
        # 4. Kalau ada escaped backslash ( \” ), bersihkan
        inner = inner.replace('\\"', '"')
        
        # 5. Bungkus dengan format Array JSON standar
        val = '[' + inner + ']'

    # Terakhir, pastikan semua kutip tunggal diubah jadi kutip ganda
    if "'" in val and '{' in val:
        val = val.replace("'", '"')
        
    return val

def bulk_import():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("✅ Berhasil nyambung ke Database.")

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

                cur.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;")

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
                    
                    def filtered_csv_generator():
                        # Siapkan keranjang pengecekan untuk tiap kolom unik
                        seen_keys = {col: set() for col in unique_cols}
                        
                        with open(file_path, 'r', encoding='utf-8') as csvfile:
                            r = csv.reader(csvfile)
                            next(r) # skip header
                            for row in r:
                                if not row: continue 
                                
                                # Cek apakah baris ini duplikat di id, no_seri, atau nama_mesin
                                is_duplicate = False
                                for col in unique_cols:
                                    if col in matched_columns:
                                        val = row[csv_header.index(col)]
                                        # Kalau isinya ada dan kembar sama yang udah pernah dimasukin -> Blokir!
                                        if val != '' and val in seen_keys[col]:
                                            is_duplicate = True
                                            break
                                
                                if is_duplicate:
                                    continue # Abaikan baris duplikat ini
                                    
                                # Kalau lolos, daftarkan datanya ke keranjang biar nggak ada yang nyontek lagi
                                for col in unique_cols:
                                    if col in matched_columns:
                                        val = row[csv_header.index(col)]
                                        if val != '':
                                            seen_keys[col].add(val)
                                
                                # Format row dan siapkan untuk disuntik
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
import csv

# Lokasi file raksasa lu
file_path = r"C:\Maintenance App\Backup Data Base\chslr_result_rows.csv"

def guess_type(col_name, val):
    """Fungsi pintar untuk nebak tipe data berdasarkan isinya"""
    if col_name == 'id':
        if '-' in val and len(val) == 36: return "UUID"
        if val.isdigit(): return "BIGINT"
        return "TEXT"
    
    if 'date' in col_name or 'time' in col_name or 'created_at' in col_name:
        return "TIMESTAMP WITH TIME ZONE"
    
    if val.isdigit():
        return "BIGINT"
    
    if val.lower() in ['true', 'false']:
        return "BOOLEAN"
    
    if '-' in val and len(val) == 36 and val.count('-') == 4:
        return "UUID"
        
    return "TEXT" # Default paling aman untuk CSV

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        
        # Baca 1 baris pertama untuk dianalisa
        try:
            first_row = next(reader)
        except StopIteration:
            first_row = [''] * len(headers)

    kolom_sql = []
    for i, header in enumerate(headers):
        # Bersihkan spasi di nama kolom
        col_name = header.strip().lower()
        val = first_row[i] if i < len(first_row) else ''
        
        tipe_data = guess_type(col_name, val)
        
        # Set kolom ID jadi Primary Key
        if col_name == 'id':
            kolom_sql.append(f"    {col_name} {tipe_data} PRIMARY KEY")
        else:
            kolom_sql.append(f"    {col_name} {tipe_data}")

    # Gabungkan jadi satu Query SQL
    query = "CREATE TABLE chslr_result (\n" + ",\n".join(kolom_sql) + "\n);"
    
    print("\n" + "="*70)
    print("✅ COPY QUERY DI BAWAH INI, LALU PASTE DAN JALANKAN DI PGADMIN:")
    print("="*70 + "\n")
    print(query)
    print("\n" + "="*70)
    
except FileNotFoundError:
    print(f"\n❌ File tidak ditemukan: {file_path}")
    print("Pastikan nama file dan foldernya sudah benar ya bro!")
except Exception as e:
    print(f"\n❌ Error: {e}")
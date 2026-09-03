import os
import base64
import psycopg2
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# PostgreSQL Configuration
DB_CONFIG = {
    "host": os.getenv('DB_HOST', 'localhost'),
    "database": os.getenv('DB_NAME', 'preventive_maintenance'),
    "user": os.getenv('DB_USER', 'postgres'),
    "password": os.getenv('DB_PASSWORD', 'postgres'),
    "port": int(os.getenv('DB_PORT', '5432'))
}

# KONFIGURASI SUPABASE (Still using for file storage)
SUPABASE_URL = "https://dsyvlavphvrdidmodokd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeXZsYXZwaHZyZGlkbW9kb2tkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI3Mjk2MywiZXhwIjoyMDgxODQ4OTYzfQ.l5nqlWwtLc_cjUlII9PWf0aU6QNz9bZKglh80MDZFQE" 

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def start_migration():
    """Migrate signatures from database Base64 to Supabase storage"""
    print("🔍 Memulai Robot Penyelamat Data Audit Perusahaan...")
    
    total_sukses = 0
    conn = None
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Looping terus sampai semua data Base64 habis diubah
        while True:
            # Cari yang di kolom signature masih ada tulisan 'base64'
            cursor.execute("""
                SELECT id, signature FROM chslr_result 
                WHERE signature LIKE '%base64%' 
                LIMIT 500
            """)
            records = cursor.fetchall()
            
            if not records:
                print(f"\n🎉 BERSIH TOTAL! {total_sukses} data Base64 sudah diamankan ke Bucket!")
                break
                
            print(f"🔄 Memproses batch baru: {len(records)} data...")
            
            for row in records:
                row_id = row[0]
                base64_str = row[1]
                
                # Kasih nama file pakai ID bawaan databasenya (Biar aman buat Audit)
                nama_file = f"sig_{row_id}.png"
                
                try:
                    # Bersihin teks Base64 nya
                    if "base64," in base64_str:
                        base64_str = base64_str.split("base64,")[1]
                    
                    # Convert ke Gambar
                    img_data = base64.b64decode(base64_str)
                    
                    # 1. Upload ke Bucket 'signatures'
                    supabase.storage.from_("signatures").upload(
                        path=nama_file,
                        file=img_data,
                        file_options={"content-type": "image/png", "x-upsert": "true"}
                    )
                    
                    # 2. UPDATE DATABASE: Ganti teks panjang jadi nama file doang!
                    cursor.execute(
                        "UPDATE chslr_result SET signature = %s WHERE id = %s",
                        (nama_file, row_id)
                    )
                    conn.commit()
                    
                    print(f"🚀 Aman: {nama_file}")
                    total_sukses += 1
                    
                except Exception as e:
                    print(f"❌ Gagal di ID {row_id}: {str(e)}")
    
    except Exception as e:
        print(f"❌ Error Koneksi PostgreSQL: {e}")
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    start_migration()

        
        # Looping terus sampai semua data Base64 habis diubah
        while True:
            # Cari yang di kolom signature masih ada tulisan 'base64'
            cursor.execute("""
                SELECT id, signature FROM chslr_result 
                WHERE signature LIKE '%base64%' 
                LIMIT 500
            """)
            records = cursor.fetchall()
            
            if not records:
                print(f"\n🎉 BERSIH TOTAL! {total_sukses} data Base64 sudah diamankan ke Bucket!")
                break
                
            print(f"🔄 Memproses batch baru: {len(records)} data...")
            
            for row in records:
                row_id = row['id']
                base64_str = row['signature']
                
                # Kasih nama file pakai ID bawaan databasenya (Biar aman buat Audit)
                nama_file = f"sig_{row_id}.png"
                
                try:
                    # Bersihin teks Base64 nya
                    if "base64," in base64_str:
                        base64_str = base64_str.split("base64,")[1]
                    
                    # Convert ke Gambar
                    img_data = base64.b64decode(base64_str)
                    
                    # 1. Upload ke Bucket 'signatures'
                    supabase.storage.from_("signatures").upload(
                        path=nama_file,
                        file=img_data,
                        file_options={"content-type": "image/png", "x-upsert": "true"}
                    )
                    
                    # 2. UPDATE DATABASE: Ganti teks panjang jadi nama file doang!
                    # (Disinilah keajaiban pengurangan Storage terjadi)
                    cursor.execute(
                        "UPDATE chslr_result SET signature = %s WHERE id = %s",
                        (nama_file, row_id)
                    )
                    conn.commit()
                    
                    print(f"🚀 Aman: {nama_file}")
                    total_sukses += 1
                    
                except Exception as e:
                    print(f"❌ Gagal di ID {row_id}: {str(e)}")
    
    except Error as e:
        print(f"❌ Error Koneksi MySQL: {e}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    start_migration()


import os
import base64
from supabase import create_client, Client

# KONFIGURASI SUPABASE
SUPABASE_URL = "https://dsyvlavphvrdidmodokd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeXZsYXZwaHZyZGlkbW9kb2tkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI3Mjk2MywiZXhwIjoyMDgxODQ4OTYzfQ.l5nqlWwtLc_cjUlII9PWf0aU6QNz9bZKglh80MDZFQE" 

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def start_migration():
    print("🔍 Memulai Robot Penyelamat Data Audit Perusahaan...")
    
    total_sukses = 0
    
    # Looping terus sampai semua data Base64 habis diubah
    while True:
        # Cari yang di kolom signature masih ada tulisan 'base64'
        response = supabase.table("chslr_result").select("id, signature").like("signature", "%base64%").limit(500).execute()
        records = response.data
        
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
                
                # 2. UPDATE DATABASE: Ganti teks puanjang jadi nama file doang!
                # (Disinilah keajaiban pengurangan Storage 486MB terjadi)
                supabase.table("chslr_result").update({"signature": nama_file}).eq("id", row_id).execute()
                
                print(f"🚀 Aman: {nama_file}")
                total_sukses += 1
                
            except Exception as e:
                print(f"❌ Gagal di ID {row_id}: {str(e)}")

if __name__ == "__main__":
    start_migration()

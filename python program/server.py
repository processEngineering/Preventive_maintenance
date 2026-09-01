from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras

# 1. Inisiasi Aplikasi & Izin Akses (CORS)
app = Flask(__name__)
CORS(app) 

# 2. Fungsi Koneksi ke Database PostgreSQL Lokal
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="preventive_maintenance", 
        user="postgres",                   
        password="utility123", # Ganti jika password db lu beda
        port="5432"
    )
    return conn

# =================================================================
# ENDPOINT UNTUK FRONTEND (GITHUB / VERCEL)
# =================================================================

# A. Ambil Semua Daftar Mesin (Untuk Dropdown Filter)
@app.route('/api/machines', methods=['GET'])
def get_all_machines():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id, merk_mesin, serial_no, tonage FROM clhmi_machine ORDER BY merk_mesin ASC")
        machines = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(machines), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# B. Ambil Laporan Bulanan Lengkap (Header + Details)
@app.route('/api/report/monthly', methods=['GET'])
def get_monthly_report():
    m_id = request.args.get('machine_id')
    bln = request.args.get('bulan')
    thn = request.args.get('tahun')

    if not all([m_id, bln, thn]):
        return jsonify({"error": "Parameter tidak lengkap"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # 1. Ambil Headers
        query_header = """
            SELECT h.*, 
                   json_build_object(
                       'tonage', m.tonage, 
                       'serial_no', m.serial_no, 
                       'merk_mesin', m.merk_mesin
                   ) as clhmi_machine
            FROM clhmi h
            LEFT JOIN clhmi_machine m ON h.machine_id = m.id
            WHERE h.machine_id = %s AND h.bulan = %s AND h.tahun = %s
            ORDER BY h.tanggal_isi ASC
        """
        cur.execute(query_header, (m_id, bln, thn))
        headers = cur.fetchall()

        if not headers:
            return jsonify({"headers": [], "details": []}), 200

        # 2. Ambil Details berdasarkan ID Header yang didapat
        header_ids = [h['id'] for h in headers]
        query_details = """
            SELECT r.*, 
                   json_build_object('nama_pengecekan', i.nama_pengecekan) as clhmi_items
            FROM clhmi_results r
            LEFT JOIN clhmi_items i ON r.item_id = i.id
            WHERE r.clhmi_id IN %s
        """
        cur.execute(query_details, (tuple(header_ids),))
        details = cur.fetchall()

        cur.close()
        conn.close()
        
        return jsonify({"headers": headers, "details": details}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# C. Ambil Daftar Pertanyaan Checklist (Untuk Pelaksana)
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM clhmi_items ORDER BY urutan::integer ASC")
        items = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# D. Terima Hasil Submit Laporan dari HP
@app.route('/api/submit', methods=['POST'])
def submit_laporan():
    try:
        data = request.json
        # Sementara kita log dulu, nanti bisa ditambah logic INSERT ke DB
        print(f"📥 Laporan Masuk: {data.get('nama_pelaksana')} - Mesin: {data.get('mesin')}")
        return jsonify({"message": "Data berhasil masuk server lokal", "status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Jalankan Server
if __name__ == '__main__':
    print("🚀 Server Lokal AKG Maintenance AKTIF!")
    print("Pintu akses terbuka di Port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
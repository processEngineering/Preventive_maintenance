from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras
from config import Config
import jwt
from datetime import datetime, timedelta
from functools import wraps
import hashlib

# 1. Initialize Flask App & CORS
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = Config.SECRET_KEY

# 2. Load Configuration
config = Config()

# 3. PostgreSQL Database Connection Function
def get_db_connection():
    """Create and return PostgreSQL connection"""
    try:
        conn = psycopg2.connect(**Config.get_db_config())
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise

# 4. JWT Authentication Decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({"error": "Token is missing!"}), 401
        
        try:
            # Remove 'Bearer ' prefix if exists
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
            request.user_id = data['user_id']
            request.user_email = data['email']
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token!"}), 401
        
        return f(*args, **kwargs)
    
    return decorated

# 5. Helper Functions
def hash_password(password):
    """Hash password for storage"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_jwt_token(user_id, email):
    """Generate JWT token"""
    expiration = datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': expiration
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)

# =================================================================
# AUTH ENDPOINTS
# =================================================================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name', email)
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "User already exists"}), 409
        
        # Create new user
        hashed_pwd = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, password, full_name, created_at) VALUES (%s, %s, %s, NOW()) RETURNING id",
            (email, hashed_pwd, full_name)
        )
        user_id = cursor.fetchone()['id']
        conn.commit()
        
        cursor.close()
        conn.close()
        
        # Generate token
        token = generate_jwt_token(user_id, email)
        
        return jsonify({
            "message": "User created successfully",
            "token": token,
            "user": {"id": user_id, "email": email, "full_name": full_name}
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Get user
        cursor.execute("SELECT id, email, password, full_name FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user or user['password'] != hash_password(password):
            cursor.close()
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401
        
        cursor.close()
        conn.close()
        
        # Generate token
        token = generate_jwt_token(user['id'], user['email'])
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {"id": user['id'], "email": user['email'], "full_name": user['full_name']}
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/user', methods=['GET'])
@token_required
def get_user():
    """Get current user info"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cursor.execute(
            "SELECT id, email, full_name FROM users WHERE id = %s",
            (request.user_id,)
        )
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({"user": user}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    """Logout endpoint (token invalidation handled by frontend)"""
    return jsonify({"message": "Logged out successfully"}), 200

# =================================================================
# DATA ENDPOINTS
# =================================================================

# A. Get All Machines (For Dropdown Filter)
@app.route('/api/machines', methods=['GET'])
def get_all_machines():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT id, merk_mesin, serial_no, tonage FROM clhmi_machine ORDER BY merk_mesin ASC")
        machines = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(machines), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# B. Get Monthly Report (Header + Details)
@app.route('/api/report/monthly', methods=['GET'])
def get_monthly_report():
    m_id = request.args.get('machine_id')
    bln = request.args.get('bulan')
    thn = request.args.get('tahun')

    if not all([m_id, bln, thn]):
        return jsonify({"error": "Parameter tidak lengkap"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Get Headers
        query_header = """
            SELECT h.*, 
                   json_build_object('tonage', m.tonage, 'serial_no', m.serial_no, 'merk_mesin', m.merk_mesin) as clhmi_machine
            FROM clhmi h
            LEFT JOIN clhmi_machine m ON h.machine_id = m.id
            WHERE h.machine_id = %s AND h.bulan = %s AND h.tahun = %s
            ORDER BY h.tanggal_isi ASC
        """
        cursor.execute(query_header, (m_id, bln, thn))
        headers = cursor.fetchall()

        if not headers:
            cursor.close()
            conn.close()
            return jsonify({"headers": [], "details": []}), 200

        # Get Details
        header_ids = tuple(h['id'] for h in headers)
        query_details = """
            SELECT r.*, 
                   json_build_object('nama_pengecekan', i.nama_pengecekan) as clhmi_items
            FROM clhmi_results r
            LEFT JOIN clhmi_items i ON r.item_id = i.id
            WHERE r.clhmi_id IN %s
        """
        cursor.execute(query_details, (header_ids,))
        details = cursor.fetchall()

        cursor.close()
        conn.close()
        
        return jsonify({"headers": headers, "details": details}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# C. Get Checklist Items
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT * FROM clhmi_items ORDER BY urutan::integer ASC")
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# D. Submit Checklist Report
@app.route('/api/submit', methods=['POST'])
@token_required
def submit_laporan():
    try:
        data = request.json
        print(f"📥 Laporan Masuk: {data.get('nama_pelaksana')} - Mesin: {data.get('mesin')}")
        
        # TODO: Add INSERT logic to PostgreSQL when ready
        
        return jsonify({"message": "Data berhasil masuk server lokal", "status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# E. Health Check
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return jsonify({"status": "ok", "message": "Server and database are running"}), 200
    except:
        return jsonify({"status": "error", "message": "Database connection failed"}), 500

# 6. Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500

# 7. Run Server
if __name__ == '__main__':
    print("🚀 Server Lokal AKG Maintenance AKTIF!")
    print(f"Environment: {config.FLASK_ENV}")
    print(f"Database: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
    print("Pintu akses terbuka di Port 5000...")
    print("Auth endpoints available at /api/auth/*")
    app.run(host='0.0.0.0', port=5000, debug=config.DEBUG)


# 4. JWT Authentication Decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({"error": "Token is missing!"}), 401
        
        try:
            # Remove 'Bearer ' prefix if exists
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
            request.user_id = data['user_id']
            request.user_email = data['email']
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token!"}), 401
        
        return f(*args, **kwargs)
    
    return decorated

# 5. Helper Functions
def hash_password(password):
    """Hash password for storage"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_jwt_token(user_id, email):
    """Generate JWT token"""
    expiration = datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': expiration
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)

# =================================================================
# AUTH ENDPOINTS
# =================================================================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name', email)
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "User already exists"}), 409
        
        # Create new user
        hashed_pwd = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, password, full_name, created_at) VALUES (%s, %s, %s, NOW())",
            (email, hashed_pwd, full_name)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        # Generate token
        token = generate_jwt_token(user_id, email)
        
        return jsonify({
            "message": "User created successfully",
            "token": token,
            "user": {"id": user_id, "email": email, "full_name": full_name}
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user
        cursor.execute("SELECT id, email, password, full_name FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user or user['password'] != hash_password(password):
            cursor.close()
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401
        
        cursor.close()
        conn.close()
        
        # Generate token
        token = generate_jwt_token(user['id'], user['email'])
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {"id": user['id'], "email": user['email'], "full_name": user['full_name']}
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/user', methods=['GET'])
@token_required
def get_user():
    """Get current user info"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, email, full_name, role FROM users WHERE id = %s",
            (request.user_id,)
        )
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({"user": user}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    """Logout endpoint (token invalidation handled by frontend)"""
    return jsonify({"message": "Logged out successfully"}), 200

# =================================================================
# DATA ENDPOINTS
# =================================================================

# A. Get All Machines (For Dropdown Filter)
@app.route('/api/machines', methods=['GET'])
def get_all_machines():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, merk_mesin, serial_no, tonage FROM clhmi_machine ORDER BY merk_mesin ASC")
        machines = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(machines), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# B. Get Monthly Report (Header + Details)
@app.route('/api/report/monthly', methods=['GET'])
def get_monthly_report():
    m_id = request.args.get('machine_id')
    bln = request.args.get('bulan')
    thn = request.args.get('tahun')

    if not all([m_id, bln, thn]):
        return jsonify({"error": "Parameter tidak lengkap"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get Headers
        query_header = """
            SELECT h.*, 
                   JSON_OBJECT('tonage', m.tonage, 'serial_no', m.serial_no, 'merk_mesin', m.merk_mesin) as clhmi_machine
            FROM clhmi h
            LEFT JOIN clhmi_machine m ON h.machine_id = m.id
            WHERE h.machine_id = %s AND h.bulan = %s AND h.tahun = %s
            ORDER BY h.tanggal_isi ASC
        """
        cursor.execute(query_header, (m_id, bln, thn))
        headers = cursor.fetchall()

        if not headers:
            cursor.close()
            conn.close()
            return jsonify({"headers": [], "details": []}), 200

        # Get Details
        header_ids = tuple(h['id'] for h in headers)
        placeholders = ','.join(['%s'] * len(header_ids))
        query_details = f"""
            SELECT r.*, 
                   JSON_OBJECT('nama_pengecekan', i.nama_pengecekan) as clhmi_items
            FROM clhmi_results r
            LEFT JOIN clhmi_items i ON r.item_id = i.id
            WHERE r.clhmi_id IN ({placeholders})
        """
        cursor.execute(query_details, header_ids)
        details = cursor.fetchall()

        cursor.close()
        conn.close()
        
        return jsonify({"headers": headers, "details": details}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# C. Get Checklist Items
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM clhmi_items ORDER BY CAST(urutan AS UNSIGNED) ASC")
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# D. Submit Checklist Report
@app.route('/api/submit', methods=['POST'])
@token_required
def submit_laporan():
    try:
        data = request.json
        print(f"📥 Laporan Masuk: {data.get('nama_pelaksana')} - Mesin: {data.get('mesin')}")
        
        # TODO: Add INSERT logic to MySQL when ready
        
        return jsonify({"message": "Data berhasil masuk server lokal", "status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# E. Health Check
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return jsonify({"status": "ok", "message": "Server and database are running"}), 200
    except:
        return jsonify({"status": "error", "message": "Database connection failed"}), 500

# 6. Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500

# 7. Run Server
if __name__ == '__main__':
    print("🚀 Server Lokal AKG Maintenance AKTIF!")
    print(f"Environment: {config.FLASK_ENV}")
    print(f"Database: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
    print("Pintu akses terbuka di Port 5000...")
    print("Auth endpoints available at /api/auth/*")
    app.run(host='0.0.0.0', port=5000, debug=config.DEBUG)


import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Database Configuration"""
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_NAME = os.getenv('DB_NAME', 'preventive_maintenance')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'utility123')
    DB_PORT = os.getenv('DB_PORT', '5432')
    
    # Flask Configuration
    DEBUG = os.getenv('DEBUG', 'True') == 'True'
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    
    @staticmethod
    def get_db_url():
        """Generate database connection string"""
        return {
            'host': Config.DB_HOST,
            'database': Config.DB_NAME,
            'user': Config.DB_USER,
            'password': Config.DB_PASSWORD,
            'port': Config.DB_PORT
        }

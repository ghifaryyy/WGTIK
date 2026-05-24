from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

db = SQLAlchemy()

def create_app():
    # Set static_folder to the frontend directory so we serve assets directly
    frontend_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend'))
    app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///rodation.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    app.config['UPLOAD_FOLDER'] = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    
    # Create upload and processed folders if they don't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'processed'), exist_ok=True)
    
    # Register blueprints
    from app.routes import detection_bp, report_bp, stats_bp
    app.register_blueprint(detection_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(stats_bp)
    
    # Explicit route to serve frontend index.html on root
    @app.route('/')
    def serve_index():
        return app.send_static_file('index.html')
        
    # Explicit route to serve uploaded and processed images
    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    return app


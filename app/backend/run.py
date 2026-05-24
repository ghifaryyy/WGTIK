import os
import sys
from datetime import datetime, timedelta
import random

# Add current folder to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.detection import Detection

app = create_app()

def seed_mock_data():
    """Seed realistic pothole reports around Telkom University, Bandung for demo purposes"""
    with app.app_context():
        # Check if database already has records
        if Detection.query.count() > 0:
            print("Database already contains data. Skipping seeding.")
            return
            
        print("[SEED] Seeding realistic road damage reports in Bandung...")
        
        # Coordinates around Telkom University, Bandung
        # Center: -6.9745, 107.6304
        locations = [
            {"lat": -6.9732, "lng": 107.6295, "desc": "Lubang jalan diameter 30cm di Jl. Telekomunikasi", "severity": "High", "status": "Reported", "days_ago": 0},
            {"lat": -6.9754, "lng": 107.6321, "desc": "Retakan aspal memanjang dekat gerbang belakang kampus", "severity": "Medium", "status": "Verified", "days_ago": 1},
            {"lat": -6.9711, "lng": 107.6278, "desc": "Lubang jalan cukup dalam rawan kecelakaan bagi pengendara motor", "severity": "High", "status": "Scheduled", "days_ago": 2},
            {"lat": -6.9772, "lng": 107.6309, "desc": "Deformasi jalan bergelombang dekat pertigaan Sukabirus", "severity": "Medium", "status": "Reported", "days_ago": 3},
            {"lat": -6.9749, "lng": 107.6254, "desc": "Pothole kecil di perumahan dekat masjid", "severity": "Low", "status": "Repaired", "days_ago": 4},
            {"lat": -6.9791, "lng": 107.6335, "desc": "Lubang beruntun di jalan akses Sukapura", "severity": "High", "status": "Repaired", "days_ago": 5},
            {"lat": -6.9723, "lng": 107.6341, "desc": "Retakan buaya meluas di area parkir luar", "severity": "Low", "status": "Verified", "days_ago": 2},
            {"lat": -6.9765, "lng": 107.6288, "desc": "Lubang amblas setelah hujan deras", "severity": "High", "status": "Reported", "days_ago": 0},
            {"lat": -6.9750, "lng": 107.6315, "desc": "Lubang sedang terendam air hujan", "severity": "Medium", "status": "Repaired", "days_ago": 6},
            {"lat": -6.9780, "lng": 107.6268, "desc": "Kerusakan pinggir jalan tergerus air selokan", "severity": "Low", "status": "Scheduled", "days_ago": 1}
        ]
        
        reporters = [
            "Ghifary Wibisono", "Prayata Yasinkha", "Zaky Muhammad", 
            "Luthfia Maulidya", "Pak Andi (Ojol)", "Ibu Ratih (Logistik)"
        ]
        
        # Standard filenames to assign
        image_filenames = [
            "demo_pothole_1.jpg", "demo_pothole_2.jpg", "demo_pothole_3.jpg"
        ]
        
        for loc in locations:
            # Create a nice datetime in the past
            created_time = datetime.utcnow() - timedelta(days=loc["days_ago"], hours=random.randint(1, 10))
            
            # Select random image filename and reporter
            img_file = random.choice(image_filenames)
            reporter = random.choice(reporters)
            
            # Calculate a realistic confidence based on severity
            confidence = random.uniform(0.72, 0.96) if loc["severity"] != "Low" else random.uniform(0.55, 0.75)
            
            report = Detection(
                filename=img_file,
                original_filename=img_file,
                damage_class='Damaged',
                confidence=confidence,
                latitude=loc["lat"],
                longitude=loc["lng"],
                severity=loc["severity"],
                status=loc["status"],
                description=loc["desc"],
                reporter_name=reporter,
                created_at=created_time
            )
            
            db.session.add(report)
            
        try:
            db.session.commit()
            print("[SEED] Seeding completed! Database populated with 10 sample reports.")
        except Exception as e:
            db.session.rollback()
            print(f"[SEED] Seeding failed: {e}")

if __name__ == '__main__':
    # Initialize and seed database
    seed_mock_data()
    
    # Run the server
    print("[SERVER] Starting RODATION AI full-stack development server...")
    print("[SERVER] Listening on all network interfaces. To connect from your phone:")
    print("[SERVER] 1. Connect phone and laptop to the same Wi-Fi/Hotspot network.")
    print("[SERVER] 2. Find your laptop IP using 'ipconfig' (e.g. 192.168.1.15).")
    print("[SERVER] 3. Open http://<YOUR_IP>:5000 in your phone's browser.")
    print("-" * 70)
    
    app.run(host='0.0.0.0', port=5000, debug=True)



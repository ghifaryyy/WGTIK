from flask import request, jsonify, current_app
from app.routes import detection_bp
from app.models.detection import Detection
from app import db
from app.utils.image_utils import allowed_file, draw_detections
from app.utils.model_utils import get_model_manager
import os
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def get_image_gps(image_path):
    """
    Extract GPS decimal coordinates from an image's EXIF metadata.
    Returns (latitude, longitude) or (None, None).
    """
    try:
        img = Image.open(image_path)
        exif = img._getexif()
        if not exif:
            return None, None
            
        gps_info = {}
        for tag, value in exif.items():
            decoded = TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                for t in value:
                    sub_decoded = GPSTAGS.get(t, t)
                    gps_info[sub_decoded] = value[t]
                    
        if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
            lat = gps_info["GPSLatitude"]
            lat_ref = gps_info.get("GPSLatitudeRef", "N")
            lng = gps_info["GPSLongitude"]
            lng_ref = gps_info.get("GPSLongitudeRef", "E")
            
            def to_decimal(coords, ref):
                # PIL extracts them as rational fractions (deg, min, sec)
                deg = float(coords[0])
                mins = float(coords[1])
                sec = float(coords[2])
                
                decimal = deg + (mins / 60.0) + (sec / 3600.0)
                if ref in ['S', 'W']:
                    decimal = -decimal
                return decimal
                
            return to_decimal(lat, lat_ref), to_decimal(lng, lng_ref)
    except Exception:
        pass
    return None, None

@detection_bp.route('/detect', methods=['POST'])
def detect_damage():
    """
    Handle road damage detection by uploading an image.
    Performs YOLO inference, draws bounding boxes, calculates severity, and saves to DB.
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image file selected'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file format. Use PNG, JPG, JPEG, or GIF'}), 400
        
    # Get default fallback metadata from request
    latitude = request.form.get('latitude', type=float)
    longitude = request.form.get('longitude', type=float)
    description = request.form.get('description', default='')
    reporter_name = request.form.get('reporter_name', default='Citizen Patroller')
    
    # Save the original file
    original_filename = secure_filename(file.filename)
    unique_id = uuid.uuid4().hex[:10]
    filename = f"{unique_id}_{original_filename}"
    
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    
    original_path = os.path.join(upload_folder, filename)
    file.save(original_path)
    
    # Try to extract GPS from photo EXIF metadata
    exif_lat, exif_lng = get_image_gps(original_path)
    if exif_lat is not None and exif_lng is not None:
        latitude = exif_lat
        longitude = exif_lng
        current_app.logger.info(f"Successfully extracted original EXIF GPS location from photo: {latitude}, {longitude}")
    
    # Process YOLO Inference
    try:
        model_manager = get_model_manager()
        results = model_manager.predict(original_path)
        
        # Classify damage and get confidence
        damage_class, confidence = model_manager.classify_damage(results)
        severity = model_manager.get_severity(results)
        
        # Path for processed/drawn image
        processed_dir = os.path.join(upload_folder, 'processed')
        os.makedirs(processed_dir, exist_ok=True)
        processed_filename = f"processed_{filename}"
        processed_path = os.path.join(processed_dir, processed_filename)
        
        # Draw detections
        if damage_class == 'Damaged':
            draw_detections(original_path, results, processed_path)
        else:
            # If normal, just copy the original or save without boxes
            import shutil
            shutil.copy(original_path, processed_path)
            
        # Create database entry
        detection = Detection(
            filename=processed_filename,
            original_filename=filename,
            damage_class=damage_class,
            confidence=confidence,
            latitude=latitude,
            longitude=longitude,
            severity=severity,
            status='Reported',
            description=description,
            reporter_name=reporter_name
        )
        
        db.session.add(detection)
        db.session.commit()
        
        # Prepare bounding boxes list to return to frontend
        boxes_data = []
        if len(results) > 0 and len(results[0].boxes) > 0:
            for box in results[0].boxes:
                x1, y1, x2, y2 = map(float, box.xyxy[0])
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                boxes_data.append({
                    'x1': x1,
                    'y1': y1,
                    'x2': x2,
                    'y2': y2,
                    'confidence': round(conf, 2),
                    'class_id': cls_id
                })
        
        return jsonify({
            'success': True,
            'message': 'Road analysis completed successfully',
            'detection': detection.to_dict(),
            'boxes': boxes_data,
            'image_url': f'/uploads/processed/{processed_filename}',
            'original_image_url': f'/uploads/{filename}'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during detection API: {e}")
        return jsonify({'error': f"Failed to process image: {str(e)}"}), 500


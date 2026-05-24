import cv2
import numpy as np
from PIL import Image
import os

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file, upload_folder):
    """Save uploaded file to upload folder"""
    if not allowed_file(file.filename):
        return None
    
    filename = os.path.join(upload_folder, file.filename)
    file.save(filename)
    return filename

def preprocess_image(image_path, target_size=(640, 640)):
    """Preprocess image for YOLO inference"""
    image = cv2.imread(image_path)
    if image is None:
        return None
    
    original_h, original_w = image.shape[:2]
    
    # Resize to target size
    image_resized = cv2.resize(image, target_size)
    
    # Normalize
    image_normalized = image_resized.astype(np.float32) / 255.0
    
    return image_normalized, (original_w, original_h)

def draw_detections(image_path, results, output_path):
    """Draw detection results on image"""
    image = cv2.imread(image_path)
    
    # Draw bounding boxes from results
    if results and len(results) > 0:
        boxes = results[0].boxes
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            
            # Draw rectangle
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Put text
            label = f'Damage: {confidence:.2f}'
            cv2.putText(image, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    cv2.imwrite(output_path, image)
    return output_path

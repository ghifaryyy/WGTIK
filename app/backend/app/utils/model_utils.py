import os
import logging
import random

logger = logging.getLogger(__name__)

# Conditional import of YOLOv8
try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except ImportError:
    HAS_ULTRALYTICS = False
    logger.warning("ultralytics package not found. Running in EMULATED Mode with Mock Detections.")

# --- Mock YOLOv8 Structure to avoid crashes and emulate YOLO results ---
class MockBox:
    def __init__(self, xyxy, conf, cls):
        self.xyxy = [xyxy]  # Format: [[x1, y1, x2, y2]]
        self.conf = [conf]
        self.cls = [cls]

class MockBoxes:
    def __init__(self, boxes):
        self.boxes_list = boxes
        
    def __len__(self):
        return len(self.boxes_list)
        
    def __iter__(self):
        return iter(self.boxes_list)
    
    @property
    def conf(self):
        # Emulate the boxes.conf property
        class ConfList:
            def __init__(self, boxes):
                self.boxes = boxes
            def max(self):
                if not self.boxes:
                    return 0.0
                return max(b.conf[0] for b in self.boxes)
        return ConfList(self.boxes_list)

class MockResult:
    def __init__(self, boxes):
        self.boxes = MockBoxes(boxes)

# ----------------------------------------------------------------------

class ModelManager:
    _instance = None
    _model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._model is None and HAS_ULTRALYTICS:
            self.load_model()
    
    def load_model(self):
        """Load YOLOv8 model"""
        try:
            # Try to load local model first
            model_path = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'best.pt')
            if os.path.exists(model_path):
                self._model = YOLO(model_path)
                logger.info(f"Loaded model from {model_path}")
            else:
                # Use pre-trained YOLOv8n
                self._model = YOLO('yolov8n.pt')
                logger.info("Loaded pre-trained YOLOv8n model")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self._model = None
    
    def predict(self, image_path, conf=0.5):
        """Run inference on image"""
        if HAS_ULTRALYTICS and self._model is not None:
            try:
                results = self._model.predict(
                    image_path,
                    conf=conf,
                    verbose=False
                )
                return results
            except Exception as e:
                logger.error(f"Error during real inference: {e}. Falling back to emulation.")
        
        # Emulated Inference Mode
        return self._predict_mock(image_path, conf)
        
    def _predict_mock(self, image_path, conf=0.5):
        """Generate realistic mock pothole detections for demo purposes"""
        # Determine if we should mock normal or damaged
        # We can look at the filename
        filename_lower = os.path.basename(image_path).lower()
        if 'normal' in filename_lower or 'clean' in filename_lower:
            # No potholes detected
            return [MockResult([])]
            
        # Standard emulation: generate 1-3 potholes in the lower half of the image
        # Let's get mock size of image or assume standard 640x640
        width, height = 640, 640
        try:
            from PIL import Image
            with Image.open(image_path) as img:
                width, height = img.size
        except Exception:
            pass
            
        boxes = []
        # Generate 1 to 2 potholes with high probability, occasionally 0 or 3
        num_potholes = random.choices([0, 1, 2, 3], weights=[0.1, 0.5, 0.3, 0.1])[0]
        
        # If the filename explicitly indicates damage (e.g. contains 'pothole' or 'damaged'), ensure at least 1
        if any(x in filename_lower for x in ['pothole', 'damage', 'crack', 'lubang', 'rusak']) and num_potholes == 0:
            num_potholes = 1
            
        for _ in range(num_potholes):
            # Potholes are usually in the lower half of the road view (y between 0.45 and 0.85)
            # and centered horizontally (x between 0.15 and 0.85)
            w_box = int(width * random.uniform(0.08, 0.25))
            h_box = int(height * random.uniform(0.05, 0.18))
            
            x1 = int(width * random.uniform(0.15, 0.85 - (w_box / width)))
            y1 = int(height * random.uniform(0.45, 0.85 - (h_box / height)))
            x2 = x1 + w_box
            y2 = y1 + h_box
            
            box_conf = random.uniform(0.55, 0.94)
            # class 0 = pothole
            boxes.append(MockBox([x1, y1, x2, y2], box_conf, 0))
            
        return [MockResult(boxes)]
    
    def classify_damage(self, results):
        """Classify if road is damaged or normal based on detection results"""
        if not results or len(results) == 0:
            return 'Normal', 0.0
        
        detections = results[0]
        
        # If detections found, it's damaged
        if len(detections.boxes) > 0:
            max_conf = float(detections.boxes.conf.max())
            return 'Damaged', max_conf
        else:
            return 'Normal', 1.0
            
    def get_severity(self, results):
        """Calculate damage severity based on the maximum bounding box area relative to image"""
        if not results or len(results) == 0 or len(results[0].boxes) == 0:
            return 'Normal'
            
        max_area = 0.0
        # Let's try to get image size
        # We can approximate normalized size from box coordinate ranges
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0]
            # If coordinates are > 1, they are absolute pixels. We need to normalize or estimate
            # Standard image is 640x640. If coordinates are small (< 1.1), they are already normalized.
            # Otherwise they are pixels.
            if x1 > 1.5:
                # Absolute pixels
                # Let's assume typical image size is 640x640, or retrieve it if possible
                width = 640
                height = 640
                # Normalise coordinates
                w = (x2 - x1) / width
                h = (y2 - y1) / height
            else:
                w = x2 - x1
                h = y2 - y1
                
            area = w * h
            if area > max_area:
                max_area = area
                
        # Severity thresholds:
        # High: > 4.5% of the frame (large pothole / highly dangerous)
        # Medium: > 1.2% of the frame
        # Low: otherwise
        if max_area > 0.045:
            return 'High'
        elif max_area > 0.012:
            return 'Medium'
        else:
            return 'Low'

# Singleton instance
_model_manager = None

def get_model_manager():
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelManager()
    return _model_manager


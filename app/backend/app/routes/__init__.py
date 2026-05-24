from flask import Blueprint

# Initialize Blueprints
detection_bp = Blueprint('detection', __name__, url_prefix='/api/detection')
report_bp = Blueprint('report', __name__, url_prefix='/api/reports')
stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

# Import routes to associate endpoints with blueprints
# These imports are required so that the handlers are loaded by Flask
from app.routes.detection import *
from app.routes.report import *
from app.routes.stats import *

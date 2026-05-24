from flask import request, jsonify
from app.routes import report_bp
from app.models.detection import Detection
from app import db

@report_bp.route('', methods=['GET'])
def get_reports():
    """Get all reports with optional filters (status, severity)"""
    status_filter = request.args.get('status')
    severity_filter = request.args.get('severity')
    damage_class_filter = request.args.get('damage_class', default='Damaged') # Default to showing damaged ones
    
    query = Detection.query
    
    if damage_class_filter:
        query = query.filter_by(damage_class=damage_class_filter)
    if status_filter:
        query = query.filter_by(status=status_filter)
    if severity_filter:
        query = query.filter_by(severity=severity_filter)
        
    reports = query.order_by(Detection.created_at.desc()).all()
    return jsonify([report.to_dict() for report in reports]), 200

@report_bp.route('/<int:report_id>', methods=['GET'])
def get_report(report_id):
    """Get detailed report by ID"""
    report = Detection.query.get_or_404(report_id)
    return jsonify(report.to_dict()), 200

@report_bp.route('/manual', methods=['POST'])
def create_manual_report():
    """Allow manual reporting from citizen form (without immediate backend YOLO run)"""
    data = request.json or {}
    
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    severity = data.get('severity', 'Medium')
    description = data.get('description', '')
    reporter_name = data.get('reporter_name', 'Citizen Patroller')
    
    # Create database entry
    report = Detection(
        filename='default_pothole.jpg', # Fallback placeholder
        original_filename='manual_report.jpg',
        damage_class='Damaged',
        confidence=1.0,
        latitude=latitude,
        longitude=longitude,
        severity=severity,
        status='Reported',
        description=description,
        reporter_name=reporter_name
    )
    
    try:
        db.session.add(report)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Report submitted successfully!',
            'report': report.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Failed to submit report: {str(e)}"}), 500

@report_bp.route('/<int:report_id>', methods=['PATCH'])
def update_report_status(report_id):
    """Update report status and/or details (Government Dashboard)"""
    report = Detection.query.get_or_404(report_id)
    data = request.json or {}
    
    if 'status' in data:
        status = data['status']
        if status not in ['Reported', 'Verified', 'Scheduled', 'Repaired']:
            return jsonify({'error': 'Invalid status'}), 400
        report.status = status
        
    if 'severity' in data:
        severity = data['severity']
        if severity not in ['Low', 'Medium', 'High']:
            return jsonify({'error': 'Invalid severity'}), 400
        report.severity = severity
        
    if 'description' in data:
        report.description = data['description']

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f"Report #{report.id} updated successfully",
            'report': report.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Failed to update report: {str(e)}"}), 500

@report_bp.route('/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    """Delete a report from database"""
    report = Detection.query.get_or_404(report_id)
    try:
        db.session.delete(report)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Report deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Failed to delete report: {str(e)}"}), 500

/* ==========================================================================
   RODATION AI - MAIN JAVASCRIPT APPLICATION
   Single Page Application Logic, Charts, Maps, and API Integrations
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Application Constants & Global State ---
    const API_URL = ''; // Relative path since they are hosted on the same Flask server
    const TELKOM_UNIVERSITY_COORDS = [-6.9745, 107.6304];
    
    let mainMap = null;
    let miniMap = null;
    let miniMapMarker = null;
    let mapMarkers = {}; // Store markers by report ID
    
    let severityChart = null;
    let timelineChart = null;
    
    // Holds currently analyzed image in sandbox for saving later
    let currentSandboxImage = null; 
    let pendingTargetView = null;

    // --- Core Initialization ---
    initNavigation();
    initClock();
    initMaps();
    refreshDashboard();
    initSandbox();
    initCitizenForm();
    initGovConsoleFilters();
    initAutocomplete();
    initLogin();
    initLandingCTAs();

    // --- 1. Dynamic Navigation & Tab Views ---
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.content-view');
        const viewTitle = document.getElementById('view-title');
        const btnBackHome = document.getElementById('btn-back-home');
        const liveIndicator = document.querySelector('.live-indicator');

        // Back to Home Button click handler for guest map view
        if (btnBackHome) {
            btnBackHome.addEventListener('click', () => {
                const landingTab = document.querySelector('[data-view="landing"]');
                if (landingTab) landingTab.click();
            });
        }

        // Back to Home logo click handler for guest layout
        const headerLogo = document.getElementById('header-logo');
        if (headerLogo) {
            headerLogo.addEventListener('click', () => {
                const landingTab = document.querySelector('[data-view="landing"]');
                if (landingTab) landingTab.click();
            });
        }

        navItems.forEach(item => {
            if (item.classList.contains('logout-item')) return; // Sign Out is handled separately

            item.addEventListener('click', (e) => {
                const targetView = item.getAttribute('data-view');
                const loggedInRole = sessionStorage.getItem('rodation_user_role');

                if (targetView !== 'dashboard' && targetView !== 'landing' && !loggedInRole) {
                    // Block guest, record target view, trigger login overlay
                    e.preventDefault();
                    pendingTargetView = targetView;
                    document.getElementById('login-overlay').style.display = 'flex';
                    
                    // Reset nav item active style back to landing
                    navItems.forEach(n => n.classList.remove('active'));
                    const landingNavItem = document.querySelector('[data-view="landing"]');
                    if (landingNavItem) landingNavItem.classList.add('active');
                    return;
                }

                // If citizen user tries to open Gov Console, block them
                if (targetView === 'government' && loggedInRole !== 'admin') {
                    alert("Akses Terbatas: Hanya Instansi Pemerintah (Admin) yang dapat mengakses Gov Console.");
                    return;
                }

                // Normal Tab switching
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                
                views.forEach(v => v.classList.remove('active'));
                const activeView = document.getElementById(`view-${targetView}`);
                if (activeView) activeView.classList.add('active');
                
                viewTitle.textContent = item.querySelector('.nav-text').textContent;

                // Show/hide Back to Home button for Guests viewing Map Tracker
                if (!loggedInRole && targetView === 'dashboard') {
                    if (btnBackHome) btnBackHome.style.display = 'inline-flex';
                    if (liveIndicator) liveIndicator.style.display = 'none';
                } else {
                    if (btnBackHome) btnBackHome.style.display = 'none';
                    if (liveIndicator) liveIndicator.style.display = 'inline-flex';
                }
                
                if (targetView === 'dashboard') {
                    refreshDashboard();
                } else if (targetView === 'reports') {
                    setTimeout(() => {
                        if (miniMap) miniMap.invalidateSize();
                    }, 200);
                    refreshCitizenHistory();
                } else if (targetView === 'government') {
                    refreshGovConsole();
                }
            });
        });
    }

    // --- 2. Live Clock Widget ---
    function initClock() {
        const timeSpan = document.getElementById('current-time');
        function updateTime() {
            const now = new Date();
            const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true };
            timeSpan.textContent = now.toLocaleDateString('en-US', options);
        }
        updateTime();
        setInterval(updateTime, 60000);
    }

    // --- 3. Leaflet.js Mapping Services ---
    function initMaps() {
        if (typeof L === 'undefined') {
            console.warn("Leaflet Map Library not loaded. Offline placeholder active.");
            renderOfflineMapPlaceholder('map', 'Main Map Tracker');
            renderOfflineMapPlaceholder('mini-map', 'Mini Map Picker');
            return;
        }

        // A. Primary Map (Dashboard)
        mainMap = L.map('map').setView(TELKOM_UNIVERSITY_COORDS, 15);
        
        // Load Voyager Light tiles for premium bright style
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(mainMap);

        // B. Mini Map (Citizen Reporting Page)
        miniMap = L.map('mini-map').setView(TELKOM_UNIVERSITY_COORDS, 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(miniMap);

        // Map Click events for coordinate selections
        miniMap.on('click', (e) => {
            const { lat, lng } = e.latlng;
            setCitizenCoords(lat, lng);
        });

        // Add a default marker in the center for the citizen form
        setCitizenCoords(TELKOM_UNIVERSITY_COORDS[0], TELKOM_UNIVERSITY_COORDS[1]);
    }

    function renderOfflineMapPlaceholder(containerId, title) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="fallback-map-mockup">
                    <div class="radar-sweep"></div>
                    <p style="margin: 0; font-family: Outfit; font-size: 1.1rem;"><i class="fa-solid fa-earth-americas"></i> ${title} (Simulated)</p>
                    <p style="font-size: 0.75rem; font-weight: 400; color: var(--text-muted); text-align: center; max-width: 85%; margin: 4px 0 0 0; line-height:1.3;">
                        SQLite Database is online. Pothole coordinates are fully loaded. Map visualization requires an active internet connection to load Leaflet CDN.
                    </p>
                </div>
            `;
        }
    }

    function setCitizenCoords(lat, lng) {
        const latInput = document.getElementById('rep-lat');
        const lngInput = document.getElementById('rep-lng');
        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);

        // Update readable address display
        const addressText = document.getElementById('address-text');
        if (addressText) {
            const readableAddr = getReadableAddress(lat, lng);
            if (addressText.tagName === 'INPUT') {
                addressText.value = readableAddr;
            } else {
                addressText.textContent = readableAddr;
            }
        }

        if (typeof L !== 'undefined' && miniMap) {
            if (miniMapMarker) {
                miniMapMarker.setLatLng([lat, lng]);
            } else {
                miniMapMarker = L.marker([lat, lng], { draggable: true }).addTo(miniMap);
                miniMapMarker.on('dragend', () => {
                    const pos = miniMapMarker.getLatLng();
                    if (latInput) latInput.value = pos.lat.toFixed(6);
                    if (lngInput) lngInput.value = pos.lng.toFixed(6);
                    if (addressText) {
                        const readableAddr = getReadableAddress(pos.lat, pos.lng);
                        if (addressText.tagName === 'INPUT') {
                            addressText.value = readableAddr;
                        } else {
                            addressText.textContent = readableAddr;
                        }
                    }
                });
            }
        }
    }

    // --- 4. Refresh Dashboard Data (Map, Cards, Charts, Logs) ---
    async function refreshDashboard() {
        try {
            // A. Fetch Summary Stats Cards
            const statsRes = await fetch(`${API_URL}/api/stats/summary`);
            const stats = await statsRes.json();
            
            document.getElementById('stat-total').textContent = stats.total_detections;
            document.getElementById('stat-active').textContent = stats.pending_repairs;
            document.getElementById('stat-repaired').textContent = stats.repaired_roads;
            document.getElementById('stat-hotspots').textContent = stats.high_severity_hotspots;
            
            // Set Gov badge alert
            const pendingBadge = document.getElementById('pending-badge');
            pendingBadge.textContent = stats.pending_repairs;
            pendingBadge.style.display = stats.pending_repairs > 0 ? 'block' : 'none';

            // B. Fetch All Reports and Add Pins to Map
            const reportsRes = await fetch(`${API_URL}/api/reports?damage_class=Damaged`);
            const reports = await reportsRes.json();
            
            if (typeof L !== 'undefined' && mainMap) {
                // Clear existing markers
                Object.values(mapMarkers).forEach(marker => mainMap.removeLayer(marker));
                mapMarkers = {};

                reports.forEach(report => {
                    if (report.latitude && report.longitude) {
                        // Decide color code based on severity/status
                        let color = '#ef4444'; // High (Red)
                        if (report.status === 'Repaired') {
                            color = '#10b981'; // Repaired (Green)
                        } else if (report.severity === 'Medium') {
                            color = '#f97316'; // Medium (Orange)
                        } else if (report.severity === 'Low') {
                            color = '#eab308'; // Low (Yellow)
                        }

                        // Circle Marker with a sleek glowing border
                        const marker = L.circleMarker([report.latitude, report.longitude], {
                            radius: 8,
                            fillColor: color,
                            color: '#ffffff',
                            weight: 2,
                            opacity: 0.9,
                            fillOpacity: 0.8
                        }).addTo(mainMap);

                        // Click popup card template
                        const popupContent = `
                            <div class="map-popup-card">
                                <img class="popup-img" src="${report.filename.startsWith('demo_pothole_') ? '/uploads/' + report.filename : '/uploads/processed/' + report.filename}" onerror="this.src='/uploads/default_pothole.jpg'">
                                <div class="popup-title">${report.reporter_name}</div>
                                <div class="popup-desc">${report.description || 'Pothole detected.'}</div>
                                <div class="popup-footer">
                                    <span class="status-pill ${report.status.toLowerCase()}">${report.status}</span>
                                    <span class="popup-date">${formatDate(report.created_at)}</span>
                                </div>
                            </div>
                        `;
                        marker.bindPopup(popupContent);
                        mapMarkers[report.id] = marker;
                    }
                });

                // Make Leaflet fit boundaries if we have pins
                const validCoords = reports.filter(r => r.latitude && r.longitude).map(r => [r.latitude, r.longitude]);
                if (validCoords.length > 0) {
                    mainMap.fitBounds(validCoords, { padding: [50, 50] });
                } else {
                    mainMap.setView(TELKOM_UNIVERSITY_COORDS, 15);
                }
            }

            // C. Fetch Chart Statistics & Draw Graph
            const chartsRes = await fetch(`${API_URL}/api/stats/chart`);
            const chartsData = await chartsRes.json();
            renderCharts(chartsData);

            // D. Populate Live Activity Feed List
            const feedContainer = document.getElementById('activity-feed-list');
            feedContainer.innerHTML = '';
            
            if (stats.recent_logs.length === 0) {
                feedContainer.innerHTML = '<p style="text-align:center; padding:20px; font-size:0.8rem; color:var(--text-muted);">No reports logged yet.</p>';
            } else {
                stats.recent_logs.forEach(log => {
                    const item = document.createElement('div');
                    item.className = `activity-item ${log.status === 'Repaired' ? 'repaired' : log.severity.toLowerCase()}`;
                    item.innerHTML = `
                        <div class="activity-details">
                            <span class="activity-desc">${log.description || 'Pothole detected by ' + log.reporter_name}</span>
                            <span class="activity-meta"><i class="fa-solid fa-clock"></i> ${formatTimeAgo(log.created_at)} • by ${log.reporter_name}</span>
                        </div>
                        <span class="activity-badge ${log.status === 'Repaired' ? 'repaired' : log.severity.toLowerCase()}">
                            ${log.status === 'Repaired' ? 'Repaired' : log.severity}
                        </span>
                    `;
                    feedContainer.appendChild(item);
                });
            }

        } catch (e) {
            console.error("Error refreshing dashboard:", e);
        }
    }

    // --- 5. Chart.js Graphs Configuration ---
    function renderCharts(data) {
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js not loaded. Chart visualizations skipped.");
            document.querySelectorAll('.chart-box').forEach((box, idx) => {
                box.innerHTML = `
                    <div style="text-align:center; padding:15px; font-size:0.8rem; color:var(--text-muted);">
                        <i class="fa-solid fa-chart-simple" style="font-size:1.8rem; color:var(--primary); margin-bottom:6px;"></i>
                        <p style="margin:0; font-weight:600; color:#0f172a;">${idx === 0 ? 'Severity Split' : 'Monthly Activity'}</p>
                        <p style="font-size:0.7rem; margin:2px 0 0 0;">Chart.js requires active internet.</p>
                    </div>
                `;
            });
            return;
        }

        // A. Severity Doughnut Chart
        if (severityChart) severityChart.destroy();
        const ctxSeverity = document.getElementById('chart-severity').getContext('2d');
        severityChart = new Chart(ctxSeverity, {
            type: 'doughnut',
            data: {
                labels: data.severity_distribution.labels,
                datasets: [{
                    data: data.severity_distribution.data,
                    backgroundColor: ['#ef4444', '#f97316', '#eab308'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#475569', font: { family: 'Inter', size: 9 } }
                    },
                    title: {
                        display: true,
                        text: 'SEVERITY INTENSITY',
                        color: '#0f172a',
                        font: { family: 'Outfit', size: 11, weight: 'bold' }
                    }
                }
            }
        });

        // B. Timeline Line Chart
        if (timelineChart) timelineChart.destroy();
        const ctxTimeline = document.getElementById('chart-timeline').getContext('2d');
        timelineChart = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: data.timeline_trend.labels,
                datasets: [
                    {
                        label: 'Reported Potholes',
                        data: data.timeline_trend.reports,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Repaired Roads',
                        data: data.timeline_trend.repairs,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#475569', font: { family: 'Inter', size: 9 } }
                    },
                    title: {
                        display: true,
                        text: 'REPORT VS REPAIR TRENDS',
                        color: '#0f172a',
                        font: { family: 'Outfit', size: 11, weight: 'bold' }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 9 } } },
                    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#475569', font: { size: 9 } } }
                }
            }
        });
    }

    // --- 6. AI Sandbox Uploader & Inference ---
    function initSandbox() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const preview = document.getElementById('sandbox-preview');
        const placeholder = document.getElementById('upload-placeholder');
        const canvasHeaderDiv = document.getElementById('canvas-header-div');
        const classTag = document.getElementById('inference-class-tag');

        const diagStatus = document.getElementById('diag-status');
        const diagConf = document.getElementById('diag-conf');
        const diagClass = document.getElementById('diag-class');
        const diagSeverity = document.getElementById('diag-severity');
        const sandboxForm = document.getElementById('sandbox-form');

        // Drag events
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processSandboxUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                processSandboxUpload(fileInput.files[0]);
            }
        });

        async function processSandboxUpload(file) {
            diagStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
            diagStatus.className = "diag-value text-warning";
            
            // Create form payload
            const formData = new FormData();
            formData.append('image', file);
            
            // Lock in current coordinates of Telkom University (randomized slightly)
            const randomOffsetLat = (Math.random() - 0.5) * 0.015;
            const randomOffsetLng = (Math.random() - 0.5) * 0.015;
            const lat = TELKOM_UNIVERSITY_COORDS[0] + randomOffsetLat;
            const lng = TELKOM_UNIVERSITY_COORDS[1] + randomOffsetLng;
            
            formData.append('latitude', lat);
            formData.append('longitude', lng);
            formData.append('reporter_name', 'Sandbox Simulator');
            formData.append('description', 'Auto-detected road issue via AI Sandbox.');

            try {
                const start = performance.now();
                const res = await fetch(`${API_URL}/api/detection/detect`, {
                    method: 'POST',
                    body: formData
                });
                const latency = (performance.now() - start).toFixed(0);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Server error');

                // Update UI image elements
                placeholder.style.display = 'none';
                preview.src = data.image_url;
                preview.style.display = 'block';
                canvasHeaderDiv.style.display = 'flex';
                
                // Class Tag outline color
                classTag.textContent = data.detection.damage_class;
                classTag.className = `tag ${data.detection.damage_class === 'Damaged' ? 'high' : 'repaired'}`;

                // Update Diagnostics
                diagStatus.textContent = `Completed (${latency}ms)`;
                diagStatus.className = "diag-value text-success";
                
                diagConf.textContent = data.detection.damage_class === 'Damaged' 
                    ? `${(data.detection.confidence * 100).toFixed(0)}%`
                    : '100%';
                    
                diagClass.textContent = data.detection.damage_class;
                diagClass.className = `diag-value ${data.detection.damage_class === 'Damaged' ? 'text-danger' : 'text-success'}`;
                
                diagSeverity.textContent = data.detection.severity;
                diagSeverity.className = `diag-value ${data.detection.severity === 'High' ? 'text-danger' : data.detection.severity === 'Medium' ? 'text-warning' : 'text-muted'}`;

                // Populate and reveal coordinates commit form
                document.getElementById('sandbox-lat').value = lat.toFixed(6);
                document.getElementById('sandbox-lng').value = lng.toFixed(6);
                document.getElementById('sandbox-desc').value = `Lubang jalan ${data.detection.severity.toLowerCase()} terdeteksi otomatis.`;
                sandboxForm.style.display = 'flex';

                // Hold reference to the created report so we can save details later
                currentSandboxImage = data.detection;

            } catch (err) {
                diagStatus.textContent = 'Error';
                diagStatus.className = "diag-value text-danger";
                alert(`Analysis Failed: ${err.message}`);
            }
        }

        // Commit sandbox modifications
        document.getElementById('btn-save-sandbox').addEventListener('click', async () => {
            if (!currentSandboxImage) return;

            const lat = parseFloat(document.getElementById('sandbox-lat').value);
            const lng = parseFloat(document.getElementById('sandbox-lng').value);
            const desc = document.getElementById('sandbox-desc').value;
            const reporter = document.getElementById('sandbox-reporter').value;

            try {
                const res = await fetch(`${API_URL}/api/reports/${currentSandboxImage.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        latitude: lat,
                        longitude: lng,
                        description: desc,
                        reporter_name: reporter
                    })
                });

                if (res.ok) {
                    alert("Report successfully pinned to Map & saved!");
                    sandboxForm.style.display = 'none';
                    preview.style.display = 'none';
                    canvasHeaderDiv.style.display = 'none';
                    placeholder.style.display = 'flex';
                    currentSandboxImage = null;
                    
                    diagStatus.textContent = 'Awaiting Upload';
                    diagStatus.className = "diag-value text-muted";
                    diagConf.textContent = 'N/A';
                    diagClass.textContent = 'N/A';
                    diagSeverity.textContent = 'N/A';

                    // Direct user back to dashboard
                    document.querySelector('[data-view="dashboard"]').click();
                } else {
                    alert("Failed to update details.");
                }
            } catch (e) {
                alert("Error: " + e.message);
            }
        });
    }

    // --- 7. Citizen Manual Incidents Submissions Form ---
    function initCitizenForm() {
        const form = document.getElementById('citizen-report-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const lat = parseFloat(document.getElementById('rep-lat').value);
            const lng = parseFloat(document.getElementById('rep-lng').value);
            const severity = document.getElementById('rep-severity').value;
            const desc = document.getElementById('rep-desc').value;
            const reporter = document.getElementById('rep-reporter').value || 'Citizen Patroller';
            
            // Extract the user-customized address from editable address-text input
            const addressInput = document.getElementById('address-text');
            const addressVal = addressInput ? (addressInput.value || addressInput.textContent) : '';
            const fullDescription = addressVal ? `${addressVal} - ${desc}` : desc;

            try {
                const res = await fetch(`${API_URL}/api/reports/manual`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        latitude: lat,
                        longitude: lng,
                        severity: severity,
                        description: fullDescription,
                        reporter_name: reporter
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    alert("Manual incident report successfully submitted!");
                    form.reset();
                    
                    // Reset coordinates to Telkom center
                    setCitizenCoords(TELKOM_UNIVERSITY_COORDS[0], TELKOM_UNIVERSITY_COORDS[1]);
                    
                    // Refresh current page list
                    refreshCitizenHistory();
                } else {
                    alert("Submission failed: " + data.error);
                }
            } catch (err) {
                alert("Network error: " + err.message);
            }
        });

        // Deteksi Lokasi GPS Saya Button Click
        const btnGet = document.getElementById('btn-get-location');
        if (btnGet) {
            btnGet.addEventListener('click', () => {
                btnGet.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mendeteksi GPS...';
                
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            
                            // Check if coordinate is realistically within Bandung area (otherwise center to Telkom for demo aesthetics)
                            const isBandung = Math.abs(lat - (-6.97)) < 0.2;
                            
                            if (isBandung) {
                                setCitizenCoords(lat, lng);
                                if (typeof L !== 'undefined' && miniMap) {
                                    miniMap.setView([lat, lng], 16);
                                }
                            } else {
                                // Outside Bandung / Mock Telkom
                                const randomOffsetLat = (Math.random() - 0.5) * 0.003;
                                const randomOffsetLng = (Math.random() - 0.5) * 0.003;
                                const mockLat = TELKOM_UNIVERSITY_COORDS[0] + randomOffsetLat;
                                const mockLng = TELKOM_UNIVERSITY_COORDS[1] + randomOffsetLng;
                                setCitizenCoords(mockLat, mockLng);
                                if (typeof L !== 'undefined' && miniMap) {
                                    miniMap.setView([mockLat, mockLng], 16);
                                }
                                alert("GPS Terdeteksi diluar jangkauan operasional Bandung. Sistem mensimulasikan lokasi GPS terdekat di Telkom University.");
                            }
                            btnGet.innerHTML = '<i class="fa-solid fa-location-crosshairs" style="color: var(--primary);"></i> Deteksi Lokasi GPS Saya';
                        },
                        (error) => {
                            // Fallback simulation if blocked
                            const randomOffsetLat = (Math.random() - 0.5) * 0.003;
                            const randomOffsetLng = (Math.random() - 0.5) * 0.003;
                            const mockLat = TELKOM_UNIVERSITY_COORDS[0] + randomOffsetLat;
                            const mockLng = TELKOM_UNIVERSITY_COORDS[1] + randomOffsetLng;
                            setCitizenCoords(mockLat, mockLng);
                            if (typeof L !== 'undefined' && miniMap) {
                                miniMap.setView([mockLat, mockLng], 16);
                            }
                            btnGet.innerHTML = '<i class="fa-solid fa-location-crosshairs" style="color: var(--primary);"></i> Deteksi Lokasi GPS Saya';
                            alert("Akses GPS diblokir/offline. Sistem berhasil mensimulasikan lokasi GPS terdekat di Telkom University.");
                        },
                        { timeout: 5000 }
                    );
                } else {
                    alert("Browser Anda tidak mendukung deteksi lokasi.");
                    btnGet.innerHTML = '<i class="fa-solid fa-location-crosshairs" style="color: var(--primary);"></i> Deteksi Lokasi GPS Saya';
                }
            });
        }
    }

    // A simple offline reverse geocoder simulation for Telkom University area
    function getReadableAddress(lat, lng) {
        const landmarks = [
            { lat: -6.9745, lng: 107.6304, name: "Masjid Syamsul 'Ulum (Kampus Telkom)" },
            { lat: -6.9732, lng: 107.6295, name: "Jl. Telekomunikasi (Depan Kampus)" },
            { lat: -6.9754, lng: 107.6321, name: "Gerbang Belakang Kampus Telkom" },
            { lat: -6.9711, lng: 107.6278, name: "Gedung Kuliah Umum (GKU) Telkom" },
            { lat: -6.9772, lng: 107.6309, name: "Pertigaan Sukabirus (Dekat Kost)" },
            { lat: -6.9749, lng: 107.6254, name: "Jl. Sukabirus Raya, Bandung" },
            { lat: -6.9791, lng: 107.6335, name: "Jl. Raya Sukapura, Bandung" },
            { lat: -6.9723, lng: 107.6341, name: "Pintu Tol Buah Batu (Akses Kampus)" },
            { lat: -6.9765, lng: 107.6288, name: "Gedung Selaru, Telkom University" },
            { lat: -6.9780, lng: 107.6268, name: "Jalan Sukabirus (Dekat Lapangan)" }
        ];

        let closest = landmarks[0];
        let minDistance = Infinity;

        landmarks.forEach(lm => {
            const dist = Math.sqrt(Math.pow(lat - lm.lat, 2) + Math.pow(lng - lm.lng, 2));
            if (dist < minDistance) {
                minDistance = dist;
                closest = lm;
            }
        });

        return `${closest.name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }

    async function refreshCitizenHistory() {
        const list = document.getElementById('citizen-submissions-list');
        list.innerHTML = '<p style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading historical feed...</p>';

        try {
            const res = await fetch(`${API_URL}/api/reports?damage_class=Damaged`);
            const reports = await res.json();
            
            // Get current logged-in user details to isolate list
            const currentFullName = sessionStorage.getItem('rodation_user_fullname') || 'Citizen User';
            const userRole = sessionStorage.getItem('rodation_user_role');
            
            // If admin, show all reports. If user, show only their reports!
            const filteredReports = userRole === 'admin' 
                ? reports 
                : reports.filter(report => report.reporter_name === currentFullName);

            list.innerHTML = '';
            
            if (filteredReports.length === 0) {
                list.innerHTML = `<p style="text-align:center; padding:20px; font-size:0.8rem; color:var(--text-muted);">Belum ada riwayat laporan atas nama <strong>${currentFullName}</strong>.</p>`;
                return;
            }

            filteredReports.forEach(report => {
                const card = document.createElement('div');
                card.className = 'submission-card';

                // Map status to progress bars
                const steps = ['Reported', 'Verified', 'Scheduled', 'Repaired'];
                const currentIndex = steps.indexOf(report.status);

                let stepsHTML = '';
                steps.forEach((step, idx) => {
                    let stateClass = '';
                    if (idx < currentIndex) stateClass = 'completed';
                    else if (idx === currentIndex) stateClass = 'active';
                    
                    stepsHTML += `
                        <div class="tracker-step ${stateClass}">
                            <div class="tracker-dot"></div>
                            <span class="tracker-label">${step === 'Scheduled' ? 'Scheduled' : step}</span>
                        </div>
                    `;
                });

                card.innerHTML = `
                    <div class="sub-header">
                        <span class="sub-id">REPORT #${report.id}</span>
                        <span class="severity-pill ${report.severity.toLowerCase()}">${report.severity} Severity</span>
                    </div>
                    <div class="sub-body">
                        <img class="sub-img" src="${report.filename.startsWith('demo_pothole_') ? '/uploads/' + report.filename : '/uploads/processed/' + report.filename}" onerror="this.src='/uploads/default_pothole.jpg'">
                        <div class="sub-details">
                            <span class="sub-desc">${report.description || 'Pothole detected'}</span>
                            <span class="sub-meta"><i class="fa-solid fa-map-pin"></i> ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</span>
                            <span class="sub-meta"><i class="fa-solid fa-calendar-days"></i> ${formatDate(report.created_at)}</span>
                        </div>
                    </div>
                    <div class="sub-tracker">
                        ${stepsHTML}
                    </div>
                `;
                list.appendChild(card);
            });

        } catch (e) {
            list.innerHTML = '<p style="text-align:center; color:var(--danger); padding:20px;">Failed to fetch history.</p>';
        }
    }

    // --- 8. Government Dashboard / Operator Console Operations ---
    function initGovConsoleFilters() {
        document.getElementById('filter-severity').addEventListener('change', refreshGovConsole);
        document.getElementById('filter-status').addEventListener('change', refreshGovConsole);
    }

    async function refreshGovConsole() {
        const severity = document.getElementById('filter-severity').value;
        const status = document.getElementById('filter-status').value;
        
        let url = `${API_URL}/api/reports?damage_class=Damaged`;
        if (severity) url += `&severity=${severity}`;
        if (status) url += `&status=${status}`;

        const tableBody = document.querySelector('#gov-reports-table tbody');
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> Fetching active cases...</td></tr>';

        try {
            const res = await fetch(url);
            const reports = await res.json();
            
            tableBody.innerHTML = '';
            if (reports.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No reports found matching selected criteria.</td></tr>';
                return;
            }

            reports.forEach(report => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${report.id}</strong></td>
                    <td>
                        <img class="table-thumbnail" src="${report.filename.startsWith('demo_pothole_') ? '/uploads/' + report.filename : '/uploads/processed/' + report.filename}" onerror="this.src='/uploads/default_pothole.jpg'">
                    </td>
                    <td><span style="font-family:monospace; font-size:0.8rem;">${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</span></td>
                    <td><span class="severity-pill ${report.severity.toLowerCase()}">${report.severity}</span></td>
                    <td>${report.reporter_name}</td>
                    <td>${formatDate(report.created_at)}</td>
                    <td><span class="status-pill ${report.status.toLowerCase()}">${report.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-verify" title="Verify Issue" data-id="${report.id}" ${report.status !== 'Reported' ? 'style="opacity:0.3; pointer-events:none;"' : ''}>
                                <i class="fa-solid fa-clipboard-check"></i>
                            </button>
                            <button class="btn-action btn-schedule" title="Schedule Repair" data-id="${report.id}" ${report.status === 'Scheduled' || report.status === 'Repaired' ? 'style="opacity:0.3; pointer-events:none;"' : ''}>
                                <i class="fa-solid fa-calendar-plus"></i>
                            </button>
                            <button class="btn-action btn-repair" title="Mark Repaired" data-id="${report.id}" ${report.status === 'Repaired' ? 'style="opacity:0.3; pointer-events:none;"' : ''}>
                                <i class="fa-solid fa-circle-check"></i>
                            </button>
                            <button class="btn-action btn-delete" title="Delete Case" data-id="${report.id}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            // Bind click event listeners to actions
            bindGovActionButtons();

        } catch (e) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--danger); padding:30px;">Error fetching records.</td></tr>';
        }
    }

    function bindGovActionButtons() {
        // A. Verify
        document.querySelectorAll('.btn-verify').forEach(btn => {
            btn.addEventListener('click', () => updateStatus(btn.getAttribute('data-id'), 'Verified'));
        });
        
        // B. Schedule
        document.querySelectorAll('.btn-schedule').forEach(btn => {
            btn.addEventListener('click', () => updateStatus(btn.getAttribute('data-id'), 'Scheduled'));
        });
        
        // C. Mark Repaired
        document.querySelectorAll('.btn-repair').forEach(btn => {
            btn.addEventListener('click', () => updateStatus(btn.getAttribute('data-id'), 'Repaired'));
        });

        // D. Delete
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm(`Are you sure you want to delete report #${id}? This action is irreversible.`)) {
                    try {
                        const res = await fetch(`${API_URL}/api/reports/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            refreshGovConsole();
                        } else {
                            alert("Failed to delete record.");
                        }
                    } catch (e) {
                        alert("Network error: " + e.message);
                    }
                }
            });
        });
    }

    async function updateStatus(id, newStatus) {
        try {
            const res = await fetch(`${API_URL}/api/reports/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                refreshGovConsole();
            } else {
                alert("Failed to update report status.");
            }
        } catch (e) {
            alert("Network error: " + e.message);
        }
    }

    // --- 9. Utility Formatting Helpers ---
    function formatDate(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('en-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function formatTimeAgo(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        const diffMs = new Date() - d;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        
        return d.toLocaleDateString('en-ID', { day: 'numeric', month: 'short' });
    }

    // --- 10. Location Search Autocomplete with OSM Nominatim API & Local Fallback ---
    function initAutocomplete() {
        const addressInput = document.getElementById('address-text');
        const suggestionsBox = document.getElementById('address-suggestions');
        if (!addressInput || !suggestionsBox) return;

        let debounceTimer = null;

        // Curated Local Telkom University & Bandung Landmark List for Offline Presentation Demo
        const localLandmarks = [
            { name: "Masjid Syamsul 'Ulum", address: "Kampus Telkom University, Bandung", lat: -6.9744, lon: 107.6304 },
            { name: "Gedung Kuliah Umum (GKU) Telkom", address: "Jl. Telekomunikasi, Bandung", lat: -6.9711, lon: 107.6278 },
            { name: "Gerbang Utama Kampus Telkom", address: "Jl. Telekomunikasi, Bandung", lat: -6.9732, lon: 107.6295 },
            { name: "Pertigaan Sukabirus", address: "Jl. Sukabirus, Bandung", lat: -6.9772, lon: 107.6309 },
            { name: "Warkop Kuningan Sukabirus", address: "Jl. Sukabirus Raya, Bandung", lat: -6.9752, lon: 107.6285 },
            { name: "Danau Galau (Situ Tekno)", address: "Kampus Telkom University, Bandung", lat: -6.9735, lon: 107.6315 },
            { name: "Gedung Selaru", address: "Kampus Telkom University, Bandung", lat: -6.9765, lon: 107.6288 },
            { name: "Pintu Tol Buah Batu", address: "Tol Padaleunyi, Buah Batu, Bandung", lat: -6.9723, lon: 107.6341 },
            { name: "Trans Studio Mall (TSM)", address: "Jl. Gatot Subroto No. 289, Bandung", lat: -6.9252, lon: 107.6365 },
            { name: "Alun-Alun Kota Bandung", address: "Jl. Asia Afrika, Balonggede, Bandung", lat: -6.9219, lon: 107.6069 },
            { name: "Gedung Sate", address: "Jl. Diponegoro No. 22, Citarum, Bandung", lat: -6.9025, lon: 107.6188 },
            { name: "Paris Van Java (PVJ)", address: "Jl. Sukajadi No. 131, Bandung", lat: -6.8897, lon: 107.5962 },
            { name: "Pasar Baru Trade Center", address: "Jl. Otto Iskandardinata, Bandung", lat: -6.9195, lon: 107.6042 }
        ];

        addressInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = addressInput.value.trim();

            if (query.length < 2) {
                suggestionsBox.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                // A. Search local curated landmarks first
                const matchedLocal = localLandmarks.filter(item => 
                    item.name.toLowerCase().includes(query.toLowerCase()) || 
                    item.address.toLowerCase().includes(query.toLowerCase())
                );

                let results = [...matchedLocal];

                // B. If online, fetch from OpenStreetMap Nominatim API (prioritizing Bandung region)
                if (navigator.onLine) {
                    try {
                        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=107.55,-6.99,107.72,-6.85&bounded=1&limit=5`;
                        const res = await fetch(url, {
                            headers: { 'Accept-Language': 'id' }
                        });
                        if (res.ok) {
                            const osmData = await res.json();
                            osmData.forEach(item => {
                                // Prevent exact duplicates from local list
                                const isDuplicate = results.some(r => 
                                    Math.abs(r.lat - parseFloat(item.lat)) < 0.0002 && 
                                    Math.abs(r.lon - parseFloat(item.lon)) < 0.0002
                                );
                                if (!isDuplicate) {
                                    results.push({
                                        name: item.display_name.split(',')[0],
                                        address: item.display_name.split(',').slice(1).join(',').trim(),
                                        lat: parseFloat(item.lat),
                                        lon: parseFloat(item.lon)
                                    });
                                }
                            });
                        }
                    } catch (e) {
                        console.warn("Nominatim Autocomplete Fetch Failed:", e);
                    }
                }

                // Render Results
                if (results.length === 0) {
                    suggestionsBox.style.display = 'none';
                    return;
                }

                suggestionsBox.innerHTML = '';
                suggestionsBox.style.display = 'block';

                results.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerHTML = `
                        <div class="suggestion-icon"><i class="fa-solid fa-location-dot"></i></div>
                        <div class="suggestion-details">
                            <span class="suggestion-name">${item.name}</span>
                            <span class="suggestion-address">${item.address}</span>
                        </div>
                    `;

                    div.addEventListener('click', () => {
                        // Update Coordinates and Address
                        const lat = item.lat;
                        const lng = item.lon;
                        
                        setCitizenCoords(lat, lng);
                        
                        // Pan Map beautifully to selected location
                        if (typeof L !== 'undefined' && miniMap) {
                            miniMap.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
                        }

                        // Explicitly set the input value to the full address name so they see it
                        addressInput.value = `${item.name}, ${item.address}`;

                        suggestionsBox.style.display = 'none';
                    });

                    suggestionsBox.appendChild(div);
                });
            }, 250); // Fast 250ms debounce
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!addressInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });
    }

    // --- 11. Role-Based Login Portal & Session Control ---
    function initLogin() {
        const loginOverlay = document.getElementById('login-overlay');
        const loginForm = document.getElementById('login-form');
        const loginUsernameInput = document.getElementById('login-username');
        const loginPasswordInput = document.getElementById('login-password');
        const loginErrorMsg = document.getElementById('login-error');
        const btnLogout = document.getElementById('btn-logout');
        const btnCloseLogin = document.getElementById('btn-close-login');

        // User Accounts Configuration for Group D and Fallbacks
        const users = {
            'admin': { fullname: 'Ghifary Wibisono', role: 'admin' },
            'ghifary': { fullname: 'Ghifary Wibisono', role: 'user' },
            'prayata': { fullname: 'Prayata Yasinkha', role: 'user' },
            'zaky': { fullname: 'Zaky Muhammad', role: 'user' },
            'luthfia': { fullname: 'Luthfia Maulidya', role: 'user' },
            'user': { fullname: 'Citizen User', role: 'user' }
        };

        // Check if there is already a user session active
        const activeUser = sessionStorage.getItem('rodation_user_role');
        if (activeUser) {
            applyUserRole(activeUser);
            loginOverlay.style.display = 'none';
        } else {
            applyUserRole(null);
            loginOverlay.style.display = 'none'; // Start cleanly in Guest Mode!
        }

        // Close Login Modal Actions
        if (btnCloseLogin) {
            btnCloseLogin.addEventListener('click', () => {
                loginOverlay.style.display = 'none';
                pendingTargetView = null; // Reset redirect view
            });
        }

        const btnCancelLogin = document.getElementById('btn-cancel-login');
        if (btnCancelLogin) {
            btnCancelLogin.addEventListener('click', () => {
                loginOverlay.style.display = 'none';
                pendingTargetView = null; // Reset redirect view
            });
        }

        // Close when clicking overlay background itself
        loginOverlay.addEventListener('click', (e) => {
            if (e.target === loginOverlay) {
                loginOverlay.style.display = 'none';
                pendingTargetView = null; // Reset redirect view
            }
        });

        // Handle Login Submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = loginUsernameInput.value.trim().toLowerCase();
            const password = loginPasswordInput.value.trim();

            if (users[username] && password === username) {
                // Successful Login (Username & Password match same key e.g. ghifary/ghifary)
                loginErrorMsg.style.display = 'none';
                sessionStorage.setItem('rodation_user_role', users[username].role);
                sessionStorage.setItem('rodation_user_fullname', users[username].fullname);
                applyUserRole(users[username].role);
                animatePortalEntry();
            } else {
                // Login Failed
                loginErrorMsg.style.display = 'flex';
                // Trigger quick shake feedback
                const box = document.querySelector('.login-box');
                if (box) {
                    box.style.animation = 'none';
                    setTimeout(() => {
                        box.style.animation = 'shake 0.3s ease-in-out';
                    }, 10);
                }
            }
        });

        // Handle Logout Clicking
        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('rodation_user_role');
                sessionStorage.removeItem('rodation_user_fullname');
                
                // Clear fields
                loginUsernameInput.value = '';
                loginPasswordInput.value = '';
                loginErrorMsg.style.display = 'none';

                // Return back to default active About page view
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const landingNavItem = document.querySelector('[data-view="landing"]');
                if (landingNavItem) landingNavItem.classList.add('active');
                
                document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
                const landingView = document.getElementById('view-landing');
                if (landingView) landingView.classList.add('active');
                
                document.getElementById('view-title').textContent = 'Road Damaged Detection';

                // Set application back to Guest Mode state
                applyUserRole(null);
            });
        }

        function applyUserRole(role) {
            const govNavItem = document.querySelector('[data-view="government"]');
            const logoutItem = document.getElementById('btn-logout');
            const fullName = sessionStorage.getItem('rodation_user_fullname') || 'Citizen User';
            const appContainer = document.querySelector('.app-container');

            if (role === 'admin') {
                // Show Gov Console Sidebar menu
                if (govNavItem) govNavItem.style.display = 'flex';
                if (logoutItem) logoutItem.style.display = 'flex';
                if (appContainer) appContainer.classList.remove('guest-mode');
            } else if (role === 'user') {
                // Hide Gov Console Sidebar menu
                if (govNavItem) govNavItem.style.display = 'none';
                if (logoutItem) logoutItem.style.display = 'flex';
                if (appContainer) appContainer.classList.remove('guest-mode');
            } else {
                // Guest Mode / Not Logged In
                if (govNavItem) govNavItem.style.display = 'none';
                if (logoutItem) logoutItem.style.display = 'none';
                // Trigger Guest Mode class to hide sidebar and expand layout to full width
                if (appContainer) appContainer.classList.add('guest-mode');
            }

            // Lock Citizen report & Sandbox reporter name fields to logged-in user
            const repReporter = document.getElementById('rep-reporter');
            if (repReporter) {
                repReporter.value = role ? fullName : '';
                repReporter.readOnly = !!role;
                repReporter.style.background = role ? '#f1f5f9' : '#ffffff';
                repReporter.placeholder = "Masukkan nama Anda...";
            }

            const sandboxReporter = document.getElementById('sandbox-reporter');
            if (sandboxReporter) {
                sandboxReporter.value = role ? fullName : '';
                sandboxReporter.readOnly = !!role;
                sandboxReporter.style.background = role ? '#f1f5f9' : '#ffffff';
                sandboxReporter.placeholder = "Masukkan nama Anda...";
            }

            // Update Dynamic Profile area in header
            updateHeaderProfile();
        }

        function updateHeaderProfile() {
            const profileArea = document.getElementById('header-profile-area');
            if (!profileArea) return;

            const role = sessionStorage.getItem('rodation_user_role');
            const fullName = sessionStorage.getItem('rodation_user_fullname');

            if (role && fullName) {
                // Logged In: Render profile widget with user avatar & details
                const displayName = fullName.split(' ')[0] + (fullName.split(' ')[1] ? ' ' + fullName.split(' ')[1][0] + '.' : '');
                const displayRole = role === 'admin' ? 'Lead Analyst' : 'Public Patroller';
                
                profileArea.innerHTML = `
                    <div class="profile-widget" style="display: flex; align-items: center; gap: 12px; animation: fadeIn 0.3s ease-out;">
                        <div class="avatar" style="width: 38px; height: 38px; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);"><i class="fa-solid fa-user-tie"></i></div>
                        <div class="profile-info" style="display: flex; flex-direction: column;">
                            <span class="profile-name" style="font-size: 0.85rem; font-weight: 600; color: #0f172a;">${displayName}</span>
                            <span class="profile-role" style="font-size: 0.7rem; color: var(--text-muted);">${displayRole}</span>
                        </div>
                    </div>
                `;
            } else {
                // Guest Mode: Render Glowing Sign In Button
                profileArea.innerHTML = `
                    <button id="btn-header-login" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.8rem; border-radius: 20px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25); display: flex; align-items: center; gap: 8px; animation: fadeIn 0.3s ease-out; font-family: inherit; cursor: pointer; border: none; font-weight: 600; background: var(--primary); color: #fff; transition: all 0.2s;">
                        <i class="fa-solid fa-right-to-bracket"></i> Sign In
                    </button>
                `;
                
                // Add click listener to open login overlay
                const btnHeaderLogin = document.getElementById('btn-header-login');
                if (btnHeaderLogin) {
                    btnHeaderLogin.addEventListener('click', () => {
                        loginOverlay.style.display = 'flex';
                    });
                }
            }
        }

        function animatePortalEntry() {
            // Smooth fade out of overlay
            loginOverlay.style.transition = 'opacity 0.3s ease-out';
            loginOverlay.style.opacity = '0';
            setTimeout(() => {
                loginOverlay.style.display = 'none';
                loginOverlay.style.opacity = '1'; // Reset for later logouts
                refreshDashboard();

                // If they clicked a restricted tab before logging in, navigate there automatically!
                if (pendingTargetView) {
                    const targetItem = document.querySelector(`[data-view="${pendingTargetView}"]`);
                    if (targetItem) {
                        pendingTargetView = null; // Clear
                        targetItem.click(); // Auto-navigate!
                        return;
                    }
                }
                
                // Default redirect to dashboard
                document.querySelector('[data-view="dashboard"]').click();
            }, 300);
        }
    }

    // --- 12. Landing Page CTA Navigation Handlers ---
    function initLandingCTAs() {
        const btnExplore = document.getElementById('btn-landing-explore');
        const btnSandbox = document.getElementById('btn-landing-sandbox');

        if (btnExplore) {
            btnExplore.addEventListener('click', () => {
                const dashboardTab = document.querySelector('[data-view="dashboard"]');
                if (dashboardTab) dashboardTab.click();
            });
        }

        if (btnSandbox) {
            btnSandbox.addEventListener('click', () => {
                const sandboxTab = document.querySelector('[data-view="sandbox"]');
                if (sandboxTab) sandboxTab.click();
            });
        }
    }
});

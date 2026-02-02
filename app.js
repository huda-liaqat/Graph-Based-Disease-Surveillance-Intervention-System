/**
 * Main Application Controller
 * Coordinates all modules and handles UI interactions
 */

// Global application state
const App = {
    graph: null,
    diseaseModel: null,
    anomalyDetector: null,
    interventionManager: null,
    simulationRunning: false,
    timelineChart: null,
    interventionChart: null
};

/**
 * Initialize the application
 */
function initializeApp() {
    // Initialize modules
    App.graph = new Graph();
    App.diseaseModel = new DiseaseModel(App.graph, 'SIR');
    App.anomalyDetector = new AnomalyDetector();
    App.interventionManager = new InterventionManager(App.graph, App.diseaseModel);

    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI
    updateModelDependentUI();
    
    // Initialize charts
    initializeCharts();
    
    // Initialize analytics panels
    updateAllAnalytics();
    
    console.log('Application initialized');
}

/**
 * Set up event listeners for UI controls
 */
function setupEventListeners() {
    // Generate graph button
    document.getElementById('generateGraph').addEventListener('click', handleGenerateGraph);
    
    // Run simulation button
    document.getElementById('runSimulation').addEventListener('click', handleRunSimulation);
    
    // Reset button
    document.getElementById('resetSimulation').addEventListener('click', handleReset);
    
    // Intervention buttons
    document.getElementById('applyInterventions').addEventListener('click', handleApplyInterventions);
    document.getElementById('contactTracing').addEventListener('click', handleContactTracing);
    
    // Model selection change
    document.getElementById('diseaseModel').addEventListener('change', handleModelChange);
    
    // Close alert button
    document.getElementById('closeAlert').addEventListener('click', () => {
        document.getElementById('alertBanner').classList.add('hidden');
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        initializeCharts();
        updateAllAnalytics();
    });
}

/**
 * Handle graph generation
 */
async function handleGenerateGraph() {
    const numAreas = parseInt(document.getElementById('numAreas').value);
    const peoplePerArea = parseInt(document.getElementById('peoplePerArea').value);
    
    if (numAreas < 5 || numAreas > 100) {
        showAlert('Number of areas must be between 5 and 100', 'warning');
        return;
    }

    if (peoplePerArea < 5 || peoplePerArea > 50) {
        showAlert('People per area must be between 5 and 50', 'warning');
        return;
    }

    // Generate graph with areas
    App.graph.generateRandomGraph(numAreas, 3, peoplePerArea);
    
    // Initialize visualization
    App.graph.initializeVisualization('graphNetwork');
    
    // Reset disease model
    const initialInfected = parseInt(document.getElementById('initialInfected').value);
    App.diseaseModel.initialize(initialInfected);
    
    // Update visualization
    App.graph.updateVisualization();
    
    // Update statistics and analytics
    updateStatistics();
    updateAllAnalytics();
    
    const totalPeople = numAreas * peoplePerArea;
    showAlert(`Graph generated with ${numAreas} areas (${totalPeople} people total)`, 'info');
}

/**
 * Handle simulation run
 */
async function handleRunSimulation() {
    if (App.simulationRunning) {
        showAlert('Simulation already running', 'warning');
        return;
    }

    if (!App.graph || App.graph.nodes.size === 0) {
        showAlert('Please generate a graph first', 'warning');
        return;
    }

    App.simulationRunning = true;
    document.getElementById('runSimulation').disabled = true;
    
    // Get parameters from UI
    const transmissionRate = parseFloat(document.getElementById('transmissionRate').value);
    const recoveryRate = parseFloat(document.getElementById('recoveryRate').value);
    const incubationRate = parseFloat(document.getElementById('incubationRate').value);
    
    App.diseaseModel.setParameters({ transmissionRate, recoveryRate, incubationRate });
    
    // Run simulation for 30 days
    await App.diseaseModel.runSimulation(30, (state, day) => {
        updateStatistics();
        updateVisualization();
        updateAllAnalytics();
    });
    
    App.simulationRunning = false;
    document.getElementById('runSimulation').disabled = false;
    
    showAlert('Simulation completed', 'info');
}

/**
 * Handle reset
 */
function handleReset() {
    if (App.simulationRunning) {
        showAlert('Please wait for simulation to complete', 'warning');
        return;
    }

    const initialInfected = parseInt(document.getElementById('initialInfected').value);
    
    // Reset disease model
    App.diseaseModel.initialize(initialInfected);
    
    // Reset interventions
    App.interventionManager.reset();
    
    // Reset charts
    initializeCharts();
    
    // Update visualization
    updateVisualization();
    updateStatistics();
    updateAllAnalytics();
    
    showAlert('Simulation reset', 'info');
}

/**
 * Handle intervention application
 */
function handleApplyInterventions() {
    if (!App.graph || App.graph.nodes.size === 0) {
        showAlert('Please generate a graph first', 'warning');
        return;
    }

    const vaccinationPercent = parseInt(document.getElementById('vaccinationPercent').value);
    const vaccinationStrategy = document.getElementById('vaccinationStrategy').value;
    const quarantineThreshold = parseInt(document.getElementById('quarantineThreshold').value);

    // Apply vaccination
    if (vaccinationPercent > 0) {
        const result = App.interventionManager.applyVaccination(vaccinationPercent, vaccinationStrategy);
        showAlert(`Vaccinated ${result.peopleVaccinated} people in ${result.areaIds.length} areas using ${vaccinationStrategy} strategy`, 'info');
    }

    // Apply quarantine
    const quarantineResult = App.interventionManager.applyQuarantine(quarantineThreshold);
    if (quarantineResult.areasQuarantined > 0) {
        showAlert(`Quarantined ${quarantineResult.areasQuarantined} areas based on neighboring infected count`, 'warning');
    }

    updateVisualization();
    updateStatistics();
    updateAllAnalytics();
}

/**
 * Handle contact tracing
 */
function handleContactTracing() {
    if (!App.graph || App.graph.nodes.size === 0) {
        showAlert('Please generate a graph first', 'warning');
        return;
    }

    const result = App.interventionManager.runContactTracing(2, true);
    
    showAlert(`Contact tracing: Found ${result.tracedAreas} areas, quarantined ${result.quarantined} areas`, 'info');
    
    updateVisualization();
    updateStatistics();
    updateAllAnalytics();
}

/**
 * Handle model type change
 */
function handleModelChange() {
    const modelType = document.getElementById('diseaseModel').value;
    App.diseaseModel.modelType = modelType;
    
    // Enable/disable incubation rate input
    const incubationInput = document.getElementById('incubationRate');
    if (modelType === 'SEIR') {
        incubationInput.disabled = false;
    } else {
        incubationInput.disabled = true;
    }
    
    updateModelDependentUI();
}

/**
 * Update UI elements that depend on model type
 */
function updateModelDependentUI() {
    const modelType = App.diseaseModel.modelType;
    const incubationInput = document.getElementById('incubationRate');
    
    if (modelType === 'SEIR') {
        incubationInput.disabled = false;
    } else {
        incubationInput.disabled = true;
    }
}

/**
 * Update statistics display
 */
function updateStatistics() {
    const state = App.diseaseModel.getCurrentState();
    
    document.getElementById('statSusceptible').textContent = state.susceptible;
    document.getElementById('statExposed').textContent = state.exposed;
    document.getElementById('statInfected').textContent = state.infected;
    document.getElementById('statRecovered').textContent = state.recovered;
    document.getElementById('statDay').textContent = state.day;
}

/**
 * Update graph visualization
 */
function updateVisualization() {
    if (App.graph) {
        App.graph.updateVisualization();
    }
}

/**
 * Initialize charts
 */
function initializeCharts() {
    // Timeline chart (using canvas for simplicity)
    const timelineCanvas = document.getElementById('timelineChart');
    if (timelineCanvas) {
        App.timelineChart = {
            canvas: timelineCanvas,
            ctx: timelineCanvas.getContext('2d')
        };
        // Set canvas size to match display size
        const rect = timelineCanvas.getBoundingClientRect();
        timelineCanvas.width = rect.width;
        timelineCanvas.height = rect.height || 200;
        drawTimelineChart();
    }

    // Intervention chart
    const interventionCanvas = document.getElementById('interventionChart');
    if (interventionCanvas) {
        App.interventionChart = {
            canvas: interventionCanvas,
            ctx: interventionCanvas.getContext('2d')
        };
        const rect = interventionCanvas.getBoundingClientRect();
        interventionCanvas.width = rect.width;
        interventionCanvas.height = rect.height || 180;
        drawInterventionChart();
    }
}

/**
 * Update timeline chart
 */
function updateTimelineChart() {
    // Resize canvas if needed
    if (App.timelineChart) {
        const canvas = App.timelineChart.canvas;
        const rect = canvas.getBoundingClientRect();
        const targetWidth = rect.width;
        const targetHeight = rect.height || 200;
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }
    }
    drawTimelineChart();
}

/**
 * Draw timeline chart
 */
function drawTimelineChart() {
    if (!App.timelineChart || !App.diseaseModel) return;
    
    const history = App.diseaseModel.getHistory();
    if (history.length === 0) return;

    const ctx = App.timelineChart.ctx;
    const canvas = App.timelineChart.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up axes
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.fillText('Day', width / 2, height - 10);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Population', 0, 0);
    ctx.restore();
    
    if (history.length === 0) return;
    
    // Find max value for scaling
    const maxValue = Math.max(...history.map(h => h.susceptible + h.infected + h.recovered + h.exposed));
    
    // Draw grid lines (horizontal)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText(Math.round(maxValue * (1 - i / 5)), 10, y + 5);
    }
    
    // Draw day labels on x-axis
    if (history.length > 0) {
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const numLabels = Math.min(10, history.length);
        const step = Math.max(1, Math.floor(history.length / numLabels));
        for (let i = 0; i < history.length; i += step) {
            const x = padding + (chartWidth / (history.length - 1 || 1)) * i;
            const day = history[i].day;
            ctx.fillText(day.toString(), x, height - padding + 20);
            // Draw vertical grid line
            ctx.strokeStyle = '#eee';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        ctx.textAlign = 'left';
    }
    
    // Draw data lines
    const drawLine = (data, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < data.length; i++) {
            const x = padding + (chartWidth / (data.length - 1 || 1)) * i;
            const y = height - padding - (data[i] / maxValue) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    };
    
    // Draw susceptible
    drawLine(history.map(h => h.susceptible), '#3498db');
    
    // Draw exposed (if SEIR)
    if (App.diseaseModel.modelType === 'SEIR') {
        drawLine(history.map(h => h.exposed), '#f39c12');
    }
    
    // Draw infected
    drawLine(history.map(h => h.infected), '#e74c3c');
    
    // Draw recovered
    drawLine(history.map(h => h.recovered), '#27ae60');
    
    // Draw legend
    const legend = [
        { label: 'Susceptible', color: '#3498db' },
        { label: 'Infected', color: '#e74c3c' },
        { label: 'Recovered', color: '#27ae60' }
    ];
    
    if (App.diseaseModel.modelType === 'SEIR') {
        legend.splice(1, 0, { label: 'Exposed', color: '#f39c12' });
    }
    
    ctx.font = '12px Arial';
    legend.forEach((item, index) => {
        ctx.fillStyle = item.color;
        ctx.fillRect(width - 150, padding + index * 20, 15, 15);
        ctx.fillStyle = '#333';
        ctx.fillText(item.label, width - 130, padding + index * 20 + 12);
    });
}

/**
 * Draw intervention effectiveness chart
 */
function drawInterventionChart() {
    if (!App.interventionChart || !App.interventionManager || !App.graph) return;
    
    const ctx = App.interventionChart.ctx;
    const canvas = App.interventionChart.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const stats = App.interventionManager.getStatistics();
    const totalPeople = App.graph.totalPeople;
    
    if (totalPeople === 0) return;
    
    // Draw a simple bar chart
    const padding = 50;
    const barWidth = 80;
    const spacing = 40;
    const chartArea = height - padding * 2;
    const maxValue = Math.max(stats.vaccinated, stats.quarantined, totalPeople, 10);
    
    // Draw grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartArea / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw vaccinated bar
    const vaxHeight = (stats.vaccinated / maxValue) * chartArea;
    const vaxX = padding;
    const vaxY = height - padding - vaxHeight;
    
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(vaxX, vaxY, barWidth, vaxHeight);
    ctx.strokeStyle = '#7d3c98';
    ctx.lineWidth = 2;
    ctx.strokeRect(vaxX, vaxY, barWidth, vaxHeight);
    
    // Draw vaccinated label and value
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Vaccinated', vaxX + barWidth / 2, height - padding + 15);
    ctx.font = '12px Arial';
    ctx.fillText(stats.vaccinated.toString(), vaxX + barWidth / 2, vaxY - 5);
    
    // Draw percentage
    const vaxPercent = ((stats.vaccinated / totalPeople) * 100).toFixed(1);
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(`${vaxPercent}%`, vaxX + barWidth / 2, vaxY - 18);
    
    // Draw quarantined bar
    const qHeight = (stats.quarantined / maxValue) * chartArea;
    const qX = padding + barWidth + spacing;
    const qY = height - padding - qHeight;
    
    ctx.fillStyle = '#34495e';
    ctx.fillRect(qX, qY, barWidth, qHeight);
    ctx.strokeStyle = '#1b2631';
    ctx.lineWidth = 2;
    ctx.strokeRect(qX, qY, barWidth, qHeight);
    
    // Draw quarantined label and value
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Quarantined', qX + barWidth / 2, height - padding + 15);
    ctx.font = '12px Arial';
    ctx.fillText(stats.quarantined.toString(), qX + barWidth / 2, qY - 5);
    
    // Draw percentage
    const qPercent = ((stats.quarantined / totalPeople) * 100).toFixed(1);
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(`${qPercent}%`, qX + barWidth / 2, qY - 18);
    
    ctx.textAlign = 'left';
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Intervention Coverage', padding, 20);
}

/**
 * Update intervention chart
 */
function updateInterventionChart() {
    // Resize canvas if needed
    if (App.interventionChart) {
        const canvas = App.interventionChart.canvas;
        const rect = canvas.getBoundingClientRect();
        const targetWidth = rect.width;
        const targetHeight = rect.height || 180;
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }
    }
    drawInterventionChart();
}

/**
 * Update all analytics panels
 */
function updateAllAnalytics() {
    updateTimelineChart();
    updateInterventionChart();
    checkAnomalies();
    updateHighRiskAreas();
    updateDiseaseMetrics();
}

/**
 * Check for anomalies and update UI
 */
function checkAnomalies() {
    if (!App.anomalyDetector || !App.diseaseModel) return;
    
    const history = App.diseaseModel.getHistory();
    if (history.length < 7) return;
    
    const anomalies = App.anomalyDetector.detectAnomalies(history);
    
    // Update anomaly alerts
    const alertsContainer = document.getElementById('anomalyAlerts');
    if (alertsContainer) {
        alertsContainer.innerHTML = '';
        
        if (anomalies.length === 0) {
            alertsContainer.innerHTML = '<div class="alert-item info">No anomalies detected</div>';
        } else {
            anomalies.forEach(anomaly => {
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert-item ${anomaly.severity}`;
                alertDiv.innerHTML = `
                    <strong>Day ${anomaly.day}:</strong> ${anomaly.message}
                `;
                alertsContainer.appendChild(alertDiv);
            });
            
            // Show critical alerts in banner
            const criticalAnomalies = anomalies.filter(a => a.severity === 'high');
            if (criticalAnomalies.length > 0) {
                showAlert(criticalAnomalies[0].message, 'danger');
            }
        }
    }
    
    // Get risk level
    const currentState = App.diseaseModel.getCurrentState();
    const riskLevel = App.anomalyDetector.getRiskLevel(currentState, history);
    
    // Update risk level indicator if needed
    if (riskLevel === 'critical' || riskLevel === 'high') {
        showAlert(`High risk level detected: ${riskLevel}`, 'danger');
    }
}

/**
 * Update high-risk areas display
 */
function updateHighRiskAreas() {
    if (!App.anomalyDetector || !App.graph) return;
    
    const hotspots = App.anomalyDetector.detectHotspots(App.graph);
    const container = document.getElementById('highRiskAreas');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (hotspots.length === 0) {
        container.innerHTML = '<p>No high-risk areas detected</p>';
        return;
    }
    
    hotspots.slice(0, 10).forEach(hotspot => {
        const areaId = hotspot.nodeId; // Using nodeId for areaId
        const infectedCount = App.graph.getInfectedCount(areaId);
        const area = App.graph.nodes.get(areaId);
        const totalPeople = area ? area.totalPeople : 0;
        
        const card = document.createElement('div');
        card.className = 'risk-node-card';
        card.innerHTML = `
            <h4>Area ${areaId}</h4>
            <p><strong>Risk:</strong> ${hotspot.riskLevel}</p>
            <p><strong>Infected:</strong> ${infectedCount}/${totalPeople}</p>
            <p><strong>Neighboring Infected:</strong> ${App.graph.getNeighboringInfectedCount(areaId)}</p>
        `;
        container.appendChild(card);
    });
}

/**
 * Update disease metrics display
 */
function updateDiseaseMetrics() {
    if (!App.diseaseModel) return;
    
    const state = App.diseaseModel.getCurrentState();
    const history = App.diseaseModel.getHistory();
    const container = document.getElementById('diseaseMetrics');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calculate R0
    const r0 = App.diseaseModel.calculateR0();
    
    // Calculate peak infection
    let peakInfected = 0;
    let peakDay = 0;
    if (history.length > 0) {
        history.forEach(state => {
            if (state.infected > peakInfected) {
                peakInfected = state.infected;
                peakDay = state.day;
            }
        });
    }
    
    // Calculate current infection rate
    const infectionRate = state.total > 0 ? ((state.infected / state.total) * 100).toFixed(1) : 0;
    
    const metrics = [
        { label: 'Basic Reproduction (R₀)', value: r0.toFixed(2) },
        { label: 'Peak Infections', value: `${peakInfected} (Day ${peakDay})` },
        { label: 'Current Infection Rate', value: `${infectionRate}%` },
        { label: 'Total Recovered', value: state.recovered },
        { label: 'Vaccination Coverage', value: state.vaccinated > 0 ? `${((state.vaccinated / state.total) * 100).toFixed(1)}%` : '0%' }
    ];
    
    metrics.forEach(metric => {
        const metricDiv = document.createElement('div');
        metricDiv.className = 'metric-item';
        metricDiv.innerHTML = `
            <span class="metric-label">${metric.label}:</span>
            <span class="metric-value">${metric.value}</span>
        `;
        container.appendChild(metricDiv);
    });
}

/**
 * Show alert banner
 */
function showAlert(message, type = 'info') {
    const banner = document.getElementById('alertBanner');
    const messageElement = document.getElementById('alertMessage');
    
    if (banner && messageElement) {
        banner.className = `alert-banner ${type}`;
        messageElement.textContent = message;
        banner.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            banner.classList.add('hidden');
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);


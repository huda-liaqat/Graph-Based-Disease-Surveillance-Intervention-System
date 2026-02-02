/**
 * Anomaly Detection Module
 * Detects unusual patterns in disease spread data
 */

class AnomalyDetector {
    constructor() {
        this.threshold = 2.0; // Z-score threshold for anomaly detection
        this.windowSize = 7; // Rolling window size for moving average
    }

    /**
     * Detect anomalies using statistical methods
     * @param {Array} history - Array of state history objects
     * @returns {Array} Array of anomaly objects
     */
    detectAnomalies(history) {
        const anomalies = [];

        if (history.length < this.windowSize + 1) {
            return anomalies;
        }

        // Calculate infection rate changes
        const infectionRates = history.map(state => state.infected);
        const infectionChanges = this.calculateChanges(infectionRates);

        // Detect spikes in infection rate
        const spikes = this.detectSpikes(infectionChanges, history);
        anomalies.push(...spikes);

        // Detect unusual patterns
        const patterns = this.detectPatterns(history);
        anomalies.push(...patterns);

        // Detect acceleration in spread
        const acceleration = this.detectAcceleration(history);
        anomalies.push(...acceleration);

        return anomalies;
    }

    /**
     * Calculate rate of change between consecutive values
     */
    calculateChanges(values) {
        const changes = [];
        for (let i = 1; i < values.length; i++) {
            const change = values[i] - values[i - 1];
            changes.push(change);
        }
        return changes;
    }

    /**
     * Detect sudden spikes in infection rate
     */
    detectSpikes(changes, history) {
        const anomalies = [];

        if (changes.length < this.windowSize) return anomalies;

        // Calculate moving average and standard deviation
        const recentChanges = changes.slice(-this.windowSize);
        const mean = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;
        const variance = recentChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentChanges.length;
        const stdDev = Math.sqrt(variance);

        // Check last change
        const lastChange = changes[changes.length - 1];
        const zScore = stdDev > 0 ? (lastChange - mean) / stdDev : 0;

        if (zScore > this.threshold) {
            const lastState = history[history.length - 1];
            anomalies.push({
                type: 'spike',
                severity: zScore > 3 ? 'high' : 'medium',
                day: lastState.day,
                message: `Sudden spike detected: ${lastChange} new infections (Z-score: ${zScore.toFixed(2)})`,
                infected: lastState.infected,
                change: lastChange
            });
        }

        return anomalies;
    }

    /**
     * Detect unusual patterns (e.g., exponential growth)
     */
    detectPatterns(history) {
        const anomalies = [];

        if (history.length < 10) return anomalies;

        // Check for exponential growth pattern
        const recentHistory = history.slice(-10);
        const infectedValues = recentHistory.map(s => s.infected);

        // Calculate growth rate
        const growthRates = [];
        for (let i = 1; i < infectedValues.length; i++) {
            if (infectedValues[i - 1] > 0) {
                const rate = (infectedValues[i] - infectedValues[i - 1]) / infectedValues[i - 1];
                growthRates.push(rate);
            }
        }

        if (growthRates.length > 0) {
            const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

            // Exponential growth threshold (e.g., > 20% daily growth)
            if (avgGrowthRate > 0.2) {
                const lastState = history[history.length - 1];
                anomalies.push({
                    type: 'exponential_growth',
                    severity: avgGrowthRate > 0.5 ? 'high' : 'medium',
                    day: lastState.day,
                    message: `Exponential growth detected: Average growth rate ${(avgGrowthRate * 100).toFixed(1)}% per day`,
                    growthRate: avgGrowthRate
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect acceleration in disease spread
     */
    detectAcceleration(history) {
        const anomalies = [];

        if (history.length < 7) return anomalies;

        // Calculate second derivative (acceleration)
        const infectedValues = history.slice(-7).map(s => s.infected);
        const firstDerivative = [];
        const secondDerivative = [];

        for (let i = 1; i < infectedValues.length; i++) {
            firstDerivative.push(infectedValues[i] - infectedValues[i - 1]);
        }

        for (let i = 1; i < firstDerivative.length; i++) {
            secondDerivative.push(firstDerivative[i] - firstDerivative[i - 1]);
        }

        if (secondDerivative.length > 0) {
            const avgAcceleration = secondDerivative.reduce((a, b) => a + b, 0) / secondDerivative.length;

            // Significant acceleration threshold
            if (avgAcceleration > 2) {
                const lastState = history[history.length - 1];
                anomalies.push({
                    type: 'acceleration',
                    severity: avgAcceleration > 5 ? 'high' : 'medium',
                    day: lastState.day,
                    message: `Accelerating spread detected: Rate of increase is accelerating`,
                    acceleration: avgAcceleration
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect hotspots (geographic clusters - simplified for graph context)
     * @param {Graph} graph - The graph object
     * @returns {Array} Array of hotspot objects
     */
    detectHotspots(graph) {
        const hotspots = [];

        // Find areas with many infected neighboring areas or high internal infection
        for (const [areaId, area] of graph.nodes) {
            const infectedCount = graph.getInfectedCount ? graph.getInfectedCount(areaId) : 0;
            const neighbors = graph.getNeighbors(areaId);
            let infectedNeighbors = 0;
            let totalNeighboringInfected = 0;

            for (const neighborId of neighbors) {
                const neighbor = graph.nodes.get(neighborId);
                if (neighbor && neighbor.status === 'infected') {
                    infectedNeighbors++;
                }
                // Count total infected people in neighboring areas
                if (graph.getInfectedCount) {
                    totalNeighboringInfected += graph.getInfectedCount(neighborId);
                }
            }

            // Consider it a hotspot if it has 2+ infected neighbor areas OR high internal infection
            if (infectedNeighbors >= 2 || infectedCount > (area.totalPeople || 10) * 0.3) {
                hotspots.push({
                    nodeId: areaId,
                    riskLevel: (infectedNeighbors >= 3 || infectedCount > (area.totalPeople || 10) * 0.5) ? 'high' : 'medium',
                    infectedNeighbors: infectedNeighbors,
                    totalNeighboringInfected: totalNeighboringInfected,
                    message: `High-risk area: Area ${areaId} has ${infectedNeighbors} infected neighboring areas and ${infectedCount} internal infections`
                });
            }
        }

        // Sort by risk level (prioritize areas with high neighboring infection)
        hotspots.sort((a, b) => {
            if (a.riskLevel !== b.riskLevel) {
                return a.riskLevel === 'high' ? -1 : 1;
            }
            return (b.totalNeighboringInfected || 0) - (a.totalNeighboringInfected || 0);
        });

        return hotspots;
    }

    /**
     * Get summary of current risk level
     * @param {Object} currentState - Current disease state
     * @param {Array} history - History of states
     * @returns {string} Risk level (low, medium, high, critical)
     */
    getRiskLevel(currentState, history) {
        const total = currentState.total;
        const infectedPercent = (currentState.infected / total) * 100;

        // Check for recent anomalies
        const recentAnomalies = this.detectAnomalies(history.slice(-14));
        const hasHighSeverityAnomaly = recentAnomalies.some(a => a.severity === 'high');

        if (hasHighSeverityAnomaly || infectedPercent > 20) {
            return 'critical';
        } else if (infectedPercent > 10) {
            return 'high';
        } else if (infectedPercent > 5 || recentAnomalies.length > 0) {
            return 'medium';
        } else {
            return 'low';
        }
    }
}


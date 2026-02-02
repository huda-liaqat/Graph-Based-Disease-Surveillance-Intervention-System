/**
 * Data Generator Module
 * Generates sample data for testing and demonstration
 */

class DataGenerator {
    /**
     * Generate synthetic interaction data
     * @param {number} numIndividuals - Number of individuals
     * @param {Object} options - Generation options
     * @returns {Object} Generated data
     */
    static generateInteractionData(numIndividuals, options = {}) {
        const {
            avgConnections = 5,
            clustering = 0.3,
            ageRange = { min: 18, max: 80 },
            mobilityRate = 0.5
        } = options;

        const individuals = [];
        const interactions = [];

        // Generate individuals with demographics
        for (let i = 0; i < numIndividuals; i++) {
            individuals.push({
                id: i,
                age: Math.floor(Math.random() * (ageRange.max - ageRange.min + 1)) + ageRange.min,
                location: {
                    x: Math.random(),
                    y: Math.random()
                },
                mobilityRate: Math.random() * mobilityRate,
                contactsPerDay: Math.floor(Math.random() * avgConnections * 2) + 1
            });
        }

        // Generate interaction network (small-world model)
        const numConnections = Math.floor((numIndividuals * avgConnections) / 2);

        // Create initial ring
        for (let i = 0; i < numIndividuals; i++) {
            const next = (i + 1) % numIndividuals;
            interactions.push({
                from: i,
                to: next,
                weight: Math.random() * 0.5 + 0.5,
                type: 'regular'
            });
        }

        // Add random connections
        for (let i = interactions.length; i < numConnections; i++) {
            let from = Math.floor(Math.random() * numIndividuals);
            let to = Math.floor(Math.random() * numIndividuals);

            // Avoid self-loops and duplicate connections
            while (from === to || interactions.some(conn => 
                (conn.from === from && conn.to === to) || 
                (conn.from === to && conn.to === from)
            )) {
                from = Math.floor(Math.random() * numIndividuals);
                to = Math.floor(Math.random() * numIndividuals);
            }

            interactions.push({
                from: from,
                to: to,
                weight: Math.random() * 0.5 + 0.5,
                type: 'random'
            });
        }

        return {
            individuals: individuals,
            interactions: interactions,
            metadata: {
                totalIndividuals: numIndividuals,
                totalInteractions: interactions.length,
                avgDegree: (interactions.length * 2) / numIndividuals,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Generate time-series infection data
     * @param {number} days - Number of days
     * @param {Object} modelParams - Disease model parameters
     * @returns {Array} Time-series data
     */
    static generateTimeSeriesData(days, modelParams = {}) {
        const {
            initialInfected = 5,
            transmissionRate = 0.3,
            recoveryRate = 0.1,
            populationSize = 100
        } = modelParams;

        const data = [];
        let susceptible = populationSize - initialInfected;
        let infected = initialInfected;
        let recovered = 0;

        for (let day = 0; day < days; day++) {
            // Simple SIR simulation
            const newInfections = Math.floor(susceptible * infected * transmissionRate / populationSize);
            const newRecoveries = Math.floor(infected * recoveryRate);

            susceptible = Math.max(0, susceptible - newInfections);
            infected = Math.max(0, infected + newInfections - newRecoveries);
            recovered = Math.min(populationSize, recovered + newRecoveries);

            data.push({
                day: day,
                susceptible: susceptible,
                infected: infected,
                recovered: recovered,
                total: populationSize
            });
        }

        return data;
    }

    /**
     * Add noise to data (for realistic simulation)
     * @param {Array} data - Input data array
     * @param {number} noiseLevel - Noise level (0-1)
     * @returns {Array} Data with noise
     */
    static addNoise(data, noiseLevel = 0.05) {
        return data.map(item => {
            const noisyItem = { ...item };
            Object.keys(noisyItem).forEach(key => {
                if (typeof noisyItem[key] === 'number' && key !== 'day') {
                    const noise = (Math.random() - 0.5) * 2 * noiseLevel * noisyItem[key];
                    noisyItem[key] = Math.max(0, Math.floor(noisyItem[key] + noise));
                }
            });
            return noisyItem;
        });
    }

    /**
     * Generate demographic data
     * @param {number} numIndividuals - Number of individuals
     * @returns {Array} Demographic data
     */
    static generateDemographics(numIndividuals) {
        const demographics = [];

        for (let i = 0; i < numIndividuals; i++) {
            demographics.push({
                id: i,
                age: Math.floor(Math.random() * 62) + 18,
                gender: Math.random() < 0.5 ? 'M' : 'F',
                riskGroup: Math.random() < 0.2 ? 'high' : Math.random() < 0.3 ? 'medium' : 'low',
                vaccinationStatus: Math.random() < 0.3 ? 'vaccinated' : 'unvaccinated'
            });
        }

        return demographics;
    }
}


/**
 * Disease Modeling Module
 * Implements SIR and SEIR models for disease spread simulation at area level
 */

class DiseaseModel {
    constructor(graph, modelType = 'SIR') {
        this.graph = graph;
        this.modelType = modelType; // 'SIR' or 'SEIR'
        this.transmissionRate = 0.3; // β - probability of transmission
        this.recoveryRate = 0.1; // γ - recovery rate
        this.incubationRate = 0.2; // σ - incubation rate (SEIR only)
        this.day = 0;
        this.history = [];
    }

    /**
     * Set model parameters
     */
    setParameters({ transmissionRate, recoveryRate, incubationRate }) {
        if (transmissionRate !== undefined) this.transmissionRate = transmissionRate;
        if (recoveryRate !== undefined) this.recoveryRate = recoveryRate;
        if (incubationRate !== undefined) this.incubationRate = incubationRate;
    }

    /**
     * Initialize the simulation with initial infected people in areas
     * @param {number} initialInfected - Number of initially infected individuals (across all areas)
     */
    initialize(initialInfected = 5) {
        this.day = 0;
        this.history = [];

        // Reset all people in all areas to susceptible
        for (const [areaId, people] of this.graph.areaPeople) {
            for (let i = 0; i < people.length; i++) {
                people[i].status = 'susceptible';
            }
            this.graph.updateAreaStatus(areaId);
        }

        // Randomly select initial infected people across all areas
        const allPeople = [];
        for (const [areaId, people] of this.graph.areaPeople) {
            for (let i = 0; i < people.length; i++) {
                allPeople.push({ areaId, personIndex: i });
            }
        }

        const shuffled = allPeople.sort(() => Math.random() - 0.5);
        const infected = shuffled.slice(0, Math.min(initialInfected, allPeople.length));

        for (const { areaId, personIndex } of infected) {
            if (this.modelType === 'SEIR') {
                this.graph.updatePersonStatus(areaId, personIndex, 'exposed');
            } else {
                this.graph.updatePersonStatus(areaId, personIndex, 'infected');
            }
        }

        // Record initial state
        this.recordState();
    }

    /**
     * Run one day of simulation
     */
    step() {
        this.day++;

        if (this.modelType === 'SEIR') {
            this.stepSEIR();
        } else {
            this.stepSIR();
        }

        this.recordState();
    }

    /**
     * Step for SIR model
     */
    stepSIR() {
        const newInfected = [];
        const newRecovered = [];

        // Process each area
        for (const [areaId, people] of this.graph.areaPeople) {
            const area = this.graph.nodes.get(areaId);
            if (!area || area.status === 'quarantined') continue; // Skip quarantined areas

            // Process each person in the area
            for (let i = 0; i < people.length; i++) {
                const person = people[i];

                if (person.status === 'infected') {
                    // Check if person recovers
                    if (Math.random() < this.recoveryRate) {
                        newRecovered.push({ areaId, personIndex: i });
                    } else {
                        // Try to infect others within the same area
                        for (let j = 0; j < people.length; j++) {
                            if (i !== j && people[j].status === 'susceptible') {
                                if (Math.random() < this.transmissionRate * 0.5) { // Within-area transmission
                                    newInfected.push({ areaId, personIndex: j });
                                }
                            }
                        }

                        // Try to infect people in neighboring areas
                        const neighbors = this.graph.getNeighbors(areaId);
                        for (const neighborId of neighbors) {
                            const neighborArea = this.graph.nodes.get(neighborId);
                            if (!neighborArea || neighborArea.status === 'quarantined') continue;

                            const neighborPeople = this.graph.areaPeople.get(neighborId);
                            if (!neighborPeople) continue;

                            // Each infected person can potentially infect people in neighboring areas
                            // Probability decreases with distance (neighboring area transmission)
                            for (let j = 0; j < neighborPeople.length; j++) {
                                if (neighborPeople[j].status === 'susceptible') {
                                    if (Math.random() < this.transmissionRate * 0.2) { // Cross-area transmission (lower)
                                        newInfected.push({ areaId: neighborId, personIndex: j });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Apply changes
        for (const { areaId, personIndex } of newRecovered) {
            this.graph.updatePersonStatus(areaId, personIndex, 'recovered');
        }
        for (const { areaId, personIndex } of newInfected) {
            this.graph.updatePersonStatus(areaId, personIndex, 'infected');
        }
    }

    /**
     * Step for SEIR model
     */
    stepSEIR() {
        const newExposed = [];
        const newInfected = [];
        const newRecovered = [];

        // Process each area
        for (const [areaId, people] of this.graph.areaPeople) {
            const area = this.graph.nodes.get(areaId);
            if (!area || area.status === 'quarantined') continue; // Skip quarantined areas

            // Process each person in the area
            for (let i = 0; i < people.length; i++) {
                const person = people[i];

                if (person.status === 'exposed') {
                    // Check if exposed becomes infected
                    if (Math.random() < this.incubationRate) {
                        newInfected.push({ areaId, personIndex: i });
                    }
                } else if (person.status === 'infected') {
                    // Check if infected recovers
                    if (Math.random() < this.recoveryRate) {
                        newRecovered.push({ areaId, personIndex: i });
                    } else {
                        // Try to expose others within the same area
                        for (let j = 0; j < people.length; j++) {
                            if (i !== j && people[j].status === 'susceptible') {
                                if (Math.random() < this.transmissionRate * 0.5) { // Within-area transmission
                                    newExposed.push({ areaId, personIndex: j });
                                }
                            }
                        }

                        // Try to expose people in neighboring areas
                        const neighbors = this.graph.getNeighbors(areaId);
                        for (const neighborId of neighbors) {
                            const neighborArea = this.graph.nodes.get(neighborId);
                            if (!neighborArea || neighborArea.status === 'quarantined') continue;

                            const neighborPeople = this.graph.areaPeople.get(neighborId);
                            if (!neighborPeople) continue;

                            for (let j = 0; j < neighborPeople.length; j++) {
                                if (neighborPeople[j].status === 'susceptible') {
                                    if (Math.random() < this.transmissionRate * 0.2) { // Cross-area transmission (lower)
                                        newExposed.push({ areaId: neighborId, personIndex: j });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Apply changes
        for (const { areaId, personIndex } of newExposed) {
            this.graph.updatePersonStatus(areaId, personIndex, 'exposed');
        }
        for (const { areaId, personIndex } of newInfected) {
            this.graph.updatePersonStatus(areaId, personIndex, 'infected');
        }
        for (const { areaId, personIndex } of newRecovered) {
            this.graph.updatePersonStatus(areaId, personIndex, 'recovered');
        }
    }

    /**
     * Record current state in history
     */
    recordState() {
        const state = this.getCurrentState();
        this.history.push(state);
    }

    /**
     * Get current state (count people, not areas)
     */
    getCurrentState() {
        let susceptible = 0;
        let exposed = 0;
        let infected = 0;
        let recovered = 0;
        let vaccinated = 0;
        let quarantined = 0;
        let total = 0;

        for (const people of this.graph.areaPeople.values()) {
            for (const person of people) {
                total++;
                if (person.status === 'susceptible') susceptible++;
                else if (person.status === 'exposed') exposed++;
                else if (person.status === 'infected') infected++;
                else if (person.status === 'recovered') recovered++;
                else if (person.status === 'vaccinated') vaccinated++;
                else if (person.status === 'quarantined') quarantined++;
            }
        }

        return {
            day: this.day,
            susceptible,
            exposed,
            infected,
            recovered,
            vaccinated,
            quarantined,
            total
        };
    }

    /**
     * Get history of all states
     */
    getHistory() {
        return this.history;
    }

    /**
     * Calculate basic reproduction number R0
     */
    calculateR0() {
        // Simplified R0 = transmission rate * average contacts / recovery rate
        const stats = this.graph.getStatistics();
        const avgContacts = stats.avgDegree + 5; // Average contacts within area + between areas
        return (this.transmissionRate * avgContacts) / this.recoveryRate;
    }

    /**
     * Run simulation for specified number of days
     * @param {number} days - Number of days to simulate
     * @param {Function} onStep - Callback function called after each step
     */
    async runSimulation(days = 30, onStep = null) {
        for (let i = 0; i < days; i++) {
            this.step();
            if (onStep) {
                await onStep(this.getCurrentState(), this.day);
            }
            // Small delay for visualization
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

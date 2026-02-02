/**
 * Intervention Strategies Module
 * Implements vaccination, quarantine, and contact tracing interventions at area level
 */

class InterventionManager {
    constructor(graph, diseaseModel) {
        this.graph = graph;
        this.diseaseModel = diseaseModel;
        this.vaccinatedAreas = new Set(); // Areas with vaccinated people
        this.quarantinedAreas = new Set(); // Quarantined areas
        this.vaccinatedPeople = new Map(); // Map of areaId -> Set of vaccinated person indices
        this.interventionHistory = [];
    }

    /**
     * Apply vaccination strategy
     * @param {number} coverage - Percentage of population to vaccinate (0-100)
     * @param {string} strategy - Strategy: 'random', 'high-contact', 'centrality'
     * @returns {Object} Intervention result
     */
    applyVaccination(coverage, strategy = 'random') {
        const totalPeople = this.graph.totalPeople;
        const numToVaccinate = Math.floor((coverage / 100) * totalPeople);
        
        let peopleToVaccinate = [];

        if (strategy === 'random') {
            // Random selection across all areas
            const allPeople = [];
            for (const [areaId, people] of this.graph.areaPeople) {
                for (let i = 0; i < people.length; i++) {
                    const person = people[i];
                    if (person.status !== 'infected' && person.status !== 'recovered') {
                        allPeople.push({ areaId, personIndex: i });
                    }
                }
            }
            const shuffled = allPeople.sort(() => Math.random() - 0.5);
            peopleToVaccinate = shuffled.slice(0, numToVaccinate);

        } else if (strategy === 'high-contact') {
            // Target high-degree areas
            const candidates = Array.from(this.graph.nodes.entries())
                .sort((a, b) => b[1].degree - a[1].degree);
            
            for (const [areaId, area] of candidates) {
                if (peopleToVaccinate.length >= numToVaccinate) break;
                
                const people = this.graph.areaPeople.get(areaId);
                if (!people) continue;
                
                for (let i = 0; i < people.length && peopleToVaccinate.length < numToVaccinate; i++) {
                    const person = people[i];
                    if (person.status !== 'infected' && person.status !== 'recovered') {
                        peopleToVaccinate.push({ areaId, personIndex: i });
                    }
                }
            }

        } else if (strategy === 'centrality') {
            // Target high betweenness centrality areas
            const centrality = this.graph.calculateBetweennessCentrality();
            const candidates = Array.from(this.graph.nodes.entries())
                .sort((a, b) => (centrality.get(b[1].id) || 0) - (centrality.get(a[1].id) || 0));
            
            for (const [areaId, area] of candidates) {
                if (peopleToVaccinate.length >= numToVaccinate) break;
                
                const people = this.graph.areaPeople.get(areaId);
                if (!people) continue;
                
                for (let i = 0; i < people.length && peopleToVaccinate.length < numToVaccinate; i++) {
                    const person = people[i];
                    if (person.status !== 'infected' && person.status !== 'recovered') {
                        peopleToVaccinate.push({ areaId, personIndex: i });
                    }
                }
            }
        }

        // Apply vaccination
        for (const { areaId, personIndex } of peopleToVaccinate) {
            const people = this.graph.areaPeople.get(areaId);
            if (people && people[personIndex].status === 'susceptible') {
                this.graph.updatePersonStatus(areaId, personIndex, 'vaccinated');
                
                if (!this.vaccinatedPeople.has(areaId)) {
                    this.vaccinatedPeople.set(areaId, new Set());
                }
                this.vaccinatedPeople.get(areaId).add(personIndex);
                this.vaccinatedAreas.add(areaId);
            }
        }

        const result = {
            type: 'vaccination',
            strategy: strategy,
            coverage: coverage,
            peopleVaccinated: peopleToVaccinate.length,
            areaIds: Array.from(this.vaccinatedAreas)
        };

        this.interventionHistory.push({
            ...result,
            day: this.diseaseModel.day
        });

        return result;
    }

    /**
     * Apply quarantine to areas based on neighboring areas' infected count
     * @param {number} threshold - Minimum infected count in neighboring areas to trigger quarantine
     * @returns {Object} Intervention result
     */
    applyQuarantine(threshold = 10) {
        const areasToQuarantine = [];

        // Check each area
        for (const [areaId, area] of this.graph.nodes) {
            // Skip if already quarantined
            if (this.quarantinedAreas.has(areaId)) continue;

            // Check if area has infected people
            const infectedCount = this.graph.getInfectedCount(areaId);
            if (infectedCount === 0) continue; // Only quarantine areas with some infection

            // Get neighboring areas' infected count
            const neighboringInfectedCount = this.graph.getNeighboringInfectedCount(areaId);

            // Quarantine if neighboring areas have greater infected count than threshold
            if (neighboringInfectedCount >= threshold) {
                areasToQuarantine.push(areaId);
            }
        }

        // Apply quarantine to all people in these areas
        for (const areaId of areasToQuarantine) {
            const people = this.graph.areaPeople.get(areaId);
            if (!people) continue;

            // Only quarantine susceptible/exposed/infected people (not recovered/vaccinated)
            for (let i = 0; i < people.length; i++) {
                const person = people[i];
                if (person.status === 'susceptible' || 
                    person.status === 'exposed' || 
                    person.status === 'infected') {
                    this.graph.updatePersonStatus(areaId, i, 'quarantined');
                }
            }
            
            this.quarantinedAreas.add(areaId);
        }

        const result = {
            type: 'quarantine',
            threshold: threshold,
            areasQuarantined: areasToQuarantine.length,
            areaIds: areasToQuarantine
        };

        this.interventionHistory.push({
            ...result,
            day: this.diseaseModel.day
        });

        return result;
    }

    /**
     * Run contact tracing from infected areas
     * @param {number} maxDepth - Maximum depth of contact tracing
     * @param {boolean} quarantineContacts - Whether to quarantine traced areas
     * @returns {Object} Contact tracing result
     */
    runContactTracing(maxDepth = 2, quarantineContacts = true) {
        const infectedAreas = [];
        
        // Find areas with infected people
        for (const [areaId, area] of this.graph.nodes) {
            if (this.graph.getInfectedCount(areaId) > 0) {
                infectedAreas.push(areaId);
            }
        }

        const tracedAreas = new Set(infectedAreas);
        const quarantineList = [];

        // For each infected area, trace neighboring areas
        for (const infectedAreaId of infectedAreas) {
            const contacts = this.traceAreaContacts(infectedAreaId, maxDepth);
            
            for (const contactAreaId of contacts) {
                tracedAreas.add(contactAreaId);
                
                // Quarantine areas with susceptible/exposed people
                if (quarantineContacts && !this.quarantinedAreas.has(contactAreaId)) {
                    const area = this.graph.nodes.get(contactAreaId);
                    if (area && (area.status === 'susceptible' || area.status === 'exposed' || area.status === 'infected')) {
                        quarantineList.push(contactAreaId);
                    }
                }
            }
        }

        // Apply quarantine if requested
        if (quarantineContacts) {
            for (const areaId of quarantineList) {
                const people = this.graph.areaPeople.get(areaId);
                if (!people) continue;

                for (let i = 0; i < people.length; i++) {
                    const person = people[i];
                    if (person.status === 'susceptible' || 
                        person.status === 'exposed' || 
                        person.status === 'infected') {
                        this.graph.updatePersonStatus(areaId, i, 'quarantined');
                    }
                }
                
                this.quarantinedAreas.add(areaId);
            }
        }

        const result = {
            type: 'contact_tracing',
            maxDepth: maxDepth,
            infectedAreas: infectedAreas.length,
            tracedAreas: tracedAreas.size,
            quarantined: quarantineList.length,
            tracedAreaIds: Array.from(tracedAreas)
        };

        this.interventionHistory.push({
            ...result,
            day: this.diseaseModel.day
        });

        return result;
    }

    /**
     * Recursively trace area contacts
     * @param {number} areaId - Starting area ID
     * @param {number} maxDepth - Maximum depth
     * @param {number} depth - Current depth
     * @param {Set} visited - Visited areas
     * @returns {Array} Array of traced contact area IDs
     */
    traceAreaContacts(areaId, maxDepth, depth = 0, visited = new Set()) {
        if (depth >= maxDepth || visited.has(areaId)) {
            return [];
        }

        visited.add(areaId);
        const contacts = [];
        const neighbors = this.graph.getNeighbors(areaId);

        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                contacts.push(neighborId);
                // Recursively trace contacts of contacts
                const subContacts = this.traceAreaContacts(neighborId, maxDepth, depth + 1, visited);
                contacts.push(...subContacts);
            }
        }

        return contacts;
    }

    /**
     * Reset all interventions
     */
    reset() {
        // Reset vaccinated people to susceptible
        for (const [areaId, personIndices] of this.vaccinatedPeople) {
            const people = this.graph.areaPeople.get(areaId);
            if (people) {
                for (const personIndex of personIndices) {
                    if (people[personIndex] && people[personIndex].status === 'vaccinated') {
                        this.graph.updatePersonStatus(areaId, personIndex, 'susceptible');
                    }
                }
            }
        }

        // Reset quarantined areas (simplified: set to susceptible)
        for (const areaId of this.quarantinedAreas) {
            const people = this.graph.areaPeople.get(areaId);
            if (people) {
                for (let i = 0; i < people.length; i++) {
                    if (people[i].status === 'quarantined') {
                        this.graph.updatePersonStatus(areaId, i, 'susceptible');
                    }
                }
            }
        }

        this.vaccinatedAreas.clear();
        this.quarantinedAreas.clear();
        this.vaccinatedPeople.clear();
        this.interventionHistory = [];
    }

    /**
     * Get intervention statistics
     */
    getStatistics() {
        let vaccinatedCount = 0;
        for (const personIndices of this.vaccinatedPeople.values()) {
            vaccinatedCount += personIndices.size;
        }

        let quarantinedCount = 0;
        for (const areaId of this.quarantinedAreas) {
            const people = this.graph.areaPeople.get(areaId);
            if (people) {
                for (const person of people) {
                    if (person.status === 'quarantined') {
                        quarantinedCount++;
                    }
                }
            }
        }

        return {
            vaccinated: vaccinatedCount,
            quarantined: quarantinedCount,
            vaccinatedAreas: this.vaccinatedAreas.size,
            quarantinedAreas: this.quarantinedAreas.size,
            totalInterventions: this.interventionHistory.length
        };
    }

    /**
     * Calculate intervention effectiveness
     * @param {Array} history - Disease model history
     * @param {number} baselineDays - Days before intervention to use as baseline
     * @returns {Object} Effectiveness metrics
     */
    calculateEffectiveness(history, baselineDays = 7) {
        if (history.length < baselineDays + 1) {
            return null;
        }

        // Calculate average infection rate before and after intervention
        const baseline = history.slice(0, baselineDays);
        const afterIntervention = history.slice(baselineDays);

        const baselineAvgInfected = baseline.reduce((sum, state) => sum + state.infected, 0) / baseline.length;
        const afterAvgInfected = afterIntervention.reduce((sum, state) => sum + state.infected, 0) / afterIntervention.length;

        const reduction = baselineAvgInfected > 0 
            ? ((baselineAvgInfected - afterAvgInfected) / baselineAvgInfected) * 100 
            : 0;

        return {
            baselineAverage: baselineAvgInfected,
            afterAverage: afterAvgInfected,
            reductionPercent: reduction,
            effective: reduction > 10 // Consider effective if >10% reduction
        };
    }
}

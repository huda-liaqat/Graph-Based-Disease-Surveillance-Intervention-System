/**
 * Graph Construction Module
 * Creates and manages the interaction graph representing areas in a city and their connections
 * Each area contains multiple people (sub-nodes)
 */

class Graph {
    constructor() {
        this.nodes = new Map(); // Area nodes
        this.edges = []; // Connections between areas
        this.areaPeople = new Map(); // Map of areaId -> array of people objects
        this.network = null;
        this.data = { nodes: [], edges: [] };
    }

    /**
     * Generate a graph with areas and people within areas
     * @param {number} numNodes - Number of areas
     * @param {number} avgDegree - Average degree (connections between areas)
     * @param {number} peoplePerArea - Average number of people per area
     * @returns {Object} Graph data structure
     */
    generateRandomGraph(numNodes, avgDegree = 3, peoplePerArea = 10) {
        this.nodes.clear();
        this.edges = [];
        this.areaPeople.clear();
        this.data = { nodes: [], edges: [] };

        // Create area nodes
        for (let i = 0; i < numNodes; i++) {
            const area = {
                id: i,
                label: `Area ${i}`,
                status: 'susceptible',
                degree: 0,
                infectedCount: 0,
                totalPeople: peoplePerArea,
                x: Math.random() * 800,
                y: Math.random() * 600,
                color: { background: '#3498db', border: '#2980b9' },
                size: 30 // Larger size for areas
            };
            this.nodes.set(i, area);
            this.data.nodes.push(area);

            // Create people within this area
            const people = [];
            for (let j = 0; j < peoplePerArea; j++) {
                people.push({
                    id: `${i}-${j}`,
                    areaId: i,
                    status: 'susceptible'
                });
            }
            this.areaPeople.set(i, people);
        }

        // Create edges between neighboring areas based on geographic proximity
        const numEdges = Math.floor((numNodes * avgDegree) / 2);

        // Calculate distances between all area pairs
        const distances = [];
        for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
                const area1 = this.nodes.get(i);
                const area2 = this.nodes.get(j);
                const dx = area1.x - area2.x;
                const dy = area1.y - area2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                distances.push({ from: i, to: j, distance });
            }
        }

        // Sort by distance (closest first)
        distances.sort((a, b) => a.distance - b.distance);

        // Connect areas based on proximity
        // Connect the closest pairs first, up to the target number of edges
        const targetEdges = Math.min(numEdges, distances.length);
        let edgesCreated = 0;

        for (let i = 0; i < distances.length && edgesCreated < targetEdges; i++) {
            const { from, to, distance } = distances[i];
            
            if (!this.hasEdge(from, to)) {
                // Weight based on distance (closer = higher weight, normalized)
                const maxDistance = Math.max(...distances.map(d => d.distance));
                const weight = 1 - (distance / maxDistance) * 0.5; // Closer areas get weights 0.5-1.0
                
                const edge = {
                    id: this.edges.length,
                    from: from,
                    to: to,
                    weight: weight,
                    label: ''
                };
                this.edges.push(edge);
                this.data.edges.push(edge);
                this.nodes.get(from).degree++;
                this.nodes.get(to).degree++;
                edgesCreated++;
            }
        }

        // Update area labels to show infected count
        this.updateAreaLabels();

        return this.data;
    }

    /**
     * Update area labels to include infected count
     */
    updateAreaLabels() {
        for (const [areaId, area] of this.nodes) {
            const people = this.areaPeople.get(areaId) || [];
            const infectedCount = people.filter(p => p.status === 'infected').length;
            area.infectedCount = infectedCount;
            area.label = `Area ${areaId}\n(${infectedCount}/${people.length} infected)`;
            
            // Update in data array
            const dataNode = this.data.nodes.find(n => n.id === areaId);
            if (dataNode) {
                dataNode.label = area.label;
                dataNode.infectedCount = infectedCount;
            }
        }
    }

    /**
     * Check if an edge exists between two areas
     */
    hasEdge(from, to) {
        return this.edges.some(e => 
            (e.from === from && e.to === to) || 
            (e.from === to && e.to === from)
        );
    }

    /**
     * Get neighboring areas of an area
     * @param {number} areaId - Area ID
     * @returns {Array} Array of neighbor area IDs
     */
    getNeighbors(areaId) {
        const neighbors = [];
        for (const edge of this.edges) {
            if (edge.from === areaId) neighbors.push(edge.to);
            if (edge.to === areaId) neighbors.push(edge.from);
        }
        return neighbors;
    }

    /**
     * Get all people in an area
     * @param {number} areaId - Area ID
     * @returns {Array} Array of people objects
     */
    getPeopleInArea(areaId) {
        return this.areaPeople.get(areaId) || [];
    }

    /**
     * Get infected count in an area
     * @param {number} areaId - Area ID
     * @returns {number} Number of infected people
     */
    getInfectedCount(areaId) {
        const people = this.areaPeople.get(areaId) || [];
        return people.filter(p => p.status === 'infected').length;
    }

    /**
     * Get total infected count in neighboring areas
     * @param {number} areaId - Area ID
     * @returns {number} Total infected count in neighboring areas
     */
    getNeighboringInfectedCount(areaId) {
        const neighbors = this.getNeighbors(areaId);
        let totalInfected = 0;
        for (const neighborId of neighbors) {
            totalInfected += this.getInfectedCount(neighborId);
        }
        return totalInfected;
    }

    /**
     * Update person status within an area
     * @param {number} areaId - Area ID
     * @param {number} personIndex - Index of person in area
     * @param {string} status - New status
     */
    updatePersonStatus(areaId, personIndex, status) {
        const people = this.areaPeople.get(areaId);
        if (!people || personIndex >= people.length) return;
        
        people[personIndex].status = status;
        this.updateAreaStatus(areaId);
    }

    /**
     * Update area status based on its people's status
     * @param {number} areaId - Area ID
     */
    updateAreaStatus(areaId) {
        const area = this.nodes.get(areaId);
        if (!area) return;

        const people = this.areaPeople.get(areaId) || [];
        const infectedCount = people.filter(p => p.status === 'infected').length;
        const exposedCount = people.filter(p => p.status === 'exposed').length;
        const recoveredCount = people.filter(p => p.status === 'recovered').length;
        const vaccinatedCount = people.filter(p => p.status === 'vaccinated').length;
        const quarantinedCount = people.filter(p => p.status === 'quarantined').length;

        area.infectedCount = infectedCount;

        // Determine area status based on majority status or priority
        let areaStatus = 'susceptible';
        if (quarantinedCount > 0 && quarantinedCount >= people.length * 0.5) {
            areaStatus = 'quarantined';
        } else if (infectedCount > 0) {
            areaStatus = 'infected';
        } else if (exposedCount > 0) {
            areaStatus = 'exposed';
        } else if (recoveredCount > people.length * 0.5) {
            areaStatus = 'recovered';
        } else if (vaccinatedCount > people.length * 0.5) {
            areaStatus = 'vaccinated';
        }

        area.status = areaStatus;

        // Update color based on status
        const colors = {
            susceptible: { background: '#3498db', border: '#2980b9' },
            exposed: { background: '#f39c12', border: '#e67e22' },
            infected: { background: '#e74c3c', border: '#c0392b' },
            recovered: { background: '#27ae60', border: '#229954' },
            vaccinated: { background: '#9b59b6', border: '#8e44ad' },
            quarantined: { background: '#34495e', border: '#2c3e50' }
        };

        area.color = colors[areaStatus] || colors.susceptible;

        // Update label
        this.updateAreaLabels();

        // Update in data array
        const dataNode = this.data.nodes.find(n => n.id === areaId);
        if (dataNode) {
            dataNode.status = areaStatus;
            dataNode.color = area.color;
            dataNode.label = area.label;
            dataNode.infectedCount = infectedCount;
        }
    }

    /**
     * Update node status (for backward compatibility, now updates area)
     * @param {number} nodeId - Node/Area ID
     * @param {string} status - New status
     */
    updateNodeStatus(nodeId, status) {
        // For backward compatibility, set all people in area to this status
        const people = this.areaPeople.get(nodeId);
        if (!people) return;

        for (let i = 0; i < people.length; i++) {
            people[i].status = status;
        }

        this.updateAreaStatus(nodeId);
    }

    /**
     * Get all people across all areas with a specific status
     * @param {string} status - Status to filter by
     * @returns {Array} Array of {areaId, personIndex} objects
     */
    getPeopleByStatus(status) {
        const result = [];
        for (const [areaId, people] of this.areaPeople) {
            for (let i = 0; i < people.length; i++) {
                if (people[i].status === status) {
                    result.push({ areaId, personIndex: i });
                }
            }
        }
        return result;
    }

    /**
     * Get all areas with a specific status
     * @param {string} status - Status to filter by
     * @returns {Array} Array of area IDs
     */
    getNodesByStatus(status) {
        const result = [];
        for (const [id, area] of this.nodes) {
            if (area.status === status) {
                result.push(id);
            }
        }
        return result;
    }

    /**
     * Calculate degree centrality for all areas
     * @returns {Map} Map of areaId -> centrality score
     */
    calculateDegreeCentrality() {
        const centrality = new Map();
        const maxDegree = Math.max(...Array.from(this.nodes.values()).map(n => n.degree));

        for (const [id, area] of this.nodes) {
            centrality.set(id, maxDegree > 0 ? area.degree / maxDegree : 0);
        }

        return centrality;
    }

    /**
     * Calculate betweenness centrality (simplified version)
     * @returns {Map} Map of areaId -> centrality score
     */
    calculateBetweennessCentrality() {
        const centrality = new Map();
        
        // Initialize centrality scores
        for (const id of this.nodes.keys()) {
            centrality.set(id, 0);
        }

        // Simplified betweenness: count shortest paths through each area
        const areas = Array.from(this.nodes.keys());
        
        for (let i = 0; i < Math.min(50, areas.length); i++) {
            const start = areas[i];
            const distances = new Map();
            const paths = new Map();
            
            distances.set(start, 0);
            paths.set(start, [start]);
            
            const queue = [start];
            
            while (queue.length > 0) {
                const current = queue.shift();
                const neighbors = this.getNeighbors(current);
                
                for (const neighbor of neighbors) {
                    if (!distances.has(neighbor)) {
                        distances.set(neighbor, distances.get(current) + 1);
                        paths.set(neighbor, [...paths.get(current), neighbor]);
                        queue.push(neighbor);
                    }
                }
            }
            
            // Update centrality for areas on shortest paths
            for (const [target, path] of paths) {
                if (path.length > 2) {
                    for (let j = 1; j < path.length - 1; j++) {
                        centrality.set(path[j], centrality.get(path[j]) + 1);
                    }
                }
            }
        }

        // Normalize
        const maxCentrality = Math.max(...Array.from(centrality.values()));
        if (maxCentrality > 0) {
            for (const [id, value] of centrality) {
                centrality.set(id, value / maxCentrality);
            }
        }

        return centrality;
    }

    /**
     * Get high-contact areas (areas with highest degree)
     * @param {number} topK - Number of top areas to return
     * @returns {Array} Array of area IDs sorted by degree
     */
    getHighContactNodes(topK = 10) {
        const areaArray = Array.from(this.nodes.values());
        return areaArray
            .sort((a, b) => b.degree - a.degree)
            .slice(0, topK)
            .map(n => n.id);
    }

    /**
     * Initialize visualization using vis.js
     * @param {string} containerId - ID of the container element
     */
    initializeVisualization(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const options = {
            nodes: {
                shape: 'dot',
                size: 30,
                font: {
                    size: 14,
                    face: 'Tahoma',
                    multi: true
                },
                borderWidth: 3,
                shadow: true
            },
            edges: {
                width: 2,
                color: { color: '#848484' },
                smooth: {
                    type: 'continuous'
                },
                shadow: true
            },
            physics: {
                stabilization: true,
                barnesHut: {
                    gravitationalConstant: -8000,
                    springConstant: 0.001,
                    springLength: 200
                }
            },
            interaction: {
                tooltipDelay: 300,
                hideEdgesOnDrag: true
            }
        };

        this.network = new vis.Network(container, this.data, options);
    }

    /**
     * Update the visualization
     */
    updateVisualization() {
        if (this.network) {
            this.network.setData(this.data);
        }
    }

    /**
     * Get graph statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        let totalPeople = 0;
        for (const people of this.areaPeople.values()) {
            totalPeople += people.length;
        }

        return {
            totalNodes: this.nodes.size,
            totalEdges: this.edges.length,
            totalPeople: totalPeople,
            avgDegree: this.edges.length * 2 / this.nodes.size,
            maxDegree: Math.max(...Array.from(this.nodes.values()).map(n => n.degree)),
            minDegree: Math.min(...Array.from(this.nodes.values()).map(n => n.degree))
        };
    }

    /**
     * Get total number of people (for compatibility)
     */
    get totalPeople() {
        let total = 0;
        for (const people of this.areaPeople.values()) {
            total += people.length;
        }
        return total;
    }
}

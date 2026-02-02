# Graph-Based Disease Surveillance & Intervention System

A web-based simulation system for modeling disease spread across city areas using graph theory and epidemiological models (SIR/SEIR). The system visualizes how diseases spread through interconnected areas and allows users to test various intervention strategies.

## Features

### 🏙️ City Area-Based Modeling
- **Area-based structure**: The city is divided into multiple areas, each containing a population
- **Geographic proximity**: Areas are connected based on their geographic proximity (spatial distance)
- **Sub-population tracking**: Each area contains multiple people, allowing for granular disease tracking

### 📊 Disease Models
- **SIR Model**: Susceptible → Infected → Recovered
- **SEIR Model**: Susceptible → Exposed → Infected → Recovered
- Configurable transmission rates, recovery rates, and incubation rates
- Real-time visualization of disease spread

### 🛡️ Intervention Strategies
- **Vaccination**: 
  - Random vaccination
  - High-contact area prioritization
  - High centrality area prioritization
- **Quarantine**: Areas are quarantined when neighboring areas have high infection counts
- **Contact Tracing**: Trace and quarantine areas connected to infected areas

### 📈 Analytics & Monitoring
- **Disease Spread Timeline**: Visual chart showing disease progression over time
- **Anomaly Detection**: Automatic detection of unusual infection patterns
- **High-Risk Areas**: Identification of areas at risk based on neighboring infections
- **Intervention Effectiveness**: Track the impact of interventions on disease spread
- **Disease Metrics**: R₀ (basic reproduction number), peak infections, current infection rates

### 🎨 User Interface
- **Compact Layout**: All panels visible in a single window without scrolling
- **Interactive Network Graph**: Visual representation of city areas and their connections
- **Real-time Updates**: Live updates during simulation runs
- **Responsive Design**: Works on different screen sizes

## How to Use

### Getting Started

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari)

2. **Configure Simulation Parameters**:
   - **Number of Areas**: Set how many areas your city will have (5-100)
   - **People per Area**: Set the population size per area (5-50)
   - **Initial Infected**: Number of initially infected people
   - **Disease Model**: Choose SIR or SEIR model
   - **Transmission Rate (β)**: Probability of disease transmission
   - **Recovery Rate (γ)**: Rate at which infected individuals recover

3. **Generate Graph**: Click "Generate Graph" to create the city network

4. **Run Simulation**: Click "Run Simulation" to start the disease spread simulation (30 days)

5. **Apply Interventions**: 
   - Set vaccination coverage percentage and strategy
   - Set quarantine threshold (minimum neighboring infected count to trigger quarantine)
   - Click "Apply Interventions" or "Run Contact Tracing"

6. **Monitor Results**: 
   - Watch the network graph update in real-time
   - Check statistics panel for current disease state
   - Review analytics panels for insights
   - View timeline chart for historical trends

### Understanding the Visualization

- **Area Colors**:
  - 🔵 Blue: Susceptible (healthy)
  - 🟠 Orange: Exposed (incubating)
  - 🔴 Red: Infected (sick)
  - 🟢 Green: Recovered (immune)
  - 🟣 Purple: Vaccinated (protected)
  - ⚫ Gray: Quarantined (isolated)

- **Area Labels**: Show "Area X (infected/total infected)" format

- **Edges**: Lines connecting areas represent geographic proximity/neighbor relationships

## Technical Details

### Architecture

The system consists of several modules:

- **graph.js**: Graph construction and management
  - Creates area-based network structure
  - Connects areas based on geographic proximity
  - Manages people within each area
  - Updates area status based on population state

- **diseaseModel.js**: Disease spread simulation
  - Implements SIR and SEIR models
  - Handles transmission within and between areas
  - Tracks disease progression over time

- **interventions.js**: Intervention strategies
  - Vaccination strategies
  - Area-based quarantine logic (based on neighboring infections)
  - Contact tracing between areas

- **anomalyDetection.js**: Pattern detection
  - Detects unusual infection patterns
  - Identifies high-risk areas
  - Calculates risk levels

- **app.js**: Main application controller
  - Coordinates all modules
  - Handles UI interactions
  - Manages visualization updates

### Graph Connection Algorithm

Areas are connected using a **geographic proximity-based approach**:

1. All areas are assigned random x,y coordinates
2. Distances between all area pairs are calculated
3. Areas are sorted by distance (closest first)
4. The closest areas are connected first, up to the target number of edges
5. Edge weights are based on distance (closer = stronger connection)

This ensures that neighboring areas in the visualization are also connected in the graph, creating a realistic city layout.

### Quarantine Logic

An area is quarantined when:
- The area has at least some infected people (infectedCount > 0)
- The **total infected count in neighboring areas** exceeds the quarantine threshold
- This means if surrounding areas have high infection rates, the area is quarantined as a preventive measure

### Disease Transmission

Disease spreads in two ways:

1. **Within-area transmission**: People within the same area can infect each other (higher probability)
2. **Cross-area transmission**: Infected people can infect people in neighboring areas (lower probability, reflecting reduced contact)

## File Structure

```
AOA_Project/
├── index.html              # Main HTML file
├── styles.css              # Styling and layout
├── graph.js                # Graph construction and area management
├── diseaseModel.js         # SIR/SEIR disease models
├── interventions.js        # Vaccination, quarantine, contact tracing
├── anomalyDetection.js     # Pattern detection and risk analysis
├── app.js                  # Main application controller
├── dataGenerator.js        # Data generation utilities
└── README.md              # This file
```

## Dependencies

- **vis-network**: Used for graph visualization (loaded via CDN)
  - https://unpkg.com/vis-network/standalone/umd/vis-network.min.js

No build process or package installation required - just open the HTML file in a browser!

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Future Enhancements

Potential improvements:
- More sophisticated area layouts (grid, clustered, etc.)
- Additional disease models (SIRS, SIRD, etc.)
- More intervention strategies (lockdown, travel restrictions)
- Export simulation data
- Comparison of multiple simulation scenarios
- Custom area layouts/import from files

## License

This project is provided as-is for educational and research purposes.

## Contributing

Feel free to submit issues, suggestions, or improvements!


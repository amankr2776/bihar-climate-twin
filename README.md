# 🌏 VARUNA — AI-Powered Climate Digital Twin of India

> **Turning India's climate data into actionable foresight.**

**VARUNA** is an AI-powered **Climate Digital Twin** designed to transform India's national climate and Earth-observation datasets into an interactive system for **climate-state monitoring, short-term prediction, risk visualization, and what-if scenario analysis**.

The initial Proof of Concept focuses on **Bihar**, with rainfall and temperature as the core climate variables, and is designed around a scalable architecture that can be extended toward **Pan-India deployment**.

---

## 🚀 What is VARUNA?

Traditional climate dashboards primarily visualize observations or forecasts.

VARUNA goes a step further by connecting:

**National Data → Data Fusion → AI Prediction → Digital Twin State → Risk Analysis → Scenario Simulation → Decision Support**

The system maintains a continuously updated virtual representation of the pilot region and allows users to explore how changes in rainfall and temperature could affect climate-related risks.

---

## 🎯 Objectives

VARUNA is designed to:

* Build a scalable framework for an **AI-driven Digital Twin of India's climate**.
* Integrate heterogeneous national datasets from multiple sources.
* Generate short-term rainfall and temperature predictions.
* Represent the evolving climate state spatially.
* Provide interactive geospatial visualization.
* Analyze compound climate risks such as flood, heatwave, and drought.
* Enable **what-if scenario simulations**.
* Provide AI-assisted decision support.
* Establish an architecture that can scale from a Bihar pilot to broader national deployment.

---

## ✨ Key Features

### 🛰️ Multi-Source Climate Data Fusion

VARUNA is designed to combine heterogeneous Indian climate and geospatial datasets, including:

* **IMD Gridded Rainfall**
* **IMD Maximum & Minimum Temperature**
* **MOSDAC / INSAT Earth-observation products**
* **Bhuvan geospatial data**
* **IMDAA / ERA5 reanalysis** for planned bias correction and baseline support

The processing pipeline brings these sources into a unified spatial-temporal representation suitable for AI modelling.

---

### 🤖 Spatio-Temporal AI Forecasting

The AI layer uses a **Spatio-Temporal Graph Neural Network (ST-GNN)** with Transformer-based temporal modelling.

The spatial graph represents relationships between **534 Bihar blocks**, while temporal modelling captures evolving rainfall and temperature patterns.

Core workflow:

```text
Climate Inputs
     ↓
Spatial Graph Construction
     ↓
ST-GNN Spatial Learning
     ↓
Temporal Transformer
     ↓
T+1 Forecast
     ↓
Multi-step / Multi-day Extension
```

The architecture is designed to predict:

* 🌧️ Rainfall
* 🌡️ Temperature

at block-level spatial granularity.

---

### 🔄 Climate Digital Twin

VARUNA maintains a dynamic representation of the pilot region's climate state rather than treating every prediction as an isolated forecast.

The Digital Twin layer tracks evolving variables such as:

* Soil moisture
* Rainfall state
* Temperature state
* Heat-retention indicators
* Recent rainfall history
* Spatial risk conditions

The state is periodically updated as new observations and model outputs become available.

---

### ⚠️ Compound Climate Risk

Climate hazards rarely occur independently.

VARUNA combines multiple climate signals to identify interacting risks such as:

* 🌊 Flood risk
* 🔥 Heatwave risk
* 🌵 Drought stress
* 🌊🔥 Compound flood + heatwave risk

This enables the system to move from individual-variable prediction toward **integrated climate-risk intelligence**.

---

### 🧪 What-If Scenario Simulation

The scenario engine allows users to modify climate conditions and examine potential downstream impacts.

Example:

```text
Rainfall Anomaly: +50%
Temperature Anomaly: +5°C
              ↓
       Scenario Engine
              ↓
      Risk Propagation
              ↓
 Flood / Heatwave / Drought
              ↓
      Affected Regions
```

The purpose is to explore potential responses to changing climate conditions rather than simply display historical observations.

---

### 🗺️ Interactive WebGIS Dashboard

The VARUNA dashboard provides a unified interface for:

* District-level visualization
* Block-level analysis
* Climate-risk zones
* Forecast information
* Compound-risk visualization
* Scenario simulation
* Alerts
* AI-assisted decision support
* Situation-report generation

The interface is designed around operational usability rather than a conventional static analytics dashboard.

---

## 🏗️ System Architecture

VARUNA follows a five-layer architecture:

```text
┌──────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│   WebGIS Dashboard • Scenario Simulator • Early Warnings    │
├──────────────────────────────────────────────────────────────┤
│                  DIGITAL TWIN ENGINE                         │
│       State Manager • Scenario Engine • State Updates        │
├──────────────────────────────────────────────────────────────┤
│                     AI / ML CORE                             │
│      ST-GNN • Temporal Transformer • Validation Loop         │
├──────────────────────────────────────────────────────────────┤
│                   PROCESSING LAYER                           │
│      Secure Ingestion • ETL • Spatial Regridding • APIs     │
├──────────────────────────────────────────────────────────────┤
│                      DATA LAYER                              │
│       IMD • MOSDAC/INSAT • Bhuvan • IMDAA / ERA5             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧠 AI Pipeline

The core modelling pipeline is structured around spatial and temporal dependencies:

```text
6 Climate Features
       ↓
534-Block Spatial Graph
       ↓
Spatio-Temporal GNN
       ↓
Transformer-based Temporal Refinement
       ↓
Block-Level T+1 Prediction
       ↓
Risk Derivation
       ↓
Digital Twin State Update
```

The model is **data-driven**, learning spatial and temporal relationships from the integrated climate datasets.

---

## 📊 Pilot Region

### Bihar

Bihar was selected as the initial pilot because its geography and climate create strong interactions between:

* Monsoon rainfall
* Riverine flooding
* Heat extremes
* Soil-moisture variability
* Drought stress

The prototype represents:

**Bihar → Districts → 534 Blocks**

The architecture is designed so that the pilot can later be expanded to additional regions.

---

## 🛠️ Technology Stack

### AI / ML

* Python
* PyTorch
* Graph Neural Networks
* Transformer-based temporal modelling

### Data Processing

* GDAL
* Rasterio
* Spatial regridding
* ETL pipelines

### Backend

* FastAPI
* Python
* REST APIs

### Database

* PostgreSQL / PostGIS
* Supabase

### Frontend

* React.js
* Mapbox GL JS
* Plotly

### Deployment

* Docker
* Containerized services
* Serverless / cloud-oriented architecture

---

## 📡 Data Sources

VARUNA is designed around Indian national climate and Earth-observation data.

| Source                                    | Data / Purpose                                        |
| ----------------------------------------- | ----------------------------------------------------- |
| **India Meteorological Department (IMD)** | Gridded rainfall and temperature                      |
| **MOSDAC / INSAT**                        | Satellite-derived Earth-observation variables         |
| **Bhuvan**                                | Geospatial and administrative information             |
| **IMDAA / ERA5**                          | Reanalysis-based baseline and planned bias correction |

### Core IMD datasets

* Rainfall: **0.25° × 0.25°**
* Maximum temperature: **1.0° × 1.0°**
* Minimum temperature: **1.0° × 1.0°**
* Historical coverage used in the design: **1951–2025**

---

## 🔬 Validation Strategy

Model predictions are intended to be evaluated against independent observations and holdout periods.

The validation framework includes:

* Temporal holdout evaluation
* Comparison against IMD observations
* Forecast error metrics
* Spatial prediction assessment
* Baseline comparison
* Continuous validation and retraining workflow

### Target Performance

The current design uses:

* **91% target accuracy**
* **CSI > 0.85 target**

These are **target benchmarks, not claimed achieved results**, and are intended to be validated during the prototype implementation.

---

## 🧪 Example Scenario

A user can introduce a hypothetical climate anomaly:

```text
Rainfall Anomaly       +50%
Temperature Anomaly     +5°C
```

VARUNA then propagates the scenario through the risk-analysis layer to estimate potential changes in:

* Flood risk
* Heatwave risk
* Drought stress
* Compound risk
* Potentially affected regions

This provides a mechanism for exploring **"what-if" climate conditions** before making operational decisions.

---

## 📈 Scalability

VARUNA is designed as a modular system rather than a Bihar-only application.

```text
                PAN-INDIA
                   │
          ┌────────┴────────┐
          │                 │
      State Level       State Level
          │                 │
      Districts          Districts
          │                 │
        Blocks            Blocks
          │                 │
          └───────┬─────────┘
                  ↓
             AI Pipeline
                  ↓
          Digital Twin State
                  ↓
        National Risk Intelligence
```

The same architecture can be extended by adding:

* Additional states
* Additional climate variables
* Higher-resolution datasets
* More hazard models
* Additional satellite products
* More observation streams

---

## 💡 Why VARUNA?

Most climate applications stop at:

> **Observe → Forecast**

VARUNA aims to provide:

> **Observe → Assimilate → Predict → Represent → Simulate → Assess → Act**

This creates a bridge between climate data and practical decision support.

---

## 🖥️ Prototype

The current project includes a Proof-of-Concept dashboard demonstrating the intended VARUNA experience, including:

* Climate-risk map
* Forecast visualization
* Digital Twin state
* What-if simulator
* Compound-risk analysis
* AI decision support
* Alert interface

> **Note:** Some dashboard values and performance figures shown in the interface are illustrative PoC outputs and should not be interpreted as operational forecasts until validated against independent observations.

---

## 📂 Project Structure

```text
VARUNA/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── maps/
│   └── dashboard/
│
├── backend/
│   ├── api/
│   ├── services/
│   ├── models/
│   └── database/
│
├── ai/
│   ├── data_pipeline/
│   ├── graph_model/
│   ├── transformer/
│   ├── training/
│   └── validation/
│
├── digital_twin/
│   ├── state_manager/
│   ├── scenario_engine/
│   └── risk_engine/
│
├── data/
│   ├── imd/
│   ├── mosdac/
│   ├── bhuvan/
│   └── reanalysis/
│
├── notebooks/
│
├── docs/
│
├── docker/
│
└── README.md
```

---


## ⚠️ Current Status

**Project Stage: Proof of Concept / Prototype**

### Implemented / Demonstrated

* VARUNA dashboard concept
* Interactive climate-risk visualization
* Bihar district/block representation
* What-if scenario interface
* Digital Twin state concept
* AI architecture
* Multi-source data architecture
* Risk-analysis workflow

### Planned / Under Development

* Full national-scale data ingestion
* Production model training
* Independent validation
* Automated model retraining
* Expanded satellite-data assimilation
* Pan-India deployment
* Operational alert integration

---

## 🎯 Roadmap

### Phase 1 — Bihar PoC

* [ ] System architecture
* [ ] Dashboard design
* [ ] Digital Twin concept
* [ ] Scenario simulation concept
* [ ] Full model validation

### Phase 2 — Enhanced Climate Intelligence

* [ ] Improved spatio-temporal forecasting
* [ ] Additional climate variables
* [ ] Automated validation
* [ ] Real-time observation assimilation
* [ ] Advanced compound-risk modelling

### Phase 3 — Regional Expansion

* [ ] Multi-state deployment
* [ ] Higher-resolution modelling
* [ ] Additional hazard classes
* [ ] Automated retraining

### Phase 4 — Pan-India Climate Digital Twin

* [ ] National-scale deployment
* [ ] Multi-source real-time assimilation
* [ ] National climate-risk intelligence
* [ ] Scalable cloud infrastructure

---

## 🏆 Bharatiya Antariksh Hackathon 2026

VARUNA was developed for **Bharatiya Antariksh Hackathon 2026**, addressing the problem statement:

> **AI-Powered Digital Twin of India's Climate using India's National Data**

The project focuses on combining **Artificial Intelligence, Earth Observation, geospatial intelligence, and climate data** to create a scalable framework for climate-risk understanding and decision support.

---

## 👥 Team HACK_TITANS

**Project:** VARUNA
**Domain:** AI × Climate × Earth Observation × Geospatial Intelligence
**Hackathon:** Bharatiya Antariksh Hackathon 2026

---

## 📜 Disclaimer

VARUNA is a **Proof-of-Concept research and hackathon project**.

Dashboard visualizations, scenario outputs, target metrics, and illustrative forecasts should not be interpreted as official weather or disaster warnings.

Operational deployment would require rigorous validation, calibrated uncertainty estimation, appropriate domain review, and integration with authoritative observation and warning systems.

---

## 🌏 Vision

> **A living digital representation of India's climate—continuously learning from national data, anticipating emerging risks, and helping decision-makers explore what could happen before it happens.**

**VARUNA — From Climate Data to Climate Foresight.** 🌧️🛰️🤖

# eRTMAC-NWIS — Part 2
## AI, ML, Knowledge Intelligence & Real-Time Risk Detection

## 1. Objective

Implement **Part 2 of the eRTMAC-NWIS backend**.

Part 1 has already established:

- Node.js + Express backend
- MySQL database
- Qdrant vector database
- JWT authentication
- REST API foundation
- WebSocket infrastructure
- Database schema
- Basic well/event APIs

Part 2 must now implement the **actual intelligence layer** described in the eRTMAC-NWIS problem statement.

The goal is to transform the backend from a basic data-management system into an **AI-powered Nearby Wells Intelligence and Decision Support System**.

The Part 2 implementation must support:

1. Historical document intelligence
2. OCR/NLP-based information extraction
3. Embedding generation
4. Qdrant knowledge indexing
5. Semantic historical knowledge search
6. Nearby-well intelligence
7. Depth and formation correlation
8. ML-based drilling-risk prediction
9. Random Forest risk models
10. Risk scoring
11. Real-time risk detection
12. Historical evidence retrieval
13. Recommendations
14. Real-time alerts through WebSocket

The implementation must build on the existing Part 1 architecture rather than restructuring the backend.

---

# 2. Core Intelligence Architecture

The final Part 2 architecture should follow this general flow:

```text
                         ┌─────────────────────┐
                         │    Active Well      │
                         │ Current Drill Data  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Intelligence      │
                         │      Layer          │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
        ┌───────────┐        ┌────────────┐       ┌────────────┐
        │   MySQL   │        │ Random     │       │  Qdrant   │
        │           │        │ Forest ML  │       │            │
        │ Structured│        │            │       │ Historical │
        │ Data      │        │ Risk       │       │ Knowledge  │
        └─────┬─────┘        │ Prediction │       └─────┬──────┘
              │              └──────┬─────┘             │
              │                     │                   │
              └─────────────────────┼───────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ Risk + Evidence │
                           │ + Context       │
                           └────────┬────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ Recommendation  │
                           └────────┬────────┘
                                    │
                                    ▼
                             ┌────────────┐
                             │ WebSocket  │
                             └─────┬──────┘
                                   │
                                   ▼
                              Dashboard
```

---

# 3. Responsibilities of Each Component

Do not mix the responsibilities of MySQL, Qdrant and the ML model.

## MySQL

MySQL is the source of truth for structured information.

Use it for:

- Wells
- Well locations
- Well trajectories
- Formations
- Drilling parameters
- Operational events
- Historical incidents
- Casing information
- Cementing information
- Mud information
- Documents and document metadata
- Risks
- Alerts
- Recommendations
- Users
- Other structured application data

---

## Qdrant

Qdrant is the semantic knowledge-retrieval layer.

Use it for:

- Document embeddings
- Historical drilling experiences
- Report chunks
- Lessons learned
- Mitigation descriptions
- Incident descriptions
- Formation-specific knowledge
- Semantic similarity search

Qdrant should answer:

> "What historical information is similar to the current situation?"

---

## Random Forest

Random Forest is the primary predictive ML model.

It should answer:

> "Given the current drilling conditions, what drilling risk is likely to occur?"

Potential risks include:

- Stuck pipe
- Mud loss
- Kick
- Overpressure
- Torque spike
- Cementing issue

The exact available risk classes must be based on the training dataset.

---

## WebSocket

WebSocket is responsible for delivering real-time results to the dashboard.

It should answer:

> "How do we immediately notify the drilling engineer when something important happens?"

---

# 4. Part 2 Folder Structure

Extend the existing backend structure with the following modules:

```text
backend/
│
├── src/
│   │
│   ├── controllers/
│   │   ├── knowledgeController.js
│   │   ├── searchController.js
│   │   ├── riskController.js
│   │   ├── recommendationController.js
│   │   └── ...
│   │
│   ├── routes/
│   │   ├── knowledgeRoutes.js
│   │   ├── searchRoutes.js
│   │   ├── riskRoutes.js
│   │   ├── recommendationRoutes.js
│   │   └── ...
│   │
│   ├── services/
│   │   ├── documentService.js
│   │   ├── ocrService.js
│   │   ├── nlpService.js
│   │   ├── embeddingService.js
│   │   ├── qdrantService.js
│   │   ├── knowledgeService.js
│   │   ├── searchService.js
│   │   ├── correlationService.js
│   │   ├── riskPredictionService.js
│   │   ├── riskFeatureService.js
│   │   ├── recommendationService.js
│   │   └── alertService.js
│   │
│   ├── ml/
│   │   ├── models/
│   │   │   └── randomForest/
│   │   ├── preprocessing/
│   │   ├── training/
│   │   ├── prediction/
│   │   └── evaluation/
│   │
│   ├── websocket/
│   │   ├── events.js
│   │   ├── handlers.js
│   │   └── ...
│   │
│   └── ...
│
├── ml/
│   ├── datasets/
│   ├── models/
│   ├── notebooks/
│   ├── training/
│   └── evaluation/
│
└── ...
```

Do not force this exact structure if the existing Part 1 architecture uses different naming conventions. Maintain consistency with the existing project.

---

# 5. Historical Document Intelligence

The problem statement identifies historical drilling documents such as:

- Well Completion Reports
- Daily Drilling Reports
- Drilling reports
- Mud logging information
- Historical well records
- Other operational documents

Part 2 must provide a processing pipeline for these documents.

The pipeline should be:

```text
Document
   ↓
Document extraction
   ↓
OCR if required
   ↓
Text cleaning
   ↓
Chunking
   ↓
NLP information extraction
   ↓
Structured information
   ↓
MySQL
   │
   └──────────────┐
                  ▼
             Embeddings
                  ↓
               Qdrant
```

---

# 6. OCR

Implement an OCR service abstraction.

Example:

```text
src/services/ocrService.js
```

The service should be responsible for extracting text from scanned documents/images.

Do not tightly couple the entire backend to one OCR provider.

Create an interface/service layer so the OCR implementation can be replaced later.

The OCR pipeline should return clean text that can be passed to the NLP/embedding pipeline.

---

# 7. NLP Information Extraction

Create:

```text
src/services/nlpService.js
```

The NLP layer should identify useful drilling information from historical documents.

Potential information includes:

```text
Well
Formation
Depth
Event
Event type
Severity
Cause
Impact
Mitigation
Outcome
Drilling parameter
Lesson learned
```

For example:

```text
Historical report:
"At 3250 m while drilling Formation X, severe mud losses
were observed. Mud weight was reduced and losses were
controlled using lost-circulation material."

Extract:

Event:
Mud Loss

Depth:
3250 m

Formation:
Formation X

Mitigation:
Lost-circulation material

Outcome:
Losses controlled
```

Store structured information in MySQL where appropriate.

---

# 8. Text Chunking

Historical documents should be split into meaningful chunks before embedding.

Do not embed an entire large report as one vector.

Chunks should preferably preserve contextual information such as:

- Well
- Formation
- Depth
- Event type
- Document type

Each chunk should retain metadata that allows it to be traced back to its original document and MySQL records.

---

# 9. Embedding Generation

Create:

```text
src/services/embeddingService.js
```

The embedding service should convert relevant text into vectors.

Examples:

- Incident descriptions
- Lessons learned
- Mitigation measures
- Report chunks
- Formation-specific knowledge

The embedding model must be configurable.

Do not hardcode the embedding dimension in multiple locations.

---

# 10. Qdrant Knowledge Indexing

After generating embeddings:

```text
Text Chunk
    ↓
Embedding
    ↓
Qdrant
```

Each Qdrant record should contain:

```text
Vector
+
Metadata payload
```

Example:

```json
{
  "mysql_id": 123,
  "well_id": 45,
  "document_id": 78,
  "event_id": 91,
  "formation": "Formation X",
  "event_type": "stuck_pipe",
  "depth": 3250,
  "document_type": "DDR"
}
```

Use the actual IDs generated by MySQL.

---

# 11. Semantic Knowledge Search

Create APIs for searching historical knowledge.

Example:

```http
POST /api/search/knowledge
```

Request:

```json
{
  "query": "What happened to nearby wells while drilling this formation?",
  "wellId": 10,
  "depth": 3200,
  "formation": "Formation X"
}
```

The search pipeline should be:

```text
User Query
    ↓
Embedding
    ↓
Qdrant similarity search
    ↓
Metadata filtering
    ↓
Relevant historical chunks
    ↓
MySQL lookup
    ↓
Structured historical context
```

---

# 12. Context-Aware Search

Search should support contextual filtering.

Possible filters:

```text
Well
Formation
Depth
Depth range
Event type
Severity
Document type
Date
```

For example:

```text
"Find stuck-pipe incidents around 3000–3500m
in Formation X from nearby wells."
```

The backend should combine:

- Semantic similarity
- Metadata filtering
- Geographical proximity
- Depth
- Formation

where appropriate.

---

# 13. Nearby-Well Intelligence

Enhance the Part 1 nearby-well API.

The system should allow:

```text
Active well
+
Search radius
+
Current depth
+
Current formation
```

to identify relevant offset wells.

Example:

```http
GET /api/intelligence/nearby-wells
```

Potential response:

```json
{
  "success": true,
  "data": {
    "activeWell": {},
    "radius": 10,
    "nearbyWells": []
  }
}
```

Each nearby well should provide useful context such as:

- Distance
- Formation
- Depth
- Historical events
- Risk incidents
- Relevant documents

---

# 14. Depth Correlation

Create a correlation service:

```text
src/services/correlationService.js
```

It should compare the active well against historical wells based on depth.

Example:

```text
Active Well
Current depth = 3200m

        ↓

Nearby Well A
Event at 3180m

Nearby Well B
Event at 3230m

Nearby Well C
Event at 3195m
```

The system should identify relevant historical events occurring around the active depth.

The depth tolerance/range must be configurable.

---

# 15. Formation Correlation

The correlation layer should also compare formations.

Example:

```text
Current formation:
Formation X

        ↓

Historical offset wells

Well A → Formation X
Well B → Formation X
Well C → Formation Y
Well D → Formation X
```

Prioritize historical evidence from the same or relevant formation.

---

# 16. Combined Offset-Well Intelligence

The system should combine:

```text
Geographic proximity
+
Formation similarity
+
Depth similarity
+
Historical event similarity
```

to identify the most relevant offset-well information.

Do not rely solely on geographic distance.

A farther well with the same formation and similar drilling conditions may be more useful than a closer well in a different formation.

---

# 17. ML Risk Prediction

## Primary Model

Use **Random Forest** as the primary ML model for drilling-risk prediction.

Do not use a neural network unless there is a later requirement that justifies it.

The ML model should operate on structured/tabular drilling data.

---

# 18. ML Prediction Objective

The model should predict the probability or class of drilling risks based on current drilling conditions and historical data.

Potential prediction targets:

```text
Stuck Pipe
Mud Loss
Kick
Overpressure
Torque Spike
Cementing Issue
```

The exact target classes must match the available training dataset.

Do not fabricate labels that do not exist in the dataset.

---

# 19. ML Input Features

Potential features include:

```text
Depth
True Vertical Depth
Formation
ROP
WOB
RPM
Torque
Standpipe Pressure
Mud Weight
Flow Rate
Pump Pressure
Temperature
Well location
Historical event indicators
Formation characteristics
Other available drilling parameters
```

Only use features actually available in the training dataset.

Categorical features such as formation or event-related categories must be encoded appropriately.

---

# 20. Feature Engineering

Create a dedicated preprocessing pipeline.

Possible feature engineering:

### Numerical

- Normalization/scaling where appropriate
- Rolling averages
- Rate of change
- Difference from previous measurements
- Moving statistics
- Depth-window statistics

### Categorical

Use appropriate encoding for:

- Formation
- Event type
- Well type
- Other categorical variables

### Temporal

If timestamps are available:

- Recent parameter trends
- Change over time
- Rolling-window features

Do not create meaningless features merely to increase model complexity.

---

# 21. ML Training Pipeline

Create a reproducible training pipeline.

The pipeline should be:

```text
Historical Data
      ↓
Data Cleaning
      ↓
Feature Engineering
      ↓
Train/Test Split
      ↓
Random Forest Training
      ↓
Validation
      ↓
Evaluation
      ↓
Save Model
```

Do not train the model every time the backend starts.

Training should be a separate process.

---

# 22. Train/Test Split

Avoid random leakage between measurements belonging to the same well.

Where the dataset allows it, split data at the **well level** rather than randomly splitting individual rows.

This is important because data points from the same well can be highly correlated.

A model that sees part of the same well during training and testing may produce misleadingly high performance.

---

# 23. Model Evaluation

Evaluate the Random Forest model using appropriate classification metrics.

At minimum consider:

```text
Accuracy
Precision
Recall
F1-score
Confusion Matrix
```

For risk prediction, pay particular attention to **recall for dangerous events**, because failing to identify a real risk may be more important than simply maximizing overall accuracy.

Do not report fabricated model accuracy.

Only display metrics calculated from the actual dataset.

---

# 24. Class Imbalance

Drilling incidents may be rare compared with normal drilling conditions.

Check for class imbalance.

If required, consider:

- Class weights
- Appropriate sampling
- Threshold adjustment
- Other justified techniques

Do not blindly oversample the data without checking its effect.

---

# 25. Random Forest Prediction Output

The prediction service should return a structured result.

Example:

```json
{
  "riskType": "STUCK_PIPE",
  "probability": 0.82,
  "severity": "HIGH",
  "model": "random_forest"
}
```

If multiple risks are predicted:

```json
{
  "risks": [
    {
      "type": "STUCK_PIPE",
      "probability": 0.82,
      "severity": "HIGH"
    },
    {
      "type": "OVERPRESSURE",
      "probability": 0.64,
      "severity": "MEDIUM"
    }
  ]
}
```

Do not confuse model probability with certainty.

---

# 26. Risk Thresholds

Define configurable thresholds.

For example:

```text
0.00 – 0.39 → Low
0.40 – 0.69 → Medium
0.70 – 1.00 → High
```

These values are only initial configuration examples.

Do not assume these thresholds are scientifically validated.

Make them configurable so they can be adjusted after model evaluation.

---

# 27. Risk Prediction Service

Create:

```text
src/services/riskPredictionService.js
```

The service should hide the ML implementation from the rest of the backend.

The rest of the backend should call something conceptually like:

```text
predictRisk(currentWellData)
```

and receive structured predictions.

Do not put Random Forest implementation directly inside REST controllers.

---

# 28. ML Model Integration

The backend must be able to communicate with the trained model.

Preferred architecture:

```text
Express Backend
      │
      ▼
riskPredictionService
      │
      ▼
ML Prediction Layer
      │
      ▼
Random Forest Model
      │
      ▼
Prediction
```

The exact implementation may use:

- A Python ML service
- A serialized model
- A suitable Node-compatible ML implementation

Choose the simplest reliable architecture based on the actual training environment.

Do not force the entire ML training stack into Node.js if Python provides a significantly cleaner implementation.

---

# 29. Historical Evidence + ML Prediction

The ML model should not operate in isolation.

After detecting a potential risk:

```text
Current Well Data
       ↓
Random Forest
       ↓
Risk detected
       ↓
Qdrant
       ↓
Search similar historical incidents
       ↓
MySQL
       ↓
Retrieve structured event details
```

Example:

```text
Prediction:

STUCK PIPE
Probability: 82%

Historical evidence:

3 nearby wells experienced stuck pipe
between 3150m–3300m in the same formation.

Historical mitigation:
...
```

This makes the system a **decision-support platform**, rather than simply a classification model.

---

# 30. Risk Explanation

Where possible, provide useful model/context information with the prediction.

For example:

```text
Risk:
Stuck Pipe

Probability:
82%

Current depth:
3230m

Formation:
Formation X

Relevant factors:
Torque increase
ROP decrease
Historical nearby incidents
```

Do not claim that a particular feature caused the prediction unless the model analysis actually supports that interpretation.

If feature importance is displayed, clearly identify it as model-derived importance rather than causal evidence.

---

# 31. Real-Time Risk Detection

Integrate the ML prediction pipeline with the existing WebSocket infrastructure.

The final flow should be:

```text
Live Drilling Data
       ↓
Backend
       ↓
Feature Preparation
       ↓
Random Forest
       ↓
Risk Prediction
       ↓
Risk Threshold
       ↓
Risk Detected
       ↓
Qdrant Historical Search
       ↓
MySQL Context
       ↓
Recommendation
       ↓
WebSocket
       ↓
Dashboard
```

---

# 32. Real-Time Alert Generation

When a high-priority risk is detected:

1. Generate a risk record.
2. Store the important structured information in MySQL.
3. Search relevant historical evidence in Qdrant.
4. Generate/retrieve a recommendation.
5. Create an alert.
6. Emit the alert through WebSocket.

Example event:

```text
risk:detected
```

Example payload:

```json
{
  "wellId": 12,
  "depth": 3230,
  "riskType": "STUCK_PIPE",
  "probability": 0.82,
  "severity": "HIGH",
  "formation": "Formation X"
}
```

---

# 33. Historical Recommendation System

Recommendations should combine:

```text
Current conditions
+
ML prediction
+
Historical events
+
Historical mitigation
+
Formation
+
Depth
+
Nearby wells
```

Example:

```text
Current Risk:
Potential stuck pipe

Historical evidence:
3 nearby wells experienced similar events.

Historical mitigation:
...

Recommendation:
Review the historical mitigation procedure
used in the relevant offset wells.
```

The recommendation should clearly distinguish historical evidence from newly generated recommendations.

---

# 34. WebSocket Events

Implement application-level real-time events such as:

```text
drilling:update
risk:detected
risk:updated
alert:new
recommendation:new
knowledge:result
```

Use the existing WebSocket infrastructure from Part 1.

Do not create a second WebSocket server.

---

# 35. Risk APIs

Create APIs such as:

```http
GET  /api/risks
GET  /api/risks/:id
POST /api/risks/predict
```

The prediction endpoint should accept current well/drilling information and return the ML prediction.

Example:

```json
{
  "wellId": 12,
  "depth": 3230,
  "formation": "Formation X",
  "rop": 18.2,
  "wob": 14.5,
  "rpm": 110,
  "torque": 4200,
  "mudWeight": 1.18
}
```

The backend should transform this into the feature format expected by the ML model.

---

# 36. Intelligence API

Provide an endpoint that combines all relevant intelligence.

Example:

```http
GET /api/intelligence/wells/:wellId
```

Potential response:

```json
{
  "well": {},
  "nearbyWells": [],
  "currentFormation": {},
  "historicalEvents": [],
  "predictedRisks": [],
  "historicalEvidence": [],
  "recommendations": []
}
```

This endpoint should make it easier for the dashboard to load the complete intelligence context.

---

# 37. Search API

Provide a semantic search API:

```http
POST /api/search/knowledge
```

It should support:

- Natural-language query
- Well filter
- Formation filter
- Depth range
- Event type
- Radius/nearby-well filtering

The backend should combine Qdrant semantic retrieval with MySQL structured filtering where appropriate.

---

# 38. Performance Considerations

Do not perform expensive operations unnecessarily.

For real-time data:

- Avoid retraining the ML model.
- Reuse the loaded model.
- Avoid querying the entire MySQL database.
- Use indexed database queries.
- Use Qdrant filtering.
- Cache where appropriate.
- Avoid running expensive semantic searches for every minor data update unless required.

Only trigger expensive intelligence processing when meaningful changes occur.

---

# 39. Model Versioning

Store model metadata.

For example:

```text
Model name
Model version
Training date
Training dataset version
Features used
Target classes
Evaluation metrics
```

Predictions should ideally record which model version generated them.

Example:

```json
{
  "model": "random_forest",
  "modelVersion": "1.0.0"
}
```

---

# 40. ML Safety / Reliability

The system is a **decision-support system**, not an autonomous drilling-control system.

The backend must not automatically control drilling equipment based on an ML prediction.

Predictions should be presented as:

- Risk indicators
- Probabilities
- Historical evidence
- Recommendations

A drilling engineer remains responsible for operational decisions.

---

# 41. Part 2 Completion Criteria

Part 2 is complete when the following functionality is working.

## Document Intelligence

```text
✓ Historical documents can be processed
✓ OCR pipeline works where required
✓ Text extraction works
✓ NLP extraction works
✓ Relevant structured information reaches MySQL
```

## Qdrant Knowledge

```text
✓ Documents/chunks are embedded
✓ Embeddings are stored in Qdrant
✓ Metadata is stored
✓ Semantic search works
✓ Historical events can be retrieved
✓ MySQL records can be linked
```

## Nearby Well Intelligence

```text
✓ Nearby wells can be identified
✓ Geographic distance is supported
✓ Formation correlation works
✓ Depth correlation works
✓ Historical events can be retrieved
```

## ML

```text
✓ Training pipeline exists
✓ Data preprocessing exists
✓ Random Forest model trains
✓ Model is evaluated
✓ Model is saved/versioned
✓ Backend can request predictions
✓ Risk probability is returned
✓ Risk severity is calculated
```

## Real-Time Intelligence

```text
✓ Current drilling data can be processed
✓ ML prediction can be triggered
✓ Risk can be detected
✓ Historical evidence can be retrieved
✓ Alert can be created
✓ Recommendation can be generated
✓ WebSocket alert reaches dashboard
```

---

# 42. Final End-to-End Architecture

The completed NWIS intelligence system should operate approximately as follows:

```text
                       ACTIVE WELL
                           │
                           ▼
                  Current Drilling Data
                           │
                           ▼
                    Feature Processing
                           │
                           ▼
                  ┌─────────────────┐
                  │  Random Forest  │
                  │   Risk Model    │
                  └────────┬────────┘
                           │
                    Risk Prediction
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
          MySQL                      Qdrant
       Current Data             Historical Knowledge
              │                         │
              │                 Similar incidents
              │                 Similar formations
              │                 Similar events
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
                   Intelligence Layer
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
          Risk Info    Historical    Context
                        Evidence
              │            │            │
              └────────────┼────────────┘
                           ▼
                     Recommendation
                           │
                           ▼
                        Alert
                           │
                           ▼
                       WebSocket
                           │
                           ▼
                    Engineer Dashboard
```

---

# 43. Important Implementation Rules

1. Do not rebuild Part 1 infrastructure.
2. Reuse the existing MySQL connection.
3. Reuse the existing Qdrant client.
4. Reuse the existing JWT authentication.
5. Reuse the existing WebSocket server.
6. Do not duplicate database connections.
7. Do not train the Random Forest model inside the API request.
8. Do not retrain the model every time the server starts.
9. Keep ML training separate from ML prediction.
10. Keep ML logic inside the ML/prediction service.
11. Keep Qdrant operations inside the Qdrant service.
12. Keep business logic inside services.
13. Keep controllers thin.
14. Do not store large document contents unnecessarily in MySQL.
15. Do not store the complete relational dataset inside Qdrant.
16. Always maintain references between Qdrant records and MySQL entities.
17. Do not fabricate model accuracy or predictions.
18. Do not fabricate historical drilling events.
19. Use fictional development data if real OIL data is unavailable.
20. Do not treat ML predictions as guaranteed outcomes.
21. Do not allow ML predictions to directly control drilling equipment.
22. Keep model configuration and thresholds configurable.
23. Make the embedding model configurable.
24. Make the ML model version identifiable.
25. Keep the system modular so the Random Forest model can later be replaced without redesigning the backend.

---

# 44. Final Instruction to the Coding Agent

Implement **ONLY PART 2** of the eRTMAC-NWIS backend.

Assume that Part 1 has already been implemented and is working.

Before coding:

1. Inspect the existing backend structure.
2. Understand the existing MySQL schema.
3. Understand the existing Qdrant configuration.
4. Understand the existing WebSocket implementation.
5. Understand the existing REST APIs.
6. Extend the existing architecture rather than replacing it.

Then implement:

```text
Document Intelligence
        +
OCR/NLP
        +
Embedding Pipeline
        +
Qdrant Knowledge Search
        +
Nearby-Well Intelligence
        +
Depth/Formation Correlation
        +
Random Forest Risk Prediction
        +
Risk Scoring
        +
Historical Evidence Retrieval
        +
Recommendations
        +
Real-Time Risk Alerts
        +
WebSocket Integration
```

Do not modify Part 1 unnecessarily.

Do not introduce a different database.

Do not replace Qdrant.

Do not replace WebSocket.

Do not replace JWT.

Do not implement a different ML algorithm unless the existing dataset makes Random Forest technically impossible; if that happens, explain the problem before changing the model.

The final result should provide an end-to-end **AI-powered Nearby Wells Intelligence and Decision Support workflow** for the eRTMAC-NWIS problem statement.
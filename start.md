# Getting Started: eRTMAC-NWIS

This document provides instructions on how to start the backend and frontend servers for the NWIS (National Well Intelligence System) project.

## Prerequisites
- Node.js (v20+ recommended)
- Docker & Docker Compose (for running the MySQL and Qdrant databases)

## 1. Start the Databases
The project uses MySQL (relational data) and Qdrant (vector knowledge base). They run locally via Docker.
1. Open a terminal in the root directory (`d:\web\SIH`).
2. Run the following command:
   ```bash
   docker-compose up -d
   ```
   *This starts MySQL on port 3306 and Qdrant on port 6333.*

## 2. Start the Backend
The backend is a Node.js/Express server written in TypeScript.
1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```
3. Set up the environment variables. Ensure the `.env` file is populated properly based on `.env.example`. Make sure to add your Grok or OpenAI API keys if you intend to test the semantic search embeddings.
4. (First-time setup only) Run the database setup, Qdrant setup, and seeding script:
   ```bash
   npm run setup
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   *The backend will be running on `http://localhost:5000`.*

## 3. Start the ML Service (Python)
The Random Forest risk model and the reranker run in a Python FastAPI service (`backend/ml/`).
1. Open a new terminal and navigate to the ML directory:
   ```bash
   cd backend/ml
   ```
2. Create a virtual environment (first time only) and install dependencies:
   ```bash
   python -m venv .venv
   .venv\Scripts\pip install -r requirements.txt      # Windows
   # .venv/bin/pip install -r requirements.txt        # macOS/Linux
   ```
3. (First time only) Generate the synthetic dataset and train the model:
   ```bash
   .venv\Scripts\python -m nwis_ml.generate_dataset
   .venv\Scripts\python -m nwis_ml.train --version v1.0.1
   ```
   Metrics are written to `ml/models/random_forest_<version>/metadata.json`.
4. Start the service:
   ```bashpython -m uvicorn nwis_ml.service:app --port 8100
   .venv\Scripts\python -m uvicorn nwis_ml.service:app --port 8100
   ```
   *The ML service will be running on `http://localhost:8100` (see `/health`).*

   If the service is not running, the backend falls back to a labeled heuristic stub for risk prediction, and hybrid search returns RRF-fused results without cross-encoder reranking — everything keeps working, just without ML.

   Optional (cross-encoder reranking): `pip install sentence-transformers`, then set `RERANKER_MODEL` in the environment and restart the ML service. Without it, `/rerank` uses lexical BM25 scoring.

## 4. Start the Frontend
The frontend is a Next.js application.
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd nwis
   ```
2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will be running on `http://localhost:3000`.*
   
## Accessing the Application
Once both servers are running, open your browser and navigate to [http://localhost:3000](http://localhost:3000) to access the application. You can login as an administrator or use the tools as a regular engineer.

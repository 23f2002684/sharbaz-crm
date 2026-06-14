# Xeno Mini CRM

An AI-native CRM for D2C brands, featuring intelligent shopper segmentation, personalized campaign drafting, and predictive analytics.

## Prerequisites
- Docker & Docker Compose installed on your machine.
- An API key from [Groq](https://console.groq.com/keys) (for the LLM reasoning) and/or [Google Gemini](https://aistudio.google.com/) (for embeddings). *If you don't provide them, the app will gracefully fall back to mock data so you can still test it!*

## How to Run the Application

### 1. Set Environment Variables
Create a `.env` file in the root `xeno work` directory and add your API keys:
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Start the Stack using Docker Compose
Open your terminal in the root directory (`xeno work`) and run:
```bash
docker-compose build
docker-compose up -d
```
This single command spins up:
- The React Frontend (Vite)
- The FastAPI CRM Backend
- The Stub Channel Microservice
- The Celery Async Worker
- Redis (Task Queue)
- PostgreSQL (Database)

### 3. Seed the Database
To populate the CRM with realistic dummy Indian D2C data (customers, orders, tags, etc.) so your dashboard looks great, run the seed script inside the backend container:
```bash
docker-compose exec crm_backend python seed.py
```

### 4. Access the Application
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **CRM Backend API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Stub Channel API Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)

## System Architecture Highlights
- **Distributed Architecture:** The Campaign dispatcher runs in the background (Celery) to prevent API blocking. The external "Channel Service" mocks actual delivery delays and failures, pinging our CRM asynchronously.
- **AI-Native Layer:** Groq parses natural language ("Show me high spenders from Mumbai") directly into JSON filters. Gemini embeds customer attributes into an in-memory NumPy vector store for rapid RAG-based context injection during message drafting.
- **Predictive Engine:** Calculates a 30-day linear regression revenue forecast and categorizes churn risk in real-time based on live PostgreSQL data.

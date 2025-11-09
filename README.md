# BloomAI – Flower Classification (Frontend + Backend)

Identify the flower in any image using a Next.js frontend and a FastAPI + TensorFlow backend.

## Features
- Next.js 15 (App Router) UI with drag-and-drop image upload
- FastAPI backend serving a Keras model (`flower_model.keras`)
- Predicts among: `daisy`, `dandelion`, `roses`, `sunflowers`, `tulips`
- Returns `prediction`, `confidence`, and `probabilities` for debugging
- **NEW: Plant Disease Detection** - Upload plant images and get AI-powered disease analysis using Google Gemini API
- CORS configured for local dev and Vercel domain

## Project Structure
```
flower/
  backend/
    main.py
    requirements.txt
    flower_model.keras
    .gitignore
  frontend/
    src/app/page.tsx
    package.json
    next.config.ts
    .gitignore
README.md
```

## Prerequisites
- Node.js ≥ 18 and npm
- Python ≥ 3.10 (with pip)
- Git (for deployment to Render/Vercel)

## Backend – Local Setup
1) Create and activate a virtual environment
- Windows PowerShell
```powershell
cd backend
python -m venv venv
backend\venv\Scripts\activate
```
- macOS/Linux
```bash
cd backend
python -m venv venv
source venv/bin/activate
```

2) Install dependencies
```bash
pip install -r requirements.txt
```

**Note:** The backend now includes `google-generativeai` for the disease detection feature. Make sure to install all dependencies.

3) Run the API
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload OR uvicorn main:app --reload
```
- Health check: open `http://localhost:8000/`
- Predict endpoint: `POST http://localhost:8000/predict` with form-data field `image`

## Frontend – Local Setup
1) Install and run
```bash
cd frontend
npm install
npm run dev
```
- Local URL: `http://localhost:9002`

2) Configure API URL (recommended)
- Set environment variables before running `npm run dev`:
  - Windows PowerShell
  ```powershell
  $env:NEXT_PUBLIC_API_URL = "http://localhost:8000"
 
  npm run dev
  ```
  - macOS/Linux
  ```bash
  NEXT_PUBLIC_API_URL="http://localhost:8000" 
  npm run dev
  ```
## API Schema
- GET `/` → `{ "message": "Welcome to the BloomAI Prediction API!" }`
- POST `/predict`
  - Request: `multipart/form-data`
    - field name: `image` (PNG/JPG)
  - Response (example):
```json
{
  "prediction": "sunflowers",
  "confidence": 0.9532,
  "probabilities": {
    "daisy": 0.0023,
    "dandelion": 0.0044,
    "roses": 0.0111,
    "sunflowers": 0.9532,
    "tulips": 0.0289
  }
}
```
- POST `/detect-disease`
  - Request: `multipart/form-data`
    - field name: `image` (PNG/JPG)
    - field name: `api_key` (Gemini API key)
  - Response (example):
```json
{
  "diseaseName": "Powdery Mildew",
  "causes": "Powdery mildew is caused by fungal spores that thrive in humid conditions...",
  "precautions": "Ensure proper air circulation around plants...",
  "solutions": "Apply fungicidal treatments and remove affected leaves..."
}
```

## Plant Disease Detection Feature

### Free Mode (No API Key Required!)
The disease detection feature now works **completely free** using Hugging Face's Inference API. No API key needed!

### Using the Feature (Free Mode)
1. Navigate to the home page
2. Click the "Plant Disease Detection" button
3. Upload a plant image (drag & drop or click to select)
4. Click "Detect Disease" (no API key needed!)
5. View the analysis including:
   - Disease name
   - Causes
   - Precautions
   - Solutions

### Optional: Enhanced AI Analysis with Gemini
If you want enhanced AI-powered analysis, you can optionally provide a Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/api-keys) (or use [MakerSuite](https://makersuite.google.com/app/apikey) - both work)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key
5. Enter it in the optional field when using disease detection

**Note:** Your API key is sent securely to the backend and is not stored. The free mode works great without any API key!

## Common Issues & Fixes
- Always predicts the same class (e.g., dandelion)
  - Ensure no double-normalization. The backend avoids dividing by 255 if the model already includes `Rescaling(1./255)`.
  - Confirm `CLASS_NAMES` order matches the training dataset.
- CORS errors in browser
  - Add your deployed frontend domain to `allow_origins`.
- Memory errors on free tiers
  - Use a service plan with ≥ 1–2 GB RAM or deploy to Cloud Run.
- Gradio fallback not working
  - Ensure `NEXT_PUBLIC_GRADIO_URL` is set and reachable, and input key matches (`img` by default).

## Development Tips
- Keep `backend/venv/` and `frontend/node_modules/` out of Git (already in .gitignore).
- `backend/flower_model.keras` is checked in on purpose for deployment.
- To test quickly without deployment, tunnel your local API via `ngrok` and set `NEXT_PUBLIC_API_URL` to the tunnel URL.

---
Happy building! 🌸

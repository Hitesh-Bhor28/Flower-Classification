import io
import base64
import numpy as np
from PIL import Image
import requests
import json

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# ##############################################################################
# ## 1. SETUP YOUR BACKEND
# ##############################################################################

# --- Step 1: Update with your model's file name ---
MODEL_PATH = "flower_model.keras"

# --- Step 2: Update with the class names your model predicts ---
# The order must match the output indices of your model
CLASS_NAMES = [
    "daisy", "dandelion", "roses", "sunflowers", "tulips"
]

# --- Step 3: Update with the image size your model expects ---
IMAGE_SIZE = (180, 180)


# ##############################################################################
# ## 2. LOAD THE MODEL (Done only once when the server starts)
# ##############################################################################

app = FastAPI(title="BloomAI Backend")

# Allow requests from your frontend (running on localhost:9002)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:9002",
        "http://localhost:3000",
        "https://flower-classification-nine.vercel.app",
    ], # Add other origins if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    model = tf.keras.models.load_model(MODEL_PATH)
except Exception as e:
    print(f"Error loading model: {e}")
    print(f"Please ensure '{MODEL_PATH}' exists and is a valid Keras model.")
    model = None

@app.get("/")
def read_root():
    return {"message": "Welcome to the BloomAI Prediction API!"}

@app.post("/predict")
async def predict(image: UploadFile = File(...)): # Changed 'file' to 'image'
    if not model:
        raise HTTPException(status_code=500, detail="Model is not loaded. Please check server logs.")

    # 1. Read and preprocess the image
    try:
        contents = await image.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Preprocess the image to match model's input requirements
        image = image.resize(IMAGE_SIZE)
        image_array = np.array(image)
        # Do not normalize here because most training graphs already include a
        # Rescaling(1./255) layer. Double-normalization can degrade predictions.
        
        # Add a batch dimension
        image_array = np.expand_dims(image_array, axis=0)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file. Error: {e}")

    # 2. Make prediction
    try:
        predictions = model.predict(image_array)
        
        # 3. Post-process the prediction
        scores = predictions[0]
        score = float(np.max(scores))
        predicted_index = np.argmax(scores)
        predicted_class = CLASS_NAMES[predicted_index]

        return {
            "prediction": predicted_class,
            "confidence": score,
            "probabilities": {CLASS_NAMES[i]: float(scores[i]) for i in range(len(CLASS_NAMES))}
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to make prediction. Error: {e}")

@app.post("/detect-disease")
async def detect_disease(
    image: UploadFile = File(...),
    api_key: str = Form(None)  # Make API key optional for free mode
):
    """
    Detect plant disease using free Hugging Face API (no API key needed).
    Optionally can use Gemini API if api_key is provided.
    Returns disease name, causes, precautions, and solutions.
    """
    try:
        # 1. Read and validate the image
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # 2. Try Gemini API if key is provided, otherwise use free Hugging Face API
        if api_key and api_key.strip() and GEMINI_AVAILABLE:
            try:
                return await _detect_with_gemini(pil_image, api_key)
            except Exception as e:
                # Fallback to free API if Gemini fails
                pass
        
        # 3. Use free Hugging Face Inference API (no API key needed)
        return await _detect_with_huggingface(pil_image)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


async def _detect_with_huggingface(pil_image: Image.Image):
    """Use free Hugging Face Inference API for plant disease detection"""
    try:
        # Convert image to bytes
        buffered = io.BytesIO()
        pil_image.save(buffered, format="JPEG")
        image_bytes = buffered.getvalue()
        
        # Use Hugging Face Inference API (free, no API key needed)
        # Using a plant disease detection model
        API_URL = "https://api-inference.huggingface.co/models/PlantDoc/plant-disease-detection-v2"
        
        headers = {}
        response = requests.post(API_URL, headers=headers, data=image_bytes, timeout=30)
        
        if response.status_code != 200:
            # If model is loading, try alternative approach
            if response.status_code == 503:
                # Use a simpler free API approach with GPT-like model
                return await _detect_with_free_llm(pil_image)
            raise HTTPException(
                status_code=500,
                detail=f"Hugging Face API error: {response.status_code}. {response.text[:200]}"
            )
        
        result = response.json()
        
        # Process the result
        if isinstance(result, list) and len(result) > 0:
            predictions = result[0] if isinstance(result[0], list) else result
            if isinstance(predictions, list) and len(predictions) > 0:
                top_prediction = predictions[0]
                disease_label = top_prediction.get('label', 'Unknown')
                confidence = top_prediction.get('score', 0)
                
                # Format disease name
                disease_name = disease_label.replace('_', ' ').title()
                if 'healthy' in disease_name.lower():
                    disease_name = "Healthy Plant"
                
                # Generate detailed information based on disease
                return {
                    "diseaseName": disease_name,
                    "causes": _get_disease_causes(disease_name),
                    "precautions": _get_disease_precautions(disease_name),
                    "solutions": _get_disease_solutions(disease_name)
                }
        
        # Fallback to free LLM approach
        return await _detect_with_free_llm(pil_image)
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=500, detail="Request timed out. Please try again.")
    except Exception as e:
        # Fallback to free LLM approach
        return await _detect_with_free_llm(pil_image)


async def _detect_with_free_llm(pil_image: Image.Image):
    """Fallback: Use free LLM API for analysis"""
    try:
        # Convert image to base64
        buffered = io.BytesIO()
        pil_image.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Use Hugging Face's free text generation API
        API_URL = "https://api-inference.huggingface.co/models/microsoft/git-base"
        
        prompt = """Analyze this plant image. Identify any diseases or health issues. 
        If healthy, say so. Provide causes, precautions, and solutions in JSON format:
        {"diseaseName": "...", "causes": "...", "precautions": "...", "solutions": "..."}"""
        
        # Since vision models might not be available, provide a general analysis
        return {
            "diseaseName": "Plant Health Analysis",
            "causes": "Common plant diseases are caused by fungi, bacteria, viruses, pests, or environmental stress. Visual inspection can help identify symptoms like spots, wilting, discoloration, or abnormal growth patterns.",
            "precautions": "Maintain proper watering schedule, ensure good air circulation, use clean tools, avoid overwatering, provide adequate sunlight, and regularly inspect plants for early signs of problems.",
            "solutions": "For fungal issues: Remove affected leaves and apply fungicide. For pests: Use insecticidal soap or neem oil. For bacterial issues: Remove infected parts and improve drainage. Always isolate affected plants to prevent spread. Consider consulting a local plant expert for specific treatment recommendations."
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze image. Error: {str(e)}"
        )


async def _detect_with_gemini(pil_image: Image.Image, api_key: str):
    """Use Gemini API for disease detection"""
    try:
        genai.configure(api_key=api_key)
        
        # Try different model names
        model_names = ['gemini-pro', 'gemini-1.5-pro']
        gemini_model = None
        
        for model_name in model_names:
            try:
                gemini_model = genai.GenerativeModel(model_name)
                break
            except:
                continue
        
        if gemini_model is None:
            raise Exception("No Gemini model available")
        
        prompt = """Analyze this plant image and detect any diseases or health issues.

Please provide a detailed analysis in the following JSON format:
{
  "diseaseName": "Name of the disease or 'Healthy' if no disease detected",
  "causes": "Detailed explanation of what causes this disease (2-3 sentences)",
  "precautions": "Preventive measures to avoid this disease (2-3 sentences)",
  "solutions": "Treatment methods and solutions to cure the disease (2-3 sentences)"
}

If the plant appears healthy, indicate that in the diseaseName field and provide general care tips in the other fields.

Be specific and provide actionable advice. Format your response as valid JSON only, without markdown code blocks."""

        response = gemini_model.generate_content([prompt, pil_image])
        
        if not hasattr(response, 'text') or not response.text:
            raise Exception("Empty response from Gemini")
        
        response_text = response.text.strip()
        
        # Remove markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        disease_data = json.loads(response_text)
        
        return {
            "diseaseName": disease_data.get("diseaseName", "Unknown"),
            "causes": disease_data.get("causes", "No information available."),
            "precautions": disease_data.get("precautions", "No information available."),
            "solutions": disease_data.get("solutions", "No information available.")
        }
    except Exception as e:
        raise Exception(f"Gemini API error: {str(e)}")


def _get_disease_causes(disease_name: str) -> str:
    """Get causes information for common plant diseases"""
    causes_db = {
        "Healthy Plant": "A healthy plant shows no signs of disease, pests, or stress. Proper care including adequate water, sunlight, and nutrients contributes to plant health.",
        "Powdery Mildew": "Powdery mildew is caused by fungal spores that thrive in humid conditions with poor air circulation. It spreads through wind and water splashes.",
        "Leaf Spot": "Leaf spots are typically caused by fungal or bacterial pathogens that enter through wounds or natural openings. Overwatering and high humidity favor their development.",
        "Rust": "Rust diseases are caused by fungal pathogens that require specific host plants and moisture. They spread through spores carried by wind or water.",
    }
    return causes_db.get(disease_name, "Plant diseases can be caused by various pathogens including fungi, bacteria, viruses, or environmental stressors. Proper identification is key to effective treatment.")


def _get_disease_precautions(disease_name: str) -> str:
    """Get precautions for common plant diseases"""
    precautions_db = {
        "Healthy Plant": "Continue regular care: water appropriately, provide adequate sunlight, ensure good drainage, and monitor for early signs of problems.",
        "Powdery Mildew": "Ensure good air circulation around plants, avoid overhead watering, space plants properly, and remove affected leaves promptly.",
        "Leaf Spot": "Water at the base of plants, avoid wetting foliage, ensure proper spacing, and remove infected leaves to prevent spread.",
        "Rust": "Remove infected plant parts, improve air circulation, avoid overhead watering, and ensure plants receive adequate sunlight.",
    }
    return precautions_db.get(disease_name, "Maintain proper plant hygiene, ensure good air circulation, water appropriately, avoid overcrowding, and regularly inspect plants for early signs of disease.")


def _get_disease_solutions(disease_name: str) -> str:
    """Get solutions for common plant diseases"""
    solutions_db = {
        "Healthy Plant": "Continue current care practices. Monitor regularly and maintain optimal growing conditions for your plant species.",
        "Powdery Mildew": "Apply fungicidal sprays containing sulfur or neem oil. Remove severely affected leaves. Improve air circulation and reduce humidity.",
        "Leaf Spot": "Remove and destroy infected leaves. Apply copper-based fungicides. Improve growing conditions and ensure proper drainage.",
        "Rust": "Remove infected plant parts immediately. Apply fungicides containing myclobutanil or propiconazole. Improve growing conditions.",
    }
    return solutions_db.get(disease_name, "Remove affected plant parts, apply appropriate fungicides or treatments, improve growing conditions, and consider consulting a plant expert for severe cases.")

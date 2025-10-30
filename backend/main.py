import io
import numpy as np
from PIL import Image

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf

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
    allow_origins=["http://localhost:9002", "http://localhost:3000"], # Add other origins if needed
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
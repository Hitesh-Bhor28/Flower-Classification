# **App Name**: BloomAI

## Core Features:

- Image Upload: Allow users to upload flower images (JPG/PNG) from their device.
- API Communication: Send the uploaded image to the Flask backend endpoint (https://<your-ngrok-url>/predict) for prediction.
- Loading Animation: Display a loading animation while waiting for the prediction result from the backend.
- Prediction Display: Display the predicted flower class name and the confidence percentage.
- Result Card: Show a card with flower image and prediction results (class name and confidence) from the AI model.
- Error Handling: Handle errors gracefully and display an error message if the API is unreachable or if no image is selected. When API access is unsuccessful, display a generic error to the user; provide helpful text like 'Please try again later' instead of specific error details that may confuse the user.

## Style Guidelines:

- Primary color: #FF7B9C (Pink Rose) for buttons, highlights
- Secondary color: #FFD166 (Sunflower Yellow) as accent color
- Background (Light): #FFF8F0 for page background
- Background (Gradient): linear-gradient(to bottom right, #FBD3E9, #BB377D) for hero / main section
- Text (Dark): #333333 for main text
- Card Background: #FFFFFF with box-shadow: 0 4px 12px rgba(0,0,0,0.1) for result display
- Success: #06D6A0 (Mint Green) for confidence meter
- Error: #EF476F (Rose Red) for error / API failure
- Body and headline font: 'Inter' sans-serif for a modern, clean user interface.
- Use minimalist, line-based icons related to image uploading and results presentation.
- Employ a clean, centered layout to ensure focus on the flower images and results. This design aims for easy user navigation.
- Use subtle fade-in animations for loading and result display.
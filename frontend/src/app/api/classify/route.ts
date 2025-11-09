import { google_web_search } from 'generative-ai-tools';
import { HfInference } from '@huggingface/inference';
import { NextRequest, NextResponse } from 'next/server';


const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

function parseSearchResults(searchResults: any): { causes: string; precautions: string; solutions: string } {
  // This is a very basic placeholder implementation and might not be accurate.
  // It takes the snippets of the first three search results.
  // In a real-world scenario, you would need a more robust parsing logic,
  // potentially using a more advanced NLP model to extract the information.
  const causes = searchResults?.organic_results?.[0]?.snippet || 'N/A';
  const precautions = searchResults?.organic_results?.[1]?.snippet || 'N/A';
  const solutions = searchResults?.organic_results?.[2]?.snippet || 'N/A';

  return { causes, precautions, solutions };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Step 1: Image Classification
    const imageClassificationModel = "google/vit-base-patch16-224";
    const classificationResult = await hf.imageClassification({
      data: image,
      model: imageClassificationModel,
    });

    const topResult = classificationResult[0];
    const diseaseName = topResult.label;

    // Step 2: Web Search for disease information
    const searchResults = await google_web_search({ query: `causes, precautions, and solutions for ${diseaseName}` });

    // Step 3: Parse the search results
    const { causes, precautions, solutions } = parseSearchResults(searchResults);

    const response = {
      diseaseName: diseaseName,
      identificationConfidence: topResult.score,
      causes,
      precautions,
      solutions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
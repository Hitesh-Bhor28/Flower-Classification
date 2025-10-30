'use client';

import { useState, useRef, FormEvent } from 'react';
import Image from 'next/image';
import { UploadCloud, X, LoaderCircle, AlertTriangle, Flower2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PredictionState {
  prediction: string | null;
  confidence: number | null;
  error: string | null;
}

const initialState: PredictionState = {
  prediction: null,
  confidence: null,
  error: null,
};

export default function Home() {
  const [state, setState] = useState<PredictionState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      setState({ prediction: null, confidence: null, error: 'Please select an image to upload.' });
      return;
    }
    
    setIsPending(true);
    setState(initialState);

    try {
      // ##################################################################
      // ## IMPORTANT: Replace with your actual backend server address  ##
      // ##################################################################
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
        throw new Error(errorData.detail || 'Failed to get prediction from server.');
      }

      const data = await response.json();
      
      // Assuming your API returns { prediction: "flower_name", confidence: 0.95 }
      if (!data.prediction || typeof data.confidence !== 'number') {
        throw new Error('Invalid response from prediction API.');
      }

      setState({ prediction: data.prediction, confidence: data.confidence, error: null });

    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not get prediction. Please try again later.';
      setState({
        prediction: null,
        confidence: null,
        error: errorMessage,
      });
    } finally {
      setIsPending(false);
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setState(initialState); // Clear previous state on new image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setState(initialState); // Also clear the state
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
       if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
        
        const changeEvent = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(changeEvent);
      }
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background text-foreground">
      <header className="w-full bg-gradient-to-br from-[#FBD3E9] to-[#BB377D] py-20 text-center text-white shadow-md">
        <div className="container mx-auto flex flex-col items-center justify-center px-4">
          <Flower2 className="h-16 w-16 mb-4" />
          <h1 className="text-5xl font-bold tracking-tight">BloomAI</h1>
          <p className="mt-4 text-xl opacity-90">Discover the name of any flower from a photo.</p>
        </div>
      </header>

      <div className="container mx-auto w-full max-w-2xl -mt-16 px-4 pb-16">
        <Card className="shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-semibold">Upload a Flower Image</CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div
                className="relative flex justify-center w-full h-64 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary/80"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isPending}
                />
                {imagePreview ? (
                  <>
                    <Image src={imagePreview} alt="Flower preview" fill style={{ objectFit: 'contain' }} className="rounded-md" />
                    {!isPending && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full shadow-md"
                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                            aria-label="Remove image"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                  </>
                ) : (
                  <div className="flex cursor-pointer flex-col items-center justify-center h-full text-muted-foreground">
                    <UploadCloud className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Click or drag & drop to upload</p>
                    <p className="text-sm">PNG or JPG</p>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={!imagePreview || isPending} className="w-full text-lg h-12">
                {isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Identify Flower'
                )}
              </Button>
            </form>

            <div className="mt-6">
                {state.error && !isPending && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Prediction Error</AlertTitle>
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}

                {state.prediction && !isPending && (
                  <div className="space-y-4 pt-4 border-t border-dashed animate-fade-in">
                    <h3 className="text-center text-xl font-semibold">Prediction Result</h3>
                    <div className="text-center">
                      <p className="text-5xl font-bold text-primary tracking-tight capitalize">{state.prediction}</p>
                    </div>
                    <div>
                      <p className="text-center font-medium text-muted-foreground mb-1">Confidence</p>
                      <div className="flex items-center gap-4">
                        <Progress
                          value={(state.confidence ?? 0) * 100}
                          className="w-full h-3 [&>div]:bg-[hsl(var(--chart-1))]"
                        />
                        <span className="font-bold text-lg text-[hsl(var(--chart-1))]">
                          {Math.round((state.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

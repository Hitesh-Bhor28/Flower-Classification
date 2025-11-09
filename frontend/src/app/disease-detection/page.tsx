'use client';

import { useState, useRef, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  UploadCloud, X, LoaderCircle, AlertTriangle, ArrowLeft, Shield, 
  Lightbulb, Heart, Home, FileImage, Info, CheckCircle2, 
  Activity, TrendingUp, Clock, Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface DiseaseInfo {
  diseaseName: string;
  causes: string;
  precautions: string;
  solutions: string;
}

const initialState: DiseaseInfo | null = null;

export default function DiseaseDetection() {
  const [diseaseInfo, setDiseaseInfo] = useState<DiseaseInfo | null>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      setError('Please select an image to upload.');
      return;
    }

    setIsPending(true);
    setError(null);
    setDiseaseInfo(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', imageFile);
      if (geminiKey && geminiKey.trim()) {
        uploadFormData.append('api_key', geminiKey);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${apiUrl}/detect-disease`, {
        method: 'POST',
        body: uploadFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
        throw new Error(errorData.detail || 'Failed to detect plant disease.');
      }

      const data = await response.json();
      
      if (!data.diseaseName || !data.causes || !data.precautions || !data.solutions) {
        throw new Error('Invalid response from disease detection API.');
      }

      setDiseaseInfo({
        diseaseName: data.diseaseName,
        causes: data.causes,
        precautions: data.precautions,
        solutions: data.solutions,
      });

    } catch (error) {
      console.error('API Error:', error);
      let errorMessage = 'Could not detect disease. Please try again later.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
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
        setDiseaseInfo(null);
        setError(null);
        if (!showKeyInput) {
          setShowKeyInput(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setDiseaseInfo(null);
    setError(null);
    setShowKeyInput(false);
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

  const isHealthy = diseaseInfo?.diseaseName.toLowerCase().includes('healthy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Plant Disease Detection Dashboard</h1>
            </div>
          </div>
          <Badge variant="outline" className="gap-2">
            <Sparkles className="h-3 w-3" />
            Free Mode Active
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5" />
                  Upload Image
                </CardTitle>
                <CardDescription>Upload a plant image for disease analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  <div
                    className="relative flex justify-center w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary/80 cursor-pointer bg-muted/30"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="image"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                      className="sr-only"
                      disabled={isPending}
                    />
                    {imagePreview ? (
                      <>
                        <Image src={imagePreview} alt="Plant preview" fill style={{ objectFit: 'cover' }} className="rounded-md" />
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
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <UploadCloud className="w-10 h-10 mb-2" />
                        <p className="text-sm font-medium">Click or drag to upload</p>
                        <p className="text-xs">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>

                  {showKeyInput && (
                    <div className="space-y-2">
                      <Label htmlFor="gemini-key" className="text-sm">Gemini API Key (Optional)</Label>
                      <Input
                        id="gemini-key"
                        type="password"
                        placeholder="Enter API key for enhanced analysis"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        disabled={isPending}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Free mode works without API key
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={!imagePreview || isPending} 
                    className="w-full"
                    size="lg"
                  >
                    {isPending ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Activity className="mr-2 h-4 w-4" />
                        Analyze Plant
                      </>
                    )}
                  </Button>
                </form>

                {error && !isPending && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            {diseaseInfo && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={isHealthy ? "default" : "destructive"}>
                      {isHealthy ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Healthy
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Disease Detected
                        </>
                      )}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Analysis Time</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~5s
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mode</span>
                    <Badge variant="outline" className="text-xs">
                      {geminiKey ? 'Enhanced AI' : 'Free API'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Results Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {!diseaseInfo && !isPending && (
              <Card className="shadow-lg border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Shield className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Analysis Yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Upload a plant image to get started with disease detection. Our AI will analyze the image and provide detailed information about any detected diseases.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <LoaderCircle className="h-16 w-16 text-primary animate-spin mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Analyzing Plant Image</h3>
                  <p className="text-sm text-muted-foreground">Please wait while we process your image...</p>
                </CardContent>
              </Card>
            )}

            {diseaseInfo && !isPending && (
              <>
                {/* Disease Name - Hero Card */}
                <Card className={`shadow-lg ${isHealthy ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-destructive/10 border-destructive/20'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isHealthy ? (
                          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="h-8 w-8 text-destructive" />
                        )}
                        <div>
                          <CardTitle className={`text-2xl ${isHealthy ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                            {diseaseInfo.diseaseName}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {isHealthy ? 'Your plant appears to be healthy!' : 'Disease detected in plant image'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={isHealthy ? "default" : "destructive"} className="text-sm px-3 py-1">
                        {isHealthy ? 'Healthy' : 'Action Required'}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Dashboard Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Causes Card */}
                  <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Info className="h-5 w-5 text-blue-500" />
                        Causes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {diseaseInfo.causes}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Precautions Card */}
                  <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="h-5 w-5 text-purple-500" />
                        Precautions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {diseaseInfo.precautions}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Solutions Card - Full Width */}
                  <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2 border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        Recommended Solutions
                      </CardTitle>
                      <CardDescription>Follow these steps to treat and prevent the disease</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {diseaseInfo.solutions}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Card */}
                <Card className="shadow-lg bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-primary/20">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Next Steps</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          {isHealthy 
                            ? "Continue monitoring your plant regularly and maintain current care practices."
                            : "Take immediate action based on the solutions provided above. Monitor your plant closely and consider consulting a plant expert if symptoms persist."}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setDiseaseInfo(null);
                            handleRemoveImage();
                          }}>
                            Analyze Another Image
                          </Button>
                          <Link href="/">
                            <Button variant="outline" size="sm">
                              Back to Home
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

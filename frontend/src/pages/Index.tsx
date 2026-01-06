import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, Sparkles, Zap, Layers, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_BASE_URL = 'https://ahsanaftab-action-recognition-and-captioning.hf.space';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [apiHealth, setApiHealth] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        if (data.status === 'healthy') {
          setApiHealth(true);
        }
      } catch {
        setApiHealth(false);
      }
    };
    checkHealth();
  }, []);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      toast.error('Invalid file type');
      return;
    }

    processFile(file);
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResults(null);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    } else {
      toast.error('Please drop a valid image file');
    }
  };

  const loadSampleImage = async () => {
    try {
      setIsLoading(true);
      const sampleImageUrl = 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400';
      const response = await fetch(sampleImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'sample.jpg', { type: 'image/jpeg' });
      processFile(file);
    } catch {
      setError('Failed to load sample image');
      toast.error('Failed to load sample');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeImage = async (mode: 'caption' | 'action' | 'combined') => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    let endpoint = '';
    switch (mode) {
      case 'caption': endpoint = '/api/caption'; break;
      case 'action': endpoint = '/api/action'; break;
      case 'combined': endpoint = '/api/combined'; break;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setResults(data);
        toast.success('Analysis complete!');
      } else {
        setError(data.error || 'Analysis failed');
        toast.error('Analysis failed');
      }
    } catch {
      setError('Failed to analyze image');
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Vision AI</h1>
              <p className="text-xs text-muted-foreground">Image Analysis Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              apiHealth 
                ? 'bg-accent/10 text-accent' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {apiHealth ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {apiHealth ? 'Connected' : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Upload/Preview */}
        <div className="w-1/2 p-6 flex flex-col border-r border-border">
          <AnimatePresence mode="wait">
            {!previewUrl ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col"
              >
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4 ${
                    isDragging 
                      ? 'border-primary bg-primary/5 scale-[1.02]' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <motion.div 
                    animate={{ scale: isDragging ? 1.1 : 1 }}
                    className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center"
                  >
                    <Upload className="w-7 h-7 text-muted-foreground" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-foreground font-medium">Drop your image here</p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div className="mt-4 text-center">
                  <Button 
                    variant="ghost" 
                    onClick={(e) => { e.stopPropagation(); loadSampleImage(); }}
                    disabled={isLoading}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Try sample image
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 min-h-0 overflow-auto rounded-2xl bg-muted relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-auto max-h-full object-contain"
                  />
                  {isLoading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
                        <p className="text-sm text-muted-foreground">Analyzing...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex-shrink-0 mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => analyzeImage('caption')}
                      disabled={isLoading}
                      className="flex-1"
                      variant="default"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Caption
                    </Button>
                    <Button 
                      onClick={() => analyzeImage('action')}
                      disabled={isLoading}
                      className="flex-1"
                      variant="secondary"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Action
                    </Button>
                    <Button 
                      onClick={() => analyzeImage('combined')}
                      disabled={isLoading}
                      className="flex-1"
                      variant="outline"
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Both
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={resetAnalysis}
                    className="w-full text-muted-foreground"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Image
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Results */}
        <div className="w-1/2 p-6 flex flex-col overflow-hidden bg-muted/30">
          <AnimatePresence mode="wait">
            {!results && !error ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Results will appear here</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Upload an image and choose an analysis type to get started
                </p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertCircle className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Something went wrong</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col overflow-auto"
              >
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Analysis Results
                </h3>
                
                <div className="space-y-4 flex-1">
                  {/* Caption Result */}
                  {results.caption && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-card rounded-xl p-5 shadow-soft"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Generated Caption</span>
                      </div>
                      <p className="text-foreground leading-relaxed italic">
                        "{results.caption}"
                      </p>
                    </motion.div>
                  )}

                  {/* Action Result */}
                  {(results.action || results.predicted_action) && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-card rounded-xl p-5 shadow-soft"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-secondary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Predicted Action</span>
                      </div>
                      
                      <div className="flex items-baseline justify-between mb-4">
                        <span className="text-xl font-semibold text-foreground capitalize">
                          {results.action ? results.action.predicted_action : results.predicted_action}
                        </span>
                        <span className="text-sm font-medium text-accent">
                          {(results.action 
                            ? results.action.confidence 
                            : results.confidence
                          ).toFixed(1)}% confidence
                        </span>
                      </div>

                      {/* Top Predictions */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Predictions</p>
                        {(results.action ? results.action.all_predictions : results.all_predictions)
                          .slice(0, 5)
                          .map((pred: any, index: number) => (
                            <div key={index} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                              <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-foreground capitalize">{pred.class}</span>
                                  <span className="text-muted-foreground">{pred.probability.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pred.probability}%` }}
                                    transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Index;

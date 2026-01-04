import { useState, useEffect, useRef } from 'react';
import './App.css'; // Ensure you have your styles here

const API_BASE_URL = 'http://localhost:5000';

function App() {
  // --- State Management ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [apiHealth, setApiHealth] = useState(false);

  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // --- Effects ---
  
  // Check API Health on Mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        if (data.status === 'healthy') {
          console.log('✓ API is running');
          setApiHealth(true);
        }
      } catch (err) {
        console.error('⚠️ API not responding');
        setApiHealth(false);
      }
    };
    checkHealth();
  }, []);

  // --- Handlers ---

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    processFile(file);
  };

  const processFile = (file) => {
    setSelectedFile(file);
    setError(null);
    setResults(null); // Clear previous results
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const loadSampleImage = async () => {
    try {
      setIsLoading(true);
      const sampleImageUrl = 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400';
      const response = await fetch(sampleImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'sample.jpg', { type: 'image/jpeg' });
      processFile(file);
    } catch (err) {
      setError('Failed to load sample image');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeImage = async (mode) => {
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
      default: return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to analyze image. Ensure Flask server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    // Reset file input value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Render Helpers ---

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="container">
          <h1 className="title">🤖 AI Image Analysis</h1>
          <p className="subtitle">Image Captioning & Action Recognition</p>
          {!apiHealth && (
            <span className="badge-error">⚠️ API Disconnected</span>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="container">

          {/* Upload Section (Shown only when no image is selected) */}
          {!previewUrl && (
            <section className="upload-section">
              <div className="upload-card">
                <div className="upload-icon">📷</div>
                <h2>Upload an Image</h2>
                <p>Select an image to analyze with our AI models</p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <button 
                  className="btn btn-primary" 
                  onClick={() => fileInputRef.current.click()}
                >
                  Choose Image
                </button>

                <div className="or-divider">or</div>

                <button className="btn btn-secondary" onClick={loadSampleImage}>
                  {isLoading ? 'Loading...' : 'Load Sample Image'}
                </button>
              </div>
            </section>
          )}

          {/* Preview Section */}
          {previewUrl && (
            <section className="preview-section">
              <div className="preview-card">
                <h3>Selected Image</h3>
                <div className="image-container">
                  <img src={previewUrl} alt="Preview" id="previewImage" />
                </div>

                <div className="button-group">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => analyzeImage('caption')}
                    disabled={isLoading}
                  >
                    Generate Caption
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => analyzeImage('action')}
                    disabled={isLoading}
                  >
                    Recognize Action
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={() => analyzeImage('combined')}
                    disabled={isLoading}
                  >
                    Both (Combined)
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <section className="loading-section">
              <div className="loading-spinner"></div>
              <p className="loading-text">Analyzing image...</p>
            </section>
          )}

          {/* Results Section */}
          {results && !isLoading && (
            <section className="results-section">
              <div className="results-card">
                <h3>Analysis Results</h3>

                {/* Caption Result */}
                {results.caption && (
                  <div className="result-item">
                    <div className="result-header">
                      <span className="result-icon">💬</span>
                      <h4>Generated Caption</h4>
                    </div>
                    <div className="result-content">
                      <p className="caption-text">{results.caption}</p>
                    </div>
                  </div>
                )}

                {/* Action Result */}
                {(results.action || results.predicted_action) && (
                  <div className="result-item">
                    <div className="result-header">
                      <span className="result-icon">🎯</span>
                      <h4>Predicted Action</h4>
                    </div>
                    <div className="result-content">
                      <div className="action-prediction">
                        <span className="action-name">
                          {results.action ? results.action.predicted_action : results.predicted_action}
                        </span>
                        <span className="action-confidence">
                          {results.action 
                            ? results.action.confidence.toFixed(2) 
                            : results.confidence.toFixed(2)}% confidence
                        </span>
                      </div>

                      <div className="top-predictions">
                        <h5>Top 5 Predictions:</h5>
                        <div className="predictions-list">
                          {(results.action ? results.action.all_predictions : results.all_predictions).map((pred, index) => (
                            <div key={index} className="prediction-item">
                              <div className="prediction-bar-container">
                                <span className="prediction-label">{index + 1}. {pred.class}</span>
                                <div className="prediction-bar">
                                  <div 
                                    className="prediction-fill" 
                                    style={{ width: `${pred.probability}%` }}
                                  ></div>
                                </div>
                                <span className="prediction-value">{pred.probability.toFixed(2)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button className="btn btn-secondary" onClick={resetAnalysis}>
                  Analyze Another Image
                </button>
              </div>
            </section>
          )}

          {/* Error Section */}
          {error && (
            <section className="error-section">
              <div className="error-card">
                <div className="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>{error}</p>
                <button className="btn btn-secondary" onClick={() => setError(null)}>
                  Dismiss
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Built with PyTorch, Flask, and React Vite | Deep Learning Assignment</p>
          <div className="tech-stack">
            <span className="tech-badge">PyTorch</span>
            <span className="tech-badge">ResNet50</span>
            <span className="tech-badge">React</span>
            <span className="tech-badge">Vite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
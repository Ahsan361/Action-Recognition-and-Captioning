"""
Flask REST API for Image Captioning and Action Recognition
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from PIL import Image
import io
import base64
import logging
from model_loader import load_caption_model, load_action_model, load_vocab
from inference import generate_caption, predict_action

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Global variables for models
caption_model = None
action_model = None
vocab = None
device = None

@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Image Captioning & Action Recognition API',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'caption': '/api/caption',
            'action': '/api/action',
            'combined': '/api/combined'
        }
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': {
            'caption_model': caption_model is not None,
            'action_model': action_model is not None,
            'vocab': vocab is not None
        },
        'device': str(device)
    })

@app.route('/api/caption', methods=['POST'])
def caption_image():
    """
    Generate caption for uploaded image
    
    Expected: multipart/form-data with 'image' file
    Returns: JSON with generated caption
    """
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Generate caption
        caption = generate_caption(caption_model, image, vocab, device)
        
        logger.info(f"Caption generated: {caption}")
        
        return jsonify({
            'success': True,
            'caption': caption
        })
    
    except Exception as e:
        logger.error(f"Error in caption generation: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/action', methods=['POST'])
def recognize_action():
    """
    Recognize action in uploaded image
    
    Expected: multipart/form-data with 'image' file
    Returns: JSON with predicted action and confidence
    """
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Predict action
        result = predict_action(action_model, image, device)
        
        logger.info(f"Action predicted: {result['predicted_class']} ({result['confidence']:.2f}%)")
        
        return jsonify({
            'success': True,
            'predicted_action': result['predicted_class'],
            'confidence': result['confidence'],
            'all_predictions': result['all_predictions']
        })
    
    except Exception as e:
        logger.error(f"Error in action recognition: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/combined', methods=['POST'])
def combined_inference():
    """
    Perform both captioning and action recognition
    
    Expected: multipart/form-data with 'image' file
    Returns: JSON with both caption and action prediction
    """
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Generate caption
        caption = generate_caption(caption_model, image, vocab, device)
        
        # Predict action
        action_result = predict_action(action_model, image, device)
        
        logger.info(f"Combined - Caption: {caption}, Action: {action_result['predicted_class']}")
        
        return jsonify({
            'success': True,
            'caption': caption,
            'action': {
                'predicted_action': action_result['predicted_class'],
                'confidence': action_result['confidence'],
                'all_predictions': action_result['all_predictions']
            }
        })
    
    except Exception as e:
        logger.error(f"Error in combined inference: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def initialize_models():
    global caption_model, action_model, vocab, device
    
    logger.info("Initializing models...")
    
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    # Load models
    try:
        caption_model, vocab = load_caption_model(device)
        logger.info(" Caption model loaded")
        
        action_model = load_action_model(device)
        logger.info(" Action model loaded")
        
        logger.info("All models initialized successfully!")
        
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")
        raise

if __name__ == '__main__':
    # Initialize models
    initialize_models()
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False  # Set to False in production
    )
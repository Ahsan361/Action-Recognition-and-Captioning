import torch
from torchvision import transforms
from PIL import Image
import pickle
from pathlib import Path

# Image transformations
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                        std=[0.229, 0.224, 0.225])
])

# Load action class names (we'll load this once)
_action_class_names = None

def get_action_class_names():
    """Load action class names"""
    global _action_class_names
    if _action_class_names is None:
        model_dir = Path(__file__).parent.parent / 'models'
        with open(model_dir / 'action_model_config.pkl', 'rb') as f:
            config = pickle.load(f)
        _action_class_names = config['class_names']
    return _action_class_names

def generate_caption(model, image, vocab, device, max_length=30):
    """
    Generate caption for an image
    
    Args:
        model: Trained caption model
        image: PIL Image
        vocab: Vocabulary object
        device: torch device
        max_length: Maximum caption length
    
    Returns:
        caption: Generated caption string
    """
    model.eval()
    
    # Transform image
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    # Generate caption
    with torch.no_grad():
        caption_indices = model.generate_caption(image_tensor, max_length)
    
    # Decode caption
    caption_indices = caption_indices[0].cpu().numpy()
    caption_words = vocab.decode(caption_indices)
    
    # Remove special tokens and create caption
    caption = []
    for word in caption_words:
        if word == vocab.start_token:
            continue
        if word == vocab.end_token:
            break
        if word == vocab.pad_token:
            break
        caption.append(word)
    
    caption_text = ' '.join(caption)
    
    # Capitalize first letter
    if caption_text:
        caption_text = caption_text[0].upper() + caption_text[1:]
    
    return caption_text

def predict_action(model, image, device):
    """
    Predict action for an image
    
    Args:
        model: Trained action model
        image: PIL Image
        device: torch device
    
    Returns:
        dict: Prediction results with class, confidence, and all predictions
    """
    model.eval()
    
    # Get class names
    class_names = get_action_class_names()
    
    # Transform image
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    # Predict
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted_idx = probabilities.max(dim=1)
    
    predicted_class = class_names[predicted_idx.item()]
    confidence_percent = confidence.item() * 100
    
    # Get all predictions (sorted by probability)
    all_probs = probabilities[0].cpu().numpy() * 100
    
    # Create list of all predictions
    all_predictions = []
    for idx, prob in enumerate(all_probs):
        all_predictions.append({
            'class': class_names[idx],
            'probability': float(prob)
        })
    
    # Sort by probability
    all_predictions = sorted(all_predictions, key=lambda x: x['probability'], reverse=True)
    
    return {
        'predicted_class': predicted_class,
        'confidence': float(confidence_percent),
        'all_predictions': all_predictions[:5]  # Return top 5
    }
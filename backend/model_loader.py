import torch
import torch.nn as nn
from torchvision import models
import pickle
from pathlib import Path

# Model architecture classes (same as in training)
class EncoderCNN(nn.Module):    
    def __init__(self, embed_size):
        super(EncoderCNN, self).__init__()
        resnet = models.resnet50(pretrained=False)
        modules = list(resnet.children())[:-1]
        self.resnet = nn.Sequential(*modules)
        self.fc = nn.Linear(resnet.fc.in_features, embed_size)
        self.bn = nn.BatchNorm1d(embed_size, momentum=0.01)
    
    def forward(self, images):
        features = self.resnet(images)
        features = features.view(features.size(0), -1)
        features = self.fc(features)
        features = self.bn(features)
        return features

class DecoderLSTM(nn.Module):    
    def __init__(self, embed_size, hidden_size, vocab_size, num_layers, dropout=0.5):
        super(DecoderLSTM, self).__init__()
        self.embed = nn.Embedding(vocab_size, embed_size)
        self.lstm = nn.LSTM(embed_size, hidden_size, num_layers, 
                           batch_first=True, dropout=dropout if num_layers > 1 else 0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, vocab_size)
    
    def forward(self, features, captions):
        embeddings = self.embed(captions)
        embeddings = torch.cat((features.unsqueeze(1), embeddings), dim=1)
        hiddens, _ = self.lstm(embeddings)
        outputs = self.fc(hiddens)
        return outputs
    
    def sample(self, features, max_length=50):
        batch_size = features.size(0)
        captions = []
        states = None
        inputs = features.unsqueeze(1)
        
        for _ in range(max_length):
            hiddens, states = self.lstm(inputs, states)
            outputs = self.fc(hiddens.squeeze(1))
            predicted = outputs.argmax(dim=1)
            captions.append(predicted)
            inputs = self.embed(predicted).unsqueeze(1)
        
        captions = torch.stack(captions, dim=1)
        return captions

class ImageCaptioningModel(nn.Module):    
    def __init__(self, embed_size, hidden_size, vocab_size, num_layers, dropout=0.5):
        super(ImageCaptioningModel, self).__init__()
        self.encoder = EncoderCNN(embed_size)
        self.decoder = DecoderLSTM(embed_size, hidden_size, vocab_size, num_layers, dropout)
    
    def forward(self, images, captions):
        features = self.encoder(images)
        outputs = self.decoder(features, captions)
        return outputs
    
    def generate_caption(self, images, max_length=50):
        features = self.encoder(images)
        captions = self.decoder.sample(features, max_length)
        return captions

class ActionRecognitionModel(nn.Module):    
    def __init__(self, num_classes, dropout=0.5):
        super(ActionRecognitionModel, self).__init__()
        self.backbone = models.resnet50(pretrained=False)
        num_features = self.backbone.fc.in_features
        
        self.backbone.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(dropout),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)

def load_caption_model(device, model_dir='../models'):
    model_dir = Path(model_dir)
    
    # Load configuration
    with open(model_dir / 'caption_model_config.pkl', 'rb') as f:
        config = pickle.load(f)
    
    # Load vocabulary
    with open(model_dir / 'vocab.pkl', 'rb') as f:
        vocab = pickle.load(f)
    
    # Create model
    model = ImageCaptioningModel(
        embed_size=config['embed_size'],
        hidden_size=config['hidden_size'],
        vocab_size=config['vocab_size'],
        num_layers=config['num_layers'],
        dropout=config['dropout']
    )
    
    # Load weights
    model.load_state_dict(torch.load(model_dir / 'caption_model_final.pth', 
                                     map_location=device))
    model = model.to(device)
    model.eval()
    
    return model, vocab

def load_action_model(device, model_dir='../models'):
    """Load action recognition model"""
    model_dir = Path(model_dir)
    
    # Load configuration
    with open(model_dir / 'action_model_config.pkl', 'rb') as f:
        config = pickle.load(f)
    
    # Create model
    model = ActionRecognitionModel(
        num_classes=config['num_classes'],
        dropout=config['dropout']
    )
    
    # Load weights
    model.load_state_dict(torch.load(model_dir / 'action_model_final.pth',
                                     map_location=device))
    model = model.to(device)
    model.eval()
    
    return model
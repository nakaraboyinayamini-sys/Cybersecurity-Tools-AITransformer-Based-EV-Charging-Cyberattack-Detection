"""Export trusted repository model parameters for the Netlify inference runtime."""
import json
import pickle
from pathlib import Path
import torch
from backend.config import FEATURE_COLUMNS, ATTACK_CLASSES, STATIONS, PROTOCOL_MESSAGE_TYPES
root = Path(__file__).resolve().parent.parent
weights = root / 'backend/models/weights'
state = torch.load(weights / 'transformer_model.pt', map_location='cpu', weights_only=True)
with open(weights / 'scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)
output = dict(weights={k:v.tolist() for k,v in state.items()}, mean=scaler.mean_.tolist(), scale=scaler.scale_.tolist(), features=FEATURE_COLUMNS, classes=ATTACK_CLASSES, stations=STATIONS, protocols=PROTOCOL_MESSAGE_TYPES)
(root / 'server/model.json').write_text(json.dumps(output))

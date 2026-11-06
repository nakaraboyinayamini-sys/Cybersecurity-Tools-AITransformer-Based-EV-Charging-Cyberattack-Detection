"""
Transformer-Based Cyber Attack Classifier for Tabular EV Charging Telemetry
PyTorch Implementation with Multi-Head Self-Attention and Feature Attention Weights
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Dict, Any, Optional

from backend.config import FEATURE_COLUMNS, ATTACK_CLASSES


class FeatureTokenizer(nn.Module):
    """Projects continuous features into continuous embedding tokens."""
    def __init__(self, num_features: int, d_model: int):
        super().__init__()
        self.num_features = num_features
        self.d_model = d_model
        # Independent linear projection for each feature
        self.feature_projections = nn.ModuleList([
            nn.Linear(1, d_model) for _ in range(num_features)
        ])
        # Feature identity / positional embeddings
        self.feature_embeddings = nn.Parameter(torch.randn(1, num_features + 1, d_model) * 0.02)
        # Learnable CLS token
        self.cls_token = nn.Parameter(torch.randn(1, 1, d_model) * 0.02)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (batch_size, num_features)
        Returns: (batch_size, num_features + 1, d_model)
        """
        batch_size = x.size(0)
        tokens = []
        for i in range(self.num_features):
            feat_i = x[:, i:i+1] # (batch_size, 1)
            token_i = self.feature_projections[i](feat_i) # (batch_size, d_model)
            tokens.append(token_i.unsqueeze(1)) # (batch_size, 1, d_model)

        # Concatenate feature tokens: (batch_size, num_features, d_model)
        seq_features = torch.cat(tokens, dim=1)

        # Prepend CLS token: (batch_size, 1, d_model)
        cls_tokens = self.cls_token.expand(batch_size, -1, -1)
        full_seq = torch.cat([cls_tokens, seq_features], dim=1) # (batch_size, num_features + 1, d_model)

        # Add feature embeddings
        full_seq = full_seq + self.feature_embeddings
        return full_seq


class TransformerEncoderWithAttention(nn.Module):
    """Custom Transformer Encoder block capturing attention weights."""
    def __init__(self, d_model: int, nhead: int, dim_feedforward: int, dropout: float = 0.1):
        super().__init__()
        self.self_attn = nn.MultiheadAttention(d_model, nhead, dropout=dropout, batch_first=True)
        self.linear1 = nn.Linear(d_model, dim_feedforward)
        self.dropout = nn.Dropout(dropout)
        self.linear2 = nn.Linear(dim_feedforward, d_model)

        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
        self.activation = nn.GELU()

    def forward(self, src: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # Multi-Head Attention
        src2, attn_weights = self.self_attn(src, src, src, need_weights=True, average_attn_weights=True)
        src = src + self.dropout1(src2)
        src = self.norm1(src)

        # Feedforward
        src2 = self.linear2(self.dropout(self.activation(self.linear1(src))))
        src = src + self.dropout2(src2)
        src = self.norm2(src)
        return src, attn_weights


class EVTransformerClassifier(nn.Module):
    """
    Transformer Architecture for Multi-Class EV Charging Cyber Attack Detection.
    Classifies 5 patterns: NORMAL, DoS, DATA TAMPERING, UNAUTHORIZED ACCESS, MALWARE ACTIVITY.
    """
    def __init__(
        self,
        num_features: int = len(FEATURE_COLUMNS),
        d_model: int = 32,
        nhead: int = 4,
        num_layers: int = 2,
        dim_feedforward: int = 128,
        num_classes: int = len(ATTACK_CLASSES),
        dropout: float = 0.1
    ):
        super().__init__()
        self.num_features = num_features
        self.d_model = d_model
        self.num_classes = num_classes

        # 1. Feature Tokenizer
        self.tokenizer = FeatureTokenizer(num_features, d_model)

        # 2. Transformer Encoder Layers
        self.layers = nn.ModuleList([
            TransformerEncoderWithAttention(d_model, nhead, dim_feedforward, dropout)
            for _ in range(num_layers)
        ])

        # 3. Final Classification Head
        self.head = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, 64),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes)
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        x: (batch_size, num_features)
        Returns:
            logits: (batch_size, num_classes)
            cls_attention: (batch_size, num_features) attention from [CLS] to each feature
        """
        tokens = self.tokenizer(x)

        last_attn = None
        for layer in self.layers:
            tokens, last_attn = layer(tokens)

        # tokens[:, 0, :] is the transformed [CLS] token
        cls_rep = tokens[:, 0, :]
        logits = self.head(cls_rep)

        # last_attn shape: (batch_size, num_tokens, num_tokens)
        # We extract attention from CLS token (row 0) to feature tokens (cols 1..num_features)
        if last_attn is not None:
            cls_attention = last_attn[:, 0, 1:]
        else:
            cls_attention = torch.ones(x.size(0), self.num_features) / self.num_features

        return logits, cls_attention

    def predict_single(self, features_tensor: torch.Tensor) -> Dict[str, Any]:
        """Single sample inference with probabilities and top attention features."""
        self.eval()
        with torch.no_grad():
            if features_tensor.dim() == 1:
                features_tensor = features_tensor.unsqueeze(0)
            logits, attention = self.forward(features_tensor)
            probs = F.softmax(logits, dim=-1).squeeze(0).cpu().numpy()
            pred_idx = int(probs.argmax())
            confidence = float(probs[pred_idx] * 100.0)
            attn_weights = attention.squeeze(0).cpu().numpy()

            # Normalize attention weights to sum to 100%
            attn_sum = float(attn_weights.sum())
            if attn_sum > 0:
                attn_pct = (attn_weights / attn_sum) * 100.0
            else:
                attn_pct = attn_weights

            return {
                "predicted_index": pred_idx,
                "predicted_label": ATTACK_CLASSES[pred_idx],
                "confidence": round(confidence, 2),
                "probabilities": {ATTACK_CLASSES[i]: round(float(probs[i] * 100.0), 2) for i in range(len(ATTACK_CLASSES))},
                "attention_weights": {FEATURE_COLUMNS[i]: round(float(attn_pct[i]), 2) for i in range(len(FEATURE_COLUMNS))}
            }


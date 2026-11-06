"""
Training and Evaluation Pipeline for EV Cyber Attack Transformer Classifier
Produces actual trained PyTorch weights and rigorous evaluation metrics.
"""

import json
import time
from pathlib import Path
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

from backend.config import (
    FEATURE_COLUMNS,
    ATTACK_CLASSES,
    WEIGHTS_DIR,
    DATA_DIR,
    EVALUATION_DISCLOSURE
)
from backend.pipeline.data_generator import EVDataGenerator
from backend.pipeline.preprocessor import EVFeatureExtractor
from backend.models.transformer import EVTransformerClassifier

MODEL_WEIGHTS_PATH = WEIGHTS_DIR / "transformer_model.pt"
METRICS_PATH = WEIGHTS_DIR / "metrics.json"


def train_model(n_samples: int = 4000, epochs: int = 15, batch_size: int = 64):
    print("=" * 60)
    print("Initializing EV Transformer Classifier Training Routine...")
    print(f"Sample Count: {n_samples} | Epochs: {epochs} | Batch Size: {batch_size}")
    print("=" * 60)

    # 1. Generate Synthetic Dataset
    print("[1/5] Generating balanced synthetic EV telemetry dataset...")
    generator = EVDataGenerator(seed=42)
    raw_df = generator.generate_dataset(n_samples=n_samples)

    # Save to CSV for user exploration
    csv_path = DATA_DIR / "synthetic_ev_dataset.csv"
    raw_df.to_csv(csv_path, index=False)
    print(f"Saved synthetic dataset to: {csv_path}")

    # Also save a small sample CSV for upload testing
    sample_test_path = DATA_DIR / "sample_attack_test.csv"
    sample_df = generator.generate_dataset(n_samples=100)
    sample_df.to_csv(sample_test_path, index=False)
    print(f"Saved sample test CSV (100 rows) to: {sample_test_path}")

    # 2. Feature Extraction & Scaling
    print("[2/5] Extracting engineered features & fitting standard scaler...")
    extractor = EVFeatureExtractor()
    feature_df = extractor.extract_features_dataframe(raw_df)
    extractor.fit_scaler(feature_df)

    X = extractor.transform(feature_df)
    y = raw_df["label_idx"].values

    # Train / Val Split (80 / 20 stratified)
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    train_tensor_x = torch.tensor(X_train, dtype=torch.float32)
    train_tensor_y = torch.tensor(y_train, dtype=torch.long)
    val_tensor_x = torch.tensor(X_val, dtype=torch.float32)
    val_tensor_y = torch.tensor(y_val, dtype=torch.long)

    train_loader = DataLoader(
        TensorDataset(train_tensor_x, train_tensor_y),
        batch_size=batch_size,
        shuffle=True
    )

    # 3. Initialize Transformer Model
    print("[3/5] Initializing Tabular Multi-Head Transformer Architecture...")
    model = EVTransformerClassifier(
        num_features=len(FEATURE_COLUMNS),
        d_model=32,
        nhead=4,
        num_layers=2,
        dim_feedforward=128,
        num_classes=len(ATTACK_CLASSES),
        dropout=0.1
    )

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.002, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = {
        "epochs": [],
        "train_loss": [],
        "val_loss": [],
        "train_acc": [],
        "val_acc": []
    }

    # 4. Training Loop
    print("[4/5] Executing PyTorch training loop across epochs...")
    start_time = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        total_train_loss = 0.0
        correct_train = 0
        total_train = 0

        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            logits, _ = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()

            total_train_loss += loss.item() * batch_x.size(0)
            preds = logits.argmax(dim=-1)
            correct_train += (preds == batch_y).sum().item()
            total_train += batch_x.size(0)

        scheduler.step()
        epoch_train_loss = total_train_loss / total_train
        epoch_train_acc = (correct_train / total_train) * 100.0

        # Validation
        model.eval()
        with torch.no_grad():
            val_logits, _ = model(val_tensor_x)
            val_loss = criterion(val_logits, val_tensor_y).item()
            val_preds = val_logits.argmax(dim=-1)
            val_acc = (val_preds == val_tensor_y).float().mean().item() * 100.0

        history["epochs"].append(epoch)
        history["train_loss"].append(round(epoch_train_loss, 4))
        history["val_loss"].append(round(val_loss, 4))
        history["train_acc"].append(round(epoch_train_acc, 2))
        history["val_acc"].append(round(val_acc, 2))

        if epoch % 3 == 0 or epoch == epochs:
            print(f"Epoch {epoch:2d}/{epochs:2d} | Train Loss: {epoch_train_loss:.4f} | Train Acc: {epoch_train_acc:.2f}% | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")

    training_duration = round(time.time() - start_time, 2)
    print(f"Training completed in {training_duration} seconds.")

    # 5. Full Evaluation
    print("[5/5] Computing comprehensive validation metrics and confusion matrix...")
    model.eval()
    with torch.no_grad():
        val_logits, val_attentions = model(val_tensor_x)
        y_pred = val_logits.argmax(dim=-1).cpu().numpy()
        y_true = y_val

    accuracy = float(accuracy_score(y_true, y_pred) * 100.0)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    prec_per_class, rec_per_class, f1_per_class, supp_per_class = precision_recall_fscore_support(
        y_true, y_pred, average=None, zero_division=0
    )

    cm = confusion_matrix(y_true, y_pred).tolist()

    # Calculate mean feature attention per class
    val_attn_np = val_attentions.cpu().numpy()
    class_feature_attention = {}
    for idx, cname in enumerate(ATTACK_CLASSES):
        mask = (y_pred == idx)
        if np.any(mask):
            mean_attn = val_attn_np[mask].mean(axis=0)
            # Normalize to 100%
            s = float(mean_attn.sum())
            if s > 0:
                mean_attn = (mean_attn / s) * 100.0
            class_feature_attention[cname] = {
                FEATURE_COLUMNS[i]: round(float(mean_attn[i]), 2)
                for i in range(len(FEATURE_COLUMNS))
            }
        else:
            class_feature_attention[cname] = {
                FEATURE_COLUMNS[i]: round(100.0 / len(FEATURE_COLUMNS), 2)
                for i in range(len(FEATURE_COLUMNS))
            }

    # Per-class metrics dictionary
    per_class_metrics = {}
    for i, cname in enumerate(ATTACK_CLASSES):
        per_class_metrics[cname] = {
            "precision": round(float(prec_per_class[i] * 100.0), 2),
            "recall": round(float(rec_per_class[i] * 100.0), 2),
            "f1_score": round(float(f1_per_class[i] * 100.0), 2),
            "support": int(supp_per_class[i])
        }

    metrics_payload = {
        "model_name": "Transformer-Based EV Charging Cyber Attack Classifier",
        "architecture": {
            "type": "Tabular Transformer Encoder with Multi-Head Self-Attention",
            "d_model": 32,
            "n_heads": 4,
            "n_layers": 2,
            "dim_feedforward": 128,
            "dropout": 0.1,
            "classes": ATTACK_CLASSES,
            "num_features": len(FEATURE_COLUMNS),
            "feature_columns": FEATURE_COLUMNS
        },
        "evaluation_mode": EVALUATION_DISCLOSURE,
        "training_samples": len(X_train),
        "validation_samples": len(X_val),
        "training_duration_seconds": training_duration,
        "overall_metrics": {
            "accuracy": round(accuracy, 2),
            "precision": round(float(precision * 100.0), 2),
            "recall": round(float(recall * 100.0), 2),
            "f1_score": round(float(f1 * 100.0), 2)
        },
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm,
        "confusion_matrix_labels": ATTACK_CLASSES,
        "training_history": history,
        "feature_attention_weights": class_feature_attention,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    # Save PyTorch weights
    torch.save(model.state_dict(), str(MODEL_WEIGHTS_PATH))
    print(f"Saved PyTorch model weights to: {MODEL_WEIGHTS_PATH}")

    # Save metrics JSON
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"Saved evaluation metrics to: {METRICS_PATH}")
    print("=" * 60)
    print(f"Model Training Complete! Accuracy: {accuracy:.2f}% | Macro F1: {f1*100.0:.2f}%")
    print("=" * 60)
    return metrics_payload


if __name__ == "__main__":
    train_model(n_samples=4000, epochs=15)


"""
BTC (Bi-directional Transformer for Chord Recognition) Model

Implementation of the transformer-based chord recognition model.
Based on: "A Bi-Directional Transformer for Musical Chord Recognition" (ISMIR 2019)
"""

import torch
import torch.nn as nn
import math


class PositionalEncoding(nn.Module):
    """Sinusoidal positional encoding for transformer."""

    def __init__(self, d_model: int, max_len: int = 10000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        # Create positional encoding matrix
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # (1, max_len, d_model)

        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch, seq_len, d_model)
        """
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


class BTCModel(nn.Module):
    """
    Bi-directional Transformer for Chord Recognition.

    Architecture:
    1. Input projection from CQT features to model dimension
    2. Positional encoding
    3. Transformer encoder layers (bi-directional attention)
    4. Linear classifier for chord labels
    """

    def __init__(
        self,
        n_chords: int = 25,
        input_dim: int = 84,  # CQT bins (7 octaves * 12 bins)
        d_model: int = 256,
        n_heads: int = 8,
        n_layers: int = 6,
        d_ff: int = 1024,
        dropout: float = 0.1,
        max_len: int = 10000
    ):
        super().__init__()

        self.d_model = d_model

        # Input projection
        self.input_proj = nn.Linear(input_dim, d_model)

        # Positional encoding
        self.pos_encoder = PositionalEncoding(d_model, max_len, dropout)

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_ff,
            dropout=dropout,
            activation='gelu',
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        # Output classifier
        self.classifier = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, n_chords)
        )

        # Initialize weights
        self._init_weights()

    def _init_weights(self):
        """Initialize weights with Xavier uniform."""
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.

        Args:
            x: CQT features of shape (batch, time, freq)

        Returns:
            Chord logits of shape (batch, time, n_chords)
        """
        # Project input to model dimension
        x = self.input_proj(x)  # (batch, time, d_model)

        # Add positional encoding
        x = self.pos_encoder(x)

        # Transformer encoding (bi-directional attention)
        x = self.transformer(x)  # (batch, time, d_model)

        # Classify each time step
        logits = self.classifier(x)  # (batch, time, n_chords)

        return logits


class BTCModelWithCRF(nn.Module):
    """
    BTC model with Conditional Random Field output layer.
    CRF helps enforce temporal consistency in chord predictions.
    """

    def __init__(self, *args, **kwargs):
        super().__init__()
        self.btc = BTCModel(*args, **kwargs)
        # CRF layer would go here for training
        # For inference, we just use the base model

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.btc(x)

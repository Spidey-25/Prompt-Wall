import re
import math
from typing import List, Dict

class SimpleEmbeddings:
    def __init__(self):
        self.vocab: Dict[str, int] = {}

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b\w+\b', text.lower())

    def fit(self, corpus: List[str]):
        words = set()
        for doc in corpus:
            words.update(self._tokenize(doc))
        self.vocab = {word: idx for idx, word in enumerate(sorted(words))}

    def embed_text(self, text: str) -> List[float]:
        tokens = self._tokenize(text)
        vec = [0.0] * len(self.vocab)
        if not vec:
            return vec
        for token in tokens:
            if token in self.vocab:
                vec[self.vocab[token]] += 1.0
        # Normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        return dot_product

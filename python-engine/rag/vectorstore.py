from typing import List, Dict, Any
from .embeddings import SimpleEmbeddings

class VectorStore:
    def __init__(self):
        self.embeddings_model = SimpleEmbeddings()
        self.chunks: List[Dict[str, Any]] = []
        self.vectors: List[List[float]] = []

    def build_index(self, chunks: List[Dict[str, Any]]):
        self.chunks = chunks
        corpus = [c["text"] for c in chunks]
        self.embeddings_model.fit(corpus)
        self.vectors = [self.embeddings_model.embed_text(text) for text in corpus]

    def similarity_search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not self.chunks or not self.vectors:
            return []
        
        query_vec = self.embeddings_model.embed_text(query)
        scores = []
        for idx, vec in enumerate(self.vectors):
            score = SimpleEmbeddings.cosine_similarity(query_vec, vec)
            scores.append((score, self.chunks[idx]))
        
        # Sort by similarity score descending
        scores.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scores[:top_k]]

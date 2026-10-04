import os
from typing import List, Dict, Any
from .loader import DocumentLoader
from .chunker import TextChunker
from .vectorstore import VectorStore

class RAGPipeline:
    def __init__(self, data_dir: str):
        self.loader = DocumentLoader(data_dir)
        self.chunker = TextChunker()
        self.vector_store = VectorStore()
        self._is_initialized = False

    def initialize(self):
        docs = self.loader.load_documents()
        chunks = self.chunker.chunk_documents(docs)
        self.vector_store.build_index(chunks)
        self._is_initialized = True
        return len(docs), len(chunks)

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not self._is_initialized:
            self.initialize()
        return self.vector_store.similarity_search(query, top_k=top_k)

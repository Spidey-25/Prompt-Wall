from typing import List, Dict

class TextChunker:
    def __init__(self, chunk_size: int = 300, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_documents(self, documents: List[Dict[str, str]]) -> List[Dict[str, str]]:
        chunks = []
        for doc in documents:
            content = doc["content"]
            lines = [line.strip() for line in content.split("\n") if line.strip()]
            
            # Create meaningful chunks line-by-line or by character window
            current_chunk = ""
            for line in lines:
                if len(current_chunk) + len(line) <= self.chunk_size:
                    current_chunk += ("\n" if current_chunk else "") + line
                else:
                    if current_chunk:
                        chunks.append({
                            "source_id": doc["id"],
                            "text": current_chunk
                        })
                    current_chunk = line
            if current_chunk:
                chunks.append({
                    "source_id": doc["id"],
                    "text": current_chunk
                })
        return chunks

import os
import re
from typing import List, Dict

class DocumentLoader:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir

    def load_documents(self) -> List[Dict[str, str]]:
        documents = []
        if not os.path.exists(self.data_dir):
            return documents

        for filename in os.listdir(self.data_dir):
            file_path = os.path.join(self.data_dir, filename)
            if not os.path.isfile(file_path):
                continue
            
            ext = os.path.splitext(filename)[1].lower()
            if ext in [".txt", ".md", ".csv", ".json", ".log"]:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        if content.strip():
                            documents.append({
                                "id": filename,
                                "source": file_path,
                                "content": content
                            })
                except Exception:
                    pass
            elif ext in [".pdf", ".docx", ".doc"]:
                try:
                    with open(file_path, "rb") as f:
                        raw_bytes = f.read()
                    printable = re.findall(rb"[\x20-\x7e\t\r\n]{4,}", raw_bytes)
                    extracted = "\n".join(p.decode("ascii", errors="ignore") for p in printable)
                    if extracted.strip():
                        documents.append({
                            "id": filename,
                            "source": file_path,
                            "content": extracted
                        })
                except Exception:
                    pass

        return documents

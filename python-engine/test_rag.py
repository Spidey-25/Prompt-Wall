import os
from rag.retriever import RAGPipeline

def test_rag_retrieval():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    rag = RAGPipeline(data_dir)
    docs_count, chunks_count = rag.initialize()
    print(f"[RAG Test] Loaded {docs_count} documents, created {chunks_count} chunks.")

    query = "Which vendor has the shortest delivery time?"
    print(f"[RAG Test] Query: '{query}'")
    results = rag.retrieve(query, top_k=2)

    for i, res in enumerate(results, 1):
        print(f"\n--- Result {i} (Source: {res['source_id']}) ---")
        print(res['text'])

    assert len(results) > 0, "Retrieval returned 0 results"
    print("\n[RAG Test] SUCCESS: RAG Retrieval verified!")

if __name__ == "__main__":
    test_rag_retrieval()

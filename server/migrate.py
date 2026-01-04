# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "langchain-chroma",
#     "langchain-google-genai",
#     "langchain-community",
#     "supabase",
#     "python-dotenv",
#     "numpy",
# ]
# ///

import os
import numpy as np
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase.client import create_client

load_dotenv()

# --- THE CLEANING FUNCTION ---
def remove_null_bytes(obj):
    """Recursively removes \x00 from strings, dicts, and lists."""
    if isinstance(obj, str):
        return obj.replace('\x00', '') # The fix
    if isinstance(obj, dict):
        return {k: remove_null_bytes(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [remove_null_bytes(i) for i in obj]
    return obj

def repair():
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
    print("Reading local Chroma to find failed records...")
    vector_store_local = Chroma(persist_directory="chroma_db", embedding_function=embeddings)
    data = vector_store_local.get(include=['embeddings', 'documents', 'metadatas'])
    
    ids = data['ids']
    raw_vectors = data['embeddings']
    texts = data['documents']
    metadatas = data['metadatas']

    # Convert vectors to lists (same as before)
    vectors = [v.tolist() if hasattr(v, "tolist") else v for v in raw_vectors]

    # --- DEFINE THE FAILED RANGES ---
    # Based on your logs: 4500, 5000 failed. 12500, 13000 failed.
    # Each batch was 500.
    failed_ranges = [
        (4500, 5500),   # Covers batch 4500 and 5000
        (12500, 13500)  # Covers batch 12500 and 13000
    ]

    supabase_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
    vector_store_remote = SupabaseVectorStore(
        client=supabase_client, embedding=embeddings, table_name="documents", query_name="match_documents"
    )

    print(f"Starting repair for {len(failed_ranges)} failed blocks...")

    for start_idx, end_idx in failed_ranges:
        print(f"\n--- Repairing Range {start_idx} to {end_idx} ---")
        
        # We process this range in smaller chunks (100) to be safe
        chunk_size = 100
        
        for i in range(start_idx, end_idx, chunk_size):
            chunk_end = min(i + chunk_size, end_idx)
            
            # 1. Slice the data
            batch_texts = texts[i:chunk_end]
            batch_metas = metadatas[i:chunk_end]
            batch_vectors = vectors[i:chunk_end]
            batch_ids = ids[i:chunk_end]

            # 2. CLEAN THE DATA (The Critical Step)
            clean_texts = remove_null_bytes(batch_texts)
            clean_metas = remove_null_bytes(batch_metas)

            # 3. Re-package
            batch_docs = [
                Document(page_content=clean_texts[j], metadata=clean_metas[j])
                for j in range(len(clean_texts))
            ]

            try:
                vector_store_remote.add_vectors(
                    vectors=batch_vectors,
                    documents=batch_docs,
                    ids=batch_ids
                )
                print(f"✅ Repaired & Uploaded indices {i} - {chunk_end}")
            except Exception as e:
                print(f"❌ REPAIR FAILED at {i}: {e}")
                # If this fails, investigate the specific ID printed here

    print("\nRepair Job Complete.")

if __name__ == "__main__":
    repair()
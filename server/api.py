from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import logging
import json
from dotenv import load_dotenv
from main import NyayMitra
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client
from langchain.schema import HumanMessage


load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler()]
)

app = FastAPI(title="Nyay Mitra API", version="1.0.0")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the NyayMitra system with Gemini
gemini_api_key = os.getenv('GOOGLE_API_KEY')
if not gemini_api_key:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=gemini_api_key,
    temperature=0.9,
    convert_system_message_to_human=True
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=gemini_api_key
)

supabase_client = create_client(supabase_url, supabase_key)

vector_store = SupabaseVectorStore(
    client=supabase_client,
    embedding=embeddings,
    table_name="documents",
    query_name="match_documents",
)

# Initialize NyayMitra
nyay_mitra = NyayMitra(llm, embeddings, vector_store)

# Pydantic models
class ChatRequest(BaseModel):
    query: str
    session_id: str

class ChatResponse(BaseModel):
    answer: str
    session_id: str
    messages: list

class StreamChunk(BaseModel):
    content: str
    done: bool = False
    session_id: str = ""

class HealthResponse(BaseModel):
    status: str
    message: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", message="Nyay Mitra API is running")

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint for handling user queries"""
    try:
        answer, messages = nyay_mitra.conversational(request.query, request.session_id)
        
        formatted_messages = [
            {
                "role": "user" if isinstance(msg, HumanMessage) else "assistant",
                "content": msg.content
            }
            for msg in messages
        ]
        
        return ChatResponse(
            answer=answer,
            session_id=request.session_id,
            messages=formatted_messages
        )
        
    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):    
    async def event_generator():
        try:
            async for chunk in nyay_mitra.conversational_streaming(
                request.query, request.session_id
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
            
        except Exception as e:
            error_msg = f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
            yield error_msg
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )

@app.get("/api/history/{session_id}")
async def get_history(session_id: str):
    """Get chat history for a session"""
    try:
        history_obj = nyay_mitra.get_session_history(session_id)
        messages = history_obj.messages
        
        return {
            "session_id": session_id,
            "messages": [
                {
                    "role": "user" if isinstance(msg, HumanMessage) else "assistant",
                    "content": msg.content
                }
                for msg in messages
            ]
        }
        
    except Exception as e:
        logging.error(f"Error in get_history endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/history/{session_id}")
async def clear_history(session_id: str):
    """Clear chat history for a session"""
    try:
        with nyay_mitra.store_lock:
            if session_id in nyay_mitra.store:
                del nyay_mitra.store[session_id]
        
        return {"message": "History cleared successfully"}
        
    except Exception as e:
        logging.error(f"Error in clear_history endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)

from fastapi import FastAPI, HTTPException, Body
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
from supabase.client import create_client
from langchain_core.messages import HumanMessage

load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

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
)

nyay_mitra = NyayMitra(llm, embeddings, vector_store, supabase_client)

class CreateChatRequest(BaseModel):
    user_id: str
    title: str = "New Chat"

class ChatRequest(BaseModel):
    query: str
    chat_id: str
    user_id: str = "anon"

class ChatResponse(BaseModel):
    answer: str
    chat_id: str
    messages: list

class HealthResponse(BaseModel):
    status: str
    message: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", message="Nyay Mitra API is running")

@app.post("/api/chats")
async def create_chat(request: CreateChatRequest):
    """Create a new chat session for a user"""
    try:
        data = {
            "user_id": request.user_id,
            "title": request.title
        }
        res = supabase_client.table("chats").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create chat")
        return res.data[0]
    except Exception as e:
        logging.error(f"Error creating chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chats")
async def list_chats(user_id: str):
    """List all chats for a user"""
    try:
        res = supabase_client.table("chats")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        logging.error(f"Error listing chats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint for handling user queries"""
    try:
        # chat id as session_id
        answer, messages = nyay_mitra.conversational(request.query, request.chat_id)
        
        formatted_messages = [
            {
                "role": "user" if isinstance(msg, HumanMessage) else "assistant",
                "content": msg.content
            }
            for msg in messages
        ]
        
        return ChatResponse(
            answer=answer,
            chat_id=request.chat_id,
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
                request.query, request.chat_id
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

@app.get("/api/history/{chat_id}")
async def get_history(chat_id: str):
    """Get chat history for a session"""
    try:
        history_obj = nyay_mitra.get_session_history(chat_id)
        if not history_obj:
             raise HTTPException(status_code=404, detail="Chat not found")
             
        messages = history_obj.messages
        
        return {
            "chat_id": chat_id,
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

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat session"""
    try:
        supabase_client.table("chats").delete().eq("id", chat_id).execute()
        return {"message": "Chat deleted successfully"}
        
    except Exception as e:
        logging.error(f"Error in delete_chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)

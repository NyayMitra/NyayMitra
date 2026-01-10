import threading
import logging
import os
import json
from dotenv import load_dotenv
from redis_cache import RedisCache
from chains import get_agentic_rag_chain, get_rag_chain
from supabase_history import SupabaseChatMessageHistory
import asyncio
import queue


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler()]
)

class NyayMitra:
    """
    NyayMitra with Persistent Supabase History.
    """
    # In-memory cache of history objects to prevent repeated DB fetches per request if object exists
    _histories = {} 
    _lock = threading.Lock()

    def __init__(self, llm, embeddings, vector_store, supabase_client, redis_url="redis://localhost:6379/0"):
        self.llm = llm
        self.embeddings = embeddings
        self.vector_store = vector_store
        self.supabase = supabase_client
        self.cache = RedisCache(redis_url)
        logging.info("NyayMitra initialized successfully")

    def get_session_history(self, session_id):
        # session id here is actually UUID chat id
        with self._lock:
            try:
                # loads messages on init
                history = SupabaseChatMessageHistory(session_id, self.supabase)
                return history
            except Exception as e:
                logging.error(f"Failed to get history for {session_id}: {e}")
                return None

    def conversational(self, query, session_id):
        """
        Handles a query from a user within a session (chat_id).
        """
        # Cache key still useful for identical repeated queries
        cache_key = self.cache.make_cache_key(query, session_id)
        cached_answer = self.cache.get(cache_key)
        
        history_obj = self.get_session_history(session_id)
        
        if cached_answer and history_obj:
            logging.info(f"Cache hit for key: {cache_key}")
            return cached_answer, history_obj.messages

        logging.info(f"Cache miss for key: {cache_key}. Generating new answer with Agents.")

        rag_chain = get_agentic_rag_chain(self.llm, self.vector_store)
        
        if not history_obj:
             return "Error: Chat session not found.", []

        messages = history_obj.messages

        response = rag_chain.invoke(
            {"input": query, "chat_history": messages}
        )

        answer = response['answer']

        # save to Supabase
        history_obj.add_user_message(query)
        history_obj.add_ai_message(answer)

        self.cache.set(cache_key, answer, 300)

        return answer, history_obj.messages



    async def conversational_streaming(self, query: str, session_id: str):
        cache_key = self.cache.make_cache_key(query, session_id)
        cached_answer = self.cache.get(cache_key)
        
        if cached_answer:
            yield "data: [DONE]\n\n"
            return

        rag_chain = get_agentic_rag_chain(self.llm, self.vector_store, self.embeddings, self.supabase)

        history_obj = self.get_session_history(session_id)
        if not history_obj:
            yield "Error: Could not load chat history."
            return

        messages = history_obj.messages

        try:
            status_queue = queue.Queue()
            result_queue = queue.Queue()

            def status_callback(msg):
                status_queue.put(msg)

            def run_chain():
                try:
                    res = rag_chain.invoke(
                        {"input": query, "chat_history": messages},
                        status_callback=status_callback
                    )
                    result_queue.put(res)
                except Exception as e:
                    result_queue.put(e)
                finally:
                    status_queue.put(None)

            t = threading.Thread(target=run_chain)
            t.start()

            while True:
                try:
                    #timeout to allow checking other conditions if needed
                    msg = status_queue.get(timeout=0.1)
                    
                    if msg is None:
                        break
                    
                    yield f"data: {json.dumps({'status': msg})}\n\n"
                    await asyncio.sleep(0.05)
                    
                except queue.Empty:
                    await asyncio.sleep(0.01)
            
            t.join()
            
            final_res = result_queue.get()
            if isinstance(final_res, Exception):
                raise final_res
            
            answer = final_res['answer']
            
            yield f"data: {json.dumps({'content': answer})}\n\n"
            yield "data: [DONE]\n\n"
            
            self.cache.set(cache_key, answer, 300)
            
            # Save to Supabase
            history_obj.add_user_message(query)
            history_obj.add_ai_message(answer)
            
        except Exception as e:
            logging.error(f"Streaming/Agent error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
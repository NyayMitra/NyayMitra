from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from supabase import Client
import logging

logger = logging.getLogger(__name__)

class SupabaseChatMessageHistory(BaseChatMessageHistory):
    """
    Manages chat history in Supabase Postgres.
    """
    def __init__(self, session_id: str, client: Client):
        self.session_id = session_id #corresponds to chat_id in schema
        self.client = client
        self.messages = []
        self._load_messages()

    def _load_messages(self):
        try:
            response = self.client.table('messages')\
                .select('*')\
                .eq('chat_id', self.session_id)\
                .order('created_at', desc=False)\
                .execute()
            
            data = response.data
            self.messages = []
            
            if data:
                for msg in data:
                    if msg['role'] == 'user':
                        self.messages.append(HumanMessage(content=msg['content']))
                    elif msg['role'] == 'assistant':
                        self.messages.append(AIMessage(content=msg['content']))
                        
        except Exception as e:
            logger.error(f"Error loading messages for chat {self.session_id}: {e}")

    def add_user_message(self, message: HumanMessage | str):
        try:
            self.client.table('messages').insert({
                "chat_id": self.session_id,
                "role": "user",
                "content": message
            }).execute()
            self.messages.append(HumanMessage(content=message))
        except Exception as e:
            logger.error(f"Error adding user message: {e}")

    def add_ai_message(self, message: str):
        try:
            self.client.table('messages').insert({
                "chat_id": self.session_id,
                "role": "assistant",
                "content": message
            }).execute()
            self.messages.append(AIMessage(content=message))
        except Exception as e:
            logger.error(f"Error adding AI message: {e}")
    
    def clear(self):
        try:
            self.client.table('messages').delete().eq('chat_id', self.session_id).execute()
            self.messages = []
        except Exception as e:
            logger.error(f"Error clearing messages: {e}")

import logging
from typing import Dict, Any, Type
from pydantic import BaseModel, Field
from crewai import Agent, Task, Crew
from crewai.tools import BaseTool
from crewai_tools import ScrapeWebsiteTool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.history_aware_retriever import create_history_aware_retriever


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStoreRetrieverTool(BaseTool):
    """Tool for retrieving documents from Supabase/Chroma"""
    name: str = "Legal Archive Retriever"
    description: str = "Retrieves relevant legal documents from the internal database"
    retriever: Any = Field(default=None)
    
    def __init__(self, retriever):
        super().__init__()
        self.retriever = retriever
    
    def _run(self, query: str) -> str:
        logger.info(f"Retreiver tool called with query: {query}")
        try:
            results = self.retriever.invoke(query)
            logger.info(f"Retriever returned {len(results) if results else 0} documents")
            
            if not results:
                logger.warning("No documents found in vector store")
                return "No relevant documents found in internal DB"
            
            formatted_docs = []
            for i, doc in enumerate(results, 1):
                source = doc.metadata.get('source', 'Unknown') if hasattr(doc, 'metadata') else 'Unknown'
                content = doc.page_content
                formatted_docs.append(f"Doc {i} (Source: {source})\n{content}\n")
            
            logger.info(f"Returning {len(formatted_docs)} formatted documents")
            return "\n".join(formatted_docs)
        except Exception as e:
            logger.error(f"Retriever error: {str(e)}")
            return f"Error retrieving documents: {str(e)}"



class DuckDuckGoSearchTool(BaseTool):
    name: str = "DuckDuckGo Search"
    description: str = "Search the web for current legal information"
    search_engine: Any = Field(default_factory=DuckDuckGoSearchRun)

    def _run(self, query: str) -> str:
        return self.search_engine.run(query)


class RobustScrapeWebsiteTool(BaseTool):
    name: str = "Read Website Content"
    description: str = "Reads the content of a specific website url"
    scraper: Any = Field(default_factory=ScrapeWebsiteTool)

    def _run(self, website_url: str) -> str:
        try:
            return self.scraper.run(website_url=website_url)
        except Exception as e:
            return f"Error reading website: {str(e)}"

def get_agentic_rag_chain(llm, vector_store, embeddings=None, supabase_client=None):
    return AgenticRAGChain(llm, vector_store, embeddings, supabase_client)

class AgenticRAGChain:
    def __init__(self, llm, vector_store, embeddings=None, supabase_client=None):
        self.llm = llm
        self.vector_store = vector_store
        self.embeddings = embeddings
        self.supabase = supabase_client
        


        class LegalArchiveInput(BaseModel):
            """Input for Legal Archive Retriever."""
            query: str = Field(..., description="Legal query to search for in the database")

        class LegalArchiveTool(BaseTool):
            name: str = "Legal_Archive_Retriever"
            description: str = (
                "Search the internal legal database for Indian laws, acts, sections, and precedents. "
                "This should ALWAYS be your FIRST choice for legal queries about IPC, IT Act, Constitution, "
                "Consumer Protection, POCSO, GST, and other Indian legal matters. "
                "Input should be a clear query about specific legal topics."
            )
            args_schema: Type[BaseModel] = LegalArchiveInput
            embeddings: Any = Field(default=None)
            supabase: Any = Field(default=None)

            def _run(self, query: str) -> str:
                """Query the internal legal database using direct Supabase"""
                try:
                    if not self.embeddings or not self.supabase:
                        return "Error: Database connection not initialized"
                    
                    query_vector = self.embeddings.embed_query(query)
                    
                    params = {
                        "query_embedding": query_vector,
                        "match_threshold": 0.60,
                        "match_count": 3
                    }
                    
                    response = self.supabase.rpc("match_documents", params).execute()
                    data = response.data
                    
                    if not data:
                        return "No relevant documents found in database"
                    
                    formatted_docs = []
                    for i, doc in enumerate(data, 1):
                        content = doc.get('content', '')
                        if len(content) > 2000:
                            content = content[:2000] + "... [TRUNCATED]"
                            
                        metadata = doc.get('metadata', {})
                        source = metadata.get('source', 'Unknown')
                        formatted_docs.append(f"Doc {i} (Source: {source})\n{content}\n")
                    
                    return "\n".join(formatted_docs)
                    
                except Exception as e:
                    logger.error(f"Retriever error: {str(e)}")
                    return f"Error querying database: {str(e)}"
        
        self.retriever_tool = LegalArchiveTool(embeddings=self.embeddings, supabase=self.supabase)
        self.search_tool = DuckDuckGoSearchTool()
        self.scrape_tool = RobustScrapeWebsiteTool()
        
        self._setup_agents()
        
    def _setup_agents(self):
        
        self.retriever_agent = Agent(
            role="Legal Researcher",
            goal="Gather comprehensive facts from Internal DB (Primary) and Web (Secondary)",
            backstory=(
                "You are a meticulous researcher with access to an internal legal database. "
                "CRITICAL WORKFLOW:\n"
                "1. ALWAYS START by using 'Legal Archive Retriever' tool to check the internal database.\n"
                "2. ONLY if the internal database returns 'No relevant documents', then use 'duckduckgo_search'.\n"
                "3. Use 'Read Website Content' to scrape specific URLs found in search results.\n"
                "The internal database contains comprehensive Indian legal documents and should be your PRIMARY source."
            ),
            verbose=False,
            memory=True,
            tools=[self.retriever_tool, self.search_tool, self.scrape_tool],
            llm=self.llm,
            max_iter=5,
            respect_context_window=True
        )
        
        self.legal_assistant_agent = Agent(
            role="Senior Legal Analyst",
            goal="Draft a detailed and professional legal response based strictly on the Researcher's findings.",
            backstory=(
                "You are NyayMitra, a top-tier legal consultant. "
                "Synthesize the research into a coherent, accurate, and professional legal answer. "
                "Cite your sources (Internal DB or Web URLs) clearly."
            ),
            verbose=False,
            memory=True,
            allow_delegation=False, 
            llm=self.llm,
            respect_context_window=True
        )
        
        self.evaluation_agent = Agent(
            role="Quality Assurance Evaluator",
            goal="Verify the accuracy, legal soundness, and tone of the drafted response.",
            backstory=(
                "You are an expert legal auditor. "
                "Verify that the Analyst's response is supported by the research. "
                "Check for hallucinations. If the response claims a fact, ensure it was in the research. "
                "If necessary, perform a quick verification search, but prefer the provided context."
            ),
            verbose=False,
            tools=[self.search_tool, self.scrape_tool],
            llm=self.llm,
            max_iter=3
        )

        self.editor_agent = Agent(
            role="Editor",
            goal="Format the final response for clarity, conciseness, and user-readability.",
            backstory=(
                "You are the final gatekeeper. "
                "Ensure the response is well-structured (bullet points where appropriate), concise (but not too brief), "
                "and free of jargon where possible. "
                "Keep the final output professional and helpful."
            ),
            verbose=False,
            llm=self.llm
        )

    def invoke(self, inputs: Dict[str, Any], status_callback=None) -> Dict[str, Any]:
        query = inputs.get("input", "")
        chat_history = inputs.get("chat_history", [])
        
        def emit_status(msg):
            if status_callback:
                status_callback(msg)
        
        # Research
        research_task = Task(
            description=f"Find legal facts and precedents for: '{query}'. Prioritize internal DB.",
            expected_output="A list of relevant facts, case laws, and legal sections found, with sources.",
            agent=self.retriever_agent
        )
        
        # Drafting
        drafting_task = Task(
            description="Draft a professional legal response based on the research.",
            expected_output="A comprehensive draft response.",
            agent=self.legal_assistant_agent,
            context=[research_task]
        )
        
        # Evaluation
        evaluation_task = Task(
            description="Review the draft for accuracy and legal validity.",
            expected_output="A validated and potentially corrected version of the response, or the original if it was good.",
            agent=self.evaluation_agent,
            context=[drafting_task]
        )

        # Editing
        editing_task = Task(
            description=(
                "Take the validated response text and format it for maximum clarity. "
                "Use bullet points, headings, and concise language. "
                "OUTPUT the ACTUAL formatted response text, do NOT just describe what you will do. "
                "IMPORTANT: Do NOT wrap the output in markdown code blocks (```). Just return the raw markdown text."
            ),
            expected_output="The final formatted legal response text in markdown with clear structure (no code blocks).",
            agent=self.editor_agent,
            context=[evaluation_task]
        )

        current_agent = {"name": "Legal Researcher"}
        
        def agent_step_callback(step_output):
            try:
                output_str = str(step_output)
                
                if "retriev" in output_str.lower() or "search" in output_str.lower():
                    agent_name = "Legal Researcher"
                    action = "searching databases"
                elif "draft" in output_str.lower() or "writ" in output_str.lower():
                    agent_name = "Legal Assistant"
                    action = "drafting response"
                elif "evaluat" in output_str.lower() or "review" in output_str.lower():
                    agent_name = "Quality Evaluator"
                    action = "reviewing accuracy"
                elif "edit" in output_str.lower() or "format" in output_str.lower():
                    agent_name = "Editor"
                    action = "polishing response"
                else:
                    agent_name = current_agent["name"]
                    action = "processing"
                
                current_agent["name"] = agent_name
                emit_status(f"{agent_name} is {action}...")
                
            except:
                emit_status("NyayMitra agents are working...")

        crew = Crew(
            agents=[
                self.retriever_agent, 
                self.legal_assistant_agent, 
                self.evaluation_agent,
                self.editor_agent
            ],
            tasks=[research_task, drafting_task, evaluation_task, editing_task],
            verbose=False,
            step_callback=agent_step_callback
        )
        
        emit_status("Legal Researcher is beginning search on internal databases...")
        
        result = crew.kickoff()
        
        logging.info(f"CrewAI result type: {type(result)}")
        logging.info(f"CrewAI result dir: {dir(result)}")
        logging.info(f"CrewAI result str: {str(result)[:200]}...")

        if hasattr(result, 'raw'):
            final_answer = result.raw
            logging.info(f"Using result.raw: {final_answer[:200]}...")
        elif hasattr(result, 'result'):
            final_answer = result.result
            logging.info(f"Using result.result: {final_answer[:200]}...")
        elif hasattr(result, 'output'):
            final_answer = result.output
            logging.info(f"Using result.output: {final_answer[:200]}...")
        else:
            logging.warning(f"No known attribute found, using str()")
            final_answer = str(result)
        
        return {"answer": final_answer}



# Standard RAG chain backup
def get_rag_chain(llm, vector_store, system_prompt, qa_prompt):
    retriever = vector_store.as_retriever(
        search_type="similarity_score_threshold", 
        search_kwargs={"k": 10, "score_threshold": 0.3}
    )
    
    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", "Given a chat history and the latest user question which might reference context in the chat history, formulate a standalone question which can be understood without the chat history. Do NOT answer the question, just reformulate it if needed and otherwise return it as is."),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)
    
    qa_prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", qa_prompt),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt_template)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)    
    
    return rag_chain

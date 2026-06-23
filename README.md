<div align="center">

<img src="client/public/logo.png" alt="NyayMitra" height="120"/>

# NyayMitra
### *"Your Friend of Justice"*

An AI-powered agentic legal assistant that democratizes access to Indian law — built on a multi-agent Retrieval-Augmented Generation (RAG) pipeline grounded in the full text of India's core statutes.

**React 19** · **Vite** · **FastAPI** · **LangChain** · **CrewAI** · **Google Gemini** · **Supabase (pgvector)** · **Redis**

</div>

---

## 📖 Table of Contents
- [Project Vision & Architecture](#-project-vision--architecture)
- [System Flow — Request Lifecycle](#-system-flow--request-lifecycle)
- [Technical Stack Deep-Dive](#-technical-stack-deep-dive)
- [Module & Folder Topology](#-module--folder-topology)
- [The Multi-Agent RAG Pipeline](#-the-multi-agent-rag-pipeline)
- [Local Environment & Setup](#-local-environment--setup)
- [Environment Variables Reference](#-environment-variables-reference)
- [API Reference](#-api-reference)
- [Legal Knowledge Base](#-legal-knowledge-base)
- [Acknowledgements](#-acknowledgements)

---

## 🔭 Project Vision & Architecture

**NyayMitra** is a full-stack conversational legal assistant specialized in Indian jurisprudence. Where a generic chatbot extrapolates (and hallucinates) legal advice, NyayMitra **grounds every answer in the actual statutory text** of India's primary laws and subjects each draft to a multi-agent quality review before it reaches the user.

### What it accomplishes
- **Case Identification** — Users describe a situation in natural language; NyayMitra surfaces the relevant acts, sections, and provisions that apply.
- **Guided Legal Steps** — Clear, step-by-step explanations of how to understand and approach a legal problem.
- **Persistent, multi-turn conversations** — Every chat is saved per-user with full message history, retrievable across sessions.
- **Real-time agentic transparency** — As the agents work (research → draft → evaluate → edit), live status updates stream to the UI so the user sees *why* the response takes time.

### Architectural shape
The project is a cleanly separated **two-tier monorepo**:

```
┌─────────────────────────┐        SSE / REST         ┌──────────────────────────────┐
│       React Client       │  ◀──────────────────────▶  │        FastAPI Server        │
│  (Vite + Clerk + R3F)    │                            │  (CrewAI Agentic RAG Core)   │
└─────────────────────────┘                            └──────────────┬───────────────┘
                                                                      │
                                            ┌─────────────────────────┼─────────────────────────┐
                                            ▼                         ▼                         ▼
                                   ┌────────────────┐       ┌──────────────────┐      ┌────────────────────┐
                                   │   Supabase     │       │  Google Gemini   │      │      Redis         │
                                   │ Postgres +     │       │  (LLM +          │      │  (Response Cache)  │
                                   │   pgvector     │       │   Embeddings)    │      │                    │
                                   └────────────────┘       └──────────────────┘      └────────────────────┘
```

- The **client** owns all rendering, auth gating, chat state, and streaming consumption.
- The **server** owns the intelligence: it orchestrates four specialized AI agents, performs vector retrieval, caches results, and persists conversation history.
- **Supabase** wears two hats — it is both the relational store for users/chats/messages *and* the vector database (via pgvector) holding the embedded legal corpus.

---

## 🔄 System Flow — Request Lifecycle

This is the precise journey of a single user message, synthesized from `ChatPage.jsx`, `api.js`, `main.py`, and `chains.py`:

1. **Auth gate** — Clerk (`<SignedIn>`/`<SignedOut>`) protects `/chat`. Unauthenticated users are redirected to sign-in.
2. **Chat provisioning** — If no `chatId` exists in the route, the client calls `POST /api/chats` to create a Supabase chat row and obtains a UUID `chat_id` (the session key everywhere downstream).
3. **Stream initiation** — The message is sent to `POST /api/chat/stream` as Server-Sent Events. The client opens a `ReadableStream` reader and parses SSE frames.
4. **Cache check** — `NyayMitra.conversational_streaming()` computes a `sha256(session_id:query)` cache key; a hit short-circuits the agents.
5. **History hydration** — `SupabaseChatMessageHistory` loads prior `messages` rows for the chat into LangChain `HumanMessage`/`AIMessage` objects.
6. **Crew kickoff** — A four-agent CrewAI crew is assembled (research → draft → evaluate → edit). A background thread runs the crew while the main coroutine drains a `status_queue`, emitting `{"status": "..."}` frames in real time.
7. **Grounded retrieval** — The **Legal Researcher** agent queries Supabase pgvector via the `match_documents` RPC (cosine similarity, threshold `0.60`, top-3). Only if the archive is empty does it fall back to DuckDuckGo web search + scraping.
8. **Synthesis & QA** — The **Senior Legal Analyst** drafts from research, the **QA Evaluator** audits for hallucinations, and the **Editor** formats the final markdown (no code fences).
9. **Delivery & persistence** — The final answer is streamed as `{"content": "..."}`, cached in Redis (300s TTL), and appended to Supabase as a new user/assistant message pair.
10. **UI reconciliation** — On completion the client navigates to `/chat/{chatId}` and hydrates from preserved state so the transition is seamless.

---

## 🧰 Technical Stack Deep-Dive

### Frontend (`client/`)
| Concern | Technology | Notes |
|---|---|---|
| **Framework** | React 19 + Vite 7 | SPA, `"type": "module"`, `@` path alias to `./src` |
| **Routing** | `react-router-dom` 7 + `react-router-hash-link` | `/`, `/chat`, `/chat/:chatId`, `/sign-in`, `/sign-up` |
| **Authentication** | `@clerk/clerk-react` | `ClerkProvider` wraps the app; `<SignedIn>`/`<SignedOut>` guards; themed `<SignIn>`/`<SignUp>` components |
| **State management** | Local `useState` + `useRef` + custom events | No Redux — chat list syncs via a `window` `"chat-created"` CustomEvent between `ChatPage` and `Sidebar` |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) + `tw-animate-css` | shadcn/ui "new-york" style, `neutral` base, OKLCH CSS variables, dark theme, custom keyframe animations |
| **UI primitives** | shadcn/ui + Aceternity registry | `3d-card`, `aurora-background`, `background-gradient`, Radix `avatar`/`slot` |
| **3D / WebGL** | `three` + `@react-three/fiber` + `@react-three/drei` | Renders an auto-rotating `.glb` model (Lady Justice) in the hero via `useFrame` + `useGLTF` |
| **Markdown rendering** | `react-markdown` + `remark-gfm` + `react-syntax-highlighter` (Dracula) | Assistant answers render as rich GFM markdown with syntax-highlighted code blocks |
| **Forms** | `react-hook-form` | |
| **Icons** | `lucide-react` | |
| **Animation** | `motion` (Framer Motion) | |

### Backend (`server/`)
| Concern | Technology | Notes |
|---|---|---|
| **API framework** | FastAPI + Uvicorn | SSE streaming via `StreamingResponse`, CORS locked to `FRONTEND_URL` |
| **LLM** | Google Gemini (`gemini-2.0-flash`) via `langchain-google-genai` | `temperature=0.9`, `convert_system_message_to_human=True` |
| **Embeddings** | `GoogleGenerativeAIEmbeddings` (`models/embedding-001`) | 768-dim vectors stored in pgvector |
| **Agent orchestration** | **CrewAI** (`Agent`, `Task`, `Crew`) | 4 specialized agents, sequential task pipeline, `step_callback` for live status |
| **RAG framework** | LangChain (`langchain-core`, `langchain-community`, `langchain-classic`) | `SupabaseVectorStore`, history-aware retriever, stuff-documents chain (backup) |
| **Vector store** | **Supabase Postgres + pgvector** | `documents` table, `match_documents` RPC; *(Chroma used historically for offline ingestion)* |
| **Tools** | `DuckDuckGoSearchRun` (web search), `crewai_tools.ScrapeWebsiteTool` (page reading) | Secondary sources only |
| **Persistence** | Supabase (Postgres) | `chats` + `messages` tables; custom `SupabaseChatMessageHistory` implementing LangChain's `BaseChatMessageHistory` |
| **Caching** | Redis via `redis-py` | SHA-256 keyed response cache, 300s TTL |
| **Concurrency** | `threading` + `asyncio` + `queue` | Crew runs on a worker thread; status frames drained on the async event loop |

---

## 🗂 Module & Folder Topology

```
Major Project/
├── client/                         # React 19 + Vite frontend
│   ├── public/                     # Static assets (logo, hero image, model.glb, card SVGs)
│   ├── src/
│   │   ├── main.jsx                # Entry point — wraps app in ClerkProvider
│   │   ├── App.jsx                 # Route table with Clerk auth gates
│   │   ├── index.css               # Tailwind v4 theme, OKLCH tokens, keyframes
│   │   ├── lib/
│   │   │   ├── api.js              # REST + SSE streaming client (chatStream async generator)
│   │   │   └── utils.js            # cn() classname merge helper
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top nav with HashLink section routing
│   │   │   ├── Sidebar.jsx         # Chat list, new/delete chat, user profile, sign-out
│   │   │   ├── HeroSection.jsx     # Landing hero with R3F 3D model canvas
│   │   │   ├── Features.jsx        # IntersectionObserver-revealed 3D feature cards
│   │   │   ├── Testimonials.jsx    # Social proof section
│   │   │   ├── Footer.jsx          # Links + contact
│   │   │   ├── Logo.jsx            # Branded logo link
│   │   │   ├── Model.jsx           # useGLTF + useFrame rotating model loader
│   │   │   └── ui/                 # shadcn/ui + Aceternity primitives
│   │   └── pages/
│   │       ├── LandingPage.jsx     # Composes Navbar → Hero → Features → Testimonials → Footer
│   │       ├── ChatPage.jsx        # Core chat UI — streaming, history, voice input, markdown
│   │       ├── SignInPage.jsx      # Clerk <SignIn> on AuroraBackground
│   │       └── SignUpPage.jsx      # Clerk <SignUp> on AuroraBackground
│   ├── components.json             # shadcn/ui config (new-york style, Aceternity registry)
│   ├── vite.config.js              # React + Tailwind plugins, @ alias
│   └── package.json
│
├── server/                         # FastAPI + CrewAI agentic backend
│   ├── api.py                      # FastAPI app, endpoints, SSE streaming, model/vector init
│   ├── main.py                     # NyayMitra orchestrator — caching, history, streaming
│   ├── chains.py                   # CrewAI agents/tasks + LangChain RAG chain factory
│   ├── prompts.py                  # SYSTEM_PROMPT & USER_PROMPT for the LLM
│   ├── redis_cache.py              # RedisCache — SHA-256 keyed get/set with TTL
│   ├── supabase_history.py         # SupabaseChatMessageHistory (BaseChatMessageHistory impl)
│   ├── src/
│   │   ├── requirements.txt        # Python deps (langchain, chromadb, pymupdf, etc.)
│   │   ├── acts.txt                # Source URLs for the legal PDFs to ingest
│   │   └── Constitution_Pdf_Injest_NyayMitra.ipynb   # Offline ingestion pipeline
│   ├── logo/                       # Brand assets
│   └── .env.example
│
├── Ingested pdfs/                  # Raw source statutes (gitignored) — the knowledge corpus
└── README.md                       # ← you are here
```

---

## 🤖 The Multi-Agent RAG Pipeline

The heart of NyayMitra is in `chains.py` — a **CrewAI crew of four agents** that process every query sequentially. This is what differentiates NyayMitra from a naive single-prompt RAG bot.

| # | Agent | Role | Goal | Tools |
|---|---|---|---|---|
| 1 | **Legal Researcher** | `Legal Researcher` | Gather facts — **internal DB first**, web second | `LegalArchiveRetriever`, DuckDuckGo, Scraper |
| 2 | **Senior Legal Analyst** | `Legal Assistant` (NyayMitra persona) | Draft a detailed, source-cited legal response from research | — (no tools, synthesis only) |
| 3 | **Quality Assurance Evaluator** | `QA Evaluator` | Verify accuracy, detect hallucinations, confirm claims trace to research | DuckDuckGo, Scraper |
| 4 | **Editor** | `Editor` | Format for clarity — bullet points, headings, concise language; strip code fences | — |

**Key design choices:**
- **Grounding-first retrieval** — The `LegalArchiveRetriever` tool calls the Supabase `match_documents` RPC directly with `match_threshold=0.60` and `match_count=3`, truncating any doc over 2000 chars. The agent's backstory *mandates* it exhaust the internal archive before touching the web.
- **Live transparency** — A `step_callback` inspects each CrewAI step's text, infers which agent is active (research / draft / evaluate / edit), and emits human-readable status strings ("Legal Researcher is searching databases…") that stream to the UI as SSE `{"status": ...}` frames.
- **Hallucination guardrail** — The QA agent's explicit job is to reject any factual claim not present in the research context.
- **Standard RAG fallback** — `get_rag_chain()` provides a classic LangChain history-aware retrieval chain (`create_retrieval_chain` + `create_stuff_documents_chain`) as a backup path.

---

## 🚀 Local Environment & Setup

### Prerequisites
- **Node.js** ≥ 18 and npm
- **Python** ≥ 3.11 (the project uses `uv` for venv management in the ingestion notebook)
- A **Supabase** project with pgvector enabled
- A **Redis** instance (local or cloud)
- A **Google AI Studio** API key (Gemini)
- A **Clerk** application (publishable + secret keys)

### 1. Clone & install the frontend
```bash
cd client
npm install
```

### 2. Configure the frontend environment
```bash
cp .env.example .env
```
Edit `client/.env`:
```env
VITE_API_BASE_URL="http://localhost:5000"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Install & configure the backend
```bash
cd ../server
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r src/requirements.txt
# Plus the runtime deps used by api.py:
pip install fastapi uvicorn redis supabase python-dotenv crewai crewai-tools langchain-classic
```

### 4. Configure the backend environment
```bash
cp .env.example .env
```
Edit `server/.env` (see [Environment Variables Reference](#-environment-variables-reference)).

### 5. Provision Supabase (schema + vector store)
You need three tables and a vector match function. In the Supabase SQL editor:

```sql
-- Enable the vector extension
create extension if not exists vector;

-- Documents table (vector store for the legal corpus)
create table documents (
  id          uuid primary key default gen_random_uuid(),
  content     text,
  metadata    jsonb,
  embedding   vector(768)   -- dimension for models/embedding-001
);

-- Cosine-similarity match function used by the retriever tool
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float default 0.60,
  match_count     int    default 3
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language sql stable as $$
  select id, content, metadata,
         1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Application tables
create table chats (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  title      text default 'New Chat',
  created_at timestamptz default now()
);

create table messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid references chats(id) on delete cascade,
  role       text not null,           -- 'user' | 'assistant'
  content    text not null,
  created_at timestamptz default now()
);
```

### 6. Ingest the legal corpus (one-time)
Open `server/src/Constitution_Pdf_Injest_NyayMitra.ipynb`. It downloads the statutes listed in `acts.txt`, chunks them with `RecursiveCharacterTextSplitter` (chunk_size=1000, overlap=300) along `"PART "` / chapter boundaries, embeds with `models/embedding-001`, and upserts into the vector store. Adapt the final cells to write into your Supabase `documents` table (the current notebook writes to a local Chroma DB; the production server reads from Supabase pgvector).

### 7. Run everything
```bash
# Terminal 1 — backend (serves on :5000)
cd server
source .venv/bin/activate
python api.py            # or: uvicorn api:app --reload --port 5000

# Terminal 2 — frontend (serves on :5173 with --host)
cd client
npm run dev
```

Visit **http://localhost:5173**.

### Available scripts
| Command | Location | Purpose |
|---|---|---|
| `npm run dev` | `client/` | Start Vite dev server with network host |
| `npm run build` | `client/` | Production build to `dist/` |
| `npm run preview` | `client/` | Preview the production build |
| `npm run lint` | `client/` | Run ESLint |
| `python api.py` | `server/` | Start FastAPI on `0.0.0.0:5000` with reload |

---

## 🔐 Environment Variables Reference

### `client/.env`
| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Base URL of the FastAPI backend (default `http://localhost:5000`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key; app throws on boot if missing |

### `server/.env`
| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | ✅ | Google AI Studio key for Gemini + embeddings; server throws on boot if missing |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key (bypasses RLS — keep secret) |
| `SUPABASE_DB_URL` | ⚙️ | Postgres connection string (used by ingestion tooling) |
| `REDIS_URL` | ✅ | Redis connection string (default `redis://localhost:6379/0`) |
| `FRONTEND_URL` | ✅ | Origin allowed by CORS (default `http://localhost:3000`; override to `http://localhost:5173`) |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/health` | Health check → `{ status, message }` |
| `POST` | `/api/chats` | Create a new chat `{ user_id, title }` → chat row |
| `GET`  | `/api/chats?user_id=` | List all chats for a user (newest first) |
| `DELETE` | `/api/chats/{chat_id}` | Delete a chat (cascades to messages) |
| `POST` | `/api/chat` | Non-streaming chat `{ query, chat_id, user_id }` → `{ answer, chat_id, messages }` |
| `POST` | `/api/chat/stream` | **SSE streaming chat** — emits `{"status": ...}` then `{"content": ...}` then `[DONE]` |
| `GET`  | `/api/history/{chat_id}` | Fetch full message history for a chat |

---

## ⚖️ Legal Knowledge Base

NyayMitra is grounded in the bare text of India's foundational statutes (sourced from official `.gov.in` domains, see `server/src/acts.txt`):

- **Constitution of India** (MHA)
- **Bharatiya Nyaya Sanhita, 2023** (BNS — successor to IPC)
- **Bharatiya Nagarak Suraksha Sanhita, 2023** (BNSS — criminal procedure)
- **Bharatiya Sakshya Adhiniyam, 2023** (BSA — evidence)
- **Information Technology Act, 2000**
- **Companies Act, 2013**
- **Consumer Protection Act, 2019**
- **Right to Information Act, 2005**
- **Right to Education Act, 2009**
- **Sexual Offences Act, 2012** (POCSO)
- **Motor Vehicles Act, 1988**
- **GST Act(s) and Rule(s)**
- **Insolvency and Bankruptcy Code, 2016**
- **NHAI Rules**

> ⚠️ **Disclaimer:** NyayMitra provides legal *information*, not legal *advice*. It is not a substitute for a licensed advocate. Always consult a qualified legal professional for matters affecting your rights.

---

## 🙏 Acknowledgements

- [Google Gemini](https://ai.google.dev/) — LLM & embeddings
- [CrewAI](https://www.crewai.com/) — multi-agent orchestration
- [LangChain](https://www.langchain.com/) — RAG primitives
- [Supabase](https://supabase.com/) — Postgres + pgvector
- [Clerk](https://clerk.com/) — authentication
- [shadcn/ui](https://ui.shadcn.com/) & [Aceternity UI](https://ui.aceternity.com/) — component library
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) — 3D rendering

<div align="center">

© 2025 **Nyay Mitra** — *Friend of Justice*

</div>

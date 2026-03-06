# Claim Sight UI

The web frontend for Claim Sight — a chat-based interface for uploading healthcare claim documents and viewing adjudication results in real time.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS**, and the **LangGraph SDK**.

## Features

- **Chat interface** — Conversational UI for interacting with the claims pipeline agent
- **File uploads** — Drag-and-drop or attach claim forms and invoices (images, PDFs)
- **Real-time streaming** — Pipeline progress streams back as the backend processes documents
- **Pipeline visualisation** — Shows which pipeline step is currently active (extract, features, scoring)
- **Claim details panel** — Resizable side panel displaying extracted claim data, computed risk features, and the final PASS/FLAG/FAIL decision
- **Thread history** — Browse and switch between previous claim processing sessions

## Architecture

```
app/
├── page.tsx               # Main page — resizable split layout (chat + claim panel)
├── layout.tsx             # Root layout
└── globals.css            # Global styles (Tailwind)

components/
├── agent/                 # Core application components
│   ├── agent-provider.tsx # React context — manages LangGraph streaming, threads, state
│   ├── agent-chat.tsx     # Chat view — message list + composer
│   ├── chat-composer.tsx  # Message input with file attachment support
│   ├── message-list.tsx   # Renders conversation messages
│   ├── claim-panel.tsx    # Right panel — claim details, features, scores
│   ├── claim-pipeline.tsx # Pipeline step visualisation
│   ├── agent-header-actions.tsx # Thread switching, new chat
│   └── types.ts           # TypeScript types (Claim, Features, Score, etc.)
└── ui/                    # Reusable UI primitives (shadcn/ui)

lib/
├── utils.ts               # Tailwind class merge utility
└── validations/           # Form validation schemas

hooks/
└── use-mobile.ts          # Responsive breakpoint hook
```

## How It Connects to the Backend

The UI communicates with the LangGraph backend using `@langchain/langgraph-sdk`:

1. **`AgentProvider`** creates a LangGraph `Client` pointed at `NEXT_PUBLIC_LANGGRAPH_API_URL`
2. **`useStream`** hook manages real-time streaming of pipeline state
3. When the user sends a message or uploads files, content is sent as a `HumanMessage` to the `pipeline` assistant
4. The backend streams back updated state (messages, claims, features, scores) which the UI renders incrementally
5. Thread management lets users revisit previous sessions

## Setup

### Environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:8120
```

This points to the LangGraph backend API. When running via Docker Compose from the monorepo root, this is configured automatically.

### Development

```bash
npm install
npm run dev
```

The dev server starts at http://localhost:3000 with hot reload.

### Production Build

```bash
npm run build
npm start
```

The Next.js config uses `output: "standalone"` for Docker deployment.

## Tech Stack

| Library | Purpose |
|---------|---------|
| Next.js 16 | React framework (App Router) |
| React 19 | UI rendering |
| @langchain/langgraph-sdk | LangGraph API client + streaming hooks |
| Tailwind CSS 4 | Styling |
| shadcn/ui | UI component primitives |
| react-resizable-panels | Split panel layout |
| react-hook-form + zod | Form handling and validation |
| lucide-react | Icons |

# Advocate — AI-Powered Medical Bill & Appeal Agent

An AI agent that reads your medical bill or insurance denial, finds billing errors, builds a visual appeal strategy, and drafts every document you need to fight back.

## The Problem

- **49 million** insurance claims are denied annually
- **80%** of hospital bills contain errors
- **$262 billion** in wrongful denials happen each year
- Most people don't appeal because the system is designed to be impenetrable

## The Solution

Advocate uses AI to:

1. **Analyze** your medical bill or denial letter for:
   - Billing errors (duplicates, wrong codes, unbundling, balance billing)
   - Appeal grounds (medical necessity, coverage violations, regulatory issues)
   - Critical deadlines (appeal windows, external review timelines, state complaints)

2. **Build** a visual "attack tree" strategy showing:
   - What actions to take, in what order
   - Which documents to prepare
   - What deadlines to meet
   - What happens if you miss a deadline
   - Fallback options if your first appeal fails

3. **Draft** ready-to-send documents:
   - Appeal letters citing plan terms and regulations
   - Complaints to state insurance commissioners
   - Itemized bill requests
   - External review requests

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (optional — can run in demo mode without one)

### Installation

```bash
cd advocate
npm install
```

### Configuration

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-key-here
```

Or set your API key in the app when prompted.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run start
```

## Project Structure

```
advocate/
├── app/
│   ├── api/                    # API routes for AI pipeline
│   │   ├── analyze/           # Document analysis endpoint
│   │   ├── strategy/          # Attack tree builder
│   │   └── draft/             # Document drafting
│   ├── dashboard/             # Main workspace
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing page
│   └── globals.css            # Global styles
├── components/                # React components
│   ├── attack-tree.tsx        # Graph visualization
│   ├── timeline.tsx           # Deadline sidebar
│   ├── document-preview.tsx   # Draft viewer
│   ├── analysis-stream.tsx    # Loading state
│   ├── risk-cascade.tsx       # Risk visualization
│   └── upload-zone.tsx        # File/paste input
├── lib/
│   ├── types.ts               # TypeScript types
│   ├── prompts.ts             # LLM prompts
│   ├── sample-data.ts         # Demo data
│   └── openai.ts              # OpenAI client config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## How It Works

### The AI Pipeline

1. **Analyze Phase** (ANALYZE_PROMPT)
   - Extracts billing errors with specific evidence
   - Identifies legal appeal grounds
   - Flags all critical deadlines
   - Calculates total overcharge amount

2. **Strategy Phase** (STRATEGY_PROMPT)
   - Builds a directed graph of actions
   - Models dependencies between steps
   - Identifies quick wins vs. escalation paths
   - Shows consequences of missed deadlines

3. **Draft Phase** (DRAFT_PROMPT)
   - Generates professional appeal letters
   - Cites plan terms and regulations
   - Includes specific billing details
   - Ready to mail or email

### Demo Mode

The app includes pre-built sample data so you can test the full workflow without an API key. Click "Try Sample Demo" on the landing page to see a realistic example with:

- Realistic medical bill with planted errors
- Comprehensive analysis with 4 billing errors
- Strategic attack tree with 9 nodes and multiple paths
- Sample appeal letter ready to send

## Features

### Attack Tree Visualization

- Interactive node-based graph showing your strategic options
- Color-coded by action type (action, deadline, document, escalation, outcome)
- Click nodes to see detailed information
- Risk Mode: Click a deadline to see cascade effects of missing it

### Timeline Sidebar

- All deadlines sorted by urgency (overdue, urgent, upcoming)
- Billing errors with specific dollar amounts
- Appeal grounds with regulatory citations
- Click any item to highlight in the attack tree

### Document Preview

- Click a document node to preview the draft
- Copy to clipboard or download as .txt
- Citations and key points highlighted
- Real-time streaming as documents generate

### Fallback & Reliability

- Works in **demo mode** without API key
- Graceful degradation if API fails
- Pre-computed sample data ensures demo reliability
- Offline-compatible for presentation environments

## Limitations & Disclaimers

- **Not a lawyer**: Consult a healthcare attorney for complex cases
- **Billing analysis is not legal advice**: Use as a starting point, verify with professionals
- **Regulatory knowledge**: Based on GPT-4o's training (as of May 2025). Verify all regulations for current applicability
- **HIPAA**: No data is stored. All processing happens in-session, but review sensitive data practices before using with real patient data

## Future Roadmap

- **RAG pipeline**: Over federal/state insurance regulation databases
- **Direct e-filing**: Integration with insurance company appeal portals
- **Expansion**: Tenant rights, consumer protection, employment disputes
- **Mobile app**: Photo capture of paper bills
- **Multi-language**: Support for Spanish, Mandarin, other languages
- **Insurance portal integration**: Direct upload and tracking

## Built With

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-4o with structured JSON outputs
- **Visualization**: Custom SVG attack tree, React Flow
- **Animations**: Framer Motion, CSS3 keyframes
- **UI Components**: shadcn/ui, Lucide icons

## License

MIT License — See LICENSE file for details

## Contributing

Contributions welcome! Open an issue or submit a PR.

## Support

For questions, issues, or feature requests, please open a GitHub issue.

---

**Made with ❤️ for patients fighting medical bills**

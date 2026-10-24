# Development Setup

## Prerequisites (verified)
- Node.js v24.15.0 (available)
- npm v11.12.1 (available)
- Python 3.15.1 (available)
- .NET SDK 10.0.401 (available)
- Git not initialized in repo (no .git) - greenfield

## Proposed project structure
```
makecom/
├── client/          # Vite + TS frontend
├── server/          # Express + TS backend
├── data/            # File storage (gitignored)
├── templates/       # Site templates (RU/DE)
├── docs/            # Documentation
├── examples/        # Two example companies/sites (deliverable)
├── .env.example     # Example config without keys
├── .gitignore
└── package.json     # Root workspace (optional)
```

## Environment variables
Required (server-side only):
- `OPENROUTER_API_KEY` - API key (never commit)
- `PORT` - Server port (default: 3000)
- `DATA_DIR` - Data directory (default: ./data)
- `SPEND_LIMIT_PER_OP` - Max spend per operation (TBD - needs value/logic)

See `.env.example` for template.

## Installation (proposed)
```bash
# Install dependencies
npm install  # in root or client/ and server/

# Setup env
cp .env.example .env
# Edit .env with your OpenRouter API key
```

## Development (proposed)
```bash
# Start dev servers
npm run dev  # or run client and server separately
```

## Testing (proposed)
```bash
npm run test        # unit tests
npm run lint        # linting
npm run typecheck   # TypeScript checks
```

## Build (proposed)
```bash
npm run build
```

## Notes
- Keys must never be committed or exposed to client
- `data/` directory must be gitignored
- No existing dependencies installed yet - this is preparation only
- Actual commands will depend on final package.json setup

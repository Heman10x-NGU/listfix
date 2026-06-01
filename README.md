# Listfix

**AI-powered Facebook Marketplace listing optimizer.**

Paste your listing → get an optimized title, description, price, and photo tips → sell faster.

## What it does

1. You paste your Marketplace listing (title, description, price)
2. AI analyzes it against best practices
3. Returns: optimized title, improved description, suggested price, photo order, keywords, and tips
4. One-click copy the optimized text back to Marketplace

## Quick Start

```bash
# Build
go build -o listfix .

# Run (demo mode — no API key needed)
./listfix

# Run with any OpenAI-compatible API
export OPENAI_API_KEY=your-key
./listfix
```

Open http://localhost:8080

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | — | API key for any OpenAI-compatible API. If not set, runs in demo mode with realistic mock data. |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | API base URL. Works with OpenAI, Azure, Groq, Together, Ollama, LM Studio, vLLM, LiteLLM, or any OpenAI-compatible endpoint. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model name to use. |
| `PORT` | No | `8080` | HTTP server port. |

**Bring Your Own Key (BYOK):** This tool does not include an API key. You bring your own key from any OpenAI-compatible provider. This keeps the project free, open source, and avoids shared-key rate limits.

### Supported Providers

Works out of the box with any OpenAI-compatible API:

| Provider | `OPENAI_BASE_URL` |
|----------|-------------------|
| OpenAI | `https://api.openai.com/v1` (default) |
| Groq | `https://api.groq.com/openai/v1` |
| Together AI | `https://api.together.xyz/v1` |
| Ollama | `http://localhost:11434/v1` |
| LM Studio | `http://localhost:1234/v1` |
| vLLM | `http://localhost:8000/v1` |
| LiteLLM | `http://localhost:4000/v1` |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deploy}/v1` |

## API

### POST /api/optimize

Optimize a marketplace listing.

**Request:**
```json
{
  "listing_text": "Selling my iPhone 14 Pro, used for 6 months, works perfectly, comes with case and charger. Asking $750 OBO."
}
```

**Response:**
```json
{
  "score": 42,
  "title": {
    "current": "Selling my iPhone 14 Pro...",
    "score": 35,
    "optimized": "iPhone 14 Pro - Excellent Condition - Local Pickup",
    "keywords_added": ["condition", "brand", "dimensions"]
  },
  "description": {
    "current": "...",
    "score": 30,
    "optimized": "...with added dimensions, condition details, and call-to-action",
    "improvements": ["Added specific dimensions", "Included brand name", "Added condition details"]
  },
  "pricing": {
    "current": 750,
    "suggested": 675,
    "analysis": "Your price is slightly above market average.",
    "comparable_range": "$525-$825"
  },
  "photos": {
    "current_lead": 1,
    "suggested_lead": 3,
    "reason": "Photo #3 shows the full item with good lighting"
  },
  "keywords": ["like new", "barely used", "must go", "obo", "local pickup"],
  "tips": [
    "Move your best-lit photo to the first position",
    "Add exact dimensions (L x W x H)",
    "Include the brand name in the title"
  ]
}
```

## Tech Stack

- **Backend:** Go (net/http)
- **AI:** Any OpenAI-compatible API (OpenAI, Groq, Together, Ollama, etc.)
- **Frontend:** HTML, Tailwind CSS (CDN), vanilla JavaScript
- **Deploy:** Docker, GitHub Actions

## License

MIT

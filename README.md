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

# Run with MiMo AI
export MIMO_API_KEY=your-key
./listfix
```

Open http://localhost:8080

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MIMO_API_KEY` | No | — | API key for MiMo AI (bring your own key). If not set, runs in demo mode with realistic mock data. |
| `MIMO_BASE_URL` | No | `https://api.mimo.com/v1` | MiMo API base URL (OpenAI-compatible) |
| `PORT` | No | `8080` | HTTP server port |

**Bring Your Own Key (BYOK):** This tool does not include an API key. You bring your own MiMo or OpenAI-compatible API key. This keeps the project free, open source, and avoids any usage limits imposed by a shared key.

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
- **AI:** MiMo v2.5 Pro via OpenAI-compatible API
- **Frontend:** HTML, Tailwind CSS (CDN), vanilla JavaScript
- **Deploy:** Docker, GitHub Actions

## License

MIT

---

Built as part of the [Daemons](https://github.com/Heman10x-NGU/daemons) ecosystem.

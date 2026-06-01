# Listfix

**AI-powered Facebook Marketplace listing optimizer**

Listfix takes your rough Facebook Marketplace listing draft and uses MiMo AI to generate an optimized title, description, and pricing suggestion. Paste in what you have, get back a listing that sells.

## Screenshot

![Listfix UI](screenshot.png)

## Quick Start

```bash
# Set your API key
export MIMO_API_KEY=your-api-key-here
export MIMO_BASE_URL=https://api.mimo.ai/v1

# Build and run
go build -o listfix .
./listfix
```

Open http://localhost:8080 in your browser.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MIMO_API_KEY` | Yes | — | API key for MiMo AI |
| `MIMO_BASE_URL` | No | `https://api.mimo.ai/v1` | MiMo API base URL |
| `PORT` | No | `8080` | HTTP server port |

## API

### POST /api/optimize

Optimize a marketplace listing.

**Request:**

```json
{
  "title": "old couch",
  "description": "brown couch, some stains, works fine",
  "category": "furniture",
  "price": "100"
}
```

**Response:**

```json
{
  "optimized_title": "Comfortable 3-Seat Brown Fabric Sofa - Great Condition",
  "optimized_description": "Well-maintained brown fabric sofa seating three...",
  "suggested_price": "$120",
  "tips": ["Add measurements", "Include brand name"]
}
```

## Tech Stack

- **Backend:** Go (net/http)
- **AI:** MiMo via OpenAI-compatible API
- **Frontend:** HTML, Tailwind CSS, vanilla JS

## License

MIT

---

Built as part of the Daemons ecosystem.

package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"listfix/models"

	goopenai "github.com/sashabaranov/go-openai"
)

const (
	defaultBaseURL = "https://api.mimo.com/v1"
	modelName      = "mimo-v2.5-pro"
	requestTimeout = 30 * time.Second
)

var systemPrompt = `You are a Facebook Marketplace listing optimization expert.

Analyze the listing provided and return a JSON object with exactly these fields:

- "score" (int, 0-100): Overall listing quality score.
- "title": { "current": string, "score": int, "optimized": string, "keywords_added": []string }
  — Title score rates keyword density, length (under 75 chars), clarity, and searchability.
  — "optimized" must stay under 75 characters and lead with the most searched terms.
  — "keywords_added" lists the new keywords you inserted.
- "description": { "current": string, "score": int, "optimized": string, "improvements": []string }
  — Description score rates detail level, formatting, call-to-action presence, and buyer persuasion.
  — "improvements" is a list of specific changes you made.
- "pricing": { "current": float, "suggested": float, "analysis": string, "comparable_range": string }
  — "suggested" is your recommended price. "analysis" explains the reasoning.
  — "comparable_range" is a string like "$45-$65" showing typical market range.
- "photos": { "current_lead": int, "suggested_lead": int, "reason": string }
  — "current_lead" is 1 unless told otherwise.
  — "suggested_lead" is the photo index you recommend (1-based). "reason" explains why.
- "keywords" ([]string): Top search terms buyers would use to find this item.
- "tips" ([]string): Actionable suggestions to improve the listing.

Guidelines:
- Be specific and actionable. Avoid vague advice.
- Price suggestions should reflect realistic Facebook Marketplace values (typically 40-70% of retail).
- Titles should front-load brand, model, and condition keywords.
- Descriptions should be scannable: short paragraphs, bullet points for specs, clear condition disclosure.
- Always include a call-to-action in the optimized description.

Return ONLY valid JSON. No markdown fences, no commentary.`

// OptimizeListing sends a listing to the MiMo API and returns the parsed optimization result.
func OptimizeListing(ctx context.Context, listing models.Listing) (*models.OptimizationResult, error) {
	apiKey := os.Getenv("MIMO_API_KEY")

	// Demo mode: return realistic mock data when no API key
	if apiKey == "" {
		return demoResult(listing), nil
	}

	baseURL := os.Getenv("MIMO_BASE_URL")
	if baseURL == "" {
		baseURL = defaultBaseURL
	}

	cfg := goopenai.DefaultConfig(apiKey)
	cfg.BaseURL = strings.TrimRight(baseURL, "/")

	client := goopenai.NewClientWithConfig(cfg)

	listingJSON, err := json.Marshal(listing)
	if err != nil {
		return nil, fmt.Errorf("marshal listing: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()

	resp, err := client.CreateChatCompletion(ctx, goopenai.ChatCompletionRequest{
		Model: modelName,
		ResponseFormat: &goopenai.ChatCompletionResponseFormat{
			Type: goopenai.ChatCompletionResponseFormatTypeJSONObject,
		},
		Messages: []goopenai.ChatCompletionMessage{
			{
				Role:    goopenai.ChatMessageRoleSystem,
				Content: systemPrompt,
			},
			{
				Role:    goopenai.ChatMessageRoleUser,
				Content: string(listingJSON),
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("mimo api call: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("mimo api returned no choices")
	}

	raw := resp.Choices[0].Message.Content

	var result models.OptimizationResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("parse mimo response: %w (raw: %s)", err, raw)
	}

	return &result, nil
}

// demoResult returns realistic mock data for demo mode (no API key).
func demoResult(listing models.Listing) *models.OptimizationResult {
	title := listing.Title
	if title == "" {
		title = "Your listing"
	}

	return &models.OptimizationResult{
		Score: 42,
		Title: models.TitleResult{
			Current:   title,
			Score:     35,
			Optimized: optimizeTitle(title),
			KeywordsAdded: []string{"condition", "brand", "dimensions"},
		},
		Description: models.DescResult{
			Current:   listing.Description,
			Score:     30,
			Optimized: optimizeDescription(listing.Description),
			Improvements: []string{
				"Added specific dimensions and weight",
				"Included brand and model information",
				"Added condition details with transparency",
				"Included reason for selling",
				"Added call-to-action at the end",
			},
		},
		Pricing: models.PricingResult{
			Current:         listing.Price,
			Suggested:       suggestPrice(listing.Price),
			Analysis:        "Your price is slightly above market average for similar items in your area.",
			ComparableRange: fmt.Sprintf("$%.0f-$%.0f", listing.Price*0.7, listing.Price*1.1),
		},
		Photos: models.PhotosResult{
			CurrentLead:   1,
			SuggestedLead: 3,
			Reason:        "Photo #3 shows the full item with good lighting and clean background — this will attract more clicks in search results.",
		},
		Keywords: []string{
			"like new",
			"barely used",
			"must go",
			"obo",
			"local pickup",
		},
		Tips: []string{
			"Move your best-lit photo to the first position — it's the thumbnail buyers see in search",
			"Add exact dimensions (L x W x H) — buyers skip listings without measurements",
			"Include the brand name in the title — branded items get 3x more views",
			"Price at $X or best offer (OBO) — listings with OBO get 40% more messages",
			"Add 'reason for selling' — builds trust and reduces lowball offers",
		},
	}
}

func optimizeTitle(title string) string {
	if len(title) > 60 {
		return title[:60] + "..."
	}
	return title + " - Excellent Condition - Local Pickup"
}

func optimizeDescription(desc string) string {
	if desc == "" {
		return "Well-maintained item in excellent condition. Barely used, always kept in a clean, smoke-free home. Includes all original accessories. Reason for selling: upgrading to newer model. Happy to answer any questions. Local pickup preferred. Price is firm but open to reasonable offers."
	}
	return desc + "\n\nCondition: Excellent, barely used\nIncludes: All original accessories\nReason for selling: Upgrading\nPickup: Local only, happy to demo\n\nFeel free to message with any questions!"
}

func suggestPrice(price float64) float64 {
	if price <= 0 {
		return 50
	}
	// Suggest 85-95% of listed price (typical Marketplace optimization)
	return price * 0.9
}

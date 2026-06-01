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
  — "improvements" is a list of specific changes you made (e.g. "Added condition details", "Included dimensions").
- "pricing": { "current": float, "suggested": float, "analysis": string, "comparable_range": string }
  — "suggested" is your recommended price. "analysis" explains the reasoning.
  — "comparable_range" is a string like "$45-$65" showing typical market range.
- "photos": { "current_lead": int, "suggested_lead": int, "reason": string }
  — "current_lead" is the index of the current lead photo (always 1 unless told otherwise).
  — "suggested_lead" is the photo index you recommend (1-based). "reason" explains why.
- "keywords" ([]string): Top search terms buyers would use to find this item.
- "tips" ([]string): Actionable suggestions to improve the listing beyond the above optimizations.

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
	if apiKey == "" {
		return nil, fmt.Errorf("MIMO_API_KEY environment variable is not set")
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

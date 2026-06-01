package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	maxListingLength = 5000
	rateLimit        = 10
	rateLimitWindow  = time.Minute
)

type OptimizeRequest struct {
	ListingText string `json:"listing_text"`
}

type OptimizeResponse struct {
	Score       int      `json:"score"`
	Suggestions []string `json:"suggestions"`
	Improved    string   `json:"improved_text"`
}

type OptimizeHandler struct {
	mu       sync.Mutex
	requests map[string][]time.Time
}

func NewOptimizeHandler() *OptimizeHandler {
	return &OptimizeHandler{
		requests: make(map[string][]time.Time),
	}
}

func (h *OptimizeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ip := r.RemoteAddr

	if !h.allowRequest(ip) {
		http.Error(w, `{"error":"rate limit exceeded, try again later"}`, http.StatusTooManyRequests)
		return
	}

	var req OptimizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON body"}`, http.StatusBadRequest)
		return
	}

	req.ListingText = strings.TrimSpace(req.ListingText)
	if req.ListingText == "" {
		http.Error(w, `{"error":"listing_text is required"}`, http.StatusBadRequest)
		return
	}

	if len(req.ListingText) > maxListingLength {
		http.Error(w, `{"error":"listing_text exceeds maximum length of 5000 characters"}`, http.StatusBadRequest)
		return
	}

	result, err := optimizeListing(req.ListingText)
	if err != nil {
		http.Error(w, `{"error":"optimization failed"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *OptimizeHandler) allowRequest(ip string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rateLimitWindow)

	// Clean old entries
	var valid []time.Time
	for _, t := range h.requests[ip] {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	h.requests[ip] = valid

	if len(valid) >= rateLimit {
		return false
	}

	h.requests[ip] = append(h.requests[ip], now)
	return true
}

func optimizeListing(text string) (*OptimizeResponse, error) {
	// TODO: Integrate with MiMo AI client for actual optimization
	// For now, return a placeholder response
	return &OptimizeResponse{
		Score: 75,
		Suggestions: []string{
			"Add more specific keywords for better search visibility",
			"Include dimensions or specifications",
			"Highlight unique selling points in the first line",
		},
		Improved: text,
	}, nil
}

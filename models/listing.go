package models

// Listing represents a Facebook Marketplace listing to be analyzed.
type Listing struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	PhotoCount  int     `json:"photo_count"`
}

// OptimizationResult holds the full AI analysis of a Marketplace listing.
type OptimizationResult struct {
	Score       int         `json:"score"`
	Title       TitleResult `json:"title"`
	Description DescResult  `json:"description"`
	Pricing     PricingResult `json:"pricing"`
	Photos      PhotosResult  `json:"photos"`
	Keywords    []string      `json:"keywords"`
	Tips        []string      `json:"tips"`
}

// TitleResult contains title analysis and optimization.
type TitleResult struct {
	Current       string   `json:"current"`
	Score         int      `json:"score"`
	Optimized     string   `json:"optimized"`
	KeywordsAdded []string `json:"keywords_added"`
}

// DescResult contains description analysis and optimization.
type DescResult struct {
	Current      string   `json:"current"`
	Score        int      `json:"score"`
	Optimized    string   `json:"optimized"`
	Improvements []string `json:"improvements"`
}

// PricingResult contains pricing analysis.
type PricingResult struct {
	Current         float64 `json:"current"`
	Suggested       float64 `json:"suggested"`
	Analysis        string  `json:"analysis"`
	ComparableRange string  `json:"comparable_range"`
}

// PhotosResult contains photo order suggestion.
type PhotosResult struct {
	CurrentLead   int    `json:"current_lead"`
	SuggestedLead int    `json:"suggested_lead"`
	Reason        string `json:"reason"`
}

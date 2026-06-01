// Listfix Frontend Application
// Vanilla JavaScript for Facebook Marketplace listing optimization
//
// Expected DOM structure:
//   #listing-input      — textarea for listing text
//   #analyze-btn        — button to trigger analysis
//   #loading            — loading container (hidden by default)
//   #results            — results container (hidden by default)
//   #error-message      — error display container (hidden by default)
//   #score-gauge        — SVG circle for score visualization
//   #score-value        — text element showing numeric score
//   #original-title     — element for current title (strikethrough)
//   #optimized-title    — element for optimized title
//   #original-desc      — element for current description
//   #optimized-desc     — element for optimized description
//   #current-price      — element for current price
//   #suggested-price    — element for suggested price
//   #price-analysis     — element for pricing analysis text
//   #photo-tip          — element for photo reorder suggestion
//   #keywords-list      — container for keyword tags
//   #tips-list          — container for tip items
//   #copy-title-btn     — button to copy optimized title
//   #copy-desc-btn      — button to copy optimized description
//   #copy-all-btn       — button to copy all results

(function () {
  "use strict";

  // --- Constants ---

  const API_ENDPOINT = "/api/optimize";
  const MAX_LENGTH = 5000;
  const COPY_FEEDBACK_DURATION = 2000; // ms
  const SCORE_GAUGE_RADIUS = 54;
  const SCORE_GAUGE_CIRCUMFERENCE = 2 * Math.PI * SCORE_GAUGE_RADIUS;
  const ANIMATION_DURATION = 800; // ms

  // --- DOM References (cached once on init) ---

  let elements = {};

  // --- Utility Functions ---

  /**
   * Safely query a DOM element by ID. Returns null if not found.
   */
  function $(id) {
    return document.getElementById(id);
  }

  /**
   * Set the text content of an element, handling null/undefined gracefully.
   */
  function setText(el, text) {
    if (!el) return;
    el.textContent = text || "";
  }

  /**
   * Show or hide an element by toggling a CSS class.
   */
  function setVisible(el, visible) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  }

  /**
   * Format a number as USD currency.
   */
  function formatPrice(value) {
    if (typeof value !== "number" || isNaN(value)) return "N/A";
    return "$" + value.toFixed(2);
  }

  /**
   * Copy text to clipboard. Falls back to execCommand for older browsers.
   * Returns a promise that resolves to true on success, false on failure.
   */
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for insecure contexts
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Show a temporary checkmark on a button for COPY_FEEDBACK_DURATION ms.
   */
  function showCopyFeedback(btn) {
    if (!btn) return;
    var original = btn.textContent;
    btn.textContent = "✓ Copied";
    btn.classList.add("copied");
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove("copied");
    }, COPY_FEEDBACK_DURATION);
  }

  /**
   * Extract an error message from a fetch Response, or return a default.
   */
  async function extractErrorMessage(response) {
    try {
      var body = await response.json();
      return body.error || "Unknown error (HTTP " + response.status + ")";
    } catch (_) {
      return "Server returned HTTP " + response.status;
    }
  }

  // --- Score Gauge Animation ---

  /**
   * Animate the SVG score gauge from 0 to the target score.
   * Expects an SVG circle element with id "score-gauge" and a text
   * element with id "score-value".
   */
  function animateScoreGauge(score) {
    var gauge = elements.scoreGauge;
    var valueEl = elements.scoreValue;
    if (!gauge || !valueEl) return;

    // Reset to 0
    gauge.style.strokeDasharray = SCORE_GAUGE_CIRCUMFERENCE;
    gauge.style.strokeDashoffset = SCORE_GAUGE_CIRCUMFERENCE;
    gauge.style.transition = "none";

    // Force reflow so the reset takes effect before animating
    gauge.getBoundingClientRect();

    // Animate
    var targetOffset =
      SCORE_GAUGE_CIRCUMFERENCE * (1 - Math.min(score, 100) / 100);
    gauge.style.transition =
      "stroke-dashoffset " + ANIMATION_DURATION + "ms ease-out";
    gauge.style.strokeDashoffset = targetOffset;

    // Animate the numeric counter
    var start = 0;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / ANIMATION_DURATION, 1);
      // Ease-out curve
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * score);
      valueEl.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // --- Rendering ---

  /**
   * Build a keyword tag element.
   */
  function createKeywordTag(keyword) {
    var tag = document.createElement("span");
    tag.className = "keyword-tag";
    tag.textContent = keyword;
    return tag;
  }

  /**
   * Build a numbered tip list item.
   */
  function createTipItem(tip, index) {
    var li = document.createElement("li");
    li.className = "tip-item";
    li.textContent = tip;
    return li;
  }

  /**
   * Render the full optimization result into the DOM.
   */
  function renderResults(data) {
    // Score gauge
    animateScoreGauge(data.score || 0);

    // Title section
    if (data.title) {
      setText(elements.originalTitle, data.title.current);
      setText(elements.optimizedTitle, data.title.optimized);
    }

    // Description section
    if (data.description) {
      setText(elements.originalDesc, data.description.current);
      setText(elements.optimizedDesc, data.description.optimized);
    }

    // Pricing section
    if (data.pricing) {
      setText(elements.currentPrice, formatPrice(data.pricing.current));
      setText(elements.suggestedPrice, formatPrice(data.pricing.suggested));
      setText(elements.priceAnalysis, data.pricing.analysis);
    }

    // Photo tip
    if (data.photos && data.photos.suggested_lead !== undefined) {
      var tip =
        "Move photo #" +
        data.photos.suggested_lead +
        " to lead position";
      if (data.photos.reason) {
        tip += " — " + data.photos.reason;
      }
      setText(elements.photoTip, tip);
    }

    // Keywords
    if (elements.keywordsList) {
      elements.keywordsList.innerHTML = "";
      if (data.keywords && data.keywords.length > 0) {
        data.keywords.forEach(function (kw) {
          elements.keywordsList.appendChild(createKeywordTag(kw));
        });
      }
    }

    // Tips
    if (elements.tipsList) {
      elements.tipsList.innerHTML = "";
      if (data.tips && data.tips.length > 0) {
        data.tips.forEach(function (tip, i) {
          elements.tipsList.appendChild(createTipItem(tip, i));
        });
      }
    }

    // Show results, hide loading
    setVisible(elements.loading, false);
    setVisible(elements.results, true);

    // Smooth scroll to results
    if (elements.results) {
      elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /**
   * Handle the case where the API returns a simplified response
   * (score + suggestions + improved_text) instead of the full model.
   */
  function renderSimplifiedResults(data) {
    animateScoreGauge(data.score || 0);

    // Show the improved text as the optimized description
    if (data.improved_text) {
      setText(elements.optimizedDesc, data.improved_text);
    }

    // Show suggestions as tips
    if (elements.tipsList) {
      elements.tipsList.innerHTML = "";
      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach(function (tip, i) {
          elements.tipsList.appendChild(createTipItem(tip, i));
        });
      }
    }

    setVisible(elements.loading, false);
    setVisible(elements.results, true);

    if (elements.results) {
      elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // --- Core Logic ---

  /**
   * Display an error message to the user.
   */
  function showError(message) {
    setText(elements.errorMessage, message);
    setVisible(elements.errorMessage, true);
    setVisible(elements.loading, false);
    setVisible(elements.results, false);
  }

  /**
   * Validate the textarea input. Returns true if valid.
   */
  function validateInput(text) {
    if (!text || text.trim().length === 0) {
      showError("Please enter a listing to analyze.");
      return false;
    }

    if (text.length > MAX_LENGTH) {
      var proceed = confirm(
        "Your listing is " +
          text.length +
          " characters (over " +
          MAX_LENGTH +
          "). The server may reject it. Continue anyway?"
      );
      return proceed;
    }

    return true;
  }

  /**
   * Detect whether the response has the full OptimizationResult shape
   * or the simplified placeholder shape.
   */
  function isFullResult(data) {
    return !!(data.title || data.description || data.pricing || data.photos);
  }

  /**
   * Main analysis flow: validate, fetch, render.
   */
  async function analyze() {
    var text = elements.listingInput ? elements.listingInput.value : "";

    // Hide previous results and errors
    setVisible(elements.results, false);
    setVisible(elements.errorMessage, false);

    if (!validateInput(text)) return;

    // Show loading state
    setVisible(elements.loading, true);

    try {
      var response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_text: text.trim() }),
      });

      if (!response.ok) {
        var errMsg = await extractErrorMessage(response);
        showError(errMsg);
        return;
      }

      var data = await response.json();

      if (!data || Object.keys(data).length === 0) {
        showError("No results returned from the server.");
        return;
      }

      // Render based on response shape
      if (isFullResult(data)) {
        renderResults(data);
      } else {
        renderSimplifiedResults(data);
      }
    } catch (err) {
      // Network error or JSON parse error
      showError(
        "Could not connect to server. Please check your connection and try again."
      );
    }
  }

  // --- Copy Handlers ---

  /**
   * Copy the optimized title to clipboard.
   */
  async function copyTitle() {
    var text = elements.optimizedTitle ? elements.optimizedTitle.textContent : "";
    if (!text) return;
    var ok = await copyToClipboard(text);
    if (ok) showCopyFeedback(elements.copyTitleBtn);
  }

  /**
   * Copy the optimized description to clipboard.
   */
  async function copyDescription() {
    var text = elements.optimizedDesc ? elements.optimizedDesc.textContent : "";
    if (!text) return;
    var ok = await copyToClipboard(text);
    if (ok) showCopyFeedback(elements.copyDescBtn);
  }

  /**
   * Copy all results (title, description, pricing, tips) to clipboard.
   */
  async function copyAll() {
    var parts = [];

    var title = elements.optimizedTitle
      ? elements.optimizedTitle.textContent
      : "";
    if (title) parts.push("Title: " + title);

    var desc = elements.optimizedDesc
      ? elements.optimizedDesc.textContent
      : "";
    if (desc) parts.push("Description: " + desc);

    var suggested = elements.suggestedPrice
      ? elements.suggestedPrice.textContent
      : "";
    if (suggested && suggested !== "N/A")
      parts.push("Suggested Price: " + suggested);

    var keywords = [];
    if (elements.keywordsList) {
      var tags = elements.keywordsList.querySelectorAll(".keyword-tag");
      tags.forEach(function (t) {
        keywords.push(t.textContent);
      });
    }
    if (keywords.length > 0)
      parts.push("Keywords: " + keywords.join(", "));

    if (parts.length === 0) return;

    var text = parts.join("\n\n");
    var ok = await copyToClipboard(text);
    if (ok) showCopyFeedback(elements.copyAllBtn);
  }

  // --- Initialization ---

  /**
   * Cache all DOM element references and bind event listeners.
   */
  function init() {
    // Cache DOM references
    elements = {
      listingInput: $("listing-input"),
      analyzeBtn: $("analyze-btn"),
      loading: $("loading"),
      results: $("results"),
      errorMessage: $("error-message"),
      scoreGauge: $("score-gauge"),
      scoreValue: $("score-value"),
      originalTitle: $("original-title"),
      optimizedTitle: $("optimized-title"),
      originalDesc: $("original-desc"),
      optimizedDesc: $("optimized-desc"),
      currentPrice: $("current-price"),
      suggestedPrice: $("suggested-price"),
      priceAnalysis: $("price-analysis"),
      photoTip: $("photo-tip"),
      keywordsList: $("keywords-list"),
      tipsList: $("tips-list"),
      copyTitleBtn: $("copy-title-btn"),
      copyDescBtn: $("copy-desc-btn"),
      copyAllBtn: $("copy-all-btn"),
    };

    // Bind event listeners
    if (elements.analyzeBtn) {
      elements.analyzeBtn.addEventListener("click", analyze);
    }

    if (elements.listingInput) {
      // Allow Ctrl+Enter / Cmd+Enter to trigger analysis
      elements.listingInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          analyze();
        }
      });
    }

    if (elements.copyTitleBtn) {
      elements.copyTitleBtn.addEventListener("click", copyTitle);
    }

    if (elements.copyDescBtn) {
      elements.copyDescBtn.addEventListener("click", copyDescription);
    }

    if (elements.copyAllBtn) {
      elements.copyAllBtn.addEventListener("click", copyAll);
    }
  }

  // Run init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

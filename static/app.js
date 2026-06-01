// Listfix — Frontend Logic
// Handles API calls, result rendering, and copy-to-clipboard

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('listing-input');
  const btn = document.getElementById('analyze-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const results = document.getElementById('results');

  // Analyze button click
  btn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) {
      showError('Please paste your listing title, description, and price.');
      return;
    }

    setLoading(true);
    hideError();

    try {
      const resp = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_text: text }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Server error (' + resp.status + ')');
      }

      const data = await resp.json();
      renderResults(data);
    } catch (err) {
      showError(err.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  });

  // Ctrl+Enter to submit
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      btn.click();
    }
  });

  function setLoading(loading) {
    btn.disabled = loading;
    btnText.textContent = loading ? 'Analyzing...' : 'Analyze with AI';
    btnSpinner.classList.toggle('hidden', !loading);
  }

  function showError(msg) {
    let el = document.getElementById('error-msg');
    if (!el) {
      el = document.createElement('div');
      el.id = 'error-msg';
      el.className = 'mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3';
      btn.parentNode.insertBefore(el, btn.nextSibling);
    }
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError() {
    const el = document.getElementById('error-msg');
    if (el) el.classList.add('hidden');
  }

  function renderResults(data) {
    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Score gauge
    animateScore(data.score || 0);

    // Suggestions container
    const sug = document.getElementById('suggestions');
    sug.innerHTML = '';

    // Title
    if (data.title) renderTitle(data.title);

    // Description improvements
    if (data.description && data.description.improvements) {
      renderImprovements(data.description.improvements, sug);
    }

    // Photo tip
    if (data.photos) renderPhotos(data.photos, sug);

    // Keywords
    if (data.keywords) renderKeywords(data.keywords, sug);

    // Tips
    if (data.tips) renderTips(data.tips, sug);

    // Optimized fields
    if (data.title) {
      document.getElementById('opt-title').textContent = data.title.optimized || 'N/A';
    }
    if (data.description) {
      document.getElementById('opt-desc').textContent = data.description.optimized || 'N/A';
    }
    if (data.pricing) {
      const current = data.pricing.current ? '$' + Math.round(data.pricing.current) : '';
      const suggested = data.pricing.suggested ? '$' + Math.round(data.pricing.suggested) : 'N/A';
      document.getElementById('opt-price').innerHTML =
        '<span class="text-white/30 line-through text-lg mr-2">' + current + '</span>' + suggested;

      // Analysis below price
      if (data.pricing.analysis) {
        const analysis = document.createElement('div');
        analysis.className = 'mt-2 text-sm text-white/50';
        analysis.textContent = data.pricing.analysis;
        document.getElementById('opt-price').parentNode.appendChild(analysis);
      }
      if (data.pricing.comparable_range) {
        const range = document.createElement('div');
        range.className = 'mt-1 text-xs text-white/30';
        range.textContent = 'Comparable range: ' + data.pricing.comparable_range;
        document.getElementById('opt-price').parentNode.appendChild(range);
      }
    }

    // Copy buttons
    setupCopyButtons(data);
  }

  function animateScore(score) {
    const ring = document.getElementById('score-ring');
    const value = document.getElementById('score-value');
    const circumference = 326.7;
    const offset = circumference - (score / 100) * circumference;

    ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
    ring.style.strokeDashoffset = offset;

    if (score >= 70) ring.style.stroke = '#22c55e';
    else if (score >= 40) ring.style.stroke = '#eab308';
    else ring.style.stroke = '#ef4444';

    let current = 0;
    const step = score / 40;
    const interval = setInterval(() => {
      current += step;
      if (current >= score) { current = score; clearInterval(interval); }
      value.textContent = Math.round(current);
    }, 30);
  }

  function renderTitle(title) {
    const el = document.getElementById('opt-title');
    el.innerHTML = '';

    if (title.current) {
      const orig = document.createElement('span');
      orig.className = 'line-through text-white/30 mr-2';
      orig.textContent = title.current;
      el.appendChild(orig);
      el.appendChild(document.createElement('br'));
    }

    const opt = document.createElement('span');
    opt.className = 'text-white font-medium';
    opt.textContent = title.optimized || 'N/A';
    el.appendChild(opt);

    if (title.keywords_added && title.keywords_added.length > 0) {
      const kw = document.createElement('div');
      kw.className = 'mt-2 flex flex-wrap gap-1.5';
      title.keywords_added.forEach(function(k) {
        const tag = document.createElement('span');
        tag.className = 'text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full';
        tag.textContent = '+' + k;
        kw.appendChild(tag);
      });
      el.appendChild(kw);
    }

    if (title.score !== undefined) {
      const s = document.createElement('div');
      s.className = 'mt-2 text-xs text-white/40';
      s.textContent = 'Title score: ' + title.score + '/100';
      el.appendChild(s);
    }
  }

  function renderImprovements(improvements, container) {
    const h = document.createElement('h3');
    h.className = 'text-sm font-medium text-white/40 uppercase tracking-wider mb-3';
    h.textContent = 'Improvements Made';
    container.appendChild(h);

    improvements.forEach(function(imp) {
      const row = document.createElement('div');
      row.className = 'flex items-start gap-2 text-sm text-white/60 mb-1';
      row.innerHTML = '<span class="text-indigo-400 mt-0.5">✦</span> ' + imp;
      container.appendChild(row);
    });
  }

  function renderPhotos(photos, container) {
    const tip = document.createElement('div');
    tip.className = 'flex items-start gap-2 text-sm text-white/60 mt-4 p-3 bg-white/5 rounded-xl border border-white/5';
    tip.innerHTML = '<span class="text-indigo-400 mt-0.5">📸</span>' +
      '<div><div class="font-medium text-white/80">Move photo #' + photos.suggested_lead + ' to lead position</div>' +
      '<div class="text-white/40 mt-1">' + photos.reason + '</div></div>';
    container.appendChild(tip);
  }

  function renderKeywords(keywords, container) {
    const section = document.createElement('div');
    section.className = 'mt-4';
    section.innerHTML = '<div class="text-sm font-medium text-white/40 uppercase tracking-wider mb-2">Top Search Keywords</div>';
    const tags = document.createElement('div');
    tags.className = 'flex flex-wrap gap-2';
    keywords.forEach(function(kw) {
      const tag = document.createElement('span');
      tag.className = 'text-xs bg-white/5 text-white/60 border border-white/10 px-2.5 py-1 rounded-full';
      tag.textContent = kw;
      tags.appendChild(tag);
    });
    section.appendChild(tags);
    container.appendChild(section);
  }

  function renderTips(tips, container) {
    const section = document.createElement('div');
    section.className = 'mt-4';
    section.innerHTML = '<div class="text-sm font-medium text-white/40 uppercase tracking-wider mb-2">Quick Wins</div>';
    tips.forEach(function(tip, i) {
      const row = document.createElement('div');
      row.className = 'flex items-start gap-2 text-sm text-white/60 mb-2';
      row.innerHTML = '<span class="text-indigo-400 font-mono text-xs mt-0.5">' + (i + 1) + '.</span> ' + tip;
      section.appendChild(row);
    });
    container.appendChild(section);
  }

  function setupCopyButtons(data) {
    document.querySelectorAll('.copy-btn').forEach(function(btn) {
      btn.onclick = async function() {
        var target = btn.dataset.target;
        var text = '';
        if (target === 'opt-title' && data.title) text = data.title.optimized || '';
        else if (target === 'opt-desc' && data.description) text = data.description.optimized || '';
        else if (target === 'opt-price' && data.pricing) text = '$' + Math.round(data.pricing.suggested);
        if (!text) return;

        try {
          await navigator.clipboard.writeText(text);
        } catch (e) {
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }

        var icon = btn.querySelector('.copy-icon');
        var check = btn.querySelector('.check-icon');
        var label = btn.querySelector('.copy-label');
        icon.classList.add('hidden');
        check.classList.remove('hidden');
        label.textContent = 'Copied!';
        setTimeout(function() {
          icon.classList.remove('hidden');
          check.classList.add('hidden');
          label.textContent = 'Copy';
        }, 2000);
      };
    });
  }
});

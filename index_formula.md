# index-formula.md
## Moviethon Index System (Ideation + Holistic Spec)

This document defines a practical, defensible scoring system that feels like stock-market analytics (momentum, volatility, movers) without any trading or gambling mechanics.

Moviethon Index is a proprietary, community-first signal. Third-party sources are supporting inputs, not the primary driver.

---

# 0) Design Principles

1. **Community is the engine**
   Ratings and engagement should move the needle meaningfully.

2. **Score must be stable but reactive**
   Avoid “random spikes” from small samples while still reflecting true surges.

3. **Explainability matters**
   Every big move should have a “Why did this change?” breakdown.

4. **Time-series is the product**
   Index values must be computed daily and stored to enable trends, volatility, gainers/decliners.

5. **Hard to game**
   Use smoothing, rate limiting, reputation weighting, and anomaly detection.

---

# 1) Key Entities and Relationships

## Film is the base asset
- Films receive the primary index score.
- Actor/genre/studio indices are derived aggregates of film indices.

Hierarchy:
Film Index → Actor Index → Genre Index → Studio/Franchise Index

---

# 2) Film Index (0–100)

Film Index is a weighted composite of:
- Quality (community rating, smoothed)
- Momentum (rating velocity + engagement velocity)
- Attention (external popularity proxies)
- Recency (time decay)
- Confidence (sample size reliability)

## 2.1 Inputs

### A) Community Rating (quality)
- Average user rating (1–10)
- Must use smoothing to reduce small-sample noise

Recommended: **Bayesian average**

Let:
- `R` = film’s average rating (1–10)
- `v` = number of ratings for film
- `C` = global mean rating (1–10)
- `m` = minimum ratings threshold (e.g. 50)

Bayesian rating:
`BR = (v/(v+m))*R + (m/(v+m))*C`

Then normalize to 0–100:
`RatingScore = 10 * BR`  (since BR in 1–10)

Optional: cap to [0,100]

### B) Rating Velocity (momentum)
We want films that are rapidly gaining attention to rise like “gainers”.

Compute:
- `v7` = ratings in last 7 days
- `v30` = ratings in last 30 days

Velocity ratio:
`VR = (v7 / 7) / max(1, (v30 / 30))`

Convert to bounded score using log:
`VelocityScore = clamp( 50 + 20 * log2(VR), 0, 100 )`

Notes:
- If VR = 1, VelocityScore ~ 50 (neutral).
- If VR > 1, positive momentum.
- If VR < 1, fading.

### C) Engagement Score (momentum + stickiness)
Include non-rating engagement to capture community energy:
- comments7, comments30
- watchlist adds (if implemented), shares, pageviews (optional)

Simple:
`Eng7 = ratings7 + 0.5*comments7 + 0.25*watchlistAdds7`
`Eng30 = ratings30 + 0.5*comments30 + 0.25*watchlistAdds30`

Engagement ratio:
`ER = (Eng7 / 7) / max(1, (Eng30 / 30))`

Bounded:
`EngagementScore = clamp( 50 + 20 * log2(ER), 0, 100 )`

### D) External Signal (supporting)
Use external sources as a stabilizer or tiebreaker, not the main engine.

Candidates:
- TMDB popularity (delta over 7d, or current percentile)
- OMDb votes count / rating (as a mild influence)

Example:
`ExternalScore = percentile_rank(TMDB_popularity) * 100`

Or if using delta:
`ExternalScore = clamp(50 + k * zscore(popularity_delta_7d), 0, 100)`

### E) Recency Weight (relevance)
Films should naturally decay unless kept alive by community activity.

Let:
- `daysSinceRelease`

Recency multiplier:
`Recency = exp(-daysSinceRelease / half_life_days)`

Suggested half-life:
- 365 days for general
- or dynamic by genre/franchise

To keep classics alive, the Bayesian rating and large v will stabilize, but recency should still matter for “market movers” views.

We can apply recency only to momentum components, not quality:
- Quality should persist
- Momentum is time-sensitive

### F) Confidence (reliability)
Small sample sizes should reduce impact.

Confidence multiplier:
`Conf = 1 - exp(-v / c)`
Where c ~ 30–50

This approaches 1 as ratings count increases.

---

## 2.2 Composite Film Index

Recommended weights (v1):
- RatingScore (quality): 45%
- VelocityScore (rating momentum): 25%
- EngagementScore (community activity): 15%
- ExternalScore (supporting signal): 15%

Composite before modifiers:
`Base = 0.45*RatingScore + 0.25*VelocityScore + 0.15*EngagementScore + 0.15*ExternalScore`

Apply modifiers:
- Confidence should dampen volatility from low v
- Recency should influence momentum, not long-term rating

Practical implementation:

`Momentum = 0.60*VelocityScore + 0.40*EngagementScore`
`Quality = RatingScore`
`Attention = ExternalScore`

`IndexRaw = 0.55*Quality + 0.30*Momentum + 0.15*Attention`

Then:
`Index = clamp( (0.85*IndexRaw + 0.15*(IndexRaw*Conf)) , 0, 100 )`

Alternative simpler:
`Index = clamp( (0.70*IndexRaw + 0.30*(IndexRaw*Conf)) , 0, 100 )`

Recency applied to Momentum:
`MomentumAdj = 50 + (Momentum - 50) * Recency`
Then recompute IndexRaw with MomentumAdj.

That way:
- Older films can still score high on quality
- They don’t dominate “movers” unless they surge again

---

# 3) “Market” Metrics Derived From Film Index

These are the stock-style mechanics that make the site feel alive.

## 3.1 Daily Change and Trend
- `Δ1d = Index(today) - Index(yesterday)`
- `Δ7d = Index(today) - Index(7 days ago)`
- `%Δ7d = Δ7d / max(1, Index(7 days ago))`

## 3.2 Volatility
Standard deviation over last 30 days:
`Vol30 = stdev(Index[d-30..d])`

Normalize volatility to 0–100:
`VolScore = clamp( (Vol30 / targetVol) * 50 , 0, 100 )`

Or classify:
- Stable: Vol30 < 3
- Moderate: 3–7
- High: > 7

## 3.3 Movers Lists
Top Gainers: highest Δ1d or Δ7d
Top Decliners: lowest Δ1d or Δ7d
Most Volatile: highest Vol30

## 3.4 “Why It Moved” Explainability
For each daily update, store component deltas:
- rating_component_delta
- velocity_component_delta
- engagement_component_delta
- external_component_delta

Then surface:
“Up +6.2 today due to rating surge + external popularity spike.”

This is key to product credibility.

---

# 4) Actor Index (Derived From Films)

Actors should not be rated directly as the main driver.
Their index is derived from the films they’re in, weighted by role and recency.

## 4.1 Actor Film Contribution
For each film credit:
Contribution = FilmIndex * RoleWeight * FilmRecencyWeight

RoleWeight:
- Lead: 1.0
- Supporting: 0.6
- Minor/Cameo: 0.3

FilmRecencyWeight:
`FR = exp(-daysSinceRelease / actor_half_life)`
Suggested actor_half_life: 540 days

## 4.2 Actor Index Formula
Let actor has films i=1..n

`ActorIndex = clamp( Σ(Contribution_i) / Σ(RoleWeight_i) , 0, 100 )`

Optional: include a “Career Quality” anchor that doesn’t decay, so legends don’t disappear:
`CareerAnchor = weighted_avg(BayesianFilmRating over top-k films)`
Then:
`ActorIndex = 0.75*ActorIndex + 0.25*CareerAnchor`

Use v1 without anchor if you want more movement.

---

# 5) Genre Index (Macro Layer)

Genre index is an aggregate of film indices, weighted by engagement.

For each genre g:
`GenreIndex = weighted_avg( FilmIndex, weight = Eng30 + 1 )`

Store daily snapshots for trend/volatility.

---

# 6) Anti-Gaming and Integrity

## 6.1 Vote Quality Controls
- Rate limit (already implemented)
- Captcha on write (already implemented)
- Cookie + IP fingerprint (already implemented)

## 6.2 Reputation Weighting (optional v2)
Logged-in users can gain “reputation” based on:
- account age
- consistent activity
- reports avoided
- community upvotes (if introduced)

Then weight votes:
`weighted_rating = Σ(rating * userWeight) / Σ(userWeight)`

## 6.3 Anomaly Detection (v2)
Flag films where:
- rating velocity spikes but external popularity does not move
- many ratings from similar fingerprints
- sudden large rating swings from low sample size

When flagged:
- dampen momentum component temporarily
- or require login to rate that film

---

# 7) UI/UX Outputs Driven by the Index

Moviethon should surface:
- Film price-like chart (Index over time)
- Momentum tag (Bullish/Neutral/Bearish)
  - Bullish if 7d moving average > 30d moving average
- Volatility tag (Stable/Moderate/High)
- Movers lists
- Explainability cards

Avoid:
- Buy/sell language
- Portfolio/shares framing

Use:
- Track
- Watchlist
- Compare
- Movers
- Trend

---

# 8) Recommended v1 Defaults (Simple + Strong)

If you want the smallest useful version:

Film Index = 70% Bayesian Rating + 30% Rating Velocity
ExternalScore = tiebreaker only

Then expand to engagement + external later.

---

# 9) Data to Store Daily

Minimum daily storage per movie:
- index_value
- rating_score
- velocity_score
- engagement_score
- external_score
- ratings_total
- ratings_7d
- comments_7d

This enables:
- ranking
- charts
- explainability
- debugging

---

# 10) What “Success” Looks Like

A user can:
- Go to a film and see a chart + why it moved
- See top gainers today and understand why
- Track actors and see derived momentum shift
- Compare genres like indices

Moviethon feels like a live cultural market dashboard powered by its community, not a static ratings site.
# Moviethon Vision

## Executive Summary

Moviethon is evolving from an actor-centric movie rating app into a film performance intelligence platform.

The goal is to build a proprietary, community-powered index system that tracks the cultural momentum of films, actors, genres, and studios over time.

Moviethon is not:
- A betting platform
- A fantasy trading simulator
- An IMDb clone

Moviethon is:
A dynamic performance analytics engine for film culture.

The product should feel closer to Bloomberg Terminal for film than a review website.

---

# Core Product Philosophy

1. Films are the foundational assets.
2. Actors inherit performance from films.
3. Community behavior drives momentum.
4. Time-series data enables trends, volatility, and rankings.
5. Moviethon Index is proprietary and central.

Everything in the system should reinforce this hierarchy.

Film → Actor → Genre → Studio

---

# Primary Objective

Introduce a Moviethon Index system powered by:

- Community ratings
- Rating velocity
- Engagement signals
- External data signals (TMDB/OMDb)
- Recency weighting

This index must:
- Update daily
- Be stored historically
- Power rankings and dashboards
- Drive all higher-level scoring

---

# Product Pillars

## 1. Film Index (Core Engine)

Every film receives a daily Moviethon Index score (0–100).

### Inputs:
- Bayesian-adjusted average rating
- Rating velocity (7d vs 30d growth)
- Engagement volume (ratings + comments)
- Recency weighting
- TMDB popularity delta

### Output:
- Current Index score
- 7-day change %
- 30-day trend
- Volatility classification

### Data Requirements:
New table: `film_index_history`
- movie_id
- index_value
- rating_component
- velocity_component
- external_component
- date

Cron job recalculates daily.

---

## 2. Actor Index (Derived Layer)

Actor Index is derived from film performance.

### Formula:
Actor Index = Σ (Film Index × role_weight × recency_decay)

Role weights:
- Lead = 1.0
- Supporting = 0.6
- Cameo = 0.3

Recent films weighted more heavily.

### Data Requirements:
New table: `actor_index_history`
- actor_id
- index_value
- volatility
- delta_7d
- date

---

## 3. Genre & Studio Indices (Macro Layer)

Aggregate film indices by:
- Genre
- Studio
- Franchise

This enables macro comparisons like:
- Horror +12% last 30 days
- Drama -4%
- Comedy flat

New table: `genre_index_history`

---

# Homepage Redesign

Replace "Featured Actor" model.

Homepage becomes Market Overview dashboard.

Sections:
- Top Gainers (24h)
- Top Decliners
- Most Volatile
- Trending Films
- Genre Performance

This reframes Moviethon as a living system.

---

# Community Layer Evolution

Current rating system is functional.

Enhancements:

1. Store timestamps for rating changes.
2. Calculate rating velocity.
3. Track engagement volume over time.
4. Add optional sentiment tags in future.

Community behavior must directly influence index movement.

---

# Time-Series Is Mandatory

Historical storage is non-negotiable.

Without time-series:
- No trend charts
- No volatility
- No momentum
- No correlation

Daily snapshots must be stored and queryable.

---

# Rankings Architecture

Introduce dedicated ranking routes:

/rankings/films  
/rankings/actors  
/rankings/genres  
/rankings/gainers  
/rankings/decliners  

These pages:
- Drive SEO
- Encourage habitual visits
- Surface index movement

---

# Volatility Classification

Use 30-day standard deviation of index values.

Classify:
- Stable
- Moderate
- High volatility

Volatility becomes a key differentiator.

---

# Product Phases

## Phase 1: Foundation
- Implement film_index_history
- Extend daily cron to compute index
- Add basic trend chart to film page
- Create /rankings/films

## Phase 2: Actor & Dashboard
- Implement actor_index_history
- Redesign homepage as Market Overview
- Add gainers/decliners feed
- Introduce volatility scoring

## Phase 3: Macro & Advanced
- Genre indices
- Studio indices
- Correlation engine
- Sentiment tagging
- Advanced analytics

---

# Strategic Positioning

Moviethon should be described as:

A cultural performance analytics platform powered by community intelligence.

Not:
A ratings website.

Not:
A fantasy trading app.

The Moviethon Index must become the central brand asset.

---

# Non-Goals

Do not:
- Introduce financial language like "buy", "sell", or "shares"
- Add real-money mechanics
- Complicate UX with speculative gambling features
- Over-prioritize individual actor pages over system-level dashboards

---

# Technical Direction

Leverage existing:
- Supabase
- Daily cron endpoint
- TMDB sync pipeline
- Rating infrastructure

Add:
- Index calculation module
- Historical storage tables
- Aggregation queries
- Ranking endpoints

No major architectural refactor required.

---

# Long-Term Vision

Moviethon becomes:

- The default reference for film momentum
- A source for weekly cultural performance insights
- A data layer others may want to reference
- A unique hybrid between analytics and community curation

The differentiator is proprietary scoring + time-series intelligence.

Everything should serve that direction.
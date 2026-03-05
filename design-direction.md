Moviethon Product & Design Specification

Version: v1
Design Direction: Bloomberg-style terminal with Moviethon purple accent
Font: Funnel Display
Density: Moderate

⸻

Core Product Identity

Moviethon is a cultural performance analytics platform powered by community intelligence.

It is NOT:
	•	A review site
	•	IMDb clone
	•	Fantasy trading simulator
	•	Betting platform

It IS:
	•	A performance index system
	•	Time-series intelligence platform
	•	Film-first hierarchy engine

Hierarchy model:
Film → Actor → Genre → Studio

Primary asset: Moviethon Index

⸻

Global Design System

Color System

Background: #0B0D10
Panel: #11151A
Border: #1C222A
Primary text: #E6E6E6
Secondary text: #8F98A3

Moviethon Purple (System Accent): #6C5CE7
Highlight Purple: #8B7CFF

Positive: #00C853
Negative: #FF3B30
Volatility Amber: #FF9500

Rules:
	•	Purple represents system authority and index identity.
	•	Green/red represent movement only.
	•	Index numbers remain white.
	•	No gradients or glow effects.

⸻

Typography

Font: Funnel Display

Weights:
400 – Body
500 – Labels
600 – Section headers
700 – Index numbers

Scale:
Hero Index: ~64px
Section headers: 20–24px
Table rows: 14–15px
Micro labels: 12px

⸻

Table Philosophy
	•	Tables are the core interface.
	•	Vertical grid lines enabled.
	•	Row height: 48–52px.
	•	Moderate density spacing.
	•	Sticky headers.
	•	Right-aligned numeric columns.
	•	Hover state: subtle charcoal shift only.

⸻

Homepage Layout

Section 1: Global Index + Trend

Layout: 5 / 7 split

Left:
	•	MOVIETHON INDEX label
	•	Primary index number (white)
	•	24H, 7D, 30D deltas
	•	Volatility badge

Right:
	•	Primary index time-series chart
	•	Toggle: 7D | 30D | 90D | 1Y
	•	Purple line only

Purpose:
Establish Moviethon as a time-series intelligence platform.

⸻

Section 2: Film Rankings Table (Primary Surface)

Columns:



Film (poster + title + year)
Index
24H Δ
7D Δ
30D Δ
Volatility
Trend (sparkline)

Default view: Top 25 by Index.

Filter tabs above table:
All | Gainers | Decliners | Volatile | Trending

⸻

Section 3: Actor Momentum Table

Columns:



Actor (circular image + name)
Index
7D Δ
Top Film
Volatility
Trend

Purpose:
Reinforce Film → Actor dependency.

⸻

Section 4: Genre Performance

Compact horizontal modules:
Genre
Index
7D Δ
Volatility
Sparkline

⸻

Section 5: Community Velocity Table

Columns:
Film
New Ratings (24H)
Rating Velocity
Comments (24H)

Purpose:
Reinforce community-driven movement.

⸻

Section 6: Index Methodology Strip

Short explanation of index inputs:
	•	Bayesian rating
	•	Engagement velocity
	•	Recency weighting
	•	External signals

Link to full methodology page.

⸻

Film Detail Page Layout

Page Purpose

The Film page is the primary analytical profile.
It must feel like a performance instrument panel.
It should be the most data-dense and trust-building page in the system.

⸻

Section 1: Film Header (Instrument Panel)

Layout: 6 / 6 split

Left:
	•	Poster (medium)
	•	Title
	•	Year
	•	Genre tags
	•	Studio

Right:
	•	Current Index (large, white)
	•	24H / 7D / 30D deltas
	•	Volatility classification
	•	Current Rank
	•	Rank Change (vs previous snapshot)

This section must immediately communicate:
Performance, movement, and positioning.

⸻

Section 2: Index History Chart (Primary Visual)

Full-width time-series chart.

Toggle:
7D | 30D | 90D | 1Y | All

Purple line.
Muted grid.
No area fill.

Overlay options (toggleable):
	•	Show Rank Position
	•	Show Rating Velocity

Below chart: Index Component Breakdown
	•	Rating Component %
	•	Velocity Component %
	•	External Component %

Display as horizontal percentage bars.

Purpose:
Make the proprietary index explainable and transparent.

⸻

Section 3: Historical Rank Position Chart

Secondary chart.

Inverted Y-axis (Rank 1 at top).

Shows rank position over time.

This reinforces:
	•	Competitive movement
	•	Relative performance
	•	Time-series intelligence depth

Small contextual note:
“Rank reflects position among all tracked films on each snapshot date.”

⸻

Section 4: Performance Snapshot Table

Columns:
Date
Index
Rank
24H Δ
Rating Score
Velocity Score
External Score

Paginated historical records.

Purpose:
Snapshot transparency.
Verifiable performance history.

⸻

Section 5: Peer Comparison Table

Title:
Comparable Films

Logic:
Films within close index range OR similar volatility profile.

Columns:
Film
Index
7D Δ
Volatility
Rank

Small poster in first column.

Optional mini comparison chart toggle:
“Compare Selected”

Allows overlay of up to 3 films on index chart.

Purpose:
Contextualizes performance.
Encourages exploration.

⸻

Section 6: Actor Contribution

Table:
Actor
Role
Weight
Derived Actor Impact

Shows how this film contributes to actor index.

Reinforces hierarchy:
Film → Actor

⸻

Section 7: Community Activity

Metrics panel:
	•	New Ratings (24H)
	•	Rating Velocity (7D vs 30D)
	•	Comment Volume (24H)

Mini sparkline for engagement trend.

This reinforces:
Community behavior drives movement.

⸻

Section 8: Related Index Movement

Small panel:
“Also Moving”

Lists films with similar directional movement in last 7 days.

Purpose:
Encourage system-level browsing.

⸻

Actor Detail Page Layout

Page Purpose

The Actor page is a derived performance profile.
It must clearly communicate that actor performance is inherited from film performance.

This page should feel analytical and secondary to the Film page.

⸻

Section 1: Actor Header

Layout: 6 / 6 split

Left:
	•	Circular headshot (medium)
	•	Actor Name
	•	Active Years
	•	Primary Genres (top 3 by contribution)

Right:
	•	Current Actor Index (large, white)
	•	7D / 30D Δ
	•	Volatility classification
	•	Current Rank among actors
	•	Rank Change (vs previous snapshot)

Purpose:
Immediate performance positioning.

⸻

Section 2: Actor Index History Chart

Full-width time-series chart.

Toggle:
7D | 30D | 90D | 1Y | All

Purple line.
Muted grid.
No fill.

Optional overlay toggle:
“Show Top Film Impact”

Displays contribution spikes from major film releases.

Purpose:
Reinforce time-series performance intelligence.

⸻

Section 3: Film Contribution Table (Core Section)

Title:
Film Performance Contribution

Columns:
Film
Role
Film Index
Weight
Contribution %
Film 7D Δ

Small poster in Film column.

Sorted by Contribution % descending.

Purpose:
Make clear that Actor Index is the sum of weighted film performance.

⸻

Section 4: Historical Snapshot Table

Columns:
Date
Actor Index
Rank
7D Δ
Volatility

Paginated historical records.

Purpose:
Transparency and longitudinal credibility.

⸻

Section 5: Peer Comparison (Actors)

Title:
Comparable Actors

Logic:
Actors within similar index range or volatility profile.

Columns:
Actor
Index
7D Δ
Volatility
Rank

Optional:
Compare Selected (overlay index lines on chart).

Purpose:
Encourage comparative exploration.

⸻

Section 6: Genre Exposure Breakdown

Compact module:
Genre
% Contribution
Average Film Index

Shows how actor performance distributes across genres.

Purpose:
Macro-level context.

⸻

Section 7: Related Momentum

“Actors Also Moving”

Lists actors with similar directional movement in last 7 days.

Encourages system browsing.

⸻

Genre Detail Page Layout

Page Purpose

The Genre page represents the macro performance layer.
It aggregates film indices into a sector-level view.

It must feel analytical, comparative, and system-wide.

⸻

Section 1: Genre Header

Layout: 6 / 6 split

Left:
	•	Genre Name
	•	Number of Active Films
	•	% of Total Tracked Films

Right:
	•	Current Genre Index (large, white)
	•	7D / 30D Δ
	•	Volatility classification
	•	Current Rank among genres
	•	Rank Change (vs previous snapshot)

Purpose:
Immediate macro positioning.

⸻

Section 2: Genre Index History Chart

Full-width time-series chart.

Toggle:
7D | 30D | 90D | 1Y | All

Purple line.
Muted grid.
No fill.

Optional overlay toggle:
“Compare to Overall Index”

Displays Moviethon Global Index alongside Genre Index.

Purpose:
Show relative outperformance or underperformance.

⸻

Section 3: Top Films in Genre

Primary table for genre page.

Columns:
Rank (within genre)
Film
Film Index
7D Δ
Volatility
Overall Rank
Trend

Small poster in Film column.

Default: Top 25 within genre.

Purpose:
Surface leaders driving genre performance.

⸻

Section 4: Genre Performance Snapshot

Auto-generated insights block.

Examples:
	•	3 of the top 10 overall films are from this genre.
	•	Average 7D index growth within genre: +2.1%.
	•	Volatility trend increasing over last 30 days.

Neutral, data-driven language only.

⸻

Section 5: Volatility Distribution

Compact visual module.

Breakdown:
Stable %
Moderate %
High %

Based on 30-day standard deviation classification.

Purpose:
Show risk/consistency profile of genre.

⸻

Section 6: Actor Exposure in Genre

Table:
Actor
Genre Contribution %
Average Film Index in Genre
Actor Index

Sorted by influence within genre.

Purpose:
Show cross-layer interaction between actors and genre.

⸻

Section 7: Related Genre Movement

“Also Trending Genres”

Lists genres with similar directional movement in last 7 days.

Encourages macro exploration.

⸻

Methodology Deep Dive Page

Page Purpose

The Methodology page establishes authority, transparency, and credibility.

It explains how the Moviethon Index works without revealing precise weighting coefficients.

Tone: Institutional, precise, analytical.
No marketing language.
No hype.

⸻

Section 1: Overview

Headline:
Understanding the Moviethon Index

Intro paragraph:
The Moviethon Index is a daily recalculated performance score designed to measure cultural momentum across films, actors, genres, and studios.

It combines structured community signals with external performance indicators and time-based weighting.

⸻

Section 2: Core Components

Structured explanation of inputs:

1. Rating Quality Component
	•	Bayesian-adjusted average rating
	•	Confidence-weighted to reduce distortion from low sample sizes
	•	Designed to reward sustained quality

2. Engagement & Velocity Component
	•	Rating submission velocity (7-day vs 30-day acceleration)
	•	Comment activity trends
	•	Participation growth rate

Measures directional momentum rather than static popularity.

3. Recency Weighting
	•	More recent activity carries greater influence
	•	Prevents historical peaks from dominating current performance
	•	Ensures index reflects present cultural movement

4. External Signals
	•	Structured popularity deltas from external data sources
	•	Cross-platform activity normalization

Designed as a contextual signal, not a dominant factor.

⸻

Section 3: Index Calculation Framework

Conceptual formula structure (no coefficients revealed):

Index = f(
Rating Quality,
Engagement Velocity,
Recency Weighting,
External Signals
)

Clarify:
	•	Each component is normalized
	•	Components are dynamically scaled
	•	Final score is mapped to a 0–100 range

Do NOT expose precise weighting percentages.

⸻

Section 4: Time-Series Architecture

Explain:
	•	Index recalculated daily
	•	Historical snapshots stored
	•	Enables trend analysis
	•	Enables volatility classification
	•	Enables ranking comparisons over time

Reinforce that time-series storage is foundational to the system.

⸻

Section 5: Volatility Classification

Explain methodology conceptually:
	•	Based on 30-day standard deviation of index values
	•	Classified into Stable / Moderate / High

Clarify purpose:
Volatility measures performance variability, not quality.

⸻

Section 6: Hierarchical Structure

Explain structural dependency:

Film → Actor → Genre → Studio
	•	Film Index is primary
	•	Actor Index derived from weighted film contributions
	•	Genre Index aggregated from constituent films

This clarifies system integrity without revealing math.

⸻

Section 7: Update Frequency

Explain:
	•	Index recalculated daily
	•	Snapshot recorded historically
	•	Ranking changes reflect snapshot-to-snapshot comparison

If intraday hybrid model is implemented, this section can be updated accordingly.

⸻

Section 8: What the Index Is Not

Clarify boundaries:
	•	Not a box office metric
	•	Not a review score
	•	Not a financial instrument
	•	Not predictive

It measures structured cultural performance momentum.

⸻

Pending Technical Decisions

Data Refresh Strategy

Option 1: Intraday live updates
Option 2: Daily recalculated snapshot
Option 3: Hybrid (stable index + live activity metrics)

Engineering to determine feasibility.

⸻

Design Principles Summary

Data Refresh Strategy

Option 1: Intraday live updates
Option 2: Daily recalculated snapshot
Option 3: Hybrid (stable index + live activity metrics)

Engineering to determine feasibility.

⸻

Design Principles Summary
	1.	Index is the hero.
	2.	Tables dominate over tiles.
	3.	Purple signals system authority.
	4.	Movement colors are separate.
	5.	Time-series visibility is mandatory.
	6.	No cinematic fluff.
	7.	Moderate density for clarity.

⸻

Next Pages To Define:
	•	Rankings Page Template
	•	Actor Detail Page
	•	Genre Detail Page
	•	Search Results Page
	•	Methodology Deep Dive Page
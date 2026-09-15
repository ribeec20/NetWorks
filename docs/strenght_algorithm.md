# NetWorks — Relationship Strength Model: Research Foundation

## Purpose

This document compiles the academic research underpinning NetWorks's relationship strength algorithm. The model uses five user-facing inputs (tenure, recency, frequency, depth, ongoing builders) plus an optional user self-assessment override. User overrides will serve as labeled training data to tune model parameters as the user base grows.

---

## 1. Theoretical Foundation: Granovetter's Tie Strength (1973)

**Paper:** Granovetter, M. S. (1973). "The Strength of Weak Ties." *American Journal of Sociology*, 78(6), 1360–1380.

**Core definition:** Tie strength is "a (probably linear) combination of the amount of time, the emotional intensity, the intimacy (mutual confiding), and the reciprocal services which characterize the tie" (p. 1361).

**Granovetter's four dimensions:**

| Granovetter Dimension | NetWorks Factor | Notes |
|---|---|---|
| Amount of time | Tenure + Frequency | Granovetter treated time as a single dimension; we split it into how long you've known someone (tenure) and how often you interact (frequency), which allows for more nuanced modeling. |
| Emotional intensity | Depth | Captured via interaction type weights (coffee > email) and user override. |
| Intimacy (mutual confiding) | Depth + Notes | The interaction notes feature captures qualitative depth; interaction type serves as a proxy for intimacy level. |
| Reciprocal services | Ongoing Builders | Shared projects, working relationships, and mutual professional support map to ongoing strength builders. |

**Key theoretical insight:** Granovetter's weak ties hypothesis states that the stronger the tie between two people, the higher the fraction of friends they share. This supports using mutual connections (structural overlap) as an additional signal in future versions of the strength algorithm.

**Relevance to NetWorks:** Granovetter's framework validates our multi-factor composite approach. His suggestion that the combination is "probably linear" gives us a reasonable starting point (weighted linear sum), while user override data will reveal whether nonlinear interactions between factors improve accuracy.

---

## 2. Predictive Model: Gilbert & Karahalios (2009)

**Paper:** Gilbert, E. & Karahalios, K. (2009). "Predicting Tie Strength with Social Media." *Proceedings of the SIGCHI Conference on Human Factors in Computing Systems (CHI '09)*, 211–220.

**What they did:** Built a predictive model mapping Facebook interaction data to tie strength using over 2,000 social media ties and 70+ variables across seven dimensions. The model distinguished strong from weak ties with over 85% accuracy.

**Seven dimensions tested:**

1. Intensity (e.g., number of inbox messages, wall posts)
2. Intimacy (e.g., private vs. public communication)
3. Duration (e.g., how long the friendship has existed)
4. Reciprocal services (e.g., mutual tagging, sharing)
5. Structural (e.g., mutual friends, network overlap)
6. Emotional support (e.g., supportive language in messages)
7. Social distance (e.g., demographic similarity)

**Relative contribution to prediction accuracy:**

| Dimension | Variance Explained |
|---|---|
| Intimacy | 32.8% |
| Intensity | 19.7% |
| Duration | 16.5% |
| Reciprocal services | ~12% |
| Structural | ~10% |
| Emotional support | ~6% |
| Social distance | ~3% |

**Key findings for NetWorks:**

- **Intimacy dominates.** The qualitative nature of interactions matters more than raw count. This supports weighting our depth factor heavily — a 2-hour coffee meeting should contribute substantially more than 10 LinkedIn messages.
- **Duration is the third strongest predictor.** Validates tenure as a core factor in our model with ~20% weight.
- **Intensity (frequency) matters but less than intimacy.** Supports our decision to weight frequency below depth.
- **Structural overlap is meaningful (~10%).** While not in our v1 algorithm, mutual connections should be considered for v2.
- **Social distance (demographics) barely matters.** We can safely ignore demographic similarity.

**Recommended initial weight mapping based on Gilbert & Karahalios:**

| NetWorks Factor | Suggested Initial Weight | Justification |
|---|---|---|
| Depth | 25% | Maps to intimacy (32.8%) — strongest predictor |
| Recency | 20% | Not directly measured by G&K but critical for a personal tool where users need actionable nudges |
| Tenure | 20% | Maps to duration (16.5%) |
| Frequency | 15% | Maps to intensity (19.7%), slightly reduced because our depth factor already partially captures this |
| Ongoing Builders | 20% | Maps to reciprocal services (~12%) + structural factors; weighted higher because persistent shared context (co-workers, project collaborators) is a stronger signal in professional networks than in Facebook friendships |

**Note:** These weights are starting points. User override data will be used to optimize them over time. The Gilbert & Karahalios model was trained on Facebook data (skewing personal/social); professional networking may weight duration and ongoing builders more heavily.

---

## 3. Latent Variable Approach: Xiang, Neville & Rogati (2010)

**Paper:** Xiang, R., Neville, J., & Rogati, M. (2010). "Modeling Relationship Strength in Online Social Networks." *Proceedings of the 19th International Conference on World Wide Web (WWW '10)*, 981–990.

**What they did:** Developed an unsupervised latent variable model that infers relationship strength as a hidden variable conditioned on observable features (profile similarity, interaction frequency, mutual connections). Tested on the Purdue Facebook network (4,500 users, 144,712 pairs).

**Key model insight:** Relationship strength is treated as a latent variable that *generates* observable interactions, rather than being directly measured by them. The model uses:

- Profile similarity features (shared networks, groups, friends)
- Interaction activity (messages, wall posts, tagging)
- A coordinate ascent optimization procedure for inference

**Results:** The latent variable model outperformed six alternative approaches including raw friendship graphs, interaction counts, and profile similarity heuristics on classification tasks.

**Relevance to NetWorks:**

- Validates the concept that strength is a hidden composite variable inferred from observable signals — exactly our approach.
- Our user strength override feature is extremely valuable in this context: it provides *labeled data* for the latent variable, which Xiang et al. did not have. This means we can eventually move from a heuristic weighted sum to a trained model.
- The homophily principle (similar people form stronger ties) suggests that shared tags, industry, or role similarity could be useful features in future versions.

**Future opportunity:** Once we have sufficient user overrides (target: 1,000+ rated relationships across users), we can train a regression model where the user override is the target variable and our five factors are features. This would empirically learn the optimal weights rather than relying on literature-derived estimates.

---

## 4. Relationship Decay Dynamics: Roberts & Dunbar (2015)

**Paper:** Roberts, S. G. B. & Dunbar, R. I. M. (2015). "Managing Relationship Decay: Network, Gender, and Contextual Effects." *Human Nature*, 26, 426–450.

**What they did:** Tracked entire active personal networks of high school students over 18 months during a major life transition (school to university/work). Measured changes in relationship quality, contact frequency, and network composition.

**Key findings:**

- **Relationships naturally decay without maintenance.** Friendship quality declined significantly over 18 months when effort was not invested.
- **Family ties are resilient; friendships are not.** Family relationships showed minimal decay regardless of contact frequency. Friendships required active maintenance to prevent decline.
- **Contact frequency mitigates decay, but differently by type.** Increased contact frequency (talking) prevented decline for some relationships, while shared activities prevented decline for others.
- **Network structure is layered.** Social networks consist of concentric circles of decreasing emotional quality (Dunbar's layers: ~5 intimate, ~15 close, ~50 friends, ~150 acquaintances). Ties at different layers decay at different rates.
- **Time is an inelastic resource.** Maintaining relationships has real costs, and people implicitly make trade-offs about which relationships to invest in.

**Direct implications for NetWorks's decay model:**

1. **Decay rate must be modulated by tenure.** A new contact (< 6 months) should decay rapidly without interaction. A 5-year colleague should decay very slowly. This is the core insight that differentiates our model from simple "days since last contact" approaches.

2. **Ongoing builders act as anti-decay.** The Roberts & Dunbar finding that shared activities prevent relationship decline directly maps to our ongoing builders feature. Working together, sharing a project, or being in the same organization provides continuous passive maintenance.

3. **Different relationship types should eventually have different decay curves.** Professional mentors may decay differently than conference acquaintances. V1 uses a uniform decay function modulated by tenure; future versions could use relationship-type-specific curves.

**Proposed decay function:**

```
decay_rate = base_rate * e^(-k * tenure_years)
```

Where:
- `base_rate` = maximum decay rate for brand-new contacts (e.g., 0.05 per day)
- `k` = tenure dampening coefficient (higher = slower decay for long relationships)
- `tenure_years` = years since dateFirstMet
- Active ongoing builders reduce the effective decay_rate further (e.g., by 50-80% depending on hours/week)

This produces the desired behavior:
- New contact, no interaction for 2 weeks → noticeable strength drop
- 5-year colleague, no interaction for 2 months → barely any change
- Active co-worker with ongoing builder → essentially zero decay

---

## 5. Temporal Decay Functions in Relational Event Networks (2023)

**Paper:** Mulder, J. & Leenders, R. (2023). "How fast do we forget our past social interactions? Understanding memory retention with parametric decays in relational event models." *Network Science*, Cambridge University Press.

**What they did:** Introduced three parametric weight decay functions (exponential, linear, and step-wise) for modeling how past interactions influence current relationship dynamics. Used Bayesian methods to determine which decay shape best fits observed interaction sequences.

**Key findings:**

- **Exponential decay is the most common best fit** for social interaction data, but the optimal rate varies significantly by context.
- **Recent events matter more than distant ones**, but the rate at which this importance drops off is highly variable.
- **The decay parameter should be estimated from data**, not assumed. Pre-specified decay rates often yield biased results.

**Implications for NetWorks:**

- Start with exponential decay (well-supported default).
- The decay rate parameter (`k` in our formula) should eventually be learned from user override data rather than hard-coded.
- Different users may have different natural decay rates — a power networker who meets 20 people/week has a different baseline than someone who meets 2 people/month. User overrides will help capture this.

---

## 6. Additional References

### Burt, R. S. (2000). "Decay Functions." *Social Networks*, 22, 1–28.

Studies how relationships decay over time as a function of structural position. Relationships that bridge between groups (structural holes) decay differently than relationships within tight clusters. Relevant to the referral → direct connection transition in NetWorks.

### Burt, R. S. (2002). "Bridge Decay." *Social Networks*, 24, 333–363.

Extends the decay analysis to bridging ties specifically. Finds that bridge ties (connections between otherwise disconnected groups) are more fragile and decay faster. This supports treating referral-based connections as inherently weaker until reinforced by direct interaction.

### Mattie, H. et al. (2018). Heuristic methods using structural features (degree, clustering coefficients, overlap) as tie strength predictors.

Suggests that graph-structural features can predict tie strength even without interaction data. Relevant for NetWorks's mutual connections feature — the more shared connections two people have, the stronger and more resilient their tie is likely to be.

### Lin, N., Dayton, P. W., & Greenwald, P. (1978). Measuring tie strength in terms of recency of contacts.

One of the earliest proposals for using recency as a tie strength measure. Proposed an exponential decay weighting where more recent contacts receive higher weight. Foundational for our recency factor.

### Marsden, P. V. & Campbell, K. E. (1984). Measuring tie strength.

Argued that "closeness" or emotional intensity is the single best indicator of tie strength, more so than frequency or duration alone. Supports our relatively high weight on the depth factor.

---

## 7. Composite Strength Formula — V1 Specification

Based on the research above, the initial strength formula is a weighted linear combination:

```
S = (w_T * T) + (w_R * R) + (w_F * F) + (w_D * D) + (w_B * B)
```

Where:
- **S** = composite strength score (0–100)
- **T** = tenure score (0–100), logarithmic scale capped at ~10 years
- **R** = recency score (0–100), exponential decay from last interaction, modulated by tenure
- **F** = frequency score (0–100), rolling 90-day interaction count, normalized
- **D** = depth score (0–100), weighted average of interaction type multipliers over recent window
- **B** = ongoing builder score (0–100), based on active builders and their intensity

### Initial Weights (Literature-Derived)

| Factor | Weight | Source Justification |
|---|---|---|
| Tenure (w_T) | 0.20 | Gilbert & Karahalios: duration = 16.5% of variance |
| Recency (w_R) | 0.20 | Lin et al. 1978; Mulder & Leenders 2023 |
| Frequency (w_F) | 0.15 | Gilbert & Karahalios: intensity = 19.7%, partially captured by depth |
| Depth (w_D) | 0.25 | Gilbert & Karahalios: intimacy = 32.8% (top predictor); Marsden & Campbell 1984 |
| Ongoing Builders (w_B) | 0.20 | Roberts & Dunbar 2015: shared activities prevent decay; Granovetter: reciprocal services |

### Recency Decay with Tenure Modulation

```
R = 100 * e^(-λ(T) * days_since_last_interaction)

λ(T) = λ_base * e^(-k * tenure_years)
```

Where:
- `λ_base` = base decay rate (suggested: 0.03, meaning ~50% decay at ~23 days for new contacts)
- `k` = tenure dampening (suggested: 0.3, meaning a 5-year relationship decays ~4.5x slower)

### Interaction Depth Multipliers

| Interaction Type | Depth Multiplier | Justification |
|---|---|---|
| message | 1.0x | Baseline — low intimacy |
| email | 1.2x | Slightly more effort than a message |
| call | 2.0x | Voice = higher intimacy (Gilbert: private communication) |
| video_call | 2.2x | Voice + face |
| coffee_lunch | 3.0x | In-person casual = high intimacy |
| meeting | 2.5x | Formal but in-person |
| event | 1.5x | Group setting, lower individual intimacy |
| collaboration | 4.0x | Deep shared work = highest intimacy + reciprocal services |
| other | 1.5x | Default moderate |

### Ongoing Builder Contribution

```
B = min(100, Σ (builder_weight_i))

builder_weight_i = base_builder_value + (hours_per_week_i * intensity_multiplier)
```

Where:
- `base_builder_value` = 30 (having any active shared context is significant)
- `intensity_multiplier` = 3 per hour/week (capped at hours_per_week = 20)
- Multiple builders stack but cap at 100

---

## 8. Parameter Tuning Strategy

### Phase 1: Literature-Derived Defaults (Launch)
- Use the weights and parameters specified above.
- Ship with sensible defaults that feel reasonable to users.

### Phase 2: Collect User Override Data
- Every user strength override creates a labeled data point: (five factor values) → (user-perceived strength).
- Store overrides with timestamps and current computed scores for analysis.

### Phase 3: Empirical Weight Optimization (Post-Launch, ~1,000+ overrides)
- Train a regression model: user_override ~ f(tenure, recency, frequency, depth, builders).
- Compare linear vs. nonlinear (e.g., random forest) models.
- Segment by relationship type if sufficient data exists.
- Update default weights based on findings.
- Consider per-user personalization if individual users provide enough overrides.

### Phase 4: Continuous Learning
- Monitor drift between computed scores and user overrides over time.
- A/B test weight changes on user engagement metrics (interaction logging frequency, retention).
- Explore adding structural overlap (mutual connections) as a sixth factor if graph density supports it.

---

## 9. Key Takeaways for Implementation

1. **Start simple, tune with data.** The weighted linear sum with literature-derived weights is a defensible v1. Don't over-engineer the algorithm before you have user data.

2. **Tenure-modulated recency is the killer feature.** No existing personal CRM does this. It's well-supported by Dunbar's research and matches real-world intuition.

3. **Depth > frequency.** Weight interaction quality over raw count. One deep collaboration session should move the needle more than 10 quick messages.

4. **Ongoing builders are anti-decay mechanisms.** They provide continuous passive maintenance, mapping directly to Roberts & Dunbar's finding that shared activities prevent relationship decline.

5. **User overrides are gold.** They serve dual purpose: improving individual accuracy immediately, and providing training data for global model improvement over time.

6. **The referral → direct transition maps to bridge decay theory.** Burt's research shows bridging ties are inherently fragile — this supports requiring substantial direct interaction before flipping a referral to a direct connection.
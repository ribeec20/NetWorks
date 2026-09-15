"""
NetWorks Strength Algorithm Simulator

Simulates how relationship strength evolves over time under different
interaction patterns and starting conditions. Outputs matplotlib charts.

Usage:
    python simulations/simulate.py

Edit the SCENARIOS list at the bottom to define your own simulations.
"""

import sys
import os
from dataclasses import dataclass, field
from typing import Optional

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

# Add functions/ to path so we can import the real algorithm
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "functions"))

from algorithm.constants import WEIGHTS, DEPTH_MULTIPLIERS, MS_PER_DAY, MS_PER_YEAR
from algorithm.strength import compute_strength

OUT_DIR = os.path.join(os.path.dirname(__file__), "output")

# ── Simulation primitives ────────────────────────────────────────────────────

@dataclass
class SimInteraction:
    """A scheduled interaction event."""
    day: int                    # Day offset from simulation start
    type: str = "message"       # InteractionType

@dataclass
class SimBuilder:
    """An ongoing builder active during a time range."""
    label: str
    hours_per_week: float = 4.0
    start_day: int = 0
    end_day: Optional[int] = None  # None = still active at sim end

@dataclass
class Scenario:
    """A complete simulation scenario."""
    name: str
    tenure_years: float = 1.0         # How long you've known them at day 0
    is_direct: bool = True
    interactions: list = field(default_factory=list)  # List[SimInteraction]
    builders: list = field(default_factory=list)      # List[SimBuilder]
    sim_weeks: int = 100              # How many weeks to simulate


def generate_periodic_interactions(
    interval_weeks: int,
    interaction_type: str,
    start_week: int = 0,
    end_week: int = 100,
) -> list[SimInteraction]:
    """Helper: generate interactions every N weeks."""
    return [
        SimInteraction(day=w * 7, type=interaction_type)
        for w in range(start_week, end_week + 1, interval_weeks)
    ]


def run_scenario(scenario: Scenario) -> list[dict]:
    """Run a scenario and return weekly strength snapshots (matches recalc cadence)."""
    sim_start_ms = 1_700_000_000_000  # Fixed reference point
    ms_per_week = MS_PER_DAY * 7

    date_first_met = sim_start_ms - int(scenario.tenure_years * MS_PER_YEAR)

    interaction_dicts = []
    for si in scenario.interactions:
        interaction_dicts.append({
            "id": f"sim-{si.day}-{si.type}",
            "contactId": "sim-contact",
            "date": sim_start_ms + si.day * MS_PER_DAY,
            "type": si.type,
            "notes": "",
            "duration": None,
            "createdAt": sim_start_ms,
        })

    builder_dicts = []
    for sb in scenario.builders:
        builder_dicts.append({
            "id": f"sim-builder-{sb.label}",
            "contactId": "sim-contact",
            "label": sb.label,
            "hoursPerWeek": sb.hours_per_week,
            "startDate": sim_start_ms + sb.start_day * MS_PER_DAY,
            "endDate": (sim_start_ms + sb.end_day * MS_PER_DAY) if sb.end_day is not None else None,
            "createdAt": sim_start_ms,
        })

    results = []
    for week in range(scenario.sim_weeks + 1):
        now = sim_start_ms + week * ms_per_week
        current_interactions = [i for i in interaction_dicts if i["date"] <= now]

        contact = {
            "id": "sim-contact",
            "dateFirstMet": date_first_met,
            "dateAdded": sim_start_ms,
            "userStrengthOverride": None,
        }

        result = compute_strength(
            contact, current_interactions, builder_dicts, scenario.is_direct, now
        )

        results.append({
            "week": week,
            "score": result.score,
            "factors": result.factors,
            "transition": result.should_transition_to_direct,
        })

    return results


# ── Matplotlib rendering ─────────────────────────────────────────────────────

FACTOR_COLORS = {
    "tenure": "#6366f1",
    "recency": "#f59e0b",
    "frequency": "#10b981",
    "depth": "#ef4444",
    "builders": "#8b5cf6",
}


def plot_comparative(scenarios: list[Scenario], all_results: list[list[dict]]) -> plt.Figure:
    """Main comparison chart: all scenarios on one plot."""
    fig, ax = plt.subplots(figsize=(14, 7))

    for scenario, results in zip(scenarios, all_results):
        weeks = [r["week"] for r in results]
        scores = [r["score"] for r in results]
        line, = ax.plot(weeks, scores, linewidth=2.2, label=scenario.name)

        # Mark transition points
        for r in results:
            if r["transition"]:
                ax.plot(r["week"], r["score"], "^", color=line.get_color(),
                        markersize=10, zorder=5)
                break  # Only mark the first transition

    ax.set_xlim(0, max(s.sim_weeks for s in scenarios))
    ax.set_ylim(0, 100)
    ax.set_xlabel("Weeks", fontsize=12)
    ax.set_ylabel("Strength Score", fontsize=12)
    ax.set_title("Relationship Strength Over Time (Weekly Recalc)", fontsize=15, fontweight="bold")
    ax.legend(loc="upper left", fontsize=9, framealpha=0.9)
    ax.grid(True, alpha=0.3)
    ax.axhline(y=40, color="gray", linestyle="--", alpha=0.5, label="Direct threshold")
    ax.yaxis.set_major_locator(ticker.MultipleLocator(10))
    ax.xaxis.set_major_locator(ticker.MultipleLocator(10))
    fig.tight_layout()
    return fig


def plot_factor_breakdown(scenario: Scenario, results: list[dict]) -> plt.Figure:
    """Stacked area chart showing each factor's weighted contribution over time."""
    weeks = [r["week"] for r in results]

    weighted = {}
    for factor_name in ["tenure", "recency", "frequency", "depth", "builders"]:
        weighted[factor_name] = [
            r["factors"][factor_name] * WEIGHTS[factor_name] * 100
            for r in results
        ]

    fig, (ax_top, ax_bot) = plt.subplots(2, 1, figsize=(14, 9), height_ratios=[2, 1])

    # Top: stacked area
    factor_order = ["tenure", "builders", "depth", "frequency", "recency"]
    bottoms = [0.0] * len(weeks)
    for factor_name in factor_order:
        values = weighted[factor_name]
        ax_top.fill_between(weeks, bottoms, [b + v for b, v in zip(bottoms, values)],
                            alpha=0.7, label=f"{factor_name} ({WEIGHTS[factor_name]:.0%})",
                            color=FACTOR_COLORS[factor_name])
        bottoms = [b + v for b, v in zip(bottoms, values)]

    # Overlay the actual score line (post-decay)
    scores = [r["score"] for r in results]
    ax_top.plot(weeks, scores, color="black", linewidth=2, linestyle="--",
                label="Final score (after decay)", zorder=5)

    ax_top.set_xlim(0, scenario.sim_weeks)
    ax_top.set_ylim(0, 100)
    ax_top.set_ylabel("Strength Score", fontsize=11)
    ax_top.set_title(f"Factor Breakdown: {scenario.name}", fontsize=14, fontweight="bold")
    ax_top.legend(loc="upper left", fontsize=9, framealpha=0.9)
    ax_top.grid(True, alpha=0.3)
    ax_top.axhline(y=40, color="gray", linestyle=":", alpha=0.5)
    ax_top.xaxis.set_major_locator(ticker.MultipleLocator(10))

    # Bottom: individual factor lines (raw 0-1 scale)
    for factor_name in factor_order:
        raw = [r["factors"][factor_name] for r in results]
        ax_bot.plot(weeks, raw, linewidth=1.8, label=factor_name,
                    color=FACTOR_COLORS[factor_name])

    ax_bot.set_xlim(0, scenario.sim_weeks)
    ax_bot.set_ylim(0, 1.05)
    ax_bot.set_xlabel("Weeks", fontsize=11)
    ax_bot.set_ylabel("Raw Factor (0-1)", fontsize=11)
    ax_bot.legend(loc="upper left", fontsize=9, ncol=5, framealpha=0.9)
    ax_bot.grid(True, alpha=0.3)
    ax_bot.xaxis.set_major_locator(ticker.MultipleLocator(10))

    fig.tight_layout()
    return fig


# ── Built-in scenarios ───────────────────────────────────────────────────────

SCENARIOS = [
    # 1. New contact, weekly coffee meetings for 100 weeks
    Scenario(
        name="New contact - weekly coffee",
        tenure_years=0.1,
        interactions=generate_periodic_interactions(1, "coffee_lunch", 0, 100),
    ),

    # 2. Old colleague, no new interactions (pure decay over ~2 years)
    Scenario(
        name="5yr colleague - going silent",
        tenure_years=5.0,
        interactions=[],
    ),

    # 3. Referral contact, gradual engagement -> transition
    Scenario(
        name="Referral - building to direct",
        tenure_years=0.5,
        is_direct=False,
        interactions=(
            generate_periodic_interactions(2, "email", 0, 20)        # biweekly emails for 20 weeks
            + generate_periodic_interactions(1, "call", 20, 50)      # weekly calls weeks 20-50
            + generate_periodic_interactions(1, "coffee_lunch", 50, 80)  # weekly coffee weeks 50-80
            # then silence for the remaining weeks
        ),
    ),

    # 4. Active coworker with builder, meetings stop at week 40
    Scenario(
        name="Coworker with active builder",
        tenure_years=2.0,
        interactions=generate_periodic_interactions(2, "meeting", 0, 40),
        builders=[SimBuilder(label="Shared project", hours_per_week=6)],
    ),

    # 5. Conference contact, one burst then silence
    Scenario(
        name="Conference contact - burst then silent",
        tenure_years=0.0,
        interactions=[
            SimInteraction(day=0, type="event"),
            SimInteraction(day=0, type="coffee_lunch"),
            SimInteraction(day=1, type="collaboration"),
            SimInteraction(day=2, type="email"),
            # Then nothing for ~2 years
        ],
    ),

    # 6. Long-term mentor, monthly deep check-ins
    Scenario(
        name="Mentor - monthly deep check-ins",
        tenure_years=3.0,
        interactions=generate_periodic_interactions(4, "video_call", 0, 100),
        builders=[SimBuilder(label="Mentorship", hours_per_week=1)],
    ),
]


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    # Run all scenarios
    all_results = []
    for scenario in SCENARIOS:
        all_results.append(run_scenario(scenario))

    # 1. Comparative chart
    fig = plot_comparative(SCENARIOS, all_results)
    path = os.path.join(OUT_DIR, "comparative.png")
    fig.savefig(path, dpi=150)
    print(f"Saved: {path}")
    plt.close(fig)

    # 2. Per-scenario factor breakdowns
    for scenario, results in zip(SCENARIOS, all_results):
        fig = plot_factor_breakdown(scenario, results)
        safe_name = scenario.name.lower().replace(" ", "_").replace("-", "")
        path = os.path.join(OUT_DIR, f"factors_{safe_name}.png")
        fig.savefig(path, dpi=150)
        print(f"Saved: {path}")
        plt.close(fig)

    print(f"\nAll charts saved to {OUT_DIR}/")

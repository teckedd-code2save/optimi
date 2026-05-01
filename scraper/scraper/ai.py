"""
OpenAI integration for the Optimi AI Assistant.

Requires the ``OPENAI_API_KEY`` environment variable to be set.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy import so the module loads even when OpenAI is not installed
try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore[misc,assignment]


def _get_client() -> "OpenAI":
    if OpenAI is None:
        raise RuntimeError(
            "OpenAI package not installed. Run: pip install openai"
        )
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY environment variable not set."
        )
    return OpenAI(api_key=api_key)


# ---------------------------------------------------------------------------
# Prompt builders — designed for competitive, winning-quality applications
# ---------------------------------------------------------------------------

def _build_system_prompt() -> str:
    return (
        "You are an elite application strategist who has helped teams win "
        "Y Combinator, ETHGlobal, NSF grants, and FAANG roles. You write "
        "with conviction, specificity, and narrative force. Every sentence "
        "earns its place. You do not use generic filler, buzzwords, or "
        "vague claims. You ground every argument in concrete evidence, "
        "metrics, or lived experience. You write to persuade judges, "
        "investors, hiring managers, and selection committees who read "
        "hundreds of applications. Your goal is to make the reader stop, "
        "remember, and advocate for this applicant."
    )


def _build_framework(template: str, opp_type: str) -> str:
    """Return a competitive writing framework for the document type."""

    frameworks: dict[str, dict[str, str]] = {
        "hackathon": {
            "project-pitch": (
                "Framework — The Demo-Day Pitch:\n"
                "1. HOOK (1 sentence): Open with the most surprising insight or "
                "counter-intuitive fact about the problem. Make the reader lean in.\n"
                "2. PROBLEM (2-3 sentences): Who suffers, how much, and why does it matter *now*? "
                "Use a real stat, quote, or anecdote if possible. Avoid generic 'the world needs X'.\n"
                "3. SOLUTION (3-4 sentences): What did you build? How does it work at a high level? "
                "What is the one thing that makes your approach different from every other attempt?\n"
                "4. TECHNICAL DEPTH (3-4 sentences): Architecture, stack choices, and why they matter. "
                "Show you made hard trade-offs, not easy defaults.\n"
                "5. IMPACT & VALIDATION (2-3 sentences): Who tested it? What did they say? Any metrics, "
                "even preliminary ones, beat promises.\n"
                "6. WHY THIS HACKATHON (2 sentences): Be specific about what this event, sponsor, or "
                "community uniquely unlocks for you. Generic enthusiasm is noise.\n"
                "7. CLOSE (1 sentence): A forward-looking claim that leaves the reader wanting to see the demo."
            ),
            "team-bio": (
                "Framework — The Credibility Narrative:\n"
                "1. ORIGIN STORY (2-3 sentences): How did this team come together? Shared trauma? "
                "A side project that wouldn't die? Origin stories build trust.\n"
                "2. COMPLEMENTARY SUPERPOWERS (3-4 sentences): Each member gets 1-2 sentences on "
                "their deepest skill and one concrete proof point (ship, paper, job, open-source repo).\n"
                "3. COLLECTIVE TRACK RECORD (2 sentences): Have you shipped together before? Won anything? "
                "Built under time pressure? Mention it.\n"
                "4. WHY THIS TEAM FOR THIS PROBLEM (2 sentences): Connect your lived experience or "
                "past work directly to the problem domain. Passion without relevance is weak.\n"
                "5. CLOSE (1 sentence): A team mantra or shared conviction."
            ),
        },
        "accelerator": {
            "one-liner-pitch": (
                "Framework — The YC-Style Opening:\n"
                "1. WHAT (1 sentence): State what you do in plain English a non-technical person understands.\n"
                "2. WHO (1 sentence): Name the exact customer segment and the burning pain they feel.\n"
                "3. WHY NOW (2-3 sentences): What changed in technology, regulation, or market behavior "
                "that makes this business possible *today* and not five years ago?\n"
                "4. TRACTION (3-4 sentences): Revenue, users, growth rate, LOIs, pilot customers. "
                "Be specific. 'Growing fast' is worthless. '30% MoM for 6 months, $50K MRR' is powerful.\n"
                "5. DIFFERENTIATION (2 sentences): Who is the incumbent and why will they fail to copy you?\n"
                "6. CLOSE (1 sentence): The biggest milestone you will hit in the next 12 months."
            ),
            "traction-summary": (
                "Framework — The Metrics That Matter:\n"
                "1. NORTH STAR (2 sentences): The one metric that captures value delivered to users. "
                "Why this metric and not vanity ones?\n"
                "2. GROWTH STORY (3-4 sentences): Plot the journey. What experiments drove inflection? "
                "What channels worked and which died?\n"
                "3. UNIT ECONOMICS (2-3 sentences): CAC, LTV, payback period, or equivalent. "
                "If pre-revenue, describe the path to monetization with assumptions.\n"
                "4. MILESTONES (2-3 sentences): 3 concrete achievements with dates and numbers.\n"
                "5. WHAT COMES NEXT (2 sentences): The next 2-3 bets and how you will measure them."
            ),
        },
        "grant": {
            "impact-statement": (
                "Framework — The Change Narrative:\n"
                "1. THE STAKES (2-3 sentences): What happens if this problem goes unsolved? "
                "Who loses, and by how much? Make it visceral.\n"
                "2. THEORY OF CHANGE (3-4 sentences): Your intervention → short-term outcome → "
                "long-term systemic change. Draw the causal chain explicitly.\n"
                "3. BENEFICIARIES (2-3 sentences): Who exactly? How many? How did you validate their need?\n"
                "4. EVIDENCE BASE (2-3 sentences): Similar interventions that worked. Citations, "
                "comparable programs, or your own pilot data.\n"
                "5. MEASUREMENT (2-3 sentences): KPIs, evaluation design, and how you will know "
                "you succeeded versus just stayed busy.\n"
                "6. CLOSE (1-2 sentences): The world in 5 years if this grant succeeds."
            ),
            "budget-narrative": (
                "Framework — The Investment Logic:\n"
                "1. TOTAL ASK & TIMELINE (1 sentence): Clear, specific, justified by the work plan.\n"
                "2. PERSONNEL (3-4 sentences): Who will be hired or retained? What do they do? "
                "Why are they essential versus nice-to-have?\n"
                "3. DIRECT COSTS (3-4 sentences): Equipment, software, travel, materials. "
                "Each line item gets a one-sentence justification tied to deliverables.\n"
                "4. LEVERAGE (2 sentences): Matching funds, in-kind contributions, or volunteer hours. "
                "Show this grant is a catalyst, not the whole budget.\n"
                "5. RISK MITIGATION (2 sentences): What if costs overrun? What's your contingency plan?"
            ),
        },
        "job": {
            "cover-letter": (
                "Framework — The Story of Fit:\n"
                "1. THE HOOK (2 sentences): The specific moment, product, or mission that made you "
                "apply. Not 'I saw your job posting.' Something real you experienced.\n"
                "2. THE BRIDGE (3-4 sentences): A narrative arc that connects your past work to this "
                "role. Use one detailed story with metrics, conflict, and resolution.\n"
                "3. THE PROOF (3-4 sentences): 2-3 achievements with numbers, context, and impact. "
                "'Built a feature' is weak. 'Built a real-time pipeline that cut latency from 2s to 200ms "
                "for 50K daily users' is strong.\n"
                "4. THE ALIGNMENT (2-3 sentences): Why this company, this team, this moment? "
                "Reference a recent launch, blog post, or company value. Show you did homework.\n"
                "5. THE CLOSE (1-2 sentences): A forward-looking statement about what you want to "
                "build together, not what you want to get."
            ),
            "linkedin-outreach": (
                "Framework — The Warm Introduction:\n"
                "1. CONTEXT (1 sentence): How you found them and why them specifically.\n"
                "2. CREDIBILITY SIGNAL (2 sentences): One impressive, relevant proof point that makes "
                "them want to reply.\n"
                "3. VALUE EXCHANGE (2-3 sentences): What can you offer? Insight, introduction, "
                "help with a problem they tweeted about? Make it asymmetric — you give first.\n"
                "4. THE ASK (1 sentence): One low-friction ask. Not 'can we chat?' but "
                "'Would you be open to a 15-min call next Tuesday about X?'\n"
                "5. CLOSE (1 sentence): Gratitude without groveling."
            ),
        },
        "government": {
            "application-statement": (
                "Framework — The Compliance + Value Argument:\n"
                "1. PURPOSE & AUTHORITY (2 sentences): The exact program name and why you are statutorily eligible.\n"
                "2. ELIGIBILITY PROOF (3-4 sentences): Walk through each requirement with your matching credential.\n"
                "Attach evidence in the docs, reference it here.\n"
                "3. PUBLIC VALUE (3-4 sentences): How does your participation advance the program's stated goals? "
                "Use the agency's own language from the RFA.\n"
                "4. CAPACITY (2-3 sentences): Past performance, team qualifications, and infrastructure.\n"
                "5. TIMELINE & DELIVERABLES (2 sentences): Specific milestones and completion dates."
            ),
        },
        "platform": {
            "integration-use-case": (
                "Framework — The Partnership Pitch:\n"
                "1. CUSTOMER PAIN (2-3 sentences): What do your users struggle with that this platform solves?\n"
                "2. INTEGRATION STORY (3-4 sentences): How it works end-to-end. Screens, flows, API calls. "
                "Make it concrete enough that a PM could visualize it.\n"
                "3. MUTUAL VALUE (2-3 sentences): What do you bring (users, data, distribution, brand)? "
                "What do they bring (capability, reach, credibility)?\n"
                "4. GO-TO-MARKET (2 sentences): How will you launch this integration to your users?\n"
                "5. SUCCESS METRICS (2 sentences): Activation rate, retention lift, revenue impact. "
                "Commit to numbers."
            ),
        },
        "other": {
            "cold-email": (
                "Framework — The Attention Arbitrage:\n"
                "1. PATTERN INTERRUPT (1 sentence): Something unexpected, funny, or sharply relevant.\n"
                "2. WHY THEM (2 sentences): Proof you know their work, their company, or their problem.\n"
                "3. CREDIBILITY (2 sentences): One result, one name, one metric.\n"
                "4. VALUE PROP (2-3 sentences): What you do, who it's for, and the before/after.\n"
                "5. LOW-FRICTION ASK (1 sentence): Specific, easy to say yes to.\n"
                "6. CLOSE (1 sentence): Sign-off that matches the tone."
            ),
            "custom": (
                "Framework — The Persuasive Essay:\n"
                "1. THESIS (1-2 sentences): The one thing you want the reader to remember.\n"
                "2. EVIDENCE (3-5 sentences): Stories, data, quotes, examples. Vary the evidence types.\n"
                "3. COUNTERARGUMENT (2 sentences): Address the obvious objection before they raise it.\n"
                "4. EMOTIONAL CORE (2-3 sentences): Why does this matter to you personally? "
                "Vulnerability, well-placed, is unforgettable.\n"
                "5. CALL TO ACTION (1-2 sentences): What should the reader do, feel, or believe next?"
            ),
        },
    }

    # Normalize keys
    tmpl_key = template.lower().replace(" ", "-")
    type_key = opp_type if opp_type in frameworks else "other"

    # Try exact match, then fallback to generic for type
    if tmpl_key in frameworks.get(type_key, {}):
        return frameworks[type_key][tmpl_key]
    if "custom" in frameworks.get(type_key, {}):
        return frameworks[type_key]["custom"]
    return frameworks["other"]["custom"]


def _build_user_prompt(
    template: str,
    tone: str,
    fields: dict[str, str],
    opportunity: Optional[dict] = None,
) -> str:
    opp_type = opportunity.get("type", "other") if opportunity else "other"
    framework = _build_framework(template, opp_type)

    opp_context = ""
    if opportunity:
        opp_context = (
            f"\n--- OPPORTUNITY CONTEXT ---\n"
            f"Title: {opportunity.get('title', 'N/A')}\n"
            f"Organization: {opportunity.get('organization', 'N/A')}\n"
            f"Type: {opp_type}\n"
            f"Description: {opportunity.get('description', 'N/A')}\n"
        )

    fields_context = "\n".join(
        f"[{k}]\n{v.strip()}\n" for k, v in fields.items() if v.strip()
    )

    tone_guidance = {
        "professional": "Authoritative, precise, confident. No exclamation points. Every claim backed by evidence.",
        "enthusiastic": "Energetic, visionary, infectious. Use vivid verbs and forward-looking language. Show genuine excitement.",
        "technical": "Rigorous, specific, architecture-aware. Name technologies, cite protocols, explain trade-offs. Assume a technical reader.",
        "casual": "Conversational, direct, human. Like a brilliant friend explaining their passion project over coffee.",
    }.get(tone.lower(), "Authoritative, precise, confident.")

    return (
        f"DOCUMENT TYPE: {template}\n"
        f"TONE: {tone} — {tone_guidance}\n"
        f"OPPORTUNITY TYPE: {opp_type}\n"
        f"\n--- WRITING FRAMEWORK ---\n"
        f"{framework}\n"
        f"{opp_context}"
        f"\n--- APPLICANT INPUTS ---\n"
        f"{fields_context}\n"
        f"\n--- INSTRUCTIONS ---\n"
        f"1. Follow the framework above section by section. Do not skip sections.\n"
        f"2. Write 600–1,200 words. Be substantive. Judges remember depth, not brevity.\n"
        f"3. Every claim must be tied to concrete evidence, metrics, or specific examples from the applicant inputs.\n"
        f"4. Do not use generic filler: 'I am passionate about', 'the world is changing', 'leverage cutting-edge'.\n"
        f"5. Do not use markdown headers, bullet lists, or section titles in the final output. "
        f"   Use flowing paragraphs with natural transitions. The reader should feel a narrative, not a form.\n"
        f"6. Weave the opportunity context into the narrative naturally—do not bolt it on as an afterthought.\n"
        f"7. End with forward momentum. The reader should feel like the next logical step is to advance this applicant.\n"
        f"8. No meta-commentary. No 'Here is the essay:' or 'In conclusion'. Just the finished piece."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_draft(
    template: str,
    tone: str,
    fields: dict[str, str],
    opportunity: Optional[dict] = None,
    model: str = "gpt-4o-mini",
) -> str:
    """Generate an application draft using OpenAI.

    Args:
        template: e.g. "Cover Letter", "Project Proposal", "Grant Essay"
        tone: e.g. "professional", "enthusiastic", "technical", "casual"
        fields: User-filled form fields.
        opportunity: Optional opportunity metadata for context.
        model: OpenAI model ID.

    Returns:
        Generated text.

    Raises:
        RuntimeError: If OpenAI is not configured.
    """
    client = _get_client()
    user_prompt = _build_user_prompt(template, tone, fields, opportunity)

    logger.info("AI generate: template=%s tone=%s model=%s", template, tone, model)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.75,
        max_tokens=3000,
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI returned empty content")

    logger.info("AI generate: success (%d chars)", len(content))
    return content.strip()


def is_configured() -> bool:
    """Return True if the OpenAI API key is available."""
    return bool(os.environ.get("OPENAI_API_KEY")) and OpenAI is not None

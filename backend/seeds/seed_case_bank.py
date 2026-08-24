"""Seed the shared Case Study Bank with demo entries (uploaded + AI-generated).

Idempotent: entries are matched by title and skipped if already present.

Run:  .venv/Scripts/python.exe seeds/seed_case_bank.py
"""

import json
import os
import sys
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def full_snapshot(
    description: str,
    subject: str,
    functional_area: str,
    industry: str,
    capabilities: List[str],
    sections: Dict[str, Any],
    questions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    return {
        "description": description,
        "industry": industry,
        "capabilities": capabilities,
        "sections": sections,
        "metadata": {"subject": subject, "functional_area": functional_area},
        "timing": {"reading_time_minutes": 8, "answer_writing_time_minutes": 12},
        "estimated_minutes": 28,
        "instructions": {
            "student_instructions_before": "Read the case carefully. Note the key numbers before you start writing.",
            "student_instructions_during": "Answer in your own words. State any assumptions explicitly.",
            "student_instructions_submission": "Review each answer against the question before submitting.",
            "company_background": sections.get("background", ""),
            "industry_background": "",
            "faculty_common_mistakes": "Students often restate the situation instead of analysing it, and skip quantifying the impact of their recommendation.",
            "faculty_discussion_points": "Push students on trade-offs, second-order effects, and what evidence would change their recommendation.",
            "key_learning_points": "Structured diagnosis before recommendation; explicit assumptions; measurable success criteria.",
        },
        "questions": questions,
        "case_specific_criteria": ["Quantifies the impact of the recommendation"],
    }


def q(text_: str, bloom: str, model: str) -> Dict[str, Any]:
    return {
        "question_text": text_,
        "blooms_level": bloom,
        "word_limit_min": 120,
        "word_limit_max": 350,
        "instructions": "Support your answer with specifics from the case.",
        "model_answer": model,
        "alternative_answers": [],
        "marking_scheme": "Full marks for a structured answer grounded in case facts with a clear, justified conclusion.",
    }


ENTRIES: List[Dict[str, Any]] = [
    # ---- uploaded entries (mapped subject / semester / difficulty) ----
    {
        "title": "Credit Risk Review at Sunrise Finance",
        "source": "uploaded",
        "creator_email": "deepak.k@pcdc.in",
        "subject": "Financial Management",
        "semester": 3,
        "difficulty": 3,
        "brief": "A retail NBFC's 90+ day delinquencies have more than doubled in three quarters. The credit committee needs a diagnosis and a corrective plan that does not stall disbursal growth.",
        "situation": (
            "Sunrise Finance is a mid-sized NBFC lending to salaried and self-employed retail "
            "borrowers across 3 states. Over the last three quarters its 90+ day delinquency rate "
            "has risen from 2.1% to 4.8%. Collections headcount is flat, field visits are down 30%, "
            "and the sales team is incentivised purely on disbursal volume. The CRO suspects "
            "underwriting drift after score-card overrides rose from 8% to 19% of approvals. "
            "The board meets in three weeks and expects a diagnosis and a 90-day corrective plan "
            "that protects growth targets as far as possible."
        ),
    },
    {
        "title": "Pricing a Subscription App for Tier-2 India",
        "source": "uploaded",
        "creator_email": "deepak.k@pcdc.in",
        "subject": "Marketing Management",
        "semester": 2,
        "difficulty": 2,
        "brief": "A fitness app with strong metro traction wants tier-2 growth where willingness to pay is ~40% lower. Design pricing and packaging that unlocks the new segment without eroding metro revenue.",
        "situation": (
            "FitOne has 240k paying subscribers in metro India at Rs 499/month with 4.1% monthly "
            "churn. Research in tier-2 cities shows strong brand awareness but willingness to pay "
            "clustered around Rs 249-299. Infrastructure costs per user are identical. The CEO "
            "wants a tier-2 launch next quarter; the CFO fears metro users migrating to any cheaper "
            "plan. Design the pricing and packaging approach, the fences between plans, and the "
            "metrics that would validate or kill the approach within two quarters."
        ),
    },
    {
        "title": "Attrition Spike at Meridian Tech Services",
        "source": "uploaded",
        "creator_email": "admin@pcdc.com",
        "subject": "Human Resource Management",
        "semester": 4,
        "difficulty": 4,
        "brief": "Regretted attrition in two delivery units has doubled the company baseline. Exit data points at two managers and a stalled promotion cycle. Advise the CHRO.",
        "situation": (
            "Meridian Tech Services runs 14 delivery units. Two of them show regretted attrition of "
            "31% annualised against a company baseline of 14%. Exit interviews cite limited growth, "
            "two specific managers, and a promotion cycle frozen during a margin-protection drive. "
            "Two key client accounts have escalated continuity concerns. The CHRO wants a "
            "diagnosis, a 90-day stabilisation plan, and leading indicators that would show the "
            "plan is working before the next quarterly review."
        ),
    },
    # ---- AI-generated entries (complete cases — publish live directly) ----
    {
        "title": "Cold-Chain Breakdown at Meridian Foods",
        "source": "ai_generated",
        "creator_email": "deepak.k@pcdc.in",
        "subject": "Operations Management",
        "semester": 4,
        "difficulty": 4,
        "brief": "A heat-wave month exposed end-to-end gaps in a frozen-foods distributor's cold chain: 6% spoilage, contractual penalties, and a key 3PL threatening exit. Recommend a response.",
        "snapshot": {
            "industry": "business",
            "functional_area": "Supply Chain & Operations",
            "capabilities": ["Problem Solving", "Decision Making"],
            "sections": {
                "situation": (
                    "Meridian Foods distributes frozen products to 1,800 retail outlets across three "
                    "states through 2 owned cold stores and 3 third-party logistics partners. During a "
                    "record heat-wave month, spoilage hit 6% of despatched value (Rs 3.1 crore), "
                    "triggering penalty clauses with two modern-trade chains. Its largest 3PL, citing "
                    "unviable fuel and power costs, has threatened to exit at 60 days' notice. "
                    "The COO must present a response plan to the board."
                ),
                "background": "Meridian Foods, Nagpur, Rs 410 crore revenue, 700 employees; frozen vegetables, snacks and ready meals; 22 years in business.",
                "data": "Spoilage by leg: cold store 0.8%, primary transport 1.9%, 3PL last-mile 3.3%. Temperature-logger coverage: 40% of vehicles. 3PL A carries 55% of volume. Penalty exposure next quarter: Rs 1.2 crore.",
                "characters": "You are consultant to COO Rajan Iyer. Others: CFO Meera Shah (capex-averse), 3PL A's owner (renegotiating), modern-trade category head (penalty enforcement).",
                "constraints": "Capex ceiling Rs 4 crore this year; no retail price increases; 3PL exit clock of 60 days; monsoon season in 10 weeks.",
                "objectives": "Diagnose the failure points, decide the 3PL response, and produce a 90-day plan that caps spoilage below 2% with measurable checkpoints.",
                "timeline": "Week 1-2 diagnosis and logger rollout decision; Week 3-6 3PL renegotiation or replacement; Week 7-12 corrective actions and monsoon readiness review.",
                "reflection_questions": [
                    "Which assumption in your plan is most fragile, and how would you test it cheaply?",
                    "How did you trade off short-term penalties against long-term network resilience?",
                ],
                "learning_outcomes": [
                    "Diagnose multi-leg supply-chain failures from partial data",
                    "Structure a make-vs-partner decision under time pressure",
                    "Design measurable operational checkpoints",
                ],
            },
            "questions": [
                q("Diagnose the primary failure points in Meridian's cold chain using the data provided.", "Analyze",
                  "Last-mile 3PL legs contribute over half the spoilage (3.3% of 6%); low logger coverage (40%) hides excursions; concentration on 3PL A (55% of volume) makes the network fragile. Root causes: unmonitored handoffs, misaligned 3PL incentives, and no temperature SLA enforcement."),
                q("Should Meridian retain, renegotiate, or replace 3PL A? Recommend with justification.", "Evaluate",
                  "Renegotiate with a temperature-linked SLA and fuel-indexed rates while qualifying a second partner to cut concentration below 40%. Outright replacement inside 60 days risks service collapse; pure retention leaves incentives broken."),
                q("Lay out the 90-day plan with owners, costs within the Rs 4 crore ceiling, and checkpoints.", "Create",
                  "Weeks 1-2: full logger rollout (~Rs 0.6 crore), spoilage dashboard (COO). Weeks 3-6: SLA renegotiation (CFO/COO), second 3PL pilot in worst corridor. Weeks 7-12: buffer stock at 2 forward stores (~Rs 1.5 crore), monsoon stress test. Checkpoints: spoilage <4% by day 45, <2% by day 90, penalty exposure halved."),
            ],
        },
    },
    {
        "title": "Turnaround Mandate at Kavery Textiles",
        "source": "ai_generated",
        "creator_email": "admin@pcdc.com",
        "subject": "Strategic Management",
        "semester": 5,
        "difficulty": 5,
        "brief": "A 60-year-old family textile firm is losing money in 2 of 3 divisions while a PE investor pushes for focus. The new CEO must choose what to fix, sell, or shut — and survive the family politics.",
        "snapshot": {
            "industry": "business",
            "functional_area": "Corporate Strategy & Turnaround",
            "capabilities": ["Strategic Thinking", "Leadership"],
            "sections": {
                "situation": (
                    "Kavery Textiles runs three divisions: yarn (profitable, commoditised), branded "
                    "home linen (loss-making, growing 18%), and garment exports (loss-making, "
                    "shrinking). A PE investor holding 26% wants divestment of both loss-makers; "
                    "the founding family, holding 51%, sees the linen brand as the future and garment "
                    "exports as a legacy obligation employing 1,100 people. The newly hired external "
                    "CEO — the first in the company's history — must table a turnaround strategy "
                    "at the next board meeting."
                ),
                "background": "Kavery Textiles, Coimbatore, est. 1964; Rs 890 crore revenue; net loss Rs 42 crore last year; debt/EBITDA 4.8x.",
                "data": "Yarn: Rs 520 cr revenue, 9% EBITDA. Linen: Rs 210 cr, -6% EBITDA, growing 18% yearly, brand NPS 61. Garments: Rs 160 cr, -11% EBITDA, volumes down 14%, 1,100 workers. Interest cover 1.1x.",
                "characters": "You advise CEO Anita Krishnan (externally hired). Others: family patriarch chairman, PE nominee director, garment-division GM (35-year veteran), lenders' consortium representative.",
                "constraints": "Interest cover near 1x limits time; family will block outright garment closure; PE can block fresh equity; one covenant test in 6 months.",
                "objectives": "Recommend the portfolio strategy (fix/sell/shut per division), the financing bridge, and a stakeholder plan that gets board approval.",
                "timeline": "Board strategy meeting in 4 weeks; covenant test in 6 months; PE exit window opens in 18 months.",
                "reflection_questions": [
                    "Where does your recommendation trade financial logic against stakeholder reality, and is the trade defensible?",
                    "What would have to be true for the opposite portfolio choice to be right?",
                ],
                "learning_outcomes": [
                    "Apply portfolio logic under financial distress",
                    "Design a stakeholder strategy for contested board decisions",
                    "Sequence a turnaround against covenant deadlines",
                ],
            },
            "questions": [
                q("Assess each division's strategic position and cash contribution. Which is the core?", "Analyze",
                  "Yarn funds the company (only positive EBITDA) but is commoditised; linen is the strategic core (growth 18%, NPS 61) needing scale to cover fixed costs; garments destroy cash with shrinking volumes and no path to cost parity."),
                q("Recommend fix/sell/shut for each division with the financing bridge.", "Evaluate",
                  "Fix-and-hold yarn as the cash engine; fix linen with focused investment funded by garment divestment; sell garments as a going concern to a labour-intensive exporter, protecting employment better than closure and releasing ~Rs 60-80 crore to cut debt before the covenant test."),
                q("Design the stakeholder plan that gets this through the board in 4 weeks.", "Create",
                  "Pre-wire separately: family (employment continuity via going-concern sale, legacy framed as brand), PE (deleveraging path and 18-month exit maths), lenders (covenant headroom). Stage the board paper as options with a recommended path, and secure the chairman's public endorsement before the meeting."),
            ],
        },
    },
    {
        "title": "Data Privacy Dilemma at CareBridge Health",
        "source": "ai_generated",
        "creator_email": "deepak.k@pcdc.in",
        "subject": "Business Ethics",
        "semester": 6,
        "difficulty": 6,
        "brief": "A health-tech scale-up discovers its analytics partner has been training models on identifiable patient data. Fixing it quietly protects the Series C; disclosure protects patients. The COO must decide.",
        "snapshot": {
            "industry": "healthcare",
            "functional_area": "Ethics, Risk & Governance",
            "capabilities": ["Decision Making", "Professionalism"],
            "sections": {
                "situation": (
                    "CareBridge Health runs chronic-care programmes for 90,000 patients on behalf of "
                    "12 hospital groups. An internal audit finds its analytics partner has for 14 "
                    "months trained models on datasets where de-identification was reversible for "
                    "roughly 18,000 patients. No breach or misuse is detected. Contracts require "
                    "notifying hospital clients of any 'compromise'; the law on this configuration is "
                    "ambiguous. A Rs 400 crore Series C closes in 6 weeks, and disclosure could stall "
                    "it. The COO must recommend a course of action to the board."
                ),
                "background": "CareBridge Health, Bengaluru, 6 years old, 380 employees, Rs 130 crore ARR, growing 70% yearly; clinical outcomes are its main sales pitch.",
                "data": "18,400 patients re-identifiable; 14 months of exposure; 0 detected misuse; partner contract allows termination for cause; Series C term sheet has a material-adverse-change clause; notification cost estimate Rs 2-4 crore plus unquantified client churn.",
                "characters": "You advise COO Nikhil Rao. Others: CEO (deal-focused), General Counsel (reads the law as ambiguous), CISO (wants full disclosure), lead investor partner, hospital-group CMOs.",
                "constraints": "6-week deal clock; contractual notification triggers on 'compromise' — a contested term; partner threatens counter-claims if terminated publicly; employees are aware and morale is fragile.",
                "objectives": "Decide what to disclose, to whom, and when; the partner consequence; and the governance fix — with reasoning that survives hindsight.",
                "timeline": "Week 1 board risk committee; Week 2 partner decision; Weeks 3-6 client communication and deal disclosure sequencing.",
                "reflection_questions": [
                    "Whose interests did your recommendation weight most heavily, and would you defend that in public?",
                    "What decision rule are you using when the law is ambiguous but the ethics are not?",
                ],
                "learning_outcomes": [
                    "Reason through disclosure decisions under legal ambiguity",
                    "Separate stakeholder management from ethical obligation",
                    "Design governance controls after a third-party failure",
                ],
            },
            "questions": [
                q("Map the stakeholders and what each stands to gain or lose under full, partial, and no disclosure.", "Analyze",
                  "Patients: dignity/autonomy vs. anxiety without detected misuse. Hospitals: contractual right to know, reputational stake. Investors: MAC clause exposure either way — late discovery is worse. Employees: precedent for the culture. Partner: liability. No-disclosure concentrates risk on the least powerful stakeholder — patients."),
                q("Recommend the disclosure decision and its sequencing against the Series C.", "Evaluate",
                  "Disclose: notify hospital clients under the contract reading most protective of patients, brief the lead investor before closing under the MAC clause, and notify the regulator proactively. Sequencing: investor first (days), clients within 2 weeks, joint patient communication with hospitals. A stalled round is recoverable; concealed exposure discovered later is not."),
                q("Design the governance changes that make this failure class unlikely to recur.", "Create",
                  "Independent annual re-identification audits of all data partners; contractual audit rights and model-training restrictions; a data-ethics committee with veto power reporting to the board; incident-response runbook with defined disclosure thresholds so the next call is not improvised."),
            ],
        },
    },
]


def build_uploaded_snapshot(entry: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "description": entry["brief"],
        "sections": {"situation": entry["situation"]},
        "metadata": {"subject": entry["subject"]},
        "questions": [],
        "capabilities": [],
    }


def build_ai_snapshot(entry: Dict[str, Any]) -> Dict[str, Any]:
    snap = entry["snapshot"]
    return full_snapshot(
        description=entry["brief"],
        subject=entry["subject"],
        functional_area=snap.get("functional_area", ""),
        industry=snap.get("industry", "business"),
        capabilities=snap.get("capabilities", []),
        sections=snap.get("sections", {}),
        questions=snap.get("questions", []),
    )


def main() -> None:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        users = {
            row.email: row
            for row in conn.execute(
                text("SELECT id, name, email FROM users WHERE email IN :emails"),
                {"emails": tuple({e["creator_email"] for e in ENTRIES})},
            ).fetchall()
        }
        created, skipped = 0, 0
        for entry in ENTRIES:
            exists = conn.execute(
                text("SELECT id FROM case_study_bank WHERE title = :title"),
                {"title": entry["title"]},
            ).fetchone()
            if exists:
                skipped += 1
                continue
            creator: Optional[Any] = users.get(entry["creator_email"])
            snapshot = (
                build_ai_snapshot(entry) if entry["source"] == "ai_generated"
                else build_uploaded_snapshot(entry)
            )
            conn.execute(
                text("""
                    INSERT INTO case_study_bank (
                        title, brief, case_snapshot, subject, semester_number, difficulty,
                        source, created_by, creator_name, status
                    )
                    VALUES (
                        :title, :brief, :snapshot, :subject, :semester, :difficulty,
                        :source, :uid, :uname, 'available'
                    )
                """),
                {
                    "title": entry["title"],
                    "brief": entry["brief"],
                    "snapshot": json.dumps(snapshot),
                    "subject": entry["subject"],
                    "semester": entry["semester"],
                    "difficulty": entry["difficulty"],
                    "source": entry["source"],
                    "uid": creator.id if creator else None,
                    "uname": creator.name if creator else "PCDC Faculty",
                },
            )
            created += 1
        conn.commit()
        print(f"Case bank seed complete: {created} created, {skipped} already present.")


if __name__ == "__main__":
    main()

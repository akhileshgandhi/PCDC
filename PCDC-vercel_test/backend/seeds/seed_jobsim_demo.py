"""Create one demo job simulation and assign it, so My Simulations can be tried
before the faculty screens exist.

Run from backend/:
    python seeds/seed_jobsim_demo.py --student-email student@example.com
    python seeds/seed_jobsim_demo.py --section-id 12

It creates "Retail Sales Analyst: Quarterly Review" (200 orders, 10 spreadsheet
tasks over 3 stages), publishes it and assigns it to that student or section.
Run it again to create another copy. Only for local / UAT demos.
"""

import argparse
import os
import random
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from sqlalchemy import text  # noqa: E402

from services.jobsim import service  # noqa: E402
from shared.database import SessionLocal  # noqa: E402

REGIONS = ["North", "South", "East", "West"]
CATEGORIES = ["Snacks", "Beverages", "Personal Care", "Home Care"]
CHANNELS = ["Modern Trade", "General Trade", "E-commerce"]


def build_dataset(rows: int = 200) -> dict:
    rng = random.Random(42)
    start = date(2025, 4, 1)
    data = []
    for i in range(rows):
        revenue = round(rng.uniform(2000, 40000))
        cost = round(revenue * rng.uniform(0.55, 0.85))
        data.append([
            f"ORD{1001 + i}",
            (start + timedelta(days=rng.randint(0, 89))).isoformat(),
            rng.choices(REGIONS, weights=[30, 25, 25, 20])[0],
            rng.choice(CATEGORIES),
            rng.choice(CHANNELS),
            rng.randint(1, 40),
            revenue,
            cost,
            rng.random() < 0.08,
        ])
    return {
        "columns": ["OrderID", "OrderDate", "Region", "Category", "Channel", "Units", "Revenue", "Cost", "Returned"],
        "rows": data,
    }


def tasks(last: int) -> list:
    def col(letter: str) -> str:
        return f"{letter}2:{letter}{last}"

    oid, region, cat, chan, units, rev, cost, ret = (col(c) for c in "ACDEFGHI")
    understand, compare, decide = "Understand the sales", "Compare regions and categories", "Find what to fix"
    return [
        {"type": "spreadsheet", "stage": understand, "prompt": "How many orders are in the dataset?",
         "hint": "COUNTA counts non-empty cells, e.g. in the OrderID column.",
         "answer_formula": f"=COUNTA({oid})", "expected_format": "number", "config": {"cell_label": "Total orders"}},
        {"type": "spreadsheet", "stage": understand, "prompt": "What is the total revenue for the quarter? Show it in rupees (Currency).",
         "hint": "Add up the Revenue column with SUM.",
         "answer_formula": f"=SUM({rev})", "expected_format": "currency"},
        {"type": "spreadsheet", "stage": understand, "prompt": "What is the average revenue per order? Show it in rupees, using a formula.",
         "hint": "AVERAGE over the Revenue column.",
         "answer_formula": f"=AVERAGE({rev})", "expected_format": "currency", "config": {"must_use_formula": True}},
        {"type": "spreadsheet", "stage": understand, "prompt": "What is the overall gross margin, (Revenue - Cost) / Revenue? Show it as a Percent.",
         "hint": "Use SUM on Revenue and on Cost, then divide.",
         "answer_formula": f"=(SUM({rev})-SUM({cost}))/SUM({rev})", "expected_format": "percent"},
        {"type": "spreadsheet", "stage": compare, "prompt": "What is the total revenue from the North region? Show it in rupees.",
         "hint": 'SUMIF(range, "North", sum_range).',
         "answer_formula": f'=SUMIF({region},"North",{rev})', "expected_format": "currency"},
        {"type": "spreadsheet", "stage": compare, "prompt": "How many orders came through E-commerce?",
         "hint": "COUNTIF on the Channel column.",
         "answer_formula": f'=COUNTIF({chan},"E-commerce")', "expected_format": "number"},
        {"type": "spreadsheet", "stage": compare, "prompt": "What is the average revenue of Snacks orders in the South region? Show it in rupees.",
         "hint": "AVERAGEIFS takes the average range, then range/criteria pairs.",
         "answer_formula": f'=AVERAGEIFS({rev},{cat},"Snacks",{region},"South")', "expected_format": "currency"},
        {"type": "spreadsheet", "stage": compare, "prompt": "How many units were sold in orders worth at least ₹20,000?",
         "hint": 'SUMIF with the criteria ">=20000" on Revenue, summing Units.',
         "answer_formula": f'=SUMIF({rev},">=20000",{units})', "expected_format": "number"},
        {"type": "spreadsheet", "stage": decide, "prompt": "What share of orders were returned? Show it as a Percent.",
         "hint": "COUNTIF the Returned column for TRUE, divided by the number of orders.",
         "answer_formula": f"=COUNTIF({ret},TRUE)/COUNTA({oid})", "expected_format": "percent"},
        {"type": "spreadsheet", "stage": decide, "prompt": "What is the revenue of order ORD1050? Show it in rupees.",
         "hint": 'VLOOKUP("ORD1050", the table from column A to G, 7, FALSE).',
         "answer_formula": f'=VLOOKUP("ORD1050",A2:G{last},7,FALSE)', "expected_format": "currency"},
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--student-email", help="assign to this student (by login email)")
    target.add_argument("--section-id", type=int, help="assign to every student in this section")
    args = parser.parse_args()

    db = SessionLocal()
    author = db.execute(
        text("SELECT id FROM users WHERE role IN ('superadmin', 'admin') ORDER BY id LIMIT 1")
    ).fetchone()
    if not author:
        sys.exit("No admin user found to own the demo simulation.")

    student_pk = None
    if args.student_email:
        student_pk = db.execute(
            text("""
                SELECT s.id FROM students s JOIN users u ON u.id = s.user_id
                WHERE LOWER(u.email) = LOWER(:e) AND u.role = 'student'
            """),
            {"e": args.student_email},
        ).scalar()
        if not student_pk:
            sys.exit(f"No student with email {args.student_email}.")
    elif not db.execute(text("SELECT 1 FROM class_sections WHERE id = :s"), {"s": args.section_id}).fetchone():
        sys.exit(f"No section with id {args.section_id}.")

    dataset = build_dataset()
    payload = {
        "title": "Retail Sales Analyst: Quarterly Review",
        "description": (
            "You've joined the commercial team of a consumer-goods company as a sales analyst. "
            "Use last quarter's order data to size the business, compare regions and categories, "
            "and find what needs fixing."
        ),
        "role": "Sales Analyst",
        "level": "Intermediate",
        "subject": "Business Analytics",
        "duration_minutes": 60,
        "dataset": dataset,
        "tasks": tasks(len(dataset["rows"]) + 1),
    }
    simulation_id = service.create_simulation(db, {"id": author.id, "role": "superadmin"}, payload)
    db.execute(
        text("UPDATE jobsim_simulations SET status = 'published', published_by = :a WHERE id = :s"),
        {"a": author.id, "s": simulation_id},
    )
    capability_ids = db.execute(
        text("""
            SELECT id FROM capabilities
            WHERE LOWER(name) SIMILAR TO '(analytical thinking|data interpretation|problem solving|decision making)'
            LIMIT 3
        """)
    ).fetchall()
    for cap in capability_ids:
        db.execute(
            text("INSERT INTO jobsim_capability_tags (simulation_id, capability_id) VALUES (:s, :c) ON CONFLICT DO NOTHING"),
            {"s": simulation_id, "c": cap.id},
        )
    db.execute(
        text("""
            INSERT INTO jobsim_assignments (simulation_id, section_id, student_id, due_date, assigned_by)
            VALUES (:s, :section, :student, :due, :a)
        """),
        {
            "s": simulation_id,
            "section": args.section_id,
            "student": student_pk,
            "due": datetime.utcnow() + timedelta(days=14),
            "a": author.id,
        },
    )
    db.commit()
    db.close()
    print(f"Created and assigned demo simulation {simulation_id}.")


if __name__ == "__main__":
    main()

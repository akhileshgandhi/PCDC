"""Additive seed: populate departments -> courses -> semesters -> batches ->
sections -> subjects for PIMR UG, PIMR LAW, and PIBM.

- Keeps existing PIMR PG data untouched.
- Idempotent: skips any course whose code already exists, and any department
  whose (institution, code) already exists.
"""
from dotenv import load_dotenv

load_dotenv()
from shared.database import SessionLocal  # noqa: E402
from sqlalchemy import text  # noqa: E402

# One "A" section for every semester, plus a "B" for semester 1.
def section_letters(sem: int):
    return ["A", "B"] if sem == 1 else ["A"]


# institution code -> departments -> courses (with subjects per semester)
PLAN = {
    "PIMR-UG": {
        "batch": ("2023–2026", 2023, 2026, "2023-26"),
        "departments": {
            ("BBA", "Bachelor of Business Administration"): [
                {
                    "name": "BBA — General", "code": "BBA-GEN", "sems": 6, "years": 3,
                    "subjects": {
                        1: ["Principles of Management", "Financial Accounting", "Business Economics"],
                        2: ["Marketing Management", "Business Statistics", "Organisational Behaviour"],
                        3: ["Human Resource Management", "Cost Accounting", "Business Law"],
                        4: ["Financial Management", "Operations Management", "Business Research Methods"],
                        5: ["Strategic Management", "Entrepreneurship Development", "Management Information Systems"],
                        6: ["Business Analytics", "Corporate Governance", "Project Work"],
                    },
                },
            ],
            ("BCOM", "Bachelor of Commerce"): [
                {
                    "name": "B.Com — Honours", "code": "BCOM-HON", "sems": 6, "years": 3,
                    "subjects": {
                        1: ["Financial Accounting", "Business Economics", "Business Organisation"],
                        2: ["Corporate Accounting", "Business Statistics", "Company Law"],
                        3: ["Cost Accounting", "Income Tax", "Banking & Insurance"],
                        4: ["Management Accounting", "Auditing", "Financial Markets"],
                        5: ["Goods & Services Tax", "Financial Management", "Business Analytics"],
                        6: ["International Business", "Corporate Governance", "Project Work"],
                    },
                },
            ],
        },
    },
    "PIMR-LAW": {
        "batch": ("2021–2026", 2021, 2026, "2021-26"),
        "departments": {
            ("BALLB", "BA LLB (Hons)"): [
                {
                    "name": "BA LLB (Hons)", "code": "BALLB", "sems": 10, "years": 5,
                    "subjects": {
                        1: ["Legal Methods", "Political Science I", "Law of Contract I"],
                        2: ["Sociology", "Political Science II", "Law of Contract II"],
                        3: ["Constitutional Law I", "Family Law I", "Law of Torts"],
                        4: ["Constitutional Law II", "Family Law II", "Criminal Law (IPC)"],
                        5: ["Property Law", "Administrative Law", "Company Law"],
                        6: ["Jurisprudence", "Public International Law", "Labour Law"],
                        7: ["Civil Procedure Code", "Law of Evidence", "Environmental Law"],
                        8: ["Criminal Procedure Code", "Intellectual Property Law", "Human Rights Law"],
                        9: ["Taxation Law", "Alternative Dispute Resolution", "Professional Ethics"],
                        10: ["Interpretation of Statutes", "Moot Court & Internship", "Legal Aid Clinic"],
                    },
                },
            ],
            ("LLB", "LLB"): [
                {
                    "name": "LLB", "code": "LLB", "sems": 6, "years": 3,
                    "subjects": {
                        1: ["Law of Contract", "Constitutional Law", "Law of Torts"],
                        2: ["Criminal Law (IPC)", "Family Law", "Property Law"],
                        3: ["Administrative Law", "Company Law", "Jurisprudence"],
                        4: ["Civil Procedure Code", "Law of Evidence", "Labour Law"],
                        5: ["Criminal Procedure Code", "Intellectual Property Law", "Environmental Law"],
                        6: ["Taxation Law", "Alternative Dispute Resolution", "Moot Court"],
                    },
                },
            ],
        },
    },
    "PIBM": {
        "batch": ("2024–2026", 2024, 2026, "2024-26"),
        "departments": {
            ("PIBM-PGDM", "Post Graduate Diploma in Management"): [
                {
                    "name": "PGDM — Marketing", "code": "PIBM-MKT", "sems": 4, "years": 2,
                    "subjects": {
                        1: ["Managerial Economics", "Organisational Behaviour", "Accounting for Managers"],
                        2: ["Marketing Management", "Operations Management", "Business Research Methods"],
                        3: ["Strategic Management", "Sales & Distribution Management", "Consumer Behaviour"],
                        4: ["Digital Marketing", "Corporate Governance", "International Marketing"],
                    },
                },
                {
                    "name": "PGDM — Finance", "code": "PIBM-FIN", "sems": 4, "years": 2,
                    "subjects": {
                        1: ["Managerial Economics", "Organisational Behaviour", "Accounting for Managers"],
                        2: ["Financial Management", "Corporate Finance", "Business Research Methods"],
                        3: ["Investment Analysis", "Financial Markets", "Strategic Management"],
                        4: ["Risk Management", "Corporate Governance", "International Finance"],
                    },
                },
            ],
        },
    },
}

db = SessionLocal()
try:
    for inst_code, cfg in PLAN.items():
        inst = db.execute(
            text("SELECT id FROM institutions WHERE code=:c"), {"c": inst_code}
        ).fetchone()
        if not inst:
            print(f"! institution {inst_code} not found, skipping")
            continue
        inst_id = inst.id
        batch_name, start_y, end_y, acad = cfg["batch"]

        for (dept_code, dept_name), courses in cfg["departments"].items():
            dept = db.execute(
                text("SELECT id FROM departments WHERE code=:c AND institution_id=:i"),
                {"c": dept_code, "i": inst_id},
            ).fetchone()
            if dept:
                dept_id = dept.id
            else:
                dept_id = db.execute(
                    text(
                        "INSERT INTO departments (name, code, status, institution_id) "
                        "VALUES (:n,:c,'active',:i) RETURNING id"
                    ),
                    {"n": dept_name, "c": dept_code, "i": inst_id},
                ).fetchone().id

            for course in courses:
                if db.execute(
                    text("SELECT id FROM courses WHERE code=:c"), {"c": course["code"]}
                ).fetchone():
                    print(f"= course {course['code']} exists, skipping")
                    continue

                sems = course["sems"]
                course_id = db.execute(
                    text(
                        "INSERT INTO courses (name, code, total_semesters, duration_years, status, department_id) "
                        "VALUES (:n,:c,:ts,:dy,'active',:d) RETURNING id"
                    ),
                    {"n": course["name"], "c": course["code"], "ts": sems,
                     "dy": course["years"], "d": dept_id},
                ).fetchone().id

                sem_ids = {}
                for n in range(1, sems + 1):
                    sem_ids[n] = db.execute(
                        text(
                            "INSERT INTO semesters (course_id, semester_number, name) "
                            "VALUES (:cid,:n,:name) RETURNING id"
                        ),
                        {"cid": course_id, "n": n, "name": f"Semester {n}"},
                    ).fetchone().id

                batch_id = db.execute(
                    text(
                        "INSERT INTO batches (course_id, name, start_year, end_year, status) "
                        "VALUES (:cid,:name,:sy,:ey,'active') RETURNING id"
                    ),
                    {"cid": course_id, "name": batch_name, "sy": start_y, "ey": end_y},
                ).fetchone().id

                for n in range(1, sems + 1):
                    for letter in section_letters(n):
                        db.execute(
                            text(
                                "INSERT INTO class_sections "
                                "(course_id, semester_id, batch_id, name, academic_year, status) "
                                "VALUES (:cid,:sid,:bid,:name,:acad,'active')"
                            ),
                            {"cid": course_id, "sid": sem_ids[n], "bid": batch_id,
                             "name": f"{course['code']} S{n}-{letter}", "acad": acad},
                        )

                idx = 0
                for n in range(1, sems + 1):
                    for sname in course["subjects"].get(n, []):
                        idx += 1
                        db.execute(
                            text(
                                "INSERT INTO subjects (name, code, department_id, course_id, semester_id, status) "
                                "VALUES (:name,:code,:dept,:cid,:sid,'active')"
                            ),
                            {"name": sname, "code": f"{course['code']}-S{n}-{idx}",
                             "dept": dept_id, "cid": course_id, "sid": sem_ids[n]},
                        )
                print(f"+ {inst_code} / {dept_code} / {course['code']} "
                      f"({sems} sems, {idx} subjects)")

    db.commit()

    print("\nPer-institution summary:")
    rows = db.execute(text("""
        SELECT i.name AS inst,
               COUNT(DISTINCT d.id) AS depts,
               COUNT(DISTINCT c.id) AS courses,
               COUNT(DISTINCT cs.id) AS sections,
               COUNT(DISTINCT sub.id) AS subjects
        FROM institutions i
        LEFT JOIN departments d ON d.institution_id = i.id
        LEFT JOIN courses c ON c.department_id = d.id
        LEFT JOIN class_sections cs ON cs.course_id = c.id
        LEFT JOIN subjects sub ON sub.course_id = c.id
        GROUP BY i.id, i.name ORDER BY i.id
    """)).fetchall()
    for r in rows:
        print(f"  {r.inst}: depts={r.depts} courses={r.courses} "
              f"sections={r.sections} subjects={r.subjects}")
except Exception as error:  # noqa: BLE001
    db.rollback()
    print("FAILED, rolled back:", type(error).__name__, str(error)[:300])
finally:
    db.close()

"""One-off: reset academic structure and seed the demo data (institutions kept)."""
from dotenv import load_dotenv

load_dotenv()
from shared.database import SessionLocal  # noqa: E402
from sqlalchemy import text  # noqa: E402

SECTION_LETTERS = {1: ["A", "B"], 2: ["A", "B"], 3: ["A"], 4: ["A"]}

COURSES = [
    {
        "name": "MBA — Marketing", "code": "MBA-MKT", "dept": "MBA",
        "subjects": {
            1: ["Managerial Economics", "Organisational Behaviour", "Accounting for Managers"],
            2: ["Marketing Management", "Operations Management", "Business Research Methods"],
            3: ["Strategic Management", "Financial Management", "Consumer Behaviour"],
            4: ["Business Analytics", "Corporate Governance", "International Marketing"],
        },
    },
    {
        "name": "MBA — Finance", "code": "MBA-FIN", "dept": "MBA",
        "subjects": {
            1: ["Managerial Economics", "Organisational Behaviour", "Accounting for Managers"],
            2: ["Financial Management", "Corporate Finance", "Business Research Methods"],
            3: ["Investment Analysis", "Financial Markets", "Strategic Management"],
            4: ["Risk Management", "Corporate Governance", "International Finance"],
        },
    },
    {
        "name": "PGDM — Business Analytics", "code": "PGDM-BA", "dept": "PGDM",
        "subjects": {
            1: ["Managerial Economics", "Statistics for Management", "Accounting for Managers"],
            2: ["Data Analysis", "Operations Management", "Business Research Methods"],
            3: ["Machine Learning for Business", "Data Visualization", "Strategic Management"],
            4: ["Big Data Analytics", "Corporate Governance", "Business Intelligence"],
        },
    },
]

db = SessionLocal()
try:
    # 1) Clear academic structure (institutions are kept).
    db.execute(text("DELETE FROM subjects"))
    db.execute(text("DELETE FROM faculty_sections"))
    db.execute(text("DELETE FROM student_sections"))
    db.execute(text("DELETE FROM case_section_assignments"))
    db.execute(
        text(
            "UPDATE students SET current_section_id=NULL, course_id=NULL, "
            "batch_id=NULL, current_semester_number=NULL"
        )
    )
    db.execute(text("DELETE FROM class_sections"))
    db.execute(text("DELETE FROM batches"))
    db.execute(text("DELETE FROM semesters"))
    db.execute(text("DELETE FROM courses"))
    db.execute(text("DELETE FROM departments"))

    # 2) Institution to hang departments off (seeded in migration 0019).
    pimr_pg = db.execute(
        text("SELECT id FROM institutions WHERE code='PIMR-PG'")
    ).fetchone().id

    def add_dept(name, code):
        return db.execute(
            text(
                "INSERT INTO departments (name, code, status, institution_id) "
                "VALUES (:n,:c,'active',:i) RETURNING id"
            ),
            {"n": name, "c": code, "i": pimr_pg},
        ).fetchone().id

    dept_ids = {
        "MBA": add_dept("Master of Business Administration", "MBA"),
        "PGDM": add_dept("Post Graduate Diploma in Management", "PGDM"),
    }

    for course in COURSES:
        course_id = db.execute(
            text(
                "INSERT INTO courses (name, code, total_semesters, duration_years, status, department_id) "
                "VALUES (:n,:c,4,2,'active',:d) RETURNING id"
            ),
            {"n": course["name"], "c": course["code"], "d": dept_ids[course["dept"]]},
        ).fetchone().id

        sem_ids = {}
        for n in range(1, 5):
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
                "VALUES (:cid,:name,2024,2026,'active') RETURNING id"
            ),
            {"cid": course_id, "name": "2024–2026"},
        ).fetchone().id

        for n in range(1, 5):
            for letter in SECTION_LETTERS[n]:
                db.execute(
                    text(
                        "INSERT INTO class_sections "
                        "(course_id, semester_id, batch_id, name, academic_year, status) "
                        "VALUES (:cid,:sid,:bid,:name,'2024-26','active')"
                    ),
                    {
                        "cid": course_id,
                        "sid": sem_ids[n],
                        "bid": batch_id,
                        "name": f"{course['code']} S{n}-{letter}",
                    },
                )

        idx = 0
        for n in range(1, 5):
            for sname in course["subjects"][n]:
                idx += 1
                db.execute(
                    text(
                        "INSERT INTO subjects (name, code, department_id, course_id, semester_id, status) "
                        "VALUES (:name,:code,:dept,:cid,:sid,'active')"
                    ),
                    {
                        "name": sname,
                        "code": f"{course['code']}-S{n}-{idx}",
                        "dept": dept_ids[course["dept"]],
                        "cid": course_id,
                        "sid": sem_ids[n],
                    },
                )

    db.commit()

    def count(table):
        return db.execute(text(f"SELECT COUNT(*) AS n FROM {table}")).fetchone().n

    print("Seeded. Counts:")
    for t in ["institutions", "departments", "courses", "batches", "semesters", "class_sections", "subjects"]:
        print(f"  {t}: {count(t)}")
except Exception as error:  # noqa: BLE001
    db.rollback()
    print("FAILED, rolled back:", type(error).__name__, str(error)[:300])
finally:
    db.close()

"""Create tables and seed dummy data on first run."""
from datetime import datetime
from .db import Base, engine, SessionLocal
from . import models
from .security import hash_pw

CAPS = {
    "Cognitive": ["Analytical Thinking", "Strategic Thinking", "Decision Making"],
    "Leadership": ["Communication", "Influence", "Negotiation", "Conflict Resolution", "Team Management"],
    "Entrepreneurial": ["Opportunity Recognition", "Innovation", "Business Model Thinking", "Risk Assessment", "Resourcefulness"],
    "Professional": ["Professional Judgment", "Business Acumen", "Execution Orientation", "Learning Agility", "Adaptability"],
}
SUBJECTS = ["Finance", "Marketing", "HR", "Operations"]
SCORING = [("Analytical Thinking", 30), ("Strategic Thinking", 30), ("Decision Making", 40)]


def init_and_seed():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            return  # already seeded
        # subjects
        subs = {}
        for s in SUBJECTS:
            row = models.Subject(name=s, status="active")
            db.add(row); db.flush(); subs[s] = row.id
        # capabilities
        for fam, names in CAPS.items():
            for n in names:
                db.add(models.Capability(family=fam, name=n))
        # scoring parameters (dynamic scheme, total 100)
        for name, wt in SCORING:
            db.add(models.ScoringParameter(name=name, weight=wt, active=True))
        # users (department = mapped Subject; no free-text department field)
        admin = models.User(full_name="Anita Desai", email="admin@pcdc.in",
                            password_hash=hash_pw("admin123"), role="admin", status="active")
        mentor = models.User(full_name="Dr. Sanjeev Patni", email="mentor@pcdc.in",
                            password_hash=hash_pw("mentor123"), role="mentor", status="active",
                            employee_id="PIBM-F-101", designation="Professor",
                            qualification="PhD (Marketing)", experience="14 yrs", phone="+91 98200 11001")
        student = models.User(full_name="Sanjay Kumar", email="student@pcdc.in",
                            password_hash=hash_pw("student123"), role="student", status="active",
                            college_id="PIBM-2401", program="PGDM", batch="2024-26", phone="+91 99300 22001")
        # Aarti recently accepted her invitation
        aarti = models.User(full_name="Aarti Menon", email="a.menon@pcdc.in", password_hash=hash_pw("x"),
                            role="mentor", status="accepted", accepted_at=datetime.utcnow(), employee_id="PIBM-F-102",
                            designation="Associate Professor", qualification="PhD (Finance)", experience="9 yrs")
        # Vikram has a pending invitation (link still valid)
        vikram = models.User(full_name="Vikram Nair", email="v.nair@pcdc.in", password_hash=hash_pw("x"),
                            role="mentor", status="pending", invitation_token="demo-invite-vikram",
                            invited_at=datetime.utcnow(), must_reset_pw=True, employee_id="PIBM-F-103",
                            designation="Assistant Professor", qualification="MBA (HR)", experience="6 yrs")
        priya = models.User(full_name="Priya Mehta", email="priya.m@pcdc.in", password_hash=hash_pw("x"),
                            role="student", status="accepted", accepted_at=datetime.utcnow(),
                            college_id="PIBM-2402", program="PGDM", batch="2024-26")
        # Amit has a pending invitation
        amit = models.User(full_name="Amit Sharma", email="amit.s@pcdc.in", password_hash=hash_pw("x"),
                            role="student", status="pending", invitation_token="demo-invite-amit",
                            invited_at=datetime.utcnow(), must_reset_pw=True,
                            college_id="PIBM-2403", program="MBA", batch="2025-27")
        db.add_all([admin, mentor, student, aarti, vikram, priya, amit]); db.flush()
        # department mappings
        db.add(models.MentorSubject(mentor_id=mentor.id, subject_id=subs["Marketing"]))
        db.add(models.MentorSubject(mentor_id=aarti.id, subject_id=subs["Finance"]))
        db.add(models.MentorSubject(mentor_id=vikram.id, subject_id=subs["HR"]))
        db.add(models.StudentSubject(student_id=student.id, subject_id=subs["Marketing"], current_level=2))
        db.add(models.StudentSubject(student_id=priya.id, subject_id=subs["Finance"], current_level=1))
        db.add(models.StudentSubject(student_id=amit.id, subject_id=subs["Operations"], current_level=1))
        db.flush()
        # heads of department
        db.query(models.Subject).filter(models.Subject.name == "Marketing").update({"head_id": mentor.id})
        db.query(models.Subject).filter(models.Subject.name == "Finance").update({"head_id": aarti.id})
        db.query(models.Subject).filter(models.Subject.name == "HR").update({"head_id": vikram.id})
        db.commit()

        _seed_case_studies(db, subs, {"Marketing": mentor.id, "Finance": aarti.id, "HR": vikram.id, "Operations": mentor.id})
    finally:
        db.close()


def _seed_case_studies(db, subs, dept_author):
    """Seed case studies + realistic attempt data so the admin analytics are populated."""
    import random
    from datetime import timedelta
    rnd = random.Random(42)
    now = datetime.utcnow()

    caps_by_fam = {}
    for c in db.query(models.Capability).all():
        caps_by_fam.setdefault(c.family, []).append(c)

    FIRST = ["Rahul", "Sneha", "Arjun", "Kavya", "Rohan", "Ananya", "Karthik", "Divya", "Siddharth",
             "Meera", "Aditya", "Pooja", "Varun", "Ishita", "Nikhil", "Tara", "Aryan", "Riya",
             "Kabir", "Sanya", "Dev", "Naina", "Yash", "Aisha", "Manav", "Zara", "Veer", "Diya"]
    LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Mehta", "Joshi", "Rao", "Shah",
            "Kulkarni", "Bose", "Chopra", "Menon", "Verma"]

    TEMPLATES = [
        ("Finance", "Turnaround of a Distressed NBFC", 4),
        ("Finance", "Working Capital Crunch at a Mid-Cap", 2),
        ("Marketing", "Repositioning a Legacy FMCG Brand", 3),
        ("Marketing", "Go-to-Market for a D2C Launch", 1),
        ("HR", "Attrition Spike in a Tech Services Firm", 3),
        ("HR", "Designing a Hybrid-Work Policy", 2),
        ("Operations", "Supply-Chain Disruption Response", 5),
        ("Operations", "Lean Transformation of a Plant", 4),
    ]
    BODY = {
        "Finance": "restructuring the debt profile and tightening the cash-conversion cycle",
        "Marketing": "repositioning around a sharper value proposition with a phased go-to-market",
        "HR": "tackling the root causes of attrition through manager enablement and career pathing",
        "Operations": "diversifying the supplier base and running a lean programme on the top bottlenecks",
    }
    RF = {
        "Finance": ["What is the single biggest risk in your plan?", "How would you fund the turnaround?", "Which metric would you watch weekly?"],
        "Marketing": ["Who is your primary target segment and why?", "How do you measure early traction?", "State your differentiation in one line."],
        "HR": ["What leading indicator of attrition would you track?", "How do you get manager buy-in?", "What would you pilot first?"],
        "Operations": ["Where is the critical bottleneck?", "How do you de-risk the supply base?", "What is your fallback if lead times double?"],
    }
    QUESTIONS = {
        "Finance": ["Diagnose the root cause of the financial distress.", "Recommend a turnaround plan with a 90-day roadmap.", "How would you manage lenders and key stakeholders?"],
        "Marketing": ["Define the target segment and the core value proposition.", "Lay out a phased go-to-market plan.", "Which metrics prove early traction, and what are the risks?"],
        "HR": ["Identify the key drivers of attrition from the data.", "Design a retention plan with concrete interventions.", "How will you measure success over 6 months?"],
        "Operations": ["Map the critical bottlenecks in the operation.", "Propose a response plan with quick wins and structural fixes.", "How do you build resilience against future disruption?"],
    }
    ANS = {
        "Finance": ["The distress stems from an over-leveraged book and weak collections.", "I'd restructure debt, renegotiate covenants and tighten the cash cycle over 90 days.", "I'd keep lenders informed with a credible plan and ring-fence the distressed portfolio."],
        "Marketing": ["The beachhead segment is value-conscious urban millennials.", "Phase 1 digital-first launch, Phase 2 retail expansion once unit economics hold.", "Track CAC, repeat rate and NPS; main risk is channel saturation."],
        "HR": ["Attrition is concentrated in early-tenure engineers under two managers.", "Manager enablement, clearer career paths and targeted comp corrections.", "Track regretted attrition and engagement quarterly."],
        "Operations": ["The bottleneck is a single-source supplier for a critical component.", "Quick win: buffer stock; structural: dual-source and an S&OP cadence.", "Build supplier redundancy and scenario-plan for lead-time shocks."],
    }
    STRENGTHS = ["Clear problem framing", "Good use of data to support the recommendation", "Structured, MECE reasoning",
                 "Practical, sequenced action plan", "Strong awareness of trade-offs", "Considered stakeholder impact"]
    IMPROVE = ["Quantify the expected impact", "Surface assumptions explicitly", "Address downside risks more directly",
               "Prioritise the recommendations", "Tighten the executive summary", "Add leading indicators to track"]
    SUGGEST = ["Lead with a one-line recommendation before the analysis.",
               "Tie each action to a measurable outcome and an owner.",
               "Stress-test the plan against a worst-case scenario.",
               "Separate quick wins from structural changes."]

    def make_report(dept, title, score):
        result = "Pass" if score >= 75 else "Needs improvement" if score >= 70 else "Below threshold"
        opener = rnd.choice(["My recommendation centres on", "I would prioritise", "My analysis points to"])
        answer = (f"{opener} {BODY[dept]}. I would sequence this over a 90-day roadmap with clear owners, "
                  f"balancing short-term stability against long-term value, and track a small set of leading indicators. "
                  f"The key trade-off is pace versus risk, which I would manage through staged checkpoints.")
        # rapid-fire — quality scales with score
        rf = []
        for q in RF[dept]:
            r = rnd.random() + (score - 75) / 100
            verdict = "Solid" if r > 0.55 else "Partial" if r > 0.2 else "Weak"
            rf.append({"q": q, "a": "Addressed the core point with a concrete example." if verdict != "Weak"
                       else "Answer was vague and lacked specifics.", "assessment": verdict})
        return answer, {
            "result": result,
            "summary": (f"A {'strong' if score >= 80 else 'competent' if score >= 70 else 'limited'} response to "
                        f"'{title}'. {'Recommendation is well-justified.' if score >= 75 else 'Reasoning needs more depth and evidence.'}"),
            "strengths": rnd.sample(STRENGTHS, 2 if score < 75 else 3),
            "improvements": rnd.sample(IMPROVE, 1 if score >= 80 else 3),
            "rapid_fire": rf,
            "suggestions": rnd.sample(SUGGEST, 2),
        }

    for i, (dept, title, level) in enumerate(TEMPLATES):
        launch = now - timedelta(days=rnd.randint(7, 56))
        mode = "fixed_window" if i % 2 == 0 else "open"
        status = "inactive" if i == 6 else "active"
        assigned = rnd.randint(40, 110)
        # active fixed-window case studies close in the near future (so "time to close" is live)
        if mode == "fixed_window":
            close_at = now + timedelta(days=rnd.randint(3, 14), hours=rnd.randint(0, 23)) if status == "active" else launch + timedelta(days=14)
        else:
            close_at = None
        cs = models.CaseStudy(
            title=title, scenario=f"{title}: analyse the situation and recommend a course of action.",
            subject_id=subs[dept], author_id=dept_author[dept], level=level, status=status,
            launch_mode=mode, reading_time_sec=rnd.choice([180, 300, 420]),
            attempt_time_sec=rnd.choice([1500, 1800, 2400]), launch_at=launch,
            close_at=close_at, assigned_count=assigned)
        db.add(cs); db.flush()

        # map 2-3 capabilities (mostly Cognitive + one other family)
        fams = ["Cognitive"] + rnd.sample([f for f in caps_by_fam if f != "Cognitive"], 2)
        mapped = []
        for fam in fams:
            cap = rnd.choice(caps_by_fam[fam])
            db.add(models.CaseStudyCapability(case_study_id=cs.id, capability_id=cap.id))
            mapped.append(cap.name)

        # questions for this case study
        qs = QUESTIONS[dept]
        for qi, qtext in enumerate(qs):
            db.add(models.CaseStudyQuestion(case_study_id=cs.id, order=qi, text=qtext))

        # generate attempts (40-80% of assigned answered, plus a few in-progress)
        n_attempts = int(assigned * rnd.uniform(0.4, 0.8))
        for _ in range(n_attempts):
            name = f"{rnd.choice(FIRST)} {rnd.choice(LAST)}"
            roll = rnd.random()
            if roll < 0.08:
                status_a, score = "in_progress", None
            elif roll < 0.20:
                status_a, score = "disqualified", rnd.randint(40, 69)
            else:
                status_a = "completed"
                score = max(0, min(100, int(rnd.gauss(78 - (level - 3) * 4, 12))))
            cap_scores = ({c: max(0, min(100, int((score or 70) + rnd.randint(-10, 10)))) for c in mapped}
                          if score is not None else None)
            answer_text, ai_report = make_report(dept, title, score) if score is not None else (None, None)
            # per-question answers (assessment scales with score)
            q_answers = None
            if score is not None:
                q_answers = []
                for qi, qtext in enumerate(qs):
                    r = rnd.random() + (score - 75) / 100
                    verdict = "Solid" if r > 0.5 else "Partial" if r > 0.15 else "Weak"
                    ans = ANS[dept][qi] if verdict != "Weak" else "Brief, underdeveloped answer that misses key points."
                    q_answers.append({"q": qtext, "a": ans, "assessment": verdict})
            submitted = launch + timedelta(days=rnd.randint(0, 12), hours=rnd.randint(0, 23)) if status_a != "in_progress" else None
            db.add(models.CaseStudyAttempt(
                case_study_id=cs.id, student_name=name, department=dept, status=status_a, score=score,
                capability_scores=cap_scores, time_taken_sec=rnd.randint(600, cs.attempt_time_sec) if score is not None else None,
                revise_used=rnd.random() < 0.5 if score is not None else False,
                answer_text=answer_text, question_answers=q_answers, ai_report=ai_report,
                started_at=submitted or launch, submitted_at=submitted))
    db.commit()

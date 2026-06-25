import os, sqlite3
from functools import wraps
from flask import Flask, g, session, request, redirect, url_for, render_template, abort

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(APP_DIR, "pcdc.db")
app = Flask(__name__)
app.secret_key = "pcdc-prototype-secret"

# ---------------- DB ----------------
def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    d = g.pop("db", None)
    if d: d.close()

def init_db():
    con = sqlite3.connect(DB); cur = con.cursor()
    cur.executescript("""
    DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS subjects; DROP TABLE IF EXISTS capabilities;
    DROP TABLE IF EXISTS case_studies; DROP TABLE IF EXISTS attempts;
    CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT, subject TEXT, initials TEXT, department TEXT, experience TEXT, level TEXT, status TEXT);
    CREATE TABLE subjects(id INTEGER PRIMARY KEY, name TEXT, status TEXT);
    CREATE TABLE capabilities(id INTEGER PRIMARY KEY, family TEXT, name TEXT);
    CREATE TABLE case_studies(id INTEGER PRIMARY KEY, title TEXT, subject TEXT, difficulty TEXT, status TEXT, t_from TEXT, t_to TEXT, faculty TEXT);
    CREATE TABLE attempts(id INTEGER PRIMARY KEY, case_id INTEGER, student TEXT, initials TEXT, completion INTEGER, mark INTEGER, total INTEGER, qa TEXT, rf TEXT, status TEXT);
    """)
    users = [
        ("Anita Desai","admin@pcdc.in","admin123","admin",None,"AD",None,None,None,"active"),
        ("Dr. Sanjeev Patni","mentor@pcdc.in","mentor123","mentor","Marketing","SP","Marketing","14 yrs",None,"active"),
        ("Sanjay Kumar","student@pcdc.in","student123","student","Marketing","SK",None,None,"L2","active"),
        ("Aarti Menon","a.menon@pcdc.in","x","mentor","Finance","AM","Finance","9 yrs",None,"active"),
        ("Vikram Nair","v.nair@pcdc.in","x","mentor","HR","VN","HR","6 yrs",None,"invited"),
        ("Priya Mehta","priya.m@pcdc.in","x","student","Finance","PM",None,None,"L3","active"),
        ("Amit Sharma","amit.s@pcdc.in","x","student","Marketing","AS",None,None,"L1","active"),
        ("Neha Rao","neha.r@pcdc.in","x","student","Marketing","NR",None,None,"L2","active"),
        ("Tara Das","tara.d@pcdc.in","x","student","HR","TD",None,None,"L1","invited"),
    ]
    cur.executemany("INSERT INTO users(name,email,password,role,subject,initials,department,experience,level,status) VALUES(?,?,?,?,?,?,?,?,?,?)", users)
    cur.executemany("INSERT INTO subjects(name,status) VALUES(?,?)", [("Finance","active"),("Marketing","active"),("HR","active"),("Operations","active")])
    caps = {"Cognitive":["Analytical Thinking","Strategic Thinking","Decision Making"],
            "Leadership":["Communication","Influence","Negotiation","Conflict Resolution","Team Management"],
            "Entrepreneurial":["Opportunity Recognition","Innovation","Business Model Thinking","Risk Assessment","Resourcefulness"],
            "Professional":["Professional Judgment","Business Acumen","Execution Orientation","Learning Agility","Adaptability"]}
    for fam, lst in caps.items():
        for c in lst: cur.execute("INSERT INTO capabilities(family,name) VALUES(?,?)",(fam,c))
    cases = [
        ("Market Entry Crisis","Marketing","L2","Live","17 Jun","19 Jun","Dr. Sanjeev Patni"),
        ("Brand Revival","Marketing","L1","Live","15 Jun","18 Jun","Dr. Sanjeev Patni"),
        ("Cost Optimisation","Operations","L3","Live","16 Jun","20 Jun","Rahul Khan"),
        ("Hiring Crunch","HR","L4","Closed","10 Jun","14 Jun","Vikram Nair"),
        ("Growth Levers","Marketing","L3","Draft","","","Dr. Sanjeev Patni"),
    ]
    cur.executemany("INSERT INTO case_studies(title,subject,difficulty,status,t_from,t_to,faculty) VALUES(?,?,?,?,?,?,?)", cases)
    atts = [
        (1,"Sanjay Kumar","SK",100,8,10,"6 / 7","2 / 3","completed"),
        (1,"Neha Rao","NR",80,5,7,"4 / 5","1 / 2","incomplete"),
        (1,"Amit Sharma","AS",55,0,0,"—","—","rejected"),
        (2,"Sanjay Kumar","SK",100,8,10,"6 / 7","2 / 3","completed"),
    ]
    cur.executemany("INSERT INTO attempts(case_id,student,initials,completion,mark,total,qa,rf,status) VALUES(?,?,?,?,?,?,?,?,?)", atts)
    con.commit(); con.close()

# ---------------- auth ----------------
NAV = {
 "admin":[("Dashboard","▤","admin_dashboard"),("Campaigns","◆","admin_campaigns"),("Mentors","◑","admin_mentors"),("Students","◍","admin_students"),("Settings","⚙","admin_settings")],
 "mentor":[("Dashboard","▤","mentor_dashboard"),("Case Studies","◆","mentor_cases"),("Students","◍","mentor_students")],
 "student":[("Home","▤","student_home"),("My Tasks","◆","student_tasks"),("My Progress","◍","student_progress")],
}
def current_user():
    uid = session.get("uid")
    if not uid: return None
    return db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()

def login_required(role=None):
    def deco(fn):
        @wraps(fn)
        def wrap(*a, **k):
            u = current_user()
            if not u: return redirect(url_for("login"))
            if role and u["role"] != role: return redirect(url_for("home"))
            return fn(*a, **k)
        return wrap
    return deco

@app.context_processor
def inject():
    u = current_user()
    return dict(user=u, NAV=NAV, role=(u["role"] if u else None))

@app.route("/")
def home():
    u = current_user()
    if not u: return redirect(url_for("login"))
    return redirect(url_for(f"{u['role']}_dashboard" if u["role"]!="student" else "student_home"))

@app.route("/login", methods=["GET","POST"])
def login():
    err = None
    if request.method == "POST":
        row = db().execute("SELECT * FROM users WHERE email=? AND password=?", (request.form.get("email","").strip(), request.form.get("password",""))).fetchone()
        if row:
            session["uid"] = row["id"]; return redirect(url_for("home"))
        err = "Invalid credentials. Try one of the demo logins below."
    return render_template("login.html", err=err)

@app.route("/switch/<role>")  # demo convenience: jump between the 3 seeded logins
def switch(role):
    emap = {"admin":"admin@pcdc.in","mentor":"mentor@pcdc.in","student":"student@pcdc.in"}
    row = db().execute("SELECT * FROM users WHERE email=?", (emap.get(role,""),)).fetchone()
    if row: session["uid"] = row["id"]
    return redirect(url_for("home"))

@app.route("/logout")
def logout():
    session.clear(); return redirect(url_for("login"))

# ---------------- ADMIN ----------------
@app.route("/admin")
@login_required("admin")
def admin_dashboard():
    d = db()
    stats = dict(students=d.execute("SELECT COUNT(*) c FROM users WHERE role='student'").fetchone()["c"],
                 mentors=d.execute("SELECT COUNT(*) c FROM users WHERE role='mentor'").fetchone()["c"],
                 live=d.execute("SELECT COUNT(*) c FROM case_studies WHERE status='Live'").fetchone()["c"],
                 subjects=d.execute("SELECT COUNT(*) c FROM subjects").fetchone()["c"])
    cases = d.execute("SELECT * FROM case_studies WHERE status!='Draft' ORDER BY id LIMIT 4").fetchall()
    return render_template("admin_dashboard.html", active="admin_dashboard", stats=stats, cases=cases)

@app.route("/admin/subjects", methods=["GET","POST"])
@login_required("admin")
def admin_subjects():
    d = db()
    if request.method == "POST" and request.form.get("name"):
        d.execute("INSERT INTO subjects(name,status) VALUES(?,?)", (request.form["name"].strip(),"active")); d.commit()
        return redirect(url_for("admin_subjects"))
    rows = d.execute("SELECT * FROM subjects ORDER BY id").fetchall()
    return render_template("admin_subjects.html", active="admin_settings", subjects=rows)

@app.route("/admin/subjects/delete/<int:sid>")
@login_required("admin")
def admin_subject_delete(sid):
    db().execute("DELETE FROM subjects WHERE id=?", (sid,)); db().commit()
    return redirect(url_for("admin_subjects"))

@app.route("/admin/settings")
@login_required("admin")
def admin_settings():
    d = db()
    caps = {}
    for r in d.execute("SELECT * FROM capabilities ORDER BY id").fetchall():
        caps.setdefault(r["family"], []).append(r["name"])
    subjects = d.execute("SELECT * FROM subjects ORDER BY id").fetchall()
    return render_template("admin_settings.html", active="admin_settings", caps=caps, subjects=subjects)

@app.route("/admin/mentors")
@login_required("admin")
def admin_mentors():
    rows = db().execute("SELECT * FROM users WHERE role='mentor' ORDER BY id").fetchall()
    return render_template("admin_mentors.html", active="admin_mentors", mentors=rows)

@app.route("/admin/students")
@login_required("admin")
def admin_students():
    rows = db().execute("SELECT * FROM users WHERE role='student' ORDER BY id").fetchall()
    return render_template("admin_students.html", active="admin_students", students=rows)

@app.route("/admin/campaigns")
@login_required("admin")
def admin_campaigns():
    rows = db().execute("""SELECT c.*, (SELECT COUNT(*) FROM attempts a WHERE a.case_id=c.id) resp
                           FROM case_studies c WHERE status!='Draft' ORDER BY id""").fetchall()
    return render_template("admin_campaigns.html", active="admin_campaigns", cases=rows)

@app.route("/admin/campaign/<int:cid>")
@login_required("admin")
def admin_campaign_detail(cid):
    c = db().execute("SELECT * FROM case_studies WHERE id=?", (cid,)).fetchone() or abort(404)
    atts = db().execute("SELECT * FROM attempts WHERE case_id=?", (cid,)).fetchall()
    return render_template("admin_campaign_detail.html", active="admin_campaigns", c=c, attempts=atts)

@app.route("/admin/scorecard/<int:aid>")
@login_required("admin")
def admin_scorecard(aid):
    a = db().execute("SELECT a.*, c.title, c.subject, c.difficulty, c.t_from, c.t_to FROM attempts a JOIN case_studies c ON c.id=a.case_id WHERE a.id=?", (aid,)).fetchone() or abort(404)
    return render_template("scorecard.html", active="admin_campaigns", a=a, back=url_for("admin_campaign_detail", cid=a["case_id"]))

# ---------------- MENTOR ----------------
def mentor_subject():
    u = current_user(); return u["subject"]

@app.route("/mentor")
@login_required("mentor")
def mentor_dashboard():
    subj = mentor_subject(); d = db()
    cases = d.execute("SELECT * FROM case_studies WHERE subject=? AND status='Live'", (subj,)).fetchall()
    rejected = d.execute("SELECT COUNT(*) c FROM attempts a JOIN case_studies cs ON cs.id=a.case_id WHERE cs.subject=? AND a.status='rejected'", (subj,)).fetchone()["c"]
    mine = d.execute("SELECT COUNT(*) c FROM case_studies WHERE subject=?", (subj,)).fetchone()["c"]
    return render_template("mentor_dashboard.html", active="mentor_dashboard", subj=subj, cases=cases, rejected=rejected, mine=mine)

@app.route("/mentor/cases")
@login_required("mentor")
def mentor_cases():
    rows = db().execute("""SELECT c.*, (SELECT COUNT(*) FROM attempts a WHERE a.case_id=c.id) resp
                           FROM case_studies c WHERE subject=? ORDER BY id""", (mentor_subject(),)).fetchall()
    return render_template("mentor_cases.html", active="mentor_cases", cases=rows)

@app.route("/mentor/case/new", methods=["GET","POST"])
@login_required("mentor")
def mentor_case_new():
    d = db()
    if request.method == "POST":
        d.execute("INSERT INTO case_studies(title,subject,difficulty,status,t_from,t_to,faculty) VALUES(?,?,?,?,?,?,?)",
                  (request.form.get("title","Untitled"), mentor_subject(), request.form.get("difficulty","L2"),
                   "Live", request.form.get("t_from",""), request.form.get("t_to",""), current_user()["name"])); d.commit()
        return redirect(url_for("mentor_cases"))
    caps = {}
    for r in d.execute("SELECT * FROM capabilities ORDER BY id").fetchall():
        caps.setdefault(r["family"], []).append(r["name"])
    subjects = [r["name"] for r in d.execute("SELECT name FROM subjects").fetchall()]
    return render_template("mentor_case_create.html", active="mentor_cases", caps=caps, subjects=subjects, subj=mentor_subject())

@app.route("/mentor/responses/<int:cid>")
@login_required("mentor")
def mentor_responses(cid):
    c = db().execute("SELECT * FROM case_studies WHERE id=?", (cid,)).fetchone() or abort(404)
    atts = db().execute("SELECT * FROM attempts WHERE case_id=?", (cid,)).fetchall()
    return render_template("mentor_responses.html", active="mentor_cases", c=c, attempts=atts)

@app.route("/mentor/scorecard/<int:aid>")
@login_required("mentor")
def mentor_scorecard(aid):
    a = db().execute("SELECT a.*, c.title, c.subject, c.difficulty, c.t_from, c.t_to FROM attempts a JOIN case_studies c ON c.id=a.case_id WHERE a.id=?", (aid,)).fetchone() or abort(404)
    return render_template("scorecard.html", active="mentor_cases", a=a, back=url_for("mentor_responses", cid=a["case_id"]), faculty=True)

@app.route("/mentor/students")
@login_required("mentor")
def mentor_students():
    rows = db().execute("SELECT * FROM users WHERE role='student' AND subject=? ORDER BY id", (mentor_subject(),)).fetchall()
    return render_template("mentor_students.html", active="mentor_students", students=rows)

# ---------------- STUDENT ----------------
@app.route("/student")
@login_required("student")
def student_home():
    u = current_user(); d = db()
    tasks = d.execute("SELECT * FROM case_studies WHERE subject=? AND status='Live'", (u["subject"],)).fetchall()
    return render_template("student_home.html", active="student_home", tasks=tasks)

@app.route("/student/tasks")
@login_required("student")
def student_tasks():
    u = current_user(); d = db()
    tasks = d.execute("SELECT * FROM case_studies WHERE subject=? AND status IN ('Live','Closed')", (u["subject"],)).fetchall()
    done = {r["case_id"]: r for r in d.execute("SELECT * FROM attempts WHERE student=?", (u["name"],)).fetchall()}
    return render_template("student_tasks.html", active="student_tasks", tasks=tasks, done=done)

@app.route("/student/assessment/<int:cid>")
@login_required("student")
def student_assessment(cid):
    c = db().execute("SELECT * FROM case_studies WHERE id=?", (cid,)).fetchone() or abort(404)
    return render_template("student_assessment.html", active="student_tasks", c=c)

@app.route("/student/progress")
@login_required("student")
def student_progress():
    return render_template("student_progress.html", active="student_progress")

if __name__ == "__main__":
    if not os.path.exists(DB): init_db()
    app.run(host="127.0.0.1", port=8099, debug=False)

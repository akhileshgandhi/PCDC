-- Database schema for the PCDC application

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('student', 'faculty', 'mentor', 'admin', 'director')),
    program VARCHAR(100),
    specialization VARCHAR(100),
    admission_year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS career_tracks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    mentor_id INT REFERENCES users(id),
    career_track_id INT REFERENCES career_tracks(id),
    current_level INT CHECK (current_level BETWEEN 1 AND 7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_mentor_id ON students(mentor_id);
CREATE INDEX idx_students_career_track_id ON students(career_track_id);

CREATE TABLE IF NOT EXISTS capabilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    weightage INT
);

INSERT INTO capabilities (name, weightage) VALUES
('Communication', 1),
('Leadership', 1),
('Problem Solving', 1),
('Decision Making', 1),
('Innovation', 1),
('Strategic Thinking', 1),
('Entrepreneurship', 1),
('Professionalism', 1);

CREATE TABLE IF NOT EXISTS student_capabilities (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    capability_id INT REFERENCES capabilities(id),
    current_score INT DEFAULT 50,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_capabilities_student_id ON student_capabilities(student_id);
CREATE INDEX idx_student_capabilities_capability_id ON student_capabilities(capability_id);

CREATE TABLE IF NOT EXISTS simulations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    difficulty INT CHECK (difficulty BETWEEN 1 AND 7),
    duration_minutes INT,
    created_by INT REFERENCES users(id),
    source VARCHAR(50) CHECK (source IN ('ai_generated', 'faculty', 'industry', 'case_study')),
    status VARCHAR(20) CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulations_created_by ON simulations(created_by);

CREATE TABLE IF NOT EXISTS simulation_attempts (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    simulation_id INT REFERENCES simulations(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    quality_score INT,
    logic_score INT,
    innovation_score INT,
    time_score INT,
    reflection_score INT,
    total_score INT,
    status VARCHAR(20) CHECK (status IN ('in_progress', 'completed'))
);

CREATE INDEX idx_simulation_attempts_student_id ON simulation_attempts(student_id);
CREATE INDEX idx_simulation_attempts_simulation_id ON simulation_attempts(simulation_id);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    simulation_id INT REFERENCES simulations(id),
    attempt_id INT REFERENCES simulation_attempts(id),
    role VARCHAR(20) CHECK (role IN ('student', 'ai')),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reflections (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    attempt_id INT REFERENCES simulation_attempts(id),
    reflection_text TEXT,
    score INT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentors (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    department VARCHAR(100),
    max_students INT DEFAULT 25
);

CREATE TABLE IF NOT EXISTS interventions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    mentor_id INT REFERENCES users(id),
    action_taken TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    badge_name VARCHAR(100),
    description TEXT,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

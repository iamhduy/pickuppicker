CREATE TABLE IF NOT EXISTS players
(
    id        SERIAL PRIMARY KEY,
    username  TEXT UNIQUE,
    hashed_pw TEXT,
    salt      TEXT
);

CREATE TABLE IF NOT EXISTS sessions
(
    id    SERIAL PRIMARY KEY,
    date  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    owner INTEGER REFERENCES players (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game
(
    id          SERIAL PRIMARY KEY,
    session_id  INTEGER REFERENCES sessions (id) ON DELETE CASCADE,
    team1_id    INTEGER,
    team2_id    INTEGER,
    team1_score INTEGER,
    team2_score INTEGER
);

CREATE TABLE IF NOT EXISTS session_player
(
    player_id INTEGER REFERENCES players (id) ON DELETE CASCADE,
    session_id  INTEGER REFERENCES sessions (id) ON DELETE CASCADE,
    team_id INTEGER
);



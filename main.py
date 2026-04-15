from contextlib import asynccontextmanager
from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Depends, Body, Request
from database import get_db, init_db, feed_data
from utils import get_current_user, create_jwt, encode_pw
from fastapi.middleware.cors import CORSMiddleware


def should_initialize():
    with get_db() as conn:
        with conn.cursor() as c:
            # Check if the players table already exists
            c.execute("""
                      SELECT EXISTS (SELECT
                                     FROM information_schema.tables
                                     WHERE table_name = 'players');
                      """)
            return not c.fetchone()[0]  # Returns True if table does NOT exist


@asynccontextmanager
async def lifespan(app: FastAPI):
    if should_initialize():
        print("Volume is empty. Initializing DB...")
        init_db()
        # feed_data()
        print("Initializing DB complete")
    else:
        print("Volume detected with existing data. Skipping initialization.")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Add your frontend URLs here. Vite usually runs on localhost:5173
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)


@app.get("/")
def home():
    return {"message": "hello"}


############
# Players  #
############
@app.get("/players")
def get_all_players():
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id, username FROM players")
    rows = c.fetchall()

    users = []
    for r in rows:
        user_info = dict()
        user_info["id"] = r[0]
        user_info["username"] = r[1]
        users.append(user_info)

    return users


@app.post("/create_player")
def create_player(username: str = Form(default=None), password: str = Form(default=None),
                  salt: str = Form(default="XD")):
    conn = get_db()
    c = conn.cursor()

    # CHECK FOR SAME USERNAME
    c.execute("SELECT id FROM players WHERE username = %s", (username,))
    if c.fetchone():
        raise HTTPException(status_code=422, detail="Username is already existed")

    encrypted_pw = encode_pw(password, salt)
    player_info = (username, encrypted_pw, salt)

    c.execute("INSERT INTO players (username, hashed_pw, salt) VALUES (%s, %s, %s) RETURNING id", player_info)
    user_id = c.fetchone()[0]
    conn.commit()
    conn.close()

    return {"message": f'Player {user_id} created with username {username}'}


@app.delete("/{player_id}/delete_player")
def delete_player(player_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE from players WHERE id = %s", (player_id,))
    conn.commit()
    conn.close()
    return {"message": f'Player {player_id} deleted'}


@app.post("/login")
def login(username: str = Form(default=None), password: str = Form(default=None)):
    user_info = verify_username(username)
    if not user_info:
        raise HTTPException(status_code=404, detail="No corresponding player with this username")
    else:
        user_id, username, hashed_pw, salt = user_info
        if encode_pw(password, salt) != hashed_pw:
            jwt = ''
            msg = "Incorrect password"
        else:
            jwt = create_jwt(user_id, username)
            msg = "Login successfully"

    # return jwt
    return {"message": msg, "jwt": jwt}


############
# Sessions #
############

@app.get("/sessions")
def get_all_sessions():
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM sessions")
    rows = c.fetchall()

    sessions = []
    for r in rows:
        session_info = dict()
        session_id = r[0]
        session_info["id"] = session_id
        session_info["owner"] = get_username_by_id(r[2])
        session_info["date"] = r[1].strftime("%m/%d/%Y")

        c.execute("SELECT COUNT(*) FROM session_player WHERE session_id = %s", (session_id,))
        session_info["player joined"] = c.fetchone()[0]

        sessions.append(session_info)

    conn.close()
    return sessions


@app.post("/sessions/{session_id}/join_session")
def join_session(session_id: int, user: dict = Depends(get_current_user)):
    user_id = user["id"]

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM session_player WHERE session_id = %s AND user_id = %s", (session_id, user_id))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=422, detail="User have already joined")

    c.execute("INSERT INTO session_player VALUES (%s, %s, %s)", (user_id, session_id, 0))
    conn.commit()
    conn.close()

    return {"message": f'Player {get_username_by_id(user_id)} join session {session_id}'}


@app.post("/add_session")
def add_session(session_date: str = Form(default=None), user: dict = Depends(get_current_user)):
    if not session_date:
        raise HTTPException(status_code=422, detail="Session date must not be None")

    user_id = user["id"]
    conn = get_db()
    c = conn.cursor()

    # Change this to jwt - authentication later
    c.execute("INSERT INTO sessions (date, owner) VALUES (%s, %s)", (session_date, user_id))

    conn.commit()
    conn.close()

    return {"message": f'Session created by player {get_username_by_id(user_id)}', "date": session_date}


@app.delete("/{session_id}/delete_session")
def delete_session(session_id: int):
    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM sessions WHERE id = %s", (session_id,))

    conn.commit()
    conn.close()
    return {"message": f'Session {session_id} deleted'}


@app.get("/sessions/{session_id}")
def view_session_by_id(session_id: int):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM sessions WHERE id = %s", (session_id,))
    session_info = c.fetchone()
    date = session_info[1].strftime("%m/%d/%Y")
    owner = get_username_by_id(session_info[2])

    c.execute("SELECT player_id, team_id FROM session_player WHERE session_id = %s", (session_id,))
    rows = c.fetchall()
    conn.close()

    players = []
    for r in rows:
        player_id, team_id = r
        info = {"player": get_username_by_id(player_id), "team": team_id}
        players.append(info)

    return {"id": session_id, "date": date, "owner": owner, "players": players}


@app.post("/sessions/{session_id}/add_game")
def create_new_game(session_id: int, team1: int = Form(default=None), team2: int = Form(default=None)):
    conn = get_db()
    c = conn.cursor()

    c.execute("INSERT INTO game (session_id, team1_id, team2_id, team1_score, team2_score) WHERE id = %s RETURNING id",
              (session_id, team1, team2, 0, 0))
    game_id = c.fetchone()[0]
    conn.commit()
    conn.close()
    return {"message": f'Game {game_id} created'}


@app.post("/sessions/{session_id}/update_team")
def join_team(session_id, player_id: int = Form(default=None), team_id: int = Form(default=None)):
    if team_id > 3 or team_id < 0:
        raise HTTPException(status_code=404, detail="No team with this id")

    conn = get_db()
    c = conn.cursor()

    c.execute("UPDATE session_player SET team_id = %s WHERE player_id = %s AND session_id = %s",
              (team_id, player_id, session_id))

    conn.commit()
    conn.close()
    return {"message": f'Player {get_username_by_id(player_id)} join team {team_id}'}


##########
# Games  #
##########
@app.get("games/{game_id}")
def get_game(game_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT team1_score, team2_score FROM game WHERE game_id = %s", (game_id,))
    team1_score, team2_score = c.fetchone()

    conn.close()
    return {'id': game_id, 'team1': team1_score, 'team2': team2_score}


@app.post("games/{game_id}/update")
def update_game(game_id: int, new_team1_score: int = Form(default=None), new_team2_score: int = Form(default=None)):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT team1_score, team2_score FROM game WHERE game_id = %s", (game_id,))

    cur_team1_score, cur_team2_score = c.fetchone()
    if not new_team1_score:
        new_team1_score = cur_team1_score

    if not new_team2_score:
        new_team2_score = cur_team2_score

    c.execute("UPDATE game SET team1_score = %s, team2_score = %s WHERE game_id = %s",
              (new_team1_score, new_team2_score, game_id))

    conn.commit()
    conn.close()
    return {"message": f'Game {game_id} updated'}


def verify_username(username: str):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM players WHERE username = %s", (username,))
    row = c.fetchone()

    conn.close()
    return row if row else False


def get_username_by_id(user_id: int):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM players WHERE id = %s", (user_id,))
    row = c.fetchone()

    conn.close()
    return row[1] if row else False

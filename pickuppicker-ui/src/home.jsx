import React, {useState, useEffect} from 'react';
import {Link} from 'react-router-dom';
import Navbar from "./navbar.jsx";

const API_BASE = "http://localhost:8080";

// A small helper function to decode the JWT and extract the user's name
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export default function Home() {
    const [jwt, setJwt] = useState(localStorage.getItem("jwt"));
    const [usernameInput, setUsernameInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [sessions, setSessions] = useState([]);

    const userInfo = jwt ? parseJwt(jwt) : null;

    // Fetch the list of sessions when the user is logged in
    useEffect(() => {
        if (jwt) {
            fetch(`${API_BASE}/sessions`)
                .then(res => res.json())
                .then(data => setSessions(data))
                .catch(err => console.error("Error fetching sessions:", err));
        }
    }, [jwt]);

    const handleLogin = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("username", usernameInput);
        formData.append("password", passwordInput);

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (response.ok && data.jwt) {
                localStorage.setItem("jwt", data.jwt);
                setJwt(data.jwt);
            } else {
                alert(data.message || "Login failed");
            }
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("jwt");
        setJwt(null);
    };

    const handleDeleteSession = async (sessionId) => {
        // Adding a confirmation so you don't accidentally delete!
        if (!window.confirm("Are you sure you want to delete this session?")) return;

        try {
            const response = await fetch(`${API_BASE}/${sessionId}/delete_session`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove the deleted session from the screen immediately
                setSessions(sessions.filter(s => s.id !== sessionId));
            } else {
                console.error("Failed to delete session");
            }
        } catch (error) {
            console.error("Error deleting session:", error);
        }
    };

    // ----------------------------------------
    // LOGGED IN VIEW (Dashboard)
    // ----------------------------------------
    if (jwt && userInfo) {
        return (
            <div style={{fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem'}}>

                {/* TOP NAVIGATION CONTAINER */}
                <Navbar userInfo={userInfo} onLogout={handleLogout}/>

                {/* MAIN CONTENT: SESSIONS LIST */}
                <div style={{marginTop: '2rem'}}>
                    <h3>Available Sessions</h3>
                    {sessions.length === 0 ? (
                        <p>No sessions found.</p>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            {sessions.map(session => (
                                <div key={session.id} style={{
                                    border: '1px solid #ccc',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <strong>Date:</strong> {session.date} <br/>
                                        <small>Owner: {session.owner} | Players
                                            joined: {session["player joined"]}</small>
                                    </div>
                                    {/* React Router Link to navigate to the session board */}
                                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                        <Link
                                            to={`/sessions/${session.id}`}
                                            style={{
                                                background: '#2ecc71',
                                                color: 'white',
                                                padding: '8px 16px',
                                                textDecoration: 'none',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            View Session
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteSession(session.id)}
                                            style={{
                                                background: '#e74c3c',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'white',
                                                padding: '8px 16px',
                                                textDecoration: 'none',
                                                borderRadius: '4px'
                                            }}
                                            title="Delete Session"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        );
    }

    // ----------------------------------------
    // LOGGED OUT VIEW (Login Form)
    // ----------------------------------------
    return (
        <div style={{padding: '2rem', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto'}}>
            <h1>Login</h1>
            <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <input
                    placeholder="Username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    style={{padding: '10px', fontSize: '1rem'}}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={{padding: '10px', fontSize: '1rem'}}
                />
                <button type="submit" style={{
                    padding: '10px',
                    fontSize: '1rem',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                }}>
                    Log In
                </button>
            </form>
        </div>
    );
}
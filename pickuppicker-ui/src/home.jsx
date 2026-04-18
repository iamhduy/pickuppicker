import React, {useState, useEffect} from 'react';
import {Link} from 'react-router-dom';
import Navbar from './navbar.jsx';
import {parseJwt} from './utils.js';

const API_BASE = "https://pickuppicker-backend-299980199441.us-east1.run.app";

export default function Home() {
    const [jwt, setJwt] = useState(localStorage.getItem("jwt"));
    const [usernameInput, setUsernameInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [sessions, setSessions] = useState([]);
    const homeText = "Pickup Picker";
    // Toggle between Login and Sign Up views
    const [isLoginView, setIsLoginView] = useState(true);

    // Use for session create func
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState("");
    const [createStatus, setCreateSessionStatus] = useState(true);
    const [newSessionName, setNewSessionName] = useState("test");

    const userInfo = jwt ? parseJwt(jwt) : null;

    const fetchSessions = () => {
        if (jwt) {
            fetch(`${API_BASE}/sessions`)
                .then(res => res.json())
                .then(data => setSessions(data))
                .catch(err => console.error("Error fetching sessions:", err));
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [jwt]);

    const handleLogin = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("username", usernameInput);
        formData.append("password", passwordInput);

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                body: formData,
                headers: {
                    "ngrok-skip-browser-warning": "69420"
                }
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

    // Sign Up Handler
    const handleSignup = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("username", usernameInput);
        formData.append("password", passwordInput);

        try {
            const response = await fetch(`${API_BASE}/create_player`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (response.ok) {
                alert("Account created successfully! Please log in.");
                setIsLoginView(true); // Switch the form back to login mode
                setPasswordInput(""); // Clear the password field for safety
            } else {
                alert(data.detail || "Failed to create account");
            }
        } catch (error) {
            console.error("Signup error:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("jwt");
        setJwt(null);
    };

    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to delete this session?")) return;

        try {
            const response = await fetch(`${API_BASE}/${sessionId}/delete_session`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setSessions(sessions.filter(s => s.id !== sessionId));
            } else {
                console.error("Failed to delete session");
            }
        } catch (error) {
            console.error("Error deleting session:", error);
        }
    };

    const handleCreateSession = async (e) => {
        if (!createStatus) return;
        setCreateSessionStatus(false);
        e.preventDefault();
        const formData = new FormData();
        formData.append("session_date", newSessionDate);
        formData.append("session_name", newSessionName);

        try {
            const response = await fetch(`${API_BASE}/add_session`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${jwt}`
                },
                body: formData
            });

            if (response.ok) {
                setShowCreateModal(false);
                setNewSessionDate("");     // Reset the input
                fetchSessions();

                const data = await response.json();
                alert(data.message || "Failed to display message...");
            } else {
                console.error("Failed to create session");
            }
        } catch (error) {
            console.error("Error creating session:", error);
        } finally {
            setCreateSessionStatus(true);
        }
    };

    // --- LOGGED IN VIEW ---
    if (jwt && userInfo) {
        return (
            <div style={{fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem'}}>
                <Navbar userInfo={userInfo} onLogout={handleLogout} navBarText={homeText}/>

                <div style={{marginTop: '2rem'}}>
                    {/* Header Row with Flexbox to align title and button */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h3 style={{margin: 0}}>Available Sessions</h3>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                background: "none",
                                color: 'black',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            + New session
                        </button>
                    </div>
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
                                        <strong>Name:</strong> {session.name} <br/>
                                        <strong>Date:</strong> {session.date} <br/>
                                        <small>Owner: {session.owner} | Players
                                            joined: {session["player joined"]}</small>
                                    </div>

                                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                        <Link
                                            to={`/sessions/${session.id}`}
                                            style={{
                                                background: '#509384',
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

                {/* Create Session Modal */}
                {showCreateModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '8px',
                            width: '350px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{marginTop: 0}}>Create New Session</h3>
                            <form onSubmit={handleCreateSession}
                                  style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                <label>
                                    Session name:
                                    <input
                                        type="text"
                                        value={newSessionName}
                                        onChange={(e) => setNewSessionName(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            marginTop: '5px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </label>

                                <label>
                                    Select Date & Time:
                                    {/* Using datetime-local provides a native calendar and clock UI */}
                                    <input
                                        type="datetime-local"
                                        value={newSessionDate}
                                        onChange={(e) => setNewSessionDate(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            marginTop: '5px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </label>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px',
                                    marginTop: '10px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        style={{
                                            background: '#ccc',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            background: '#2ecc71',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }


// --- LOGGED OUT VIEW (Login / Sign Up Form) ---
    return (
        <div style={{padding: '2rem', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto'}}>
            <h1>{isLoginView ? "Login" : "Create Account"}</h1>

            <form onSubmit={isLoginView ? handleLogin : handleSignup}
                  style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <input
                    placeholder="Username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    style={{padding: '10px', fontSize: '1rem'}}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={{padding: '10px', fontSize: '1rem'}}
                    required
                />
                <button type="submit" style={{
                    padding: '10px',
                    fontSize: '1rem',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px'
                }}>
                    {isLoginView ? "Log In" : "Sign Up"}
                </button>
            </form>

            {/* Toggle Button */}
            <div style={{marginTop: '1rem', textAlign: 'center'}}>
                <button
                    onClick={() => setIsLoginView(!isLoginView)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#3498db',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '0.9rem'
                    }}
                >
                    {isLoginView ? "Sign up" : "Already have an account? Log in"}
                </button>
            </div>

        </div>
    );
}
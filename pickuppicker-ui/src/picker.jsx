import React, {useState, useEffect} from 'react';
import {DragDropContext, Droppable, Draggable} from '@hello-pangea/dnd';
import {useParams, useNavigate} from 'react-router-dom';
import Navbar from "./navbar.jsx";
import {parseJwt} from "./utils.js";


const API_BASE = "https://unnoisy-dorthy-intermeningeal.ngrok-free.dev";

export default function PickupPicker() {
    const {sessionId} = useParams();
    const navigate = useNavigate();
    const homeText = '< All sessions';
    // Grab the login state
    const [jwt, setJwt] = useState(localStorage.getItem("jwt"));
    const userInfo = jwt ? parseJwt(jwt) : null;

    const [alreadyJoined, setJoinStatus] = useState(false);
    const [isKeeper, setKeeperStatus] = useState(false);

    const [sessionDetails, setSessionDetails] = useState(null);

    // Create the logout function for this page
    const handleLogout = () => {
        localStorage.removeItem("jwt");
        setJwt(null);
        navigate('/');
    };
    const [teams, setTeams] = useState({
        "0": [], // Unassigned Players
        "1": [], // Team 1
        "2": [], // Team 2
        "3": [], // Team 3
        "4": [], // Team 4
        "cap": [] // Cap
    });

    const fetchBoardData = async () => {
        try {
            //const playerRes = await fetch(`${API_BASE}/players`);
            //const allPlayers = await playerRes.json();

            const sessionRes = await fetch(`${API_BASE}/sessions/${sessionId}`);
            const sessionData = await sessionRes.json();

            const allPlayers = sessionData.players;
            const allKeepers = sessionData.keepers;
            setSessionDetails(sessionData);

            const newTeams = {"0": [], "1": [], "2": [], "3": [], "4": [], "cap": []};
            const assignedPlayerIds = new Set();

            allPlayers.forEach(p => {
                if (p) {
                    newTeams[p.team.toString()].push(p);
                    assignedPlayerIds.add(p.id);
                }
            });

            if (allKeepers) {
                setKeeperStatus(false);
                allKeepers.forEach(k => {
                    if (k) {
                        newTeams["cap"].push(k);
                        assignedPlayerIds.add(k.id);

                        if (k.id === userInfo.id) {
                            setKeeperStatus(true);
                        }
                    }
                });

            }

            if (assignedPlayerIds.has(userInfo.id)) {
                setJoinStatus(true);
            } else {
                setJoinStatus(false);
            }

            setTeams(newTeams);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // Fetch initial data to populate the board
    // Use a single useEffect to handle initial load AND the WebSocket
    useEffect(() => {
        if (!userInfo) {
            navigate('/'); // Send them back to the login screen
            return;
        }

        // Fetch immediately when the page loads
        fetchBoardData();

        // Connect to the FastAPI WebSocket
        // Note: We use ws:// instead of http://
        // Instead of hardcoding the URL, we build it based on Vercel's secure domain
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${API_BASE}/ws/sessions/${sessionId}`);
        // This swaps "http" for "ws" automatically!
        //const WS_BASE = API_BASE.replace(/^http/, 'ws');
        //const ws = new WebSocket(`${WS_BASE}/ws/sessions/${sessionId}`);
        //const ws = new WebSocket(`ws://localhost:8080/ws/sessions/${sessionId}`);

        // Listen for messages from the server
        ws.onmessage = (event) => {
            if (event.data === "BOARD_UPDATED") {
                console.log("Someone else moved a player! Refreshing board...");
                fetchBoardData()
            }
        };

        // Cleanup function: Close the connection if the user leaves the page
        return () => {
            ws.close();
        };
    }, [sessionId]);

    // Handle the drag-and-drop event
    const onDragEnd = async (result) => {
        const {source, destination, draggableId} = result;

        // Dropped outside the list
        if (!destination) return;

        // Dropped in the same place
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const sourceTeamId = source.droppableId;
        const destTeamId = destination.droppableId;
        const playerId = draggableId; // This is the stringified player ID

        // Optimistically update the UI state
        const sourceClone = Array.from(teams[sourceTeamId]);
        const destClone = Array.from(teams[destTeamId]);
        const [movedPlayer] = sourceClone.splice(source.index, 1);
        destClone.splice(destination.index, 0, movedPlayer);

        setTeams({
            ...teams,
            [sourceTeamId]: sourceClone,
            [destTeamId]: destClone
        });

        // Send update to FastAPI using FormData
        const formData = new FormData();
        formData.append('player_id', parseInt(playerId));
        formData.append('team_id', parseInt(destTeamId));

        try {
            const response = await fetch(`${API_BASE}/sessions/${sessionId}/update_team`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // You can add a toast notification here confirming the move
        } catch (error) {
            console.error("Failed to update team on server. Reverting UI state.", error);
            // Optional: Revert the UI state if the API call fails
        }
    };

    const joinSession = async (sessionId) => {
        try {
            const response = await fetch(`${API_BASE}/sessions/${sessionId}/join_session`, {
                method: "POST",
                headers: {
                    // Your backend requires a valid user to create a session
                    "Authorization": `Bearer ${jwt}`
                }
            });
            if (response.ok) {
                setJoinStatus(true);
            } else {
                console.error("Failed to join session");
            }
        } catch (error) {
            console.error("Error joining session:", error);
        }
    };

    const leaveSession = async (sessionId) => {
        try {
            const response = await fetch(`${API_BASE}/sessions/${sessionId}/leave`, {
                method: "POST",
                headers: {
                    // Your backend requires a valid user to create a session
                    "Authorization": `Bearer ${jwt}`
                }
            });
            if (response.ok) {
                setJoinStatus(false);
                navigate('/');
            } else {
                console.error("Failed to leave session");
            }
        } catch (error) {
            console.error("Error leaving session:", error);
        }
    };

    const joinKeeper = async (sessionId) => {
        if (sessionDetails.keepers.length >= 4) {
            alert("Maximum amount of keeper is 4");
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/sessions/${sessionId}/captain`, {
                method: "POST",
                headers: {
                    // Your backend requires a valid user to create a session
                    "Authorization": `Bearer ${jwt}`
                }
            });
            if (response.ok) {
                setKeeperStatus(true);
                console.log("Be a cap successfully!");
            } else {
                console.error("Failed to join keeper");
            }
        } catch (error) {
            console.error("Error joining keeper:", error);
        }
    };

    const leaveKeeper = async (sessionId) => {
        try {
            const response = await fetch(`${API_BASE}/sessions/${sessionId}/player`, {
                method: "POST",
                headers: {
                    // Your backend requires a valid user to create a session
                    "Authorization": `Bearer ${jwt}`
                }
            });
            if (response.ok) {
                setKeeperStatus(false);
                console.log("PLayer ready!");
            } else {
                console.error("Failed to join player");
            }
        } catch (error) {
            console.error("Error joining player:", error);
        }
    };

    const distributeKeeper = async (sessionId) => {
        try {
            const response = await fetch(`${API_BASE}/sessions/${sessionId}/randomize`, {
                method: "POST",
                headers: {
                    // Your backend requires a valid user to create a session
                    "Authorization": `Bearer ${jwt}`
                }
            });
            const data = await response.json()
            console.log(data.code);
            if (response.ok) {
                if (!data.code) {
                    alert("Need at least 2 keepers to distribute team!");
                } else {
                    await fetchBoardData()
                }
            } else {
                console.error("Connection failed");
            }
        } catch (error) {
            console.error("Error distributing keeper:", error);
        }
    };


    return (
        <div style={{padding: '2rem', fontFamily: 'sans-serif'}}>

            {/* TOP NAVIGATION CONTAINER */}
            <Navbar userInfo={userInfo} onLogout={handleLogout} navBarText={homeText}/>

            {/* Your drag and drop board goes here... */}
            <div style={{marginTop: '2rem'}}>
                <h2>Session Board</h2>

                <div style={{display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center'}}>
                    <strong>Date: {sessionDetails?.date}</strong>

                    {alreadyJoined && (
                        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                            <strong style={{color: 'darkcyan'}}> Joined</strong>
                            <button onClick={() => leaveSession(sessionId)}
                                    style={{
                                        background: '#e74c3c',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'white',
                                        padding: '8px 20px',
                                        borderRadius: '4px'
                                    }}
                                    title="Leave Session"> Leave session
                            </button>
                        </div>
                    )}

                    {!alreadyJoined && (
                        <button onClick={() => joinSession(sessionId)}
                                style={{
                                    background: '#3498db',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'white',
                                    padding: '8px 20px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold'
                                }}
                                title="Join Session"> Join session</button>
                    )}
                </div>
                <br/>
                {/* KEEPER POOL */}
                <div style={{marginBottom: '2rem'}}>
                    <div style={{display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>Keepers</h2>

                        {alreadyJoined && isKeeper && (
                            <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                                <button onClick={() => distributeKeeper(sessionId)}
                                        style={{
                                            background: '#1e3bd5',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'white',
                                            padding: '8px 20px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}
                                        title="Distribute Keepers"> Distribute Keepers
                                </button>
                                <button onClick={() => leaveKeeper(sessionId)}
                                        style={{
                                            background: '#e74c3c',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'white',
                                            padding: '8px 20px',
                                            borderRadius: '4px'
                                        }}
                                        title="Leave Keeper"> Leave
                                </button>
                            </div>
                        )}

                        {alreadyJoined && !isKeeper && (
                            <button onClick={() => joinKeeper(sessionId)}
                                    style={{
                                        background: '#3498db',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'white',
                                        padding: '8px 20px',
                                        borderRadius: '4px',
                                        fontWeight: 'bold'
                                    }}
                                    title="Join Keeper"> Join </button>
                        )}
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center'
                    }}>
                        {teams["cap"].map((player, index) => (
                            <div key={player.id}>{index + 1}: {player.player}</div>
                        ))}
                    </div>
                </div>
                <DragDropContext onDragEnd={onDragEnd}>
                    {/* PLAYER POOL (Team 0) */}
                    <div style={{marginBottom: '2rem'}}>
                        <h2>Players Pool</h2>

                        <Droppable droppableId="0" direction="horizontal">
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{
                                        display: 'flex',
                                        gap: '10px',
                                        padding: '10px',
                                        minHeight: '60px',
                                        background: '#f0f0f0',
                                        borderRadius: '8px'
                                    }}
                                >
                                    {teams["0"].map((player, index) => (
                                        <PlayerBubble key={player.id} player={player} index={index}/>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* TEAMS TABLE (Teams 1, 2, 3) */}
                    <div style={{display: 'flex', gap: '20px'}}>
                        {["1", "2", "3", "4"].map(teamId => (
                            <div key={teamId}
                                 style={{flex: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '10px'}}>
                                <h3 style={{textAlign: 'center'}}>Team {teamId}</h3>
                                <Droppable droppableId={teamId}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{
                                                minHeight: '200px',
                                                background: '#fafafa',
                                                borderRadius: '4px',
                                                padding: '10px'
                                            }}
                                        >
                                            {teams[teamId].map((player, index) => (
                                                <PlayerBubble key={player.id} player={player} index={index}/>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </div>
        </div>
    );
}

// Draggable Bubble Component
function PlayerBubble({player, index}) {
    return (
        <Draggable draggableId={player.id.toString()} index={index}>
            {(provided) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                        ...provided.draggableProps.style,
                        padding: '8px 16px',
                        background: '#3498db',
                        color: 'white',
                        borderRadius: '20px',
                        userSelect: 'none',
                        display: 'inline-block',
                        margin: '0 5px 5px 0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        alignContent: 'center'
                    }}
                >
                    {player.player}
                </div>
            )}
        </Draggable>
    );
}

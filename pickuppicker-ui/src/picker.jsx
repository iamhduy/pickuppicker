import React, {useState, useEffect} from 'react';
import {DragDropContext, Droppable, Draggable} from '@hello-pangea/dnd';
import {useParams, useNavigate} from 'react-router-dom';
import Navbar from "./navbar.jsx";
import {parseJwt} from "./utils.js";


const API_BASE = "http://localhost:8080";

export default function PickupPicker() {
    const {sessionId} = useParams();
    const navigate = useNavigate();

    // 3. Grab the login state
    const [jwt, setJwt] = useState(localStorage.getItem("jwt"));
    const userInfo = jwt ? parseJwt(jwt) : null;

    const [sessionDetails, setSessionDetails] = useState(null);

    // 4. Create the logout function for this page
    const handleLogout = () => {
        localStorage.removeItem("jwt");
        setJwt(null);
        navigate('/'); // Send them back to the login screen
    };
    const [teams, setTeams] = useState({
        "0": [], // Unassigned Players
        "1": [], // Team 1
        "2": [], // Team 2
        "3": []  // Team 3
    });

    // Fetch initial data to populate the board
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all players to have a master list
                const playerRes = await fetch(`${API_BASE}/players`);
                const allPlayers = await playerRes.json();

                // Fetch current session to see who is already assigned
                const sessionRes = await fetch(`${API_BASE}/sessions/${sessionId}`);
                const sessionData = await sessionRes.json();
                setSessionDetails(sessionData)
                // Organize players into their respective teams based on session_player data
                const newTeams = {"0": [], "1": [], "2": [], "3": []};

                // Map assigned players
                const assignedPlayerIds = new Set();
                sessionData.players.forEach(p => {
                    // Find the player object from the master list matching the username
                    const playerObj = allPlayers.find(ap => ap.username === p.player);
                    if (playerObj) {
                        newTeams[p.team.toString()].push(playerObj);
                        assignedPlayerIds.add(playerObj.id);
                    }
                });

                // Put remaining players into the unassigned pool (Team 0)
                allPlayers.forEach(p => {
                    if (!assignedPlayerIds.has(p.id)) {
                        newTeams["0"].push(p);
                    }
                });

                setTeams(newTeams);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

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

    return (
        <div style={{padding: '2rem', fontFamily: 'sans-serif'}}>

            {/* TOP NAVIGATION CONTAINER */}
            <Navbar userInfo={userInfo} onLogout={handleLogout}/>

            {/* Your drag and drop board goes here... */}
            <div style={{marginTop: '2rem'}}>
                <h2>Session {sessionId} Board</h2>
                <h2>Date: {sessionDetails?.date}</h2>
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
                        {["1", "2", "3"].map(teamId => (
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
                    }}
                >
                    {player.username}
                </div>
            )}
        </Draggable>
    );
}

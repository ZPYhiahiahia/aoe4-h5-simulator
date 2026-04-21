import express from 'express';
import cors from 'cors';
import { GameEngine } from './src/GameEngine.js';

const app = express();
const PORT = process.env.PORT || 8088;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve the web frontend (index.html, src/*, etc.)

// --- INITIALIZE GAME ENGINE ---
const engine = new GameEngine({ width: 1200, height: 700 });
const defaultArmyA = { knights: 15, spearmen: 0, archers: 0 };
const defaultArmyB = { knights: 5, spearmen: 5, archers: 5 };
engine.setupBattle(defaultArmyA, defaultArmyB);
engine.armyTargetA = { isManual: true, manualQueue: [] };

// Game Loop: update at 30 fps (approx 33ms)
const TICK_RATE_MS = 33; 
const DT_SECONDS = TICK_RATE_MS / 1000;

setInterval(() => {
    engine.update(DT_SECONDS);
}, TICK_RATE_MS);

// --- APIs ---

// 1. Snapshot API (For Browser Frontend rendering)
app.get('/api/snapshot', (req, res) => {
    try {
        const snap = engine.getSnapshot();
        // Augment with things the UI needs that aren't natively in the renderer snapshot
        snap.battleLog = engine.battleLog;
        snap.manualQueues = { 0: engine.armyTargetA.manualQueue, 1: [] };
        res.json(snap);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Semantic State API (For LLM / AI Agents)
// This returns abstract, denoised JSON to reduce Token usage.
app.get('/api/state', (req, res) => {
    const snap = engine.getSnapshot();
    
    // Create a summarized state without thousands of X, Y coords.
    const state = {
        tick: engine.tickCount,
        elapsedSeconds: engine.elapsedTime.toFixed(1),
        gameOver: engine.gameOver,
        winner: engine.winner,
        team0_Red: {
            resources: snap.resources[0],
            popCap: snap.teamAPopCap,
            alive: snap.teamAAlive,
            queue: engine.armyTargetA.manualQueue,
            // Group by type for simpler reading
            unitCounts: engine.teamA.reduce((acc, u) => {
                if (u.alive) {
                    acc[u.type] = (acc[u.type] || 0) + 1;
                }
                return acc;
            }, {})
        },
        team1_Blue: {
            resources: snap.resources[1],
            popCap: snap.teamBPopCap,
            alive: snap.teamBAlive,
            unitCounts: engine.teamB.reduce((acc, u) => {
                if (u.alive) {
                    acc[u.type] = (acc[u.type] || 0) + 1;
                }
                return acc;
            }, {})
        },
        // Summarized map resources
        neutralResources: snap.resourceNodes.filter(r => r.team === -1 && r.alive).map(r => ({
            type: r.resourceType,
            remaining: Math.floor(r.remaining),
            location: { x: Math.floor(r.x), y: Math.floor(r.y) }
        })),
        battleLog: engine.battleLog.slice(-5) // Last 5 events
    };
    
    res.json(state);
});

// 3. Command API (For LLM actions or Manual Buttons)
app.post('/api/command', (req, res) => {
    const { action, team, type } = req.body;
    
    if (action === 'queueManualTask') {
        engine.queueManualTask(team, type);
        res.json({ status: 'ok', msg: `Queued ${type} for team ${team}` });
    } else {
        res.status(400).json({ error: 'Unknown action' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`[Backend Engine] Running at http://localhost:${PORT}`);
    console.log(`[Frontend UI] Open browser to http://localhost:${PORT}`);
});

import { Renderer } from './Renderer.js';

const canvas = document.getElementById('battlefield');
const logPanel = document.getElementById('log-panel');
const statusText = document.getElementById('status-text');

canvas.width = 1200;
canvas.height = 700;

const renderer = new Renderer(canvas);

// Append logs helper
function appendLog(msg) {
    if (!logPanel) return;
    const p = document.createElement('p');
    p.textContent = msg;
    logPanel.appendChild(p);
    logPanel.scrollTop = logPanel.scrollHeight;
}

let lastLogCount = 0;

async function fetchLoop() {
    try {
        const rs = await fetch('/api/snapshot');
        if (!rs.ok) return;
        const snapshot = await rs.json();
        
        // Render graphics
        renderer.render(snapshot);

        // Update UI info
        statusText.textContent = `运行中 | 时长: ${snapshot.time.toFixed(1)}s | Tick: ${snapshot.tick}`;

        // Sync logs if any
        if (snapshot.battleLog && snapshot.battleLog.length > lastLogCount) {
            for (let i = lastLogCount; i < snapshot.battleLog.length; i++) {
                const entry = snapshot.battleLog[i];
                if (entry.type === 'ATTACK' && entry.data.killed) {
                    appendLog(`[${entry.time}s] 💀 ${entry.data.attackerType}#${entry.data.attackerId} 击杀了 ${entry.data.targetType}#${entry.data.targetId}`);
                }
            }
            lastLogCount = snapshot.battleLog.length;
        }

        // Update Manual Queue UI
        const manualQueueDisplay = document.getElementById('manual-queue-display');
        const queueLengthLabel = document.getElementById('queue-length');
        if (manualQueueDisplay && snapshot.manualQueues && snapshot.manualQueues[0]) {
            const mq = snapshot.manualQueues[0];
            queueLengthLabel.textContent = mq.length;
            
            const symbolMap = {
                'Knight': '骑', 'Horseman': '肉', 'Spearman': '枪', 
                'MenAtArms': '武', 'Archer': '弓', 'Crossbowman': '弩',
                'House': '🏠', 'Farm': '🌾'
            };
            
            manualQueueDisplay.innerHTML = mq.map(type => 
                `<div style="background:#555; padding:2px 6px; font-size:12px; border-radius:3px;">${symbolMap[type] || '?'}</div>`
            ).join('');
        }
    } catch (e) {
        console.error("fetch loop error", e);
    }
    
    // Poll roughly at ~30 FPS
    setTimeout(fetchLoop, 33);
}

// Override queueManualTask for buttons in index.html
window.engine = {
    queueManualTask: async (team, type) => {
        try {
            await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'queueManualTask', team, type })
            });
        } catch (e) {
            console.error("Failed to queue task", e);
        }
    }
};

window.startBattle = () => {
    console.log("Battle automatically started on the backend server.");
};
window.togglePause = async () => {
    try {
        const rs = await fetch('/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'togglePause' })
        });
        const data = await rs.json();
        document.getElementById('btn-pause').textContent = data.paused ? '▶ 继续' : '⏸ 暂停';
    } catch (e) { console.error(e); }
}
window.setSpeed = async (multiplier) => {
    try {
        await fetch('/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'speed', value: multiplier })
        });
    } catch (e) { console.error(e); }
}

// Start polling
fetchLoop();

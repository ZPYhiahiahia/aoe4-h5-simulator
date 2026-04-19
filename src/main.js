/**
 * main.js - 入口调度
 * 
 * 职责：
 * 1. 初始化 GameEngine 和 Renderer
 * 2. 启动主循环（requestAnimationFrame）
 * 3. 连接 UI 控件
 */

import { GameEngine } from './GameEngine.js';
import { Renderer } from './Renderer.js';

// ─── 初始化 ─────────────────────────────────────
const canvas = document.getElementById('battlefield');
const logPanel = document.getElementById('log-panel');
const statusText = document.getElementById('status-text');

canvas.width = 1200;
canvas.height = 700;

const engine = new GameEngine({
  width: canvas.width,
  height: canvas.height,
  speed: 1.0,
  onGameOver: (winner, summary) => {
    console.log('=== 战斗结束 ===', summary);
    appendLog(`🏁 战斗结束！胜者: ${winner} | 用时: ${summary.duration} | ${summary.ticks} ticks`);
    appendLog(`   红方: 存活 ${summary.teamA.alive}/${summary.teamA.total}, 击杀 ${summary.teamA.totalKills}`);
    appendLog(`   蓝方: 存活 ${summary.teamB.alive}/${summary.teamB.total}, 击杀 ${summary.teamB.totalKills}`);
    statusText.textContent = `战斗结束 — ${winner === 'A' ? '红方' : winner === 'B' ? '蓝方' : '平局'}`;
  },
  onLog: (entry) => {
    if (entry.type === 'ATTACK' && entry.data.killed) {
      appendLog(`[${entry.time}s] 💀 ${entry.data.attackerType}#${entry.data.attackerId} 击杀了 ${entry.data.targetType}#${entry.data.targetId} (伤害: ${entry.data.damage})`);
    }
  },
});

const renderer = new Renderer(canvas);

// ─── 默认军队配置 ──────────────────────────────────
const defaultArmyA = { knights: 15, spearmen: 0, archers: 0 };
const defaultArmyB = { knights: 5, spearmen: 5, archers: 5 };

// ─── 游戏循环 ──────────────────────────────────────
let lastTime = 0;
const FIXED_DT = 1 / 60;

function gameLoop(timestamp) {
  const dt = FIXED_DT; // 固定时间步长

  // 更新逻辑
  engine.update(dt);

  // 渲染（读取快照）
  const snapshot = engine.getSnapshot();
  renderer.render(snapshot);

  // 更新手动队列 UI
  const manualQueueDisplay = document.getElementById('manual-queue-display');
  const queueLengthLabel = document.getElementById('queue-length');
  if (manualQueueDisplay && engine.manualQueues && engine.manualQueues[0]) {
    const mq = engine.manualQueues[0];
    queueLengthLabel.textContent = mq.length;
    
    // 简单映射名字到单字
    const symbolMap = {
      'Knight': '骑', 'Horseman': '肉', 'Spearman': '枪', 
      'MenAtArms': '武', 'Archer': '弓', 'Crossbowman': '弩'
    };
    
    manualQueueDisplay.innerHTML = mq.map(type => 
      `<div style="background:#555; padding:2px 6px; font-size:12px; border-radius:3px;">${symbolMap[type]}</div>`
    ).join('');
  }

  requestAnimationFrame(gameLoop);
}

// ─── UI 控件 ────────────────────────────────────────
function startBattle() {
  clearLog();

  // 读取 UI 配置
  const getVal = (id, def) => { const el = document.getElementById(id); if(!el) return def; const v = parseInt(el.value); return isNaN(v) ? def : v; };
  
  // 红方现在是手动模式，不需要初始 target，传入 isManual 标志
  const armyA = {
    isManual: true
  };
  const armyB = {
    knights: getVal('b-knights', 5),
    spearmen: getVal('b-spearmen', 5),
    archers: getVal('b-archers', 5),
    horsemen: getVal('b-horsemen', 0),
    menAtArms: getVal('b-menAtArms', 0),
    crossbows: getVal('b-crossbows', 0),
  };

  engine.setupBattle(armyA, armyB);
  statusText.textContent = '⚔️ 战斗进行中...';
  appendLog('🚀 新战斗开始！');
  appendLog(`   红方: ${armyA.knights}骑 ${armyA.spearmen}枪 ${armyA.archers}弓`);
  appendLog(`   蓝方: ${armyB.knights}骑 ${armyB.spearmen}枪 ${armyB.archers}弓`);
}

function togglePause() {
  engine.paused = !engine.paused;
  statusText.textContent = engine.paused ? '⏸ 已暂停' : '⚔️ 战斗进行中...';
  document.getElementById('btn-pause').textContent = engine.paused ? '▶ 继续' : '⏸ 暂停';
}

function setSpeed(multiplier) {
  engine.speed = multiplier;
  document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

// ─── 日志面板 ─────────────────────────────────────
function appendLog(msg) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = msg;
  logPanel.appendChild(line);
  logPanel.scrollTop = logPanel.scrollHeight;
}

function clearLog() {
  logPanel.innerHTML = '';
}

// ─── 暴露到全局（供 HTML 按钮调用）──────────────
window.startBattle = startBattle;
window.togglePause = togglePause;
window.setSpeed = setSpeed;
window.engine = engine;

// ─── 启动 ──────────────────────────────────────────
startBattle();
requestAnimationFrame(gameLoop);

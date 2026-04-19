/**
 * GameEngine - 世界运行的心脏
 * 
 * 职责：
 * 1. 管理所有实体（单位数组）
 * 2. 驱动 Tick 循环（固定时间步长）
 * 3. 调度 AI（Commander + StateMachine）
 * 4. 碰撞检测 & 分离
 * 5. 战斗结算
 * 6. 生成战斗日志
 * 
 * 核心原则：此模块完全独立于渲染层。
 * 即使没有 Renderer，GameEngine 也能在后台跑完一场战斗并输出文字日志。
 */

import { Knight } from './entities/Knight.js';
import { Spearman } from './entities/Spearman.js';
import { Archer } from './entities/Archer.js';
import { Horseman } from './entities/Horseman.js';
import { MenAtArms } from './entities/MenAtArms.js';
import { Crossbowman } from './entities/Crossbowman.js';
import { TownCenter, Barracks, ArcheryRange, Stable } from './entities/Building.js';
import { Villager } from './entities/Villager.js';
import { ResourceNode } from './entities/ResourceNode.js';
import { StateMachine } from './ai/StateMachine.js';
import { Commander } from './ai/Commander.js';
import { MicroAI } from './ai/MicroAI.js';
import { MacroAI } from './ai/MacroAI.js';

export const POPULATION_CAP = 50;

export class GameEngine {
  constructor(config = {}) {
    this.width = config.width || 1200;
    this.height = config.height || 700;

    this.units = [];         // 所有单位与建筑
    this.teamA = [];         // 队伍 A (team=0, red)
    this.teamB = [];         // 队伍 B (team=1, blue)
    this.resourceNodes = [];

    this.resources = {
      0: { food: 200, wood: 200, gold: 100 },
      1: { food: 200, wood: 200, gold: 100 }
    };

    this.armyTargetA = {};
    this.armyTargetB = {};

    this.tickCount = 0;
    this.elapsedTime = 0;    // 总经过时间（秒）
    this.gameOver = false;
    this.winner = null;       // 'A' | 'B' | null

    this.battleLog = [];     // 战斗事件日志
    this.commanderInterval = 0.5; // Commander 发令间隔（秒）
    this.commanderTimer = 0;

    this.paused = false;
    this.speed = config.speed || 1.0; // 时间倍率

    // 回调
    this.onGameOver = config.onGameOver || null;
    this.onLog = config.onLog || null;
  }

  /**
   * 初始化宏观对战环境
   */
  setupBattle(armyTargetA, armyTargetB) {
    this.armyTargetA = armyTargetA;
    this.armyTargetB = armyTargetB;

    this.units = [];
    this.teamA = [];
    this.teamB = [];
    this.resourceNodes = [];
    
    this.resources = {
      0: { food: 200, wood: 200, gold: 100 },
      1: { food: 200, wood: 200, gold: 100 }
    };

    this.manualQueues = {
      0: [],
      1: []
    };

    this.tickCount = 0;
    this.elapsedTime = 0;
    this.gameOver = false;
    this.winner = null;
    this.battleLog = [];

    // 随机生成中央阻挡物
    this._setupObstacles();

    // 初始化双方基地
    this._setupBase(0);
    this._setupBase(1);

    this._log('BATTLE_START', `战斗开始！目标阵容：红方 ${JSON.stringify(armyTargetA)}, 蓝方 ${JSON.stringify(armyTargetB)}`);
  }

  /**
   * 建立基地：1个中心，3个村民，3个资源点
   */
  _setupBase(team) {
    const list = team === 0 ? this.teamA : this.teamB;
    const baseX = team === 0 ? 100 : this.width - 100;
    const baseY = this.height / 2;

    // 1. 生成 TC
    const tc = new TownCenter({ team, x: baseX, y: baseY });
    this.units.push(tc);
    list.push(tc);

    // 2. Initial villagers removed (factions must produce them from TC)
    const resSpawnDir = team === 0 ? -1 : 1; // 资源点放基地后面

    // 3. 生成资源点 (Food, Wood, Gold)
    this.resourceNodes.push(new ResourceNode({ team: team, x: baseX + resSpawnDir * 60, y: baseY - 60, resourceType: 'wood', visual: { shape: 'circle', radius: 15, color: '#166534' } }));
    this.resourceNodes.push(new ResourceNode({ team: team, x: baseX + resSpawnDir * 60, y: baseY, resourceType: 'food', visual: { shape: 'circle', radius: 12, color: '#f87171' } }));
    this.resourceNodes.push(new ResourceNode({ team: team, x: baseX + resSpawnDir * 60, y: baseY + 60, resourceType: 'gold', visual: { shape: 'circle', radius: 12, color: '#facc15' } }));
  }

  /**
   * 生成障碍物（陨石/岩石）
   */
  _setupObstacles() {
    this.obstacles = [];
    const numObstacles = 4 + Math.floor(Math.random() * 4); // 4~7 个障碍物
    for (let i = 0; i < numObstacles; i++) {
      this.obstacles.push({
        x: 200 + Math.random() * (this.width - 400),
        y: 100 + Math.random() * (this.height - 200),
        radius: 20 + Math.random() * 25
      });
    }
  }

  // 已通过 _setupBase 替代原生爆兵，保留但未使用
  _spawnArmy(armyConfig, team) { }

  /**
   * 手动推送一个造兵任务到指定队伍的全局列队中
   */
  queueManualTask(team, type) {
    if (this.manualQueues && this.manualQueues[team]) {
      // 限制队列上限，防止无限狂点
      if (this.manualQueues[team].length < 20) {
        this.manualQueues[team].push(type);
      }
    }
  }

  /**
   * 核心帧更新（固定时间步长）
   * @param {number} dt - 时间步长（秒），通常 1/60
   */
  update(dt) {
    if (this.gameOver || this.paused) return;

    dt *= this.speed;
    this.elapsedTime += dt;
    this.tickCount++;

    // 1. Commander 定期发布战术指令
    this.commanderTimer += dt;
    if (this.commanderTimer >= this.commanderInterval) {
      Commander.issueOrders(this.teamA, this.teamB);
      Commander.issueOrders(this.teamB, this.teamA);
      this.commanderTimer = 0;
    }

    this.currentEvents = []; // 当前帧的事件合集

    // 1.5 宏观AI指挥 (建造、采矿、爆兵)
    // 对于手控方，传入 manualQueue
    const aiTargetA = this.armyTargetA.isManual ? { isManual: true, manualQueue: this.manualQueues[0] } : this.armyTargetA;
    MacroAI.update(this.teamA, this.resources[0], aiTargetA, dt, this.resourceNodes, this);
    MacroAI.update(this.teamB, this.resources[1], this.armyTargetB, dt, this.resourceNodes, this);

    // 2. 遍历每个单位（执行状态机、队列或采集）
    for (const unit of this.units) {
      if (!unit.alive) continue;

      // 建筑逻辑：生产进度
      if (unit.isBuilding && unit.isBuilt) {
        this._processBuildingProduction(unit, dt);
      }
      
      // TC 射箭逻辑
      if (unit.type === 'TownCenter' && unit.isBuilt && unit.alive) {
        unit.tcAttackCooldown -= dt;
        const enemies = unit.team === 0 ? this.teamB : this.teamA;
        // 寻找范围内最近的敌人（不含建筑）
        let closest = null;
        let closestDist = Infinity;
        for (const e of enemies) {
          if (!e.alive || e.isBuilding) continue;
          const d = unit.distanceTo(e);
          if (d <= unit.attackRange && d < closestDist) {
            closest = e;
            closestDist = d;
          }
        }
        if (closest && unit.tcAttackCooldown <= 0) {
          const dmg = Math.max(1, unit.attack - closest.armor);
          closest.takeDamage(dmg, unit);
          unit.tcAttackCooldown = unit.attackSpeed;
          // 生成箭矢视觉事件
          unit._lastAttackLog = {
            attackerId: unit.id, attackerType: 'TownCenter',
            targetId: closest.id, targetType: closest.type,
            damage: dmg, killed: !closest.alive,
            fromX: unit.x, fromY: unit.y,
            toX: closest.x, toY: closest.y
          };
        }
      }

      // 村民采集逻辑
      if (unit.type === 'Villager' && unit.state === 'GATHERING' && unit.resourceTarget) {
        unit.gatheringTimer += dt;
        if (unit.gatheringTimer >= unit.gatherRate) {
          unit.gatheringTimer = 0;
          this.resources[unit.team][unit.resourceTarget.resourceType] += 2;
        }
        // 每5秒重新评估一次分配（让MacroAI重新指派采集方向）
        if (!unit._regatherTimer) unit._regatherTimer = 0;
        unit._regatherTimer += dt;
        if (unit._regatherTimer >= 5) {
          unit._regatherTimer = 0;
          unit.state = 'IDLE'; // 回到IDLE，MacroAI下一帧会根据队列重新分派
        }
      }

      // 普通战斗状态机逻辑
      if (!unit.isBuilding && unit.type !== 'Villager') {
        const enemies = unit.team === 0 ? this.teamB : this.teamA;
        StateMachine.update(unit, enemies, dt);
      }

      // 收集攻击日志
      if (unit._lastAttackLog) {
        this.currentEvents.push(unit._lastAttackLog);
        this._log('ATTACK', unit._lastAttackLog);
        unit._lastAttackLog = null;
      }
    }

    // 2.5 蓝方微操层（红方无微操，作为对照组）
    MicroAI.update(this.teamB, this.teamA, dt, { width: this.width, height: this.height });

    // 收集微操期间产生的战斗日志
    for (const unit of this.teamB) {
      if (unit._lastAttackLog) {
        this.currentEvents.push(unit._lastAttackLog);
        this._log('ATTACK', unit._lastAttackLog);
        unit._lastAttackLog = null;
      }
    }

    // 3. 简单碰撞分离（防止单位重叠）
    this._resolveCollisions();

    // 4. 检测胜负
    this._checkVictory();
  }

  /**
   * 处理建筑内的序列生产
   */
  _processBuildingProduction(building, dt) {
    if (!building.currentTask && building.productionQueue.length > 0) {
      building.currentTask = building.productionQueue.shift();
      building.productionTimer = 0;
    }

    if (building.currentTask) {
      building.productionTimer += dt;
      if (building.productionTimer >= building.currentTask.totalTime) {
         // 生成单位
         this._spawnUnitFromBuilding(building, building.currentTask.typeKey);
         building.currentTask = null;
      }
    }
  }

  _spawnUnitFromBuilding(building, typeKey) {
    const Classes = {
      Villager: Villager,
      Knight: Knight,
      Spearman: Spearman,
      Archer: Archer,
      Horseman: Horseman,
      MenAtArms: MenAtArms,
      Crossbowman: Crossbowman,
    };
    const UnitClass = Classes[typeKey];
    if (!UnitClass) return;

    // Pop cap check handles correctly inside MacroAI before queuing, but double check
    const myPop = this._getPopulation(building.team);
    if (myPop >= POPULATION_CAP) {
       // Supply blocked (refund logic ignored in MVP for simplicity, just stop)
       return;
    }

    const spawnDir = building.team === 0 ? -1 : 1;
    const unit = new UnitClass({
      team: building.team,
      x: building.x + spawnDir * 40,
      y: building.y + building.visual.height/2 + Math.random() * 20
    });
    
    this.units.push(unit);
    if (building.team === 0) this.teamA.push(unit);
    else this.teamB.push(unit);
  }

  _getPopulation(team) {
    const list = team === 0 ? this.teamA : this.teamB;
    return list.filter(u => u.alive && !u.isBuilding).length; // 建筑不占人口
  }

  /**
   * 外部提供建筑地基
   */
  placeFoundation(team, buildingClass, x, y) {
    const foundation = new buildingClass({ team, x, y, isBuilt: false });
    this.units.push(foundation);
    if (team === 0) this.teamA.push(foundation);
    else this.teamB.push(foundation);
    return foundation;
  }

  /**
   * 碰撞分离：防止友方单位堆叠
   */
  _resolveCollisions() {
    const alive = this.units.filter(u => u.alive);
    const minDist = 14; // 最小间距

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (a.isBuilding && b.isBuilding) continue; // 建筑不互相推
        
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          
          if (!a.isBuilding && !b.isBuilding) {
             a.x -= nx * overlap;
             a.y -= ny * overlap;
             b.x += nx * overlap;
             b.y += ny * overlap;
          } else if (!a.isBuilding && b.isBuilding) {
             a.x -= nx * overlap * 2;
             a.y -= ny * overlap * 2;
          } else if (a.isBuilding && !b.isBuilding) {
             b.x += nx * overlap * 2;
             b.y += ny * overlap * 2;
          }
        }
      }
    }

    // 障碍物碰撞：推开单位，利用这个实现自动绕道(滑动)
    if (this.obstacles) {
      for (const unit of alive) {
        for (const obs of this.obstacles) {
          const dx = unit.x - obs.x;
          const dy = unit.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = obs.radius + 12; // 12是单位的大致半径
          
          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            unit.x += (dx / dist) * overlap;
            unit.y += (dy / dist) * overlap;
          }
        }
      }
    }

    // 边界约束
    for (const unit of alive) {
      unit.x = Math.max(10, Math.min(this.width - 10, unit.x));
      unit.y = Math.max(10, Math.min(this.height - 10, unit.y));
    }
  }

  /**
   * 检测胜负条件 (城镇中心被毁或敌军全灭且无生兵能力)
   * MVP简易逻辑：为了演示战斗过程，暂时保留“对方全灭”算赢，但需要剔除建筑。
   */
  _checkVictory() {
    const aCombat = this.teamA.filter(u => u.alive && !u.isBuilding && u.type !== 'Villager').length;
    const bCombat = this.teamB.filter(u => u.alive && !u.isBuilding && u.type !== 'Villager').length;
    
    // 如果没有敌军并不代表输了（一开始就没有），所以必须设定一个触发阈值，
    // 例如游戏经过了60秒，或者检查所有存活的单位
    // MVP 中如果某队的 TC 被摧毁直接判负：
    const aTC = this.teamA.find(u => u.type === 'TownCenter');
    const bTC = this.teamB.find(u => u.type === 'TownCenter');

    let aLost = !aTC || !aTC.alive;
    let bLost = !bTC || !bTC.alive;

    if (aLost || bLost) {
      this.gameOver = true;
      if (aLost && bLost) {
        this.winner = 'DRAW';
        this._log('GAME_OVER', '平局！');
      } else if (bLost) {
        this.winner = 'A';
        this._log('GAME_OVER', '红方胜利！');
      } else {
        this.winner = 'B';
        this._log('GAME_OVER', '蓝方胜利！');
      }

      if (this.onGameOver) {
        this.onGameOver(this.winner, this._generateSummary());
      }
    }
  }

  /**
   * 写入战斗日志
   */
  _log(type, data) {
    const entry = {
      tick: this.tickCount,
      time: this.elapsedTime.toFixed(2),
      type,
      data,
    };
    this.battleLog.push(entry);
    if (this.onLog) this.onLog(entry);
  }

  /**
   * 生成战斗总结
   */
  _generateSummary() {
    const aStats = this._teamStats(this.teamA, 'Red');
    const bStats = this._teamStats(this.teamB, 'Blue');
    return {
      duration: this.elapsedTime.toFixed(1) + 's',
      ticks: this.tickCount,
      winner: this.winner,
      teamA: aStats,
      teamB: bStats,
    };
  }

  _teamStats(team, name) {
    const alive = team.filter(u => u.alive);
    const totalKills = team.reduce((sum, u) => sum + u.killCount, 0);
    return {
      name,
      total: team.length,
      alive: alive.length,
      dead: team.length - alive.length,
      totalKills,
    };
  }

  /**
   * 获取当前所有单位快照（供 Renderer 读取）
   */
  getSnapshot() {
    return {
      tick: this.tickCount,
      time: this.elapsedTime,
      gameOver: this.gameOver,
      winner: this.winner,
      units: this.units.map(u => u.toSnapshot()),
      resourceNodes: this.resourceNodes.map(r => r.toSnapshot()),
      teamAAlive: this._getPopulation(0),
      teamBAlive: this._getPopulation(1),
      teamATotal: POPULATION_CAP,
      teamBTotal: POPULATION_CAP,
      resources: this.resources,
      obstacles: this.obstacles,
      events: this.currentEvents || [],
    };
  }
}

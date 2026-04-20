import { Barracks, ArcheryRange, Stable } from '../entities/Building.js';
import { POPULATION_CAP } from '../GameEngine.js'; // 我们在 GameEngine 中 export

const COSTS = {
  Villager: { food: 50, wood: 0, gold: 0, time: 1.5 },
  Spearman: { food: 60, wood: 20, gold: 0, time: 2 },
  Archer:   { food: 30, wood: 50, gold: 0, time: 2.5 },
  Knight:   { food: 100, wood: 0, gold: 20, time: 4 },
  Horseman: { food: 100, wood: 20, gold: 0, time: 3 },
  MenAtArms: { food: 100, wood: 0, gold: 20, time: 3.5 },
  Crossbowman: { food: 80, wood: 0, gold: 40, time: 3.5 },
  Barracks: { food: 0, wood: 150, gold: 0, time: 3 },
  ArcheryRange: { food: 0, wood: 150, gold: 0, time: 3 },
  Stable: { food: 0, wood: 150, gold: 0, time: 3 }
};

export class MacroAI {
  /**
   * 宏观运营 AI 更新（节流：每0.5秒执行一次，不需要每帧跑）
   */
  static _timers = new Map(); // team -> accumulated dt

  static update(myUnits, myResources, armyTarget, dt, resourceNodes, engine) {
    if (!myUnits || myUnits.length === 0) return;

    // 节流：只有累计超过0.5秒才真正执行宏观决策
    const team = myUnits[0]?.team ?? 0;
    const accum = (MacroAI._timers.get(team) || 0) + dt;
    if (accum < 0.5) {
      MacroAI._timers.set(team, accum);
      // 但村民的移动和建造逻辑需要每帧更新
      MacroAI._updateVillagerMovement(myUnits, dt);
      return;
    }
    MacroAI._timers.set(team, 0);
    const tickDt = accum; // 使用累计时间
    
    // 分类统计
    const tc = myUnits.find(u => u.type === 'TownCenter');
    const barracks = myUnits.find(u => u.type === 'Barracks');
    const archery = myUnits.find(u => u.type === 'ArcheryRange');
    const stable = myUnits.find(u => u.type === 'Stable');
    const villagers = myUnits.filter(u => u.type === 'Villager' && u.alive);

    const spearmenCount = myUnits.filter(u => u.type === 'Spearman' && u.alive).length;
    const archersCount = myUnits.filter(u => u.type === 'Archer' && u.alive).length;
    const knightsCount = myUnits.filter(u => u.type === 'Knight' && u.alive).length;
    const horsemenCount = myUnits.filter(u => u.type === 'Horseman' && u.alive).length;
    const maaCount = myUnits.filter(u => u.type === 'MenAtArms' && u.alive).length;
    const crossbowCount = myUnits.filter(u => u.type === 'Crossbowman' && u.alive).length;

    // 当前总人口（不含建筑地基，建筑不算人口)
    const currentPop = myUnits.filter(u => u.alive && !u.isBuilding).length; // 包括村民和兵

    // 如果是手动模式，生成虚拟的 armyTarget
    let t = armyTarget;
    if (armyTarget.isManual) {
        const mq = armyTarget.manualQueue || [];
        t = {
            spearmen: mq.filter(u => u === 'Spearman').length,
            menAtArms: mq.filter(u => u === 'MenAtArms').length,
            archers: mq.filter(u => u === 'Archer').length,
            crossbows: mq.filter(u => u === 'Crossbowman').length,
            knights: mq.filter(u => u === 'Knight').length,
            horsemen: mq.filter(u => u === 'Horseman').length,
        };
    }

    // 1. 分派无所事事的村民去执行任务
    for (let i = 0; i < villagers.length; i++) {
        const v = villagers[i];

        // 如果村民在准备去建造
        if (v.state === 'SEEKING_BUILD') {
            if (v.buildTarget && !v.buildTarget.isBuilt) {
                if (v.distanceTo(v.buildTarget) > 30) {
                    v.moveToward(v.buildTarget.x, v.buildTarget.y, dt);
                } else {
                    v.state = 'BUILDING';
                }
            } else {
                v.state = 'IDLE';
                v.buildTarget = null;
            }
            continue;
        }

        // 村民在敲建筑
        if (v.state === 'BUILDING') {
            if (v.buildTarget && !v.buildTarget.isBuilt) {
                v.buildTarget.hp += (v.buildTarget.maxHp / COSTS[v.buildTarget.type].time) * dt;
                if (v.buildTarget.hp >= v.buildTarget.maxHp) {
                    v.buildTarget.hp = v.buildTarget.maxHp;
                    v.buildTarget.isBuilt = true;
                    v.state = 'IDLE';
                    v.buildTarget = null;
                }
            } else {
                v.state = 'IDLE';
                v.buildTarget = null;
            }
            continue;
        }

        // 采集资源逻辑
        if (v.state === 'IDLE') {
            let fW = 150 + t.spearmen * COSTS.Spearman.food + t.archers * COSTS.Archer.food + t.knights * COSTS.Knight.food + t.horsemen * COSTS.Horseman.food + t.menAtArms * COSTS.MenAtArms.food + t.crossbows * COSTS.Crossbowman.food;
            let wW = 150 + t.spearmen * COSTS.Spearman.wood + t.archers * COSTS.Archer.wood + t.knights * COSTS.Knight.wood + t.horsemen * COSTS.Horseman.wood + t.menAtArms * COSTS.MenAtArms.wood + t.crossbows * COSTS.Crossbowman.wood;
            let gW =  50 + t.spearmen * COSTS.Spearman.gold + t.archers * COSTS.Archer.gold + t.knights * COSTS.Knight.gold + t.horsemen * COSTS.Horseman.gold + t.menAtArms * COSTS.MenAtArms.gold + t.crossbows * COSTS.Crossbowman.gold;
            const totalW = fW + wW + gW;
            const seed = (i * 317) % totalW; // 伪随机
            let resType = 'food';
            if (seed >= fW) { resType = seed >= fW + wW ? 'gold' : 'wood'; }
            
            const targetNode = resourceNodes.find(r => r.resourceType === resType && r.team === v.team);
            if (targetNode) {
                v.resourceTarget = targetNode; // <--- Fix: 绑定目标
                const dist = v.distanceTo(targetNode);
                if (dist > 20) {
                    v.moveToward(targetNode.x, targetNode.y, dt);
                    v.state = 'SEEKING'; 
                } else {
                    v.state = 'GATHERING';
                }
            }
        } else if (v.state === 'SEEKING' && !v.target) {
            if (v.resourceTarget) {
                if (v.distanceTo(v.resourceTarget) > 20) {
                    v.moveToward(v.resourceTarget.x, v.resourceTarget.y, dt);
                } else {
                    v.state = 'GATHERING';
                }
            } else {
                v.state = 'IDLE';
            }
        }
    }

    // --- 建造逻辑区 (不能超过人口上限) ---
    const canBuild = currentPop < POPULATION_CAP;

    // 2. 城镇中心：生产村民 (上限设为保持20个村民打工，为了给兵腾出人口)
    if (tc && tc.alive && tc.isBuilt && tc.productionQueue.length === 0 && !tc.currentTask && canBuild) {
        if (villagers.length < Math.min(20, POPULATION_CAP / 2)) {
           if (MacroAI._canAfford(myResources, COSTS.Villager)) {
               MacroAI._spend(myResources, COSTS.Villager);
               tc.queueUnit('Villager', COSTS.Villager, COSTS.Villager.time);
           }
        }
    }

    // 3. 建造军事建筑，按目标配比决定厂房数量
    MacroAI._checkAndBuild(myUnits, myResources, villagers, engine, t.spearmen + t.menAtArms, Barracks, COSTS.Barracks, tc);
    MacroAI._checkAndBuild(myUnits, myResources, villagers, engine, t.archers + t.crossbows, ArcheryRange, COSTS.ArcheryRange, tc);
    MacroAI._checkAndBuild(myUnits, myResources, villagers, engine, t.knights + t.horsemen, Stable, COSTS.Stable, tc);

    // 4. 军事建筑：造兵分摊到各个空闲排期的建筑中
    if (canBuild) {
        if (armyTarget.isManual) {
            // 手动模式：按队列顺序生产，遇到能造的就造并出队
            const mq = armyTarget.manualQueue;
            if (mq && mq.length > 0) {
                const nextType = mq[0];
                const cost = COSTS[nextType];
                
                // 判断归属的建筑类型
                let facType = 'Barracks';
                if (nextType === 'Archer' || nextType === 'Crossbowman') facType = 'ArcheryRange';
                if (nextType === 'Knight' || nextType === 'Horseman') facType = 'Stable';
                
                const idleBuilding = myUnits.find(u => u.type === facType && u.isBuilt && u.productionQueue.length === 0 && !u.currentTask);
                if (idleBuilding && MacroAI._canAfford(myResources, cost)) {
                    MacroAI._spend(myResources, cost);
                    idleBuilding.queueUnit(nextType, cost, cost.time);
                    mq.shift(); // 消费掉这个排队
                }
            }
        } else {
            // 自动对照组模式：配平分摊
            const factories = [
                { list: myUnits.filter(u => u.type === 'Barracks' && u.isBuilt), target: t.spearmen, type: 'Spearman', cost: COSTS.Spearman, currentCount: spearmenCount },
                { list: myUnits.filter(u => u.type === 'Barracks' && u.isBuilt), target: t.menAtArms, type: 'MenAtArms', cost: COSTS.MenAtArms, currentCount: maaCount },
                { list: myUnits.filter(u => u.type === 'ArcheryRange' && u.isBuilt), target: t.archers, type: 'Archer', cost: COSTS.Archer, currentCount: archersCount },
                { list: myUnits.filter(u => u.type === 'ArcheryRange' && u.isBuilt), target: t.crossbows, type: 'Crossbowman', cost: COSTS.Crossbowman, currentCount: crossbowCount },
                { list: myUnits.filter(u => u.type === 'Stable' && u.isBuilt), target: t.knights, type: 'Knight', cost: COSTS.Knight, currentCount: knightsCount },
                { list: myUnits.filter(u => u.type === 'Stable' && u.isBuilt), target: t.horsemen, type: 'Horseman', cost: COSTS.Horseman, currentCount: horsemenCount }
            ];

            for (const fac of factories) {
            let pendingCount = fac.currentCount;
            for (const b of fac.list) {
                pendingCount += b.productionQueue.length + (b.currentTask ? 1 : 0);
            }
            if (pendingCount < fac.target) {
                const idleBuilding = fac.list.find(b => b.productionQueue.length === 0 && !b.currentTask);
                if (idleBuilding && MacroAI._canAfford(myResources, fac.cost)) {
                    MacroAI._spend(myResources, fac.cost);
                    idleBuilding.queueUnit(fac.type, fac.cost, fac.cost.time);
                }
            }
            }
        }
    }
    
    // 5. 地基自建逻辑被移除，改为由村民敲建筑（BUILDING）
  }

  static _checkAndBuild(myUnits, myResources, villagers, engine, targetArmyCount, BuildingClass, cost, tc) {
      if (targetArmyCount > 0) {
          const buildings = myUnits.filter(u => u instanceof BuildingClass);
          const foundations = buildings.filter(u => !u.isBuilt);
          const desiredCount = Math.ceil(targetArmyCount / 5); // 每5兵需要1个生产建筑
          
          if (buildings.length < desiredCount && foundations.length === 0) { // 同一类型每次只盖1个地基
              const builder = villagers.find(v => v.state === 'IDLE' || v.state === 'SEEKING' || v.state === 'GATHERING');
              
              if (MacroAI._canAfford(myResources, cost) && builder) {
                  MacroAI._spend(myResources, cost);
                  const signX = builder.team === 0 ? 1 : -1;
                  const bx = tc ? tc.x + signX * (80 + Math.random()*80) : builder.x + signX * 50;
                  const by = tc ? tc.y + (Math.random()-0.5)*120 : builder.y + 50;
                  const f = engine.placeFoundation(builder.team, BuildingClass, bx, by);
                  
                  builder.buildTarget = f;
                  builder.state = 'SEEKING_BUILD';
              }
          }
      }
  }

  static _canAfford(res, cost) {
      return res.food >= cost.food && res.wood >= (cost.wood||0) && res.gold >= (cost.gold||0);
  }

  static _spend(res, cost) {
      res.food -= cost.food;
      res.wood -= cost.wood;
      res.gold -= cost.gold;
  }

  /**
   * 每帧运行的轻量村民移动更新（不做决策，只处理已有指令的移动和建造进度）
   */
  static _updateVillagerMovement(myUnits, dt) {
    for (const v of myUnits) {
      if (!v.alive || v.type !== 'Villager') continue;

      if (v.state === 'SEEKING_BUILD' && v.buildTarget && !v.buildTarget.isBuilt) {
        if (v.distanceTo(v.buildTarget) > 30) {
          v.moveToward(v.buildTarget.x, v.buildTarget.y, dt);
        } else {
          v.state = 'BUILDING';
        }
      }

      if (v.state === 'BUILDING' && v.buildTarget && !v.buildTarget.isBuilt) {
        v.buildTarget.hp += (v.buildTarget.maxHp / COSTS[v.buildTarget.type].time) * dt;
        if (v.buildTarget.hp >= v.buildTarget.maxHp) {
          v.buildTarget.hp = v.buildTarget.maxHp;
          v.buildTarget.isBuilt = true;
          v.state = 'IDLE';
          v.buildTarget = null;
        }
      } else if (v.state === 'BUILDING') {
        v.state = 'IDLE';
        v.buildTarget = null;
      }

      if (v.state === 'SEEKING' && v.resourceTarget) {
        if (v.distanceTo(v.resourceTarget) > 20) {
          v.moveToward(v.resourceTarget.x, v.resourceTarget.y, dt);
        } else {
          v.state = 'GATHERING';
        }
      }
    }
  }
}

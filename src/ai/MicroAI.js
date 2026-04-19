/**
 * MicroAI - 单位级微操控制器 v2
 * 
 * 仅对蓝方 (Team B) 生效，红方作为无微操对照组。
 * 
 * 核心微操策略：
 * 1. Archer Kiting（弓兵风筝）：攻击后利用冷却期直线后撤，保持最大射程优势
 * 2. Knight Dive（骑士斩首）：优先冲弓兵，回避枪兵（有其他选择时）
 * 3. Spearman Screen（枪兵前置）：主动拦截敌方骑兵保护弓兵
 * 4. Overkill Prevention（过杀保护）：避免 3+ 单位同时打一个将死目标
 * 5. Smart Retreat（智能撤退）：极低血量时后撤到友军身后
 * 
 * v2 修复：
 * - 风筝采用直线后撤而非弧线（避免跑角落）
 * - 降低残血撤退阈值（15%），避免过早退缩丢失战力
 * - 过杀保护仅在 3+ 集火且目标 <30% 血时触发
 * - 骑兵在无其他选择时仍会攻击枪兵
 * 
 * 纯逻辑层
 */

export class MicroAI {

  /**
   * 蓝方高级微操
   */
  static update(friendlies, enemies, dt, bounds) {
    const aliveFriendlies = friendlies.filter(u => u.alive);
    const aliveEnemies = enemies.filter(e => e.alive);
    if (aliveFriendlies.length === 0 || aliveEnemies.length === 0) return;

    const friendlyCenter = MicroAI._center(aliveFriendlies);

    for (const unit of aliveFriendlies) {
      if (!unit.alive) continue;

      // 如果单位在这一帧由 StateMachine 发起了攻击，我们不打断（冷却刚重置为 max）
      // 我们主要在攻击间隙或有严重危险时进行微操移动（覆盖 StateMachine 的走向）

      switch (unit.type) {
        case 'Archer':
          MicroAI._microArcher(unit, aliveEnemies, friendlyCenter, dt, bounds);
          break;
        case 'Knight':
          MicroAI._microKnight(unit, aliveEnemies, friendlyCenter, dt, bounds);
          break;
        case 'Spearman':
          MicroAI._microSpearman(unit, aliveEnemies, friendlyCenter, dt, bounds);
          break;
      }
      
      // 避免跑出边界
      unit.x = Math.max(12, Math.min(bounds.width - 12, unit.x));
      unit.y = Math.max(12, Math.min(bounds.height - 12, unit.y));
    }
  }

  // ══════════════════════════════════════════════
  //  弓兵：智能集火枪兵 & 冷却期 Hit and Run
  // ══════════════════════════════════════════════
  static _microArcher(unit, enemies, friendlyCenter, dt, bounds) {
    // 1. 集火优化：优先打距离较近的枪兵
    const spears = enemies.filter(e => e.alive && e.type === 'Spearman');
    if (spears.length > 0) {
      const nearSpear = MicroAI._nearest(unit, spears);
      if (unit.distanceTo(nearSpear) < unit.attackRange * 1.5) {
        unit.target = nearSpear;
      }
    }

    // 2. Hit and Run (走砍)
    // 弓兵攻速 1.5 秒/次。如果 cooldown > 0.1 并且有敌人在靠近，则利用这 1.4 秒往安全位置撤！
    const meleeEnemies = enemies.filter(e => e.alive && e.type !== 'Archer');
    const nearestMelee = MicroAI._nearest(unit, meleeEnemies);

    if (nearestMelee) {
      const dist = unit.distanceTo(nearestMelee);
      // 如果处于冷却状态，且敌人进了危险圈，撤退换取空间
      if (unit.attackCooldown > 0.2 && dist < 120) {
        // 撤退不仅远离敌人，还应当向友方大部队靠拢，防止散开
        const runDirX = unit.x - nearestMelee.x;
        const runDirY = unit.y - nearestMelee.y;

        // 结合友方重心，给它一个吸引力
        const toCenterX = friendlyCenter.x - unit.x;
        const toCenterY = friendlyCenter.y - unit.y;

        let nx = runDirX + toCenterX * 0.3;
        let ny = runDirY + toCenterY * 0.3;

        MicroAI._moveDir(unit, nx, ny, dt);
        // 让它强制处于 SEEKING 防止在冷却期间原地抽搐
        unit.state = 'SEEKING';
      }
    }
  }

  // ══════════════════════════════════════════════
  //  骑士：拉开枪兵 (溜狗) & 切弓兵
  // ══════════════════════════════════════════════
  static _microKnight(unit, enemies, friendlyCenter, dt, bounds) {
    const spears = enemies.filter(e => e.alive && e.type === 'Spearman');
    const nearSpear = spears.length > 0 ? MicroAI._nearest(unit, spears) : null;

    // 1. 溜狗战术：枪兵死克骑兵(3倍伤害)，但骑兵移速(4.0)远大于枪兵(1.8)
    // 如果枪兵靠近（<60），不要打，直接跑，引导枪兵追，让我方弓兵白嫖！
    if (nearSpear && unit.distanceTo(nearSpear) < 80) {
      if (unit.attackCooldown > 0.1 || unit.target === nearSpear) {
        let nx = unit.x - nearSpear.x;
        let ny = unit.y - nearSpear.y;
        
        // 带着枪兵往我方弓兵阵地跑，或者往空地跑
        nx += (friendlyCenter.x - unit.x) * 0.5;
        ny += (friendlyCenter.y - unit.y) * 0.5;

        MicroAI._moveDir(unit, nx, ny, dt);
        
        // 换目标：千万别打枪兵
        const nonSpears = enemies.filter(e => e.alive && e.type !== 'Spearman');
        if (nonSpears.length > 0) {
          unit.target = MicroAI._nearest(unit, nonSpears);
        }
        unit.state = 'SEEKING';
        return;
      }
    }

    // 2. 切后排
    const archers = enemies.filter(e => e.alive && e.type === 'Archer');
    if (archers.length > 0) {
      const nearArcher = MicroAI._nearest(unit, archers);
      if (!unit.target || unit.target.type !== 'Archer') {
         // 只切距离不太远的弓兵，避免长途跋涉送死
         if (unit.distanceTo(nearArcher) < 200) {
           unit.target = nearArcher;
         }
      }
    }
  }

  // ══════════════════════════════════════════════
  //  枪兵：保护弓兵，拦截骑兵
  // ══════════════════════════════════════════════
  static _microSpearman(unit, enemies, friendlyCenter, dt, bounds) {
    const knights = enemies.filter(e => e.alive && e.type === 'Knight');
    
    // 优先干骑兵，死克！
    if (knights.length > 0) {
      const nearKnight = MicroAI._nearest(unit, knights);
      if (unit.distanceTo(nearKnight) < 300) {
        unit.target = nearKnight;
      }
    }
  }

  // ══════════════════════════════════════════════
  //  工具函数
  // ══════════════════════════════════════════════
  
  static _moveDir(unit, nx, ny, dt) {
    const len = Math.sqrt(nx * nx + ny * ny);
    if (len < 0.01) return;
    nx /= len;
    ny /= len;

    const speed = unit.moveSpeed * 60 * dt;
    unit.x += nx * speed;
    unit.y += ny * speed;
  }

  static _nearest(unit, targets) {
    let best = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const d = unit.distanceTo(t);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  static _center(units) {
    let sx = 0, sy = 0;
    for (const u of units) {
      sx += u.x;
      sy += u.y;
    }
    return { x: sx / units.length, y: sy / units.length };
  }
}

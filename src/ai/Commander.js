/**
 * Commander - 战术指挥官 AI
 * 
 * 负责团队级别的战术决策：
 * - 集火指令：让同类型兵种集中攻击同一目标
 * - 目标优先级：优先消灭被克制 / 低血量的敌人
 * - 未来可扩展：编队、夹击、撤退等
 * 
 * 纯逻辑层
 */

export class Commander {
  /**
   * 为一支队伍执行战术指令
   * @param {BaseUnit[]} friendlies - 友方存活单位
   * @param {BaseUnit[]} enemies - 敌方存活单位
   */
  static issueOrders(friendlies, enemies) {
    const aliveEnemies = enemies.filter(e => e.alive && !e.isBuilding);
    const aliveFriendlies = friendlies.filter(u => u.alive && !u.isBuilding && u.type !== 'Villager');

    if (aliveEnemies.length === 0 || aliveFriendlies.length === 0) return;

    // 按兵种分组
    const groups = Commander._groupByType(aliveFriendlies);

    for (const [type, units] of Object.entries(groups)) {
      // 为每组兵种找到最优集火目标
      const focusTarget = Commander._selectFocusTarget(units[0], aliveEnemies);
      if (!focusTarget) continue;

      // 让没有有效目标的单位去集火
      for (const unit of units) {
        if (unit.state === 'IDLE' || !unit.target || !unit.target.alive) {
          unit.target = focusTarget;
          unit.state = 'SEEKING';
        }
      }
    }
  }

  /**
   * 按兵种类型分组
   */
  static _groupByType(units) {
    const groups = {};
    for (const unit of units) {
      if (!groups[unit.type]) groups[unit.type] = [];
      groups[unit.type].push(unit);
    }
    return groups;
  }

  /**
   * 为一组兵种选择最优集火目标
   * 加权公式：距离权重 + 克制加成 + 低血量优先
   */
  static _selectFocusTarget(sampleUnit, enemies) {
    if (enemies.length === 0) return null;

    let bestTarget = null;
    let bestScore = Infinity;

    for (const enemy of enemies) {
      // 距离分（归一化）
      const dist = sampleUnit.distanceTo(enemy);

      // 克制加成：被克制的目标优先级高
      const counterMultiplier = sampleUnit.bonusDamage[enemy.type] ? 0.4 : 1.0;

      // 低血量优先：残血目标得分更低
      const hpRatio = enemy.hp / enemy.maxHp;

      const score = dist * counterMultiplier * (0.3 + 0.7 * hpRatio);

      if (score < bestScore) {
        bestScore = score;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }
}

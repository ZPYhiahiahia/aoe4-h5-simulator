/**
 * StateMachine - 单位级 AI 状态机
 * 
 * 状态流转：
 *   IDLE → SEEKING → ATTACKING
 *                  ↘ SEEKING（目标死亡时重新寻敌）
 *   任意状态 → DEAD
 * 
 * 纯逻辑层，不涉及任何渲染
 */

export class StateMachine {
  /**
   * 处理单个单位的状态更新
   * @param {BaseUnit} unit 
   * @param {BaseUnit[]} enemies - 所有存活的敌方单位
   * @param {number} dt - 时间步长（秒）
   */
  static update(unit, enemies, dt) {
    if (!unit.alive) {
      unit.state = 'DEAD';
      return;
    }

    switch (unit.state) {
      case 'IDLE':
        StateMachine._handleIdle(unit, enemies);
        break;
      case 'SEEKING':
        StateMachine._handleSeeking(unit, enemies, dt);
        break;
      case 'ATTACKING':
        StateMachine._handleAttacking(unit, enemies, dt);
        break;
      case 'DEAD':
        break;
    }
  }

  /**
   * IDLE：没有目标，寻找最近的敌人
   */
  static _handleIdle(unit, enemies) {
    const target = StateMachine._findBestTarget(unit, enemies);
    if (target) {
      unit.target = target;
      unit.state = 'SEEKING';
    }
  }

  /**
   * SEEKING：有目标，向目标移动
   */
  static _handleSeeking(unit, enemies, dt) {
    // 目标失效 → 重新寻敌
    if (!unit.target || !unit.target.alive) {
      unit.target = null;
      unit.state = 'IDLE';
      return;
    }

    // 已进入攻击范围 → 转入攻击
    if (unit.isInRange(unit.target)) {
      unit.state = 'ATTACKING';
      unit.attackCooldown = 0; // 立即可以攻击
      return;
    }

    // 向目标移动
    unit.moveToward(unit.target.x, unit.target.y, dt);
  }

  /**
   * ATTACKING：在攻击范围内，执行攻击
   */
  static _handleAttacking(unit, enemies, dt) {
    // 目标失效
    if (!unit.target || !unit.target.alive) {
      unit.target = null;
      unit.state = 'IDLE';
      return;
    }

    // 目标跑出范围 → 追击
    if (!unit.isInRange(unit.target)) {
      unit.state = 'SEEKING';
      return;
    }

    // 攻击冷却
    unit.attackCooldown -= dt;
    if (unit.attackCooldown <= 0) {
      const damage = unit.calculateDamage(unit.target);
      unit.target.takeDamage(damage, unit);
      unit.attackCooldown = unit.attackSpeed;

      // 生成战斗日志事件
      unit._lastAttackLog = {
        attackerId: unit.id,
        attackerType: unit.type,
        targetId: unit.target.id,
        targetType: unit.target.type,
        damage,
        targetHpAfter: unit.target.hp,
        killed: !unit.target.alive,
      };
    }
  }

  /**
   * 寻找最佳目标：优先攻击被克制的敌人，然后距离最近
   */
  static _findBestTarget(unit, enemies) {
    const alive = enemies.filter(e => e.alive);
    if (alive.length === 0) return null;

    // 优先选择有克制加成的目标
    let best = null;
    let bestScore = Infinity;

    for (const enemy of alive) {
      const dist = unit.distanceTo(enemy);
      const hasBonus = unit.bonusDamage[enemy.type] ? 0.5 : 1.0; // 有克制关系的权重更低（优先级更高）
      const score = dist * hasBonus;

      if (score < bestScore) {
        bestScore = score;
        best = enemy;
      }
    }

    return best;
  }
}

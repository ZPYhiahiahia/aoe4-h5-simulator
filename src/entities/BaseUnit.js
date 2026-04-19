/**
 * BaseUnit - 所有兵种的基类
 * 纯数据 + 逻辑层，不包含任何渲染代码
 */

let _unitIdCounter = 0;

export class BaseUnit {
  constructor(config) {
    this.id = _unitIdCounter++;
    this.type = config.type || 'unknown';
    this.team = config.team || 0; // 0 = red, 1 = blue

    // 位置 & 运动
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.vx = 0;
    this.vy = 0;

    // 属性
    this.maxHp = config.maxHp || 100;
    this.hp = this.maxHp;
    this.attack = config.attack || 10;
    this.attackRange = config.attackRange || 30;
    this.attackSpeed = config.attackSpeed || 1.0; // 秒/次
    this.moveSpeed = config.moveSpeed || 2.0;
    this.armor = config.armor || 0;

    // 克制关系：对哪种类型的额外伤害倍率
    this.bonusDamage = config.bonusDamage || {}; // e.g. { Knight: 3.0 }

    // 战斗状态
    this.target = null;       // 当前目标 (BaseUnit reference)
    this.attackCooldown = 0;  // 攻击冷却计时器（秒）
    this.state = 'IDLE';      // 状态机当前状态
    this.alive = true;

    // 视觉提示（不影响逻辑，只供渲染器读取）
    this.visual = config.visual || { shape: 'rect', width: 16, height: 16, color: '#fff' };

    // 日志
    this.killCount = 0;
  }

  /**
   * 计算到目标的距离
   */
  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 判断目标是否在攻击范围内
   */
  isInRange(other) {
    return this.distanceTo(other) <= this.attackRange;
  }

  /**
   * 计算对某个目标的实际伤害
   */
  calculateDamage(target) {
    let dmg = this.attack;
    const bonus = this.bonusDamage[target.type];
    if (bonus) {
      dmg *= bonus;
    }
    dmg = Math.max(1, dmg - target.armor);
    return Math.round(dmg);
  }

  /**
   * 受到伤害
   */
  takeDamage(amount, attacker) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.state = 'DEAD';
      if (attacker) {
        attacker.killCount++;
      }
    }
  }

  /**
   * 朝目标移动
   */
  moveToward(targetX, targetY, dt) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const speed = this.moveSpeed * 60; // 像素/秒
    const step = Math.min(speed * dt, dist);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  /**
   * 序列化为日志快照（纯数据）
   */
  toSnapshot() {
    return {
      id: this.id,
      type: this.type,
      team: this.team,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      state: this.state,
      alive: this.alive,
      targetId: this.target ? this.target.id : null,
      killCount: this.killCount,
      visual: this.visual,
    };
  }
}

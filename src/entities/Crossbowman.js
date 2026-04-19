/**
 * Crossbowman (弩手)
 * 特点：移速慢，远程攻击，攻速慢但单发伤害高
 * 克制 重甲单位（Knight, MenAtArms）
 * 被 高机动/高远程护甲克制 (Horseman)
 * 视觉：圆形，稍微不一样颜色
 */
import { BaseUnit } from './BaseUnit.js';

export class Crossbowman extends BaseUnit {
  constructor(config = {}) {
    super({
      type: 'Crossbowman',
      maxHp: 85,
      attack: 16,
      attackRange: 160,
      attackSpeed: 2.0, // 攻速很慢
      moveSpeed: 2.3,
      armor: 0,
      bonusDamage: { Knight: 2.2, MenAtArms: 2.2 }, // 破甲伤害
      visual: {
        shape: 'circle',
        radius: 9,
        color: config.team === 1 ? '#5D4B8E' : '#8E4B4B',
      },
      ...config,
    });
  }
}

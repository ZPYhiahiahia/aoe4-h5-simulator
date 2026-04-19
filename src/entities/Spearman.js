/**
 * Spearman (枪兵)
 * 特点：移速慢，近战距离稍长，中等血量
 * 克制 Knight（巨额额外伤害）
 * 被 Archer 克制
 * 视觉：修长矩形
 */
import { BaseUnit } from './BaseUnit.js';

export class Spearman extends BaseUnit {
  constructor(config = {}) {
    super({
      type: 'Spearman',
      maxHp: 140,
      attack: 11,
      attackRange: 48,
      attackSpeed: 1.2,
      moveSpeed: 1.8,
      armor: 1,
      bonusDamage: { Knight: 3.0, Horseman: 3.0 }, // 死克骑兵(金马/肉马)
      visual: {
        shape: 'rect',
        width: 10,
        height: 22,
        color: config.team === 1 ? '#5BB5A6' : '#B55B5B',
      },
      ...config,
    });
  }
}

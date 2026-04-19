/**
 * Archer (弓兵)
 * 特点：移速一般，远程攻击，血脆
 * 克制 Spearman（远程白嫖）
 * 被 Knight 克制（被冲脸）
 * 视觉：圆形
 */
import { BaseUnit } from './BaseUnit.js';

export class Archer extends BaseUnit {
  constructor(config = {}) {
    super({
      type: 'Archer',
      maxHp: 75,
      attack: 14,
      attackRange: 160,
      attackSpeed: 1.5,
      moveSpeed: 2.5,
      armor: 0,
      bonusDamage: { Spearman: 1.5 }, // 克制枪兵
      visual: {
        shape: 'circle',
        radius: 8,
        color: config.team === 1 ? '#7B8CDE' : '#DE7B7B',
      },
      ...config,
    });
  }
}

/**
 * Knight (骑士)
 * 特点：移速极快，极近距离攻击，血高
 * 被 Spearman 死克
 * 视觉：正方形
 */
import { BaseUnit } from './BaseUnit.js';

export class Knight extends BaseUnit {
  constructor(config = {}) {
    super({
      type: 'Knight',
      maxHp: 220,
      attack: 18,
      attackRange: 32,
      attackSpeed: 0.9,
      moveSpeed: 4.0,
      armor: 3,
      bonusDamage: { Archer: 1.3 }, // 对弓兵有少量克制
      visual: {
        shape: 'rect',
        width: 18,
        height: 18,
        color: config.team === 1 ? '#4A90D9' : '#D94A4A',
      },
      ...config,
    });
  }
}

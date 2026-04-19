/**
 * Horseman (肉马)
 * 特点：移速快，高远程护甲，血量中等
 * 克制 远程单位 (Archer, Crossbowman)
 * 被 Spearman 死克
 * 视觉：长方形（细长）
 */
import { BaseUnit } from './BaseUnit.js';

export class Horseman extends BaseUnit {
  constructor(config = {}) {
    super({
      type: 'Horseman',
      maxHp: 160,
      attack: 12,
      attackRange: 32,
      attackSpeed: 1.2,
      moveSpeed: 3.8, // 比骑士略慢但很快
      armor: 2, // 模拟一定远程护甲
      bonusDamage: { Archer: 2.0, Crossbowman: 2.0 }, // 死克远程
      visual: {
        shape: 'rect',
        width: 16,
        height: 12,
        color: config.team === 1 ? '#4ABDD9' : '#D9894A',
      },
      ...config,
    });
  }
}

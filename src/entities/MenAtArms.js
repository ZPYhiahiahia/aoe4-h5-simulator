/**
 * MenAtArms (武士)
 * 特点：移速慢，高护甲，高血量，近战输出
 * 没有明显被克制对象，除了弩手和骑士的冲锋
 * 视觉：方形，厚实
 */
import { BaseUnit } from './BaseUnit.js';

export class MenAtArms extends BaseUnit {
  constructor(config = {}) {
    super({
      type: 'MenAtArms',
      maxHp: 180,
      attack: 14,
      attackRange: 32,
      attackSpeed: 1.1,
      moveSpeed: 1.5, // 比较慢
      armor: 4, // 重甲
      bonusDamage: {}, // 没有特殊克制，纯面板怪
      visual: {
        shape: 'rect',
        width: 14,
        height: 14,
        color: config.team === 1 ? '#003366' : '#660000', // 深色代表重甲
      },
      ...config,
    });
  }
}

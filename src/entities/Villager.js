import { BaseUnit } from './BaseUnit.js';

export class Villager extends BaseUnit {
  constructor(config) {
    super({
      type: 'Villager',
      maxHp: 50,
      attack: 5,
      attackRange: 15,
      attackSpeed: 2.0,
      moveSpeed: 1.5,
      armor: 0,
      visual: { shape: 'circle', radius: 7, color: config.team === 0 ? '#fda4af' : '#93c5fd' },
      ...config
    });
    
    // 经济工作状态
    this.resourceTarget = null; // 指向某个 ResourceNode
    this.gatheringTimer = 0;
    this.gatherRate = 0.2; // 采集间隔（秒） - 加速5倍
  }

  toSnapshot() {
    return {
      ...super.toSnapshot(),
      isGathering: this.state === 'GATHERING'
    };
  }
}

import { BaseUnit } from './BaseUnit.js';

let _buildingIdCounter = 10000;

export class Building extends BaseUnit {
  constructor(config) {
    super({
      ...config,
      moveSpeed: 0,
      attackSpeed: 0,
      attack: 0
    });
    this.id = _buildingIdCounter++;
    
    // 建筑属性
    this.isBuilding = true;
    this.isBuilt = config.isBuilt !== undefined ? config.isBuilt : true; // 是否建造完毕
    if (!this.isBuilt) {
      this.hp = 1; // 地基
    }
    
    // 生产队列
    this.productionQueue = [];
    this.productionTimer = 0;
    this.currentTask = null;
  }
  
  queueUnit(typeKey, cost, totalTime) {
     this.productionQueue.push({ typeKey, cost, totalTime });
  }

  toSnapshot() {
    return {
      ...super.toSnapshot(),
      isBuilding: true,
      isBuilt: this.isBuilt,
      productionProgress: this.currentTask ? this.productionTimer / this.currentTask.totalTime : 0,
      queueLength: this.productionQueue.length + (this.currentTask ? 1 : 0)
    };
  }
}

export class TownCenter extends Building {
  constructor(config) {
    super({
      type: 'TownCenter',
      maxHp: 2400,
      attack: 5,
      attackRange: 300,
      attackSpeed: 1.5,
      visual: { shape: 'rect', width: 60, height: 60, color: config.team === 0 ? '#7f1d1d' : '#1e3a8a' },
      ...config
    });
    this.tcAttackCooldown = 0;
    this.tcTarget = null;
  }
}

export class Barracks extends Building {
  constructor(config) {
    super({
      type: 'Barracks',
      maxHp: 1500,
      visual: { shape: 'rect', width: 40, height: 40, color: config.team === 0 ? '#991b1b' : '#1d4ed8' },
      ...config
    });
  }
}

export class ArcheryRange extends Building {
  constructor(config) {
    super({
      type: 'ArcheryRange',
      maxHp: 1500,
      visual: { shape: 'rect', width: 40, height: 40, color: config.team === 0 ? '#991b1b' : '#1d4ed8' },
      ...config
    });
  }
}

export class Stable extends Building {
  constructor(config) {
    super({
      type: 'Stable',
      maxHp: 1500,
      visual: { shape: 'rect', width: 40, height: 40, color: config.team === 0 ? '#991b1b' : '#1d4ed8' },
      ...config
    });
  }
}

export class House extends Building {
  constructor(config) {
    super({
      type: 'House',
      maxHp: 750,
      visual: { shape: 'rect', width: 25, height: 25, color: config.team === 0 ? '#b45309' : '#1e40af' },
      ...config
    });
  }
}

export class Farm extends Building {
  constructor(config) {
    super({
      type: 'Farm',
      maxHp: 400,
      visual: { shape: 'rect', width: 35, height: 35, color: config.team === 0 ? '#166534' : '#065f46' },
      ...config
    });
    this.farmTimer = 0;
  }
}

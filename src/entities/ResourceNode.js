let _resourceNodeIdCounter = 20000;

const DEFAULT_REMAINING = {
  food: 1500,
  wood: 2000,
  gold: 800
};

export class ResourceNode {
  constructor(config) {
    this.id = _resourceNodeIdCounter++;
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.team = config.team !== undefined ? config.team : -1; // -1 for neutral
    this.resourceType = config.resourceType || 'food';
    
    // 有限资源
    this.remaining = config.remaining !== undefined ? config.remaining : (DEFAULT_REMAINING[this.resourceType] || 1000);
    this.maxRemaining = this.remaining;
    
    // 视觉表现
    this.baseRadius = config.visual?.radius || 15;
    this.visual = config.visual || { shape: 'circle', radius: this.baseRadius, color: '#fcd34d' };
    
    this.alive = true;
    this.isResource = true;
  }

  /**
   * 采集资源，返回实际采集量
   */
  gather(amount) {
    if (!this.alive || this.remaining <= 0) return 0;
    const actual = Math.min(amount, this.remaining);
    this.remaining -= actual;
    
    // 更新视觉大小（随储量缩小）
    const ratio = this.remaining / this.maxRemaining;
    this.visual.radius = Math.max(4, this.baseRadius * (0.3 + 0.7 * ratio));
    
    if (this.remaining <= 0) {
      this.alive = false;
    }
    return actual;
  }

  toSnapshot() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      team: this.team,
      resourceType: this.resourceType,
      visual: this.visual,
      remaining: this.remaining,
      maxRemaining: this.maxRemaining,
      isResource: true,
      alive: this.alive
    };
  }
}

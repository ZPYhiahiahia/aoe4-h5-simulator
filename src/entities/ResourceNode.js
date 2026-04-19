let _resourceNodeIdCounter = 20000;

export class ResourceNode {
  constructor(config) {
    this.id = _resourceNodeIdCounter++;
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.team = config.team !== undefined ? config.team : -1; // -1 for neutral
    this.resourceType = config.resourceType || 'food'; // 'food', 'wood', 'gold'
    
    // 视觉表现
    this.visual = config.visual || { shape: 'circle', radius: 15, color: '#fcd34d' };
    
    // 无限资源，不设置 HP，也无法被攻击
    this.alive = true;
    this.isResource = true;
  }

  toSnapshot() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      resourceType: this.resourceType,
      visual: this.visual,
      isResource: true
    };
  }
}

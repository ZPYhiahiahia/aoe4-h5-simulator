/**
 * Renderer - 基于 PixiJS 的高性能渲染层
 * 
 * 核心原则：只读取快照数据，无状态依赖。完美解耦。
 */

export class Renderer {
  constructor(canvas) {
    this.width = canvas.width;
    this.height = canvas.height;

    // 初始化 PixiJS Application
    // 注意：在 index.html 中已经通过 CDN 引入了 PIXI 全局对象
    this.app = new PIXI.Application({
      view: canvas,
      width: this.width,
      height: this.height,
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true
    });

    // 容器层级管理
    this.bgLayer = new PIXI.Container();
    this.obstacleLayer = new PIXI.Container();
    this.lineLayer = new PIXI.Container();
    this.unitLayer = new PIXI.Container();
    this.effectLayer = new PIXI.Container();
    this.hudLayer = new PIXI.Container();

    this.app.stage.addChild(this.bgLayer);
    this.app.stage.addChild(this.obstacleLayer);
    this.app.stage.addChild(this.lineLayer);
    this.app.stage.addChild(this.unitLayer);
    this.app.stage.addChild(this.effectLayer);
    this.app.stage.addChild(this.hudLayer);

    // 状态与引用
    this.unitSprites = new Map();
    this.obstaclesDrawn = false;
    this.lastTick = -1;

    // 绘制常驻对象
    this._drawGrid();
    this._initHUD();

    // 攻击连线层
    this.linesGraphics = new PIXI.Graphics();
    this.lineLayer.addChild(this.linesGraphics);

    // 特效池
    this.particles = [];
    this.damageTexts = [];

    // PixiJS 独立动画循环（用于运行粒子的抛物线和淡出等，脱离 GameEngine 的 Tick）
    this.app.ticker.add(() => {
      this._updateEffects();
    });
  }

  /**
   * 核心渲染入口
   */
  render(snapshot) {
    // 0. 绘制资源点
    if (!this.resourcesDrawn && snapshot.resourceNodes) {
      this._drawResourceNodes(snapshot.resourceNodes);
      this.resourcesDrawn = true;
    }

    // 1. 绘制障碍物（仅需一次）
    if (snapshot.obstacles && !this.obstaclesDrawn) {
      this._drawObstacles(snapshot.obstacles);
      this.obstaclesDrawn = true;
    }

    // 2. 更新/创建/销毁所有单位
    const currentIds = new Set();
    for (const unitData of snapshot.units) {
      if (!unitData.alive) continue;
      currentIds.add(unitData.id);

      let sys = this.unitSprites.get(unitData.id);
      if (!sys) {
        sys = this._createUnitSprite(unitData);
        this.unitSprites.set(unitData.id, sys);
        this.unitLayer.addChild(sys.container);
      }
      this._updateUnitSprite(sys, unitData, snapshot.time);
    }

    // 清理已阵亡或消失的单位
    for (const [id, sys] of this.unitSprites.entries()) {
      if (!currentIds.has(id)) {
        this.unitLayer.removeChild(sys.container);
        sys.container.destroy({ children: true });
        this.unitSprites.delete(id);
      }
    }

    // 3. 绘制攻击线
    this.linesGraphics.clear();
    for (const unitData of snapshot.units) {
      if (!unitData.alive || unitData.targetId === null || unitData.state !== 'ATTACKING') continue;
      const target = snapshot.units.find(u => u.id === unitData.targetId);
      if (target && target.alive) {
        const color = unitData.team === 0 ? 0xff5050 : 0x508cff;
        this.linesGraphics.lineStyle(1, color, 0.4);
        this.linesGraphics.moveTo(unitData.x, unitData.y);
        this.linesGraphics.lineTo(target.x, target.y);
      }
    }

    // 4. 处理这一帧的新事件（受击特效、文字）
    if (snapshot.tick !== this.lastTick) {
      this.lastTick = snapshot.tick;
      if (snapshot.events) {
        for (const ev of snapshot.events) {
          const target = snapshot.units.find(u => u.id === ev.targetId);
          if (target) {
            this._addDamageText(target.x, target.y - 15, ev.damage, ev.killed);
            for (let i = 0; i < 4 + Math.random() * 4; i++) {
              this._addParticle(target.x, target.y, 0xef4444);
            }
          }
        }
      }
    }

    // 5. 更新 HUD 文字状态
    this._updateHUD(snapshot);
  }

  // ══════════════════════════════════════════════
  //  初始化与常驻绘制
  // ══════════════════════════════════════════════

  _drawGrid() {
    const g = new PIXI.Graphics();
    g.lineStyle(1, 0xffffff, 0.03);
    const gridSize = 40;

    for (let x = 0; x <= this.width; x += gridSize) {
      g.moveTo(x, 0);
      g.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      g.moveTo(0, y);
      g.lineTo(this.width, y);
    }
    this.bgLayer.addChild(g);
  }

  _drawResourceNodes(nodes) {
    const g = new PIXI.Graphics();
    for (const node of nodes) {
      g.beginFill(PIXI.utils.string2hex(node.visual.color), 0.8);
      g.drawCircle(node.x, node.y, node.visual.radius);
      g.endFill();
    }
    this.bgLayer.addChild(g);
  }

  _drawObstacles(obstacles) {
    const g = new PIXI.Graphics();
    for (const obs of obstacles) {
      // 阴影
      g.beginFill(0x000000, 0.5);
      g.drawCircle(obs.x, obs.y + 5, obs.radius + 2);
      g.endFill();

      // 本体
      g.beginFill(0x3f3f46);
      g.lineStyle(2, 0x18181b, 1);
      g.drawCircle(obs.x, obs.y, obs.radius);
      g.endFill();
      
      // 高光提示圆心
      g.beginFill(0x52525b);
      g.lineStyle(0);
      g.drawCircle(obs.x - obs.radius * 0.2, obs.y - obs.radius * 0.2, obs.radius * 0.4);
      g.endFill();
    }
    this.obstacleLayer.addChild(g);
  }

  _initHUD() {
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, this.width, 36);
    bg.endFill();
    this.hudLayer.addChild(bg);

    const style = new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' });
    
    this.hudRed = new PIXI.Text('', { ...style, fill: '#ef4444' });
    this.hudRed.position.set(16, 2);
    this.hudLayer.addChild(this.hudRed);

    this.hudBlue = new PIXI.Text('', { ...style, fill: '#3b82f6' });
    this.hudBlue.anchor.set(1, 0);
    this.hudBlue.position.set(this.width - 16, 2);
    this.hudLayer.addChild(this.hudBlue);

    this.hudRedRes = new PIXI.Text('', { ...style, fill: '#f8c2bc' });
    this.hudRedRes.position.set(16, 18);
    this.hudLayer.addChild(this.hudRedRes);

    this.hudBlueRes = new PIXI.Text('', { ...style, fill: '#bfdbfe' });
    this.hudBlueRes.anchor.set(1, 0);
    this.hudBlueRes.position.set(this.width - 16, 18);
    this.hudLayer.addChild(this.hudBlueRes);

    this.hudTime = new PIXI.Text('', { ...style, fill: '#94a3b8' });
    this.hudTime.anchor.set(0.5, 0);
    this.hudTime.position.set(this.width / 2, 10);
    this.hudLayer.addChild(this.hudTime);

    // 游戏结束层
    this.gameOverPanel = new PIXI.Container();
    this.gameOverPanel.visible = false;
    
    const goBg = new PIXI.Graphics();
    goBg.beginFill(0x000000, 0.7);
    goBg.drawRect(0, this.height / 2 - 50, this.width, 100);
    goBg.endFill();
    this.gameOverPanel.addChild(goBg);

    this.gameOverText = new PIXI.Text('', new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 28, fontWeight: 'bold', fill: '#ffffff' }));
    this.gameOverText.anchor.set(0.5);
    this.gameOverText.position.set(this.width / 2, this.height / 2);
    this.gameOverPanel.addChild(this.gameOverText);
    
    this.hudLayer.addChild(this.gameOverPanel);
  }

  _updateHUD(snapshot) {
    this.hudRed.text = `🔴 RED   Pop: ${snapshot.teamAAlive}/${snapshot.teamATotal}`;
    this.hudBlue.text = `🔵 BLUE  Pop: ${snapshot.teamBAlive}/${snapshot.teamBTotal}`;
    
    // UI Resources
    const resA = snapshot.resources[0];
    const resB = snapshot.resources[1];
    if (resA && resB) {
        this.hudRedRes.text = `🍎${resA.food} 🪵${resA.wood} 💰${resA.gold}`;
        this.hudBlueRes.text = `🍎${resB.food} 🪵${resB.wood} 💰${resB.gold}`;
    }

    this.hudTime.text = `⏱ ${snapshot.time.toFixed(1)}s  |  Tick: ${snapshot.tick}`;

    if (snapshot.gameOver) {
      this.gameOverPanel.visible = true;
      const t = snapshot.winner === 'A' ? '🏆 RED WINS!' : snapshot.winner === 'B' ? '🏆 BLUE WINS!' : '🤝 DRAW!';
      this.gameOverText.text = t;
    } else {
      this.gameOverPanel.visible = false;
    }
  }

  // ══════════════════════════════════════════════
  //  单位对象池及其逻辑
  // ══════════════════════════════════════════════

  _createUnitSprite(unit) {
    const container = new PIXI.Container();
    const v = unit.visual;
    const colorHex = PIXI.utils.string2hex(v.color);

    // 攻击光圈圈
    const atkRing = new PIXI.Graphics();
    container.addChild(atkRing);

    // 底部阴影
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.5);
    if (v.shape === 'circle') shadow.drawCircle(0, 4, v.radius);
    else shadow.drawRect(-v.width/2, -v.height/2 + 4, v.width, v.height);
    shadow.endFill();
    container.addChild(shadow);

    // 本体
    const body = new PIXI.Graphics();
    body.beginFill(colorHex);
    body.lineStyle(1.5, 0xffffff, 0.4);
    if (v.shape === 'circle') body.drawCircle(0, 0, v.radius);
    else body.drawRect(-v.width/2, -v.height/2, v.width, v.height);
    body.endFill();
    container.addChild(body);

    // 血条底色
    const barW = 20;
    const hy = v.shape === 'circle' ? -(v.radius + 8) : -(v.height / 2 + 8);
    const hpBg = new PIXI.Graphics();
    hpBg.beginFill(0x000000, 0.6);
    hpBg.drawRect(-barW/2, hy, barW, 4);
    hpBg.endFill();
    container.addChild(hpBg);

    // 血条进度
    const hpBar = new PIXI.Graphics();
    container.addChild(hpBar);

    // 建造进度 / 生产进度 (如果是建筑)
    const prodBar = new PIXI.Graphics();
    container.addChild(prodBar);

    // 兵种/建筑 首字母
    const label = new PIXI.Text(unit.type.slice(0, 2), new PIXI.TextStyle({
      fontFamily: 'monospace', fontSize: unit.isBuilding ? 14 : 10, fill: 0xffffff, fontWeight: 'bold'
    }));
    label.anchor.set(0.5);
    container.addChild(label);

    return { container, body, shadow, hpBar, prodBar, label, atkRing, v, hy, barW };
  }

  _updateUnitSprite(sys, unit, time) {
    const isMoving = unit.state === 'SEEKING' || unit.state === 'RETREATING' || unit.state === 'GATHERING';
    const bounce = isMoving ? Math.sin(time * 15 + unit.id) * 2 : 0;

    // 更新整体坐标
    sys.container.x = unit.x;
    sys.container.y = unit.y;

    // 如果是地基阶段，设置半透明
    if (unit.isBuilding && !unit.isBuilt) {
       sys.body.alpha = 0.5;
       sys.label.text = '🏗️';
    } else {
       sys.body.alpha = 1.0;
       sys.label.text = unit.type.slice(0, 2);
    }

    // 呼吸跳跃（仅影响本体和字，不影响阴影）
    sys.body.y = bounce;
    sys.label.y = bounce;

    // 重绘血条
    sys.hpBar.clear();
    const hpRatio = unit.hp / unit.maxHp;
    const hpColor = hpRatio > 0.6 ? 0x4ade80 : hpRatio > 0.3 ? 0xfbbf24 : 0xef4444;
    sys.hpBar.beginFill(hpColor);
    sys.hpBar.drawRect(-sys.barW/2, sys.hy + bounce, sys.barW * hpRatio, 4);
    sys.hpBar.endFill();

    // 重绘生产条 (对建筑有效)
    sys.prodBar.clear();
    if (unit.isBuilding && unit.isBuilt && unit.queueLength > 0) {
       sys.prodBar.beginFill(0x60a5fa);
       sys.prodBar.drawRect(-sys.barW/2, sys.hy - 6, sys.barW * unit.productionProgress, 3);
       sys.prodBar.endFill();
    }

    // 更新攻击环
    sys.atkRing.clear();
    if (unit.state === 'ATTACKING') {
      const ringColor = PIXI.utils.string2hex(sys.v.color);
      sys.atkRing.lineStyle(2, ringColor, 0.3);
      const r = sys.v.shape === 'circle' ? Math.max(sys.v.radius || 8, 20) : 20;
      sys.atkRing.drawCircle(0, bounce, r);
    }
  }

  // ══════════════════════════════════════════════
  //  特效与粒子 (脱离数据帧独立更新)
  // ══════════════════════════════════════════════

  _addDamageText(x, y, damage, isKill) {
    const color = isKill ? '#facc15' : '#f87171'; // 黄金击杀 vs 普通掉血
    const size = isKill ? 20 : 12;
    const t = new PIXI.Text('-' + damage, new PIXI.TextStyle({
      fontFamily: 'sans-serif', fontSize: size, fontWeight: 'bold', fill: color
    }));
    t.anchor.set(0.5);
    t.x = x + (Math.random() - 0.5) * 10;
    t.y = y;
    
    this.effectLayer.addChild(t);
    this.damageTexts.push({ sprite: t, life: 1.0, vy: -0.8 });
  }

  _addParticle(x, y, color) {
    const p = new PIXI.Graphics();
    p.beginFill(color);
    p.drawRect(-1.5, -1.5, 3, 3);
    p.endFill();
    p.x = x;
    p.y = y;
    
    this.effectLayer.addChild(p);
    this.particles.push({
      sprite: p,
      life: 1.0,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4
    });
  }

  _updateEffects() {
    // 无论主引擎暂不暂停，粒子系统都在流转
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.sprite.x += p.vx;
      p.sprite.y += p.vy;
      p.vx *= 0.85; // 空气阻力
      p.vy *= 0.85;
      p.life -= 0.03;
      
      p.sprite.alpha = p.life;
      if (p.life <= 0) {
        this.effectLayer.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const d = this.damageTexts[i];
      d.sprite.y += d.vy;
      d.life -= 0.02;
      
      d.sprite.alpha = d.life;
      if (d.life <= 0) {
        this.effectLayer.removeChild(d.sprite);
        d.sprite.destroy();
        this.damageTexts.splice(i, 1);
      }
    }
  }
}

export class PhaserRenderer {
  constructor({ parentId, width, height }) {
    this.parentId = parentId;
    this.width = width;
    this.height = height;

    this._game = null;
    this._scene = null;

    this._gfx = null;
    this._text = null;
    this._panelText = null;

    this._resizeHandler = null;
  }

  init(state) {
    const self = this;

    class MainScene extends Phaser.Scene {
      constructor() {
        super('main');
      }

      create() {
        self._scene = this;
        self._gfx = this.add.graphics();
        self._text = this.add.text(12, 10, '', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontSize: '14px',
          color: '#d7e3ff',
        });
        self._panelText = this.add.text(12, 540 - 10, '', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontSize: '13px',
          color: '#d7e3ff',
          align: 'left',
        });
        self._panelText.setOrigin(0, 1);

        self._updateViewportState(state);
      }
    }

    this._game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.parentId,
      width: this.width,
      height: this.height,
      backgroundColor: '#0b0f17',
      scene: [MainScene],
      fps: { target: 60, forceSetTimeOut: true },
      physics: { default: 'arcade' },
    });

    this._resizeHandler = () => this._updateViewportState(state);
    window.addEventListener('resize', this._resizeHandler);
  }

  render(state, dt) {
    if (!this._scene || !this._gfx) return;

    this._updateViewportState(state);

    this._gfx.clear();

    this._gfx.lineStyle(1, 0x22304a, 1);
    this._gfx.strokeRect(0.5, 0.5, state.map.width - 1, state.map.height - 1);

    this._gfx.fillStyle(0x2a3550, 1);
    for (const c of state.map.colliders) {
      this._gfx.fillRect(c.x, c.y, c.w, c.h);
    }

    this._gfx.lineStyle(2, 0xa7d7ff, 1);
    this._gfx.strokeCircle(state.player.targetX, state.player.targetY, 8);

    this._gfx.fillStyle(0x3aa0ff, 1);
    this._gfx.fillRect(state.player.x - 14, state.player.y - 14, 28, 28);

    this._gfx.fillStyle(0xff5a6a, 1);
    for (const m of state.monsters) {
      this._gfx.fillRect(m.x - 13, m.y - 13, 26, 26);
    }

    if (state.boss) {
      this._gfx.fillStyle(0xff3333, 1);
      this._gfx.fillRect(state.boss.x - 20, state.boss.y - 20, 40, 40);

      const bossBarWidth = 200;
      const bossBarHeight = 12;
      const bossBarX = this.width / 2 - bossBarWidth / 2;
      const bossBarY = 40;
      const hpPercent = state.boss.hp / state.boss.maxHp;

      this._gfx.fillStyle(0x1a1a2e, 1);
      this._gfx.fillRect(bossBarX, bossBarY, bossBarWidth, bossBarHeight);

      this._gfx.fillStyle(0xff3333, 1);
      this._gfx.fillRect(bossBarX, bossBarY, bossBarWidth * hpPercent, bossBarHeight);

      this._gfx.lineStyle(1, 0xffffff, 0.5);
      this._gfx.strokeRect(bossBarX, bossBarY, bossBarWidth, bossBarHeight);
    }

    this._gfx.fillStyle(0x4ade80, 1);
    for (const npc of state.town.npcs) {
      this._gfx.fillRect(npc.x - 12, npc.y - 12, 24, 24);
    }

    for (const e of state.effects) {
      const skillColors = {
        q: 0x9b7bff,
        w: 0xff6b35,
        e: 0x4ecdc4,
        r: 0xffd93d,
        t: 0xff3333,
        a: 0x6bcb77,
        s: 0x4d96ff,
        d: 0xff6b9d,
        f: 0xc44569,
        v: 0xffd700,
      };
      const color = skillColors[e.skillKey] || 0x9b7bff;

      if (e.type === 'aoe') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.3));

        this._gfx.fillStyle(color, 0.15 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius);

        this._gfx.lineStyle(4, color, 0.5 * alpha);
        this._gfx.strokeCircle(e.x, e.y, e.radius);

        this._gfx.lineStyle(2, 0xffffff, 0.7 * alpha);
        this._gfx.strokeCircle(e.x, e.y, Math.max(0, e.radius - 15));

        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + (state.time * 3);
          const px = e.x + Math.cos(angle) * (e.radius * 0.7);
          const py = e.y + Math.sin(angle) * (e.radius * 0.7);
          this._gfx.fillStyle(0xffffff, 0.3 * alpha);
          this._gfx.fillCircle(px, py, 4);
        }
      }

      if (e.type === 'projectile') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.5));
        const progress = 1 - (e.ttl / 0.5);
        const px = e.startX + (e.targetX - e.startX) * progress;
        const py = e.startY + (e.targetY - e.startY) * progress;

        this._gfx.fillStyle(color, 0.8 * alpha);
        this._gfx.fillCircle(px, py, 15);

        this._gfx.fillStyle(0xffffff, 0.5 * alpha);
        this._gfx.fillCircle(px, py, 8);

        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + (state.time * 8);
          const trailX = px - Math.cos(angle) * 20 * progress;
          const trailY = py - Math.sin(angle) * 20 * progress;
          this._gfx.fillStyle(color, 0.3 * alpha);
          this._gfx.fillCircle(trailX, trailY, 5);
        }
      }

      if (e.type === 'chain') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.4));

        this._gfx.fillStyle(color, 0.4 * alpha);
        this._gfx.fillCircle(e.x, e.y, 20);

        if (e.chainTargets && e.chainTargets.length > 0) {
          for (const target of e.chainTargets) {
            this._gfx.lineStyle(3, color, 0.8 * alpha);
            this._gfx.beginPath();
            this._gfx.moveTo(e.x, e.y);
            this._gfx.lineTo(target.x, target.y);
            this._gfx.strokePath();

            this._gfx.fillStyle(color, 0.6 * alpha);
            this._gfx.fillCircle(target.x, target.y, 12);
          }
        }
      }

      if (e.type === 'falling') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.6));
        const progress = 1 - (e.ttl / 0.6);
        const currentY = e.startY + (e.targetY - e.startY) * progress;

        this._gfx.fillStyle(0xff4444, 0.6 * alpha);
        this._gfx.fillCircle(e.x, currentY, 25);

        this._gfx.fillStyle(0xffaa00, 0.8 * alpha);
        this._gfx.fillCircle(e.x, currentY, 15);

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + (state.time * 4);
          const sparkX = e.x + Math.cos(angle) * 30;
          const sparkY = currentY + Math.sin(angle) * 30;
          this._gfx.fillStyle(0xffaa00, 0.5 * alpha);
          this._gfx.fillCircle(sparkX, sparkY, 3);
        }
      }

      if (e.type === 'melee') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.2));
        const arcLength = Math.PI / 2;
        const startAngle = e.angle - arcLength / 2;
        const endAngle = e.angle + arcLength / 2;

        this._gfx.lineStyle(4, color, 0.7 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.radius, startAngle, endAngle, false);
        this._gfx.strokePath();

        this._gfx.fillStyle(color, 0.3 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius * 0.5);
      }

      if (e.type === 'bossSkill') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.4));
        this._gfx.fillStyle(0xff4444, 0.2 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius);

        this._gfx.lineStyle(5, 0xff4444, 0.5 * alpha);
        this._gfx.strokeCircle(e.x, e.y, e.radius);

        this._gfx.lineStyle(3, 0xff8888, 0.7 * alpha);
        this._gfx.strokeCircle(e.x, e.y, Math.max(0, e.radius - 15));

        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 - (state.time * 2);
          const px = e.x + Math.cos(angle) * (e.radius * 0.8);
          const py = e.y + Math.sin(angle) * (e.radius * 0.8);
          this._gfx.fillStyle(0xff6666, 0.4 * alpha);
          this._gfx.fillCircle(px, py, 5);
        }
      }

      if (e.type === 'basicAttack') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.15));
        this._gfx.fillStyle(0xffffff, 0.2 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius);

        this._gfx.lineStyle(3, 0xffffff, 0.6 * alpha);
        this._gfx.strokeCircle(e.x, e.y, e.radius);

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + (state.time * 5);
          const px = e.x + Math.cos(angle) * (e.radius * 0.5);
          const py = e.y + Math.sin(angle) * (e.radius * 0.5);
          this._gfx.fillStyle(0xffffff, 0.5 * alpha);
          this._gfx.fillCircle(px, py, 3);
        }
      }
    }

    if (this._text) {
      const hp = Math.round(state.player.hp);
      const dialog = state.interactions.dialog ?? '';
      const zone = state.currentZone.toUpperCase();

      const skillLines = [];
      for (const key of ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'v']) {
        const skill = state.player.skills[key];
        const cd = skill.remaining.toFixed(1);
        skillLines.push(`${key.toUpperCase()}: ${skill.name} (${cd}s)`);
      }

      const consumableLines = [];
      for (let i = 0; i < 4; i++) {
        const item = state.player.consumableSlots[i];
        if (item) {
          const cd = item.remaining > 0 ? `(${item.remaining.toFixed(0)}s)` : '';
          consumableLines.push(`[${i + 1}] ${item.name} ${cd}`);
        } else {
          consumableLines.push(`[${i + 1}] Empty`);
        }
      }

      let zoneInfo = '';
      if (state.currentZone === 'town') {
        zoneInfo = 'R: Enter Raid';
      } else if (state.currentZone === 'raid') {
        zoneInfo = 'ESC: Return to Town';
      }

      this._text.setText(
        `Zone: ${zone}\n${zoneInfo}\nLMB: Move\nRMB: Basic Attack\nE: Interact\nI: Upgrade Panel\nHP: ${hp}\nGold: ${state.player.gold}\n\n=== SKILLS ===\n${skillLines.join('\n')}\n\n=== CONSUMABLES ===\n${consumableLines.join('\n')}\n\n${dialog}`,
      );
    }

    if (this._panelText) {
      if (state.interactions.upgradePanelOpen) {
        const eq = state.player.equipment;
        const lines = [
          '=== EQUIPMENT & UPGRADE ===',
          '',
          `[1] Weapon: ${eq.weapon ? `${eq.weapon.name} (+${eq.weapon.level}) ${eq.weapon.totalPower}P` : 'None'}`,
          `[2] Armor: ${eq.armor ? `${eq.armor.name} (+${eq.armor.level}) ${eq.armor.totalPower}P` : 'None'}`,
          `[3] Accessory: ${eq.accessory ? `${eq.accessory.name} (+${eq.accessory.level}) ${eq.accessory.totalPower}P` : 'None'}`,
          '',
          'Press 1/2/3 to upgrade (costs gold)',
        ];
        this._panelText.setText(lines.join('\n'));
      } else {
        this._panelText.setText('');
      }
    }
  }

  _updateViewportState(state) {
    if (!state._render) state._render = {};

    const canvas = this._game?.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.width;
    const scaleY = rect.height / this.height;

    state._render.viewport = {
      left: rect.left,
      top: rect.top,
      scaleX,
      scaleY,
    };
  }
}

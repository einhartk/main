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

        self._skillSlotTexts = [];
        self._skillCdTexts = [];
        // Main skills: QWERT-V (기력/공격), ASDF (충격/이동)
        const mainSkillKeys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'v'];
        // Special skills: Z (수라결), X (호신투기)
        const specialSkillKeys = ['z', 'x'];
        const allSkillKeys = [...mainSkillKeys, ...specialSkillKeys];

        for (let i = 0; i < allSkillKeys.length; i++) {
          // Skill key label
          const label = this.add.text(0, 0, allSkillKeys[i].toUpperCase(), {
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            fontSize: '10px',
            color: '#ffffff',
            fontStyle: 'bold',
          });
          label.setScrollFactor(0);
          label.setVisible(false);
          self._skillSlotTexts.push(label);
          // Cooldown text
          const cdText = this.add.text(0, 0, '', {
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            fontSize: '12px',
            color: '#ff3333',
            fontStyle: 'bold',
          });
          cdText.setScrollFactor(0);
          cdText.setVisible(false);
          self._skillCdTexts.push(cdText);
        }

        // Sura gauge text
        self._suraText = this.add.text(0, 0, '0', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontSize: '14px',
          color: '#ff3333',
          fontStyle: 'bold',
        });
        self._suraText.setScrollFactor(0);
        self._suraText.setVisible(false);

        this.cameras.main.setBackgroundColor('#0b0f17');
        this.cameras.main.setBounds(0, 0, 960, 540);
        this.cameras.main.scrollX = 0;
        this.cameras.main.scrollY = 0;
        this.cameras.main.setZoom(1);
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

    if (state.frame % 60 === 0) {
      console.log('Render - zone:', state.currentZone, 'map size:', state.map.width, state.map.height, 'colliders:', state.map.colliders.length);
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

    if (state.currentZone === 'town') {
      this._gfx.fillStyle(0x4ade80, 1);
      for (const npc of state.town.npcs) {
        this._gfx.fillRect(npc.x - 12, npc.y - 12, 24, 24);
      }
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
        const progress = 1 - alpha;

        // EXPLOSION: Expanding shockwave rings
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
          const ringProgress = Math.max(0, (progress * ringCount - i));
          if (ringProgress > 0 && ringProgress <= 1) {
            const ringRadius = e.radius * (0.3 + 0.7 * ringProgress);
            const ringAlpha = (1 - ringProgress) * 0.6 * alpha;
            this._gfx.lineStyle(3 - i, color, ringAlpha);
            this._gfx.strokeCircle(e.x, e.y, ringRadius);
          }
        }

        // Center burst
        this._gfx.fillStyle(color, 0.4 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius * 0.3);

        // Radial lines
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + progress * Math.PI;
          const lineLength = e.radius * (0.5 + 0.5 * Math.sin(progress * Math.PI));
          this._gfx.lineStyle(2, color, 0.6 * alpha);
          this._gfx.beginPath();
          this._gfx.moveTo(e.x, e.y);
          this._gfx.lineTo(
            e.x + Math.cos(angle) * lineLength,
            e.y + Math.sin(angle) * lineLength
          );
          this._gfx.strokePath();
        }
      }

      if (e.type === 'projectile') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.5));
        const progress = 1 - (e.ttl / 0.5);
        const px = e.startX + (e.targetX - e.startX) * progress;
        const py = e.startY + (e.targetY - e.startY) * progress;

        // ARROW PROJECTILE: Pointed shape with long trail
        const angle = Math.atan2(e.targetY - e.startY, e.targetX - e.startX);

        // Long fading trail
        for (let i = 1; i <= 10; i++) {
          const trailDist = i * 8;
          const trailAlpha = alpha * (1 - i / 11) * 0.5;
          this._gfx.fillStyle(color, trailAlpha);
          this._gfx.fillCircle(
            px - Math.cos(angle) * trailDist,
            py - Math.sin(angle) * trailDist,
            6 - i * 0.4
          );
        }

        // Arrow head (triangle)
        const headLen = 18;
        const headWidth = 10;
        this._gfx.fillStyle(0xffffff, 0.9 * alpha);
        this._gfx.beginPath();
        this._gfx.moveTo(px + Math.cos(angle) * headLen, py + Math.sin(angle) * headLen);
        this._gfx.lineTo(
          px + Math.cos(angle + Math.PI * 0.8) * headWidth,
          py + Math.sin(angle + Math.PI * 0.8) * headWidth
        );
        this._gfx.lineTo(
          px + Math.cos(angle - Math.PI * 0.8) * headWidth,
          py + Math.sin(angle - Math.PI * 0.8) * headWidth
        );
        this._gfx.closePath();
        this._gfx.fillPath();

        // Core glow
        this._gfx.fillStyle(color, 0.8 * alpha);
        this._gfx.fillCircle(px, py, 10);
      }

      if (e.type === 'chain') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.4));

        // LIGHTNING CHAIN: Zigzag electric lines
        this._gfx.fillStyle(0xffff00, 0.8 * alpha);
        this._gfx.fillCircle(e.x, e.y, 12);

        if (e.chainTargets && e.chainTargets.length > 0) {
          for (const target of e.chainTargets) {
            // Zigzag lightning line
            const dx = target.x - e.x;
            const dy = target.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const segments = 5;

            this._gfx.lineStyle(2, 0xffff00, 0.9 * alpha);
            this._gfx.beginPath();
            this._gfx.moveTo(e.x, e.y);

            for (let i = 1; i <= segments; i++) {
              const t = i / segments;
              const baseX = e.x + dx * t;
              const baseY = e.y + dy * t;
              // Add zigzag offset
              const offset = (i % 2 === 0 ? 1 : -1) * 10 * Math.sin(t * Math.PI);
              const perpAngle = angle + Math.PI / 2;
              const zigX = baseX + Math.cos(perpAngle) * offset;
              const zigY = baseY + Math.sin(perpAngle) * offset;
              this._gfx.lineTo(zigX, zigY);
            }
            this._gfx.strokePath();

            // Glow at target
            this._gfx.fillStyle(0xffff00, 0.6 * alpha);
            this._gfx.fillCircle(target.x, target.y, 10);

            // Electric sparks around target
            for (let i = 0; i < 4; i++) {
              const sparkAngle = (i / 4) * Math.PI * 2 + state.time * 10;
              const sparkDist = 20;
              this._gfx.fillStyle(0xffffff, 0.7 * alpha);
              this._gfx.fillCircle(
                target.x + Math.cos(sparkAngle) * sparkDist,
                target.y + Math.sin(sparkAngle) * sparkDist,
                3
              );
            }
          }
        }
      }

      if (e.type === 'falling') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.6));
        const progress = 1 - (e.ttl / 0.6);
        const currentY = e.startY + (e.targetY - e.startY) * progress;

        // METEOR: Fire trail falling down
        // Long fire trail behind
        for (let i = 0; i < 8; i++) {
          const trailY = currentY - i * 10;
          const trailSize = 18 - i * 2;
          const trailAlpha = alpha * (1 - i / 9) * 0.6;
          const fireColor = i < 3 ? 0xff6600 : 0xffaa00;
          this._gfx.fillStyle(fireColor, trailAlpha);
          this._gfx.fillCircle(e.x, trailY, Math.max(0, trailSize));
        }

        // Meteor core (red-hot)
        this._gfx.fillStyle(0xff2200, 0.9 * alpha);
        this._gfx.fillCircle(e.x, currentY, 20);

        // Outer fire glow
        this._gfx.fillStyle(0xff6600, 0.4 * alpha);
        this._gfx.fillCircle(e.x, currentY, 35);

        // Impact ring when close to ground
        if (progress > 0.8) {
          const impactAlpha = (progress - 0.8) * 5 * alpha;
          this._gfx.lineStyle(3, 0xff4400, impactAlpha);
          this._gfx.strokeCircle(e.x, e.targetY, (progress - 0.8) * 100);
        }
      }

      if (e.type === 'melee') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.2));
        const progress = 1 - (e.ttl / 0.2);

        // SLASH: Fast sword slash with motion blur
        const slashAngle = e.angle + (progress - 0.5) * Math.PI;
        const slashLength = e.radius * 1.2;

        // Main slash line
        this._gfx.lineStyle(5, 0xffffff, 0.9 * alpha);
        this._gfx.beginPath();
        this._gfx.moveTo(e.x, e.y);
        this._gfx.lineTo(
          e.x + Math.cos(slashAngle) * slashLength,
          e.y + Math.sin(slashAngle) * slashLength
        );
        this._gfx.strokePath();

        // Secondary slash (slightly offset)
        this._gfx.lineStyle(3, color, 0.6 * alpha);
        this._gfx.beginPath();
        this._gfx.moveTo(e.x, e.y);
        this._gfx.lineTo(
          e.x + Math.cos(slashAngle + 0.1) * slashLength * 0.9,
          e.y + Math.sin(slashAngle + 0.1) * slashLength * 0.9
        );
        this._gfx.strokePath();

        // Slash arc at tip
        const tipX = e.x + Math.cos(slashAngle) * slashLength;
        const tipY = e.y + Math.sin(slashAngle) * slashLength;
        this._gfx.fillStyle(0xffffff, 0.5 * alpha);
        this._gfx.fillCircle(tipX, tipY, 8);

        // Motion blur trails
        for (let i = 1; i <= 3; i++) {
          const blurAngle = slashAngle - i * 0.15;
          const blurAlpha = alpha * (0.3 - i * 0.1);
          this._gfx.lineStyle(2, color, blurAlpha);
          this._gfx.beginPath();
          this._gfx.moveTo(e.x, e.y);
          this._gfx.lineTo(
            e.x + Math.cos(blurAngle) * slashLength * (1 - i * 0.1),
            e.y + Math.sin(blurAngle) * slashLength * (1 - i * 0.1)
          );
          this._gfx.strokePath();
        }
      }

      if (e.type === 'combo') {
        // Q: 맹호권 - 3 rapid small punches
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.25));
        const progress = 1 - (e.ttl / 0.25);
        const numPunches = Math.min(3, Math.floor(progress * 3) + 1);

        for (let i = 0; i < numPunches; i++) {
          const punchAngle = e.angle + (i - 1) * 0.5;
          const punchDist = e.radius * (0.6 + i * 0.15);
          const punchX = e.x + Math.cos(punchAngle) * punchDist;
          const punchY = e.y + Math.sin(punchAngle) * punchDist;

          // Small fist
          this._gfx.fillStyle(color, 0.7 * alpha);
          this._gfx.fillCircle(punchX, punchY, 8);

          // Quick impact flash
          this._gfx.fillStyle(0xffffff, 0.4 * alpha);
          this._gfx.fillCircle(punchX, punchY, 4);
        }
      }

      if (e.type === 'spin') {
        // W: 연환격 - spinning attack with circular trail
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.4));
        const progress = 1 - (e.ttl / 0.4);
        const spinAngle = progress * Math.PI * 4; // 2 full spins

        // Circular trail
        for (let i = 0; i < 8; i++) {
          const trailAngle = spinAngle - i * 0.3;
          const trailDist = e.radius * (0.5 + 0.5 * Math.sin(progress * Math.PI));
          const trailAlpha = alpha * (1 - i / 8) * 0.5;
          const tx = e.x + Math.cos(trailAngle) * trailDist;
          const ty = e.y + Math.sin(trailAngle) * trailDist;

          this._gfx.fillStyle(color, trailAlpha);
          this._gfx.fillCircle(tx, ty, 6 - i * 0.5);
        }

        // Center spin core
        this._gfx.fillStyle(color, 0.6 * alpha);
        this._gfx.fillCircle(e.x, e.y, 10);

        // Outer ring
        this._gfx.lineStyle(3, color, 0.5 * alpha);
        this._gfx.strokeCircle(e.x, e.y, e.radius * 0.8);
      }

      if (e.type === 'uppercut') {
        // E: 천마파 - upward arc strike
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.35));
        const progress = 1 - (e.ttl / 0.35);

        // Upward arc trajectory
        const arcStart = e.angle - e.arc / 2;
        const arcEnd = e.angle + e.arc / 2;
        const currentArc = arcStart + (arcEnd - arcStart) * progress;

        const strikeX = e.x + Math.cos(currentArc) * e.radius;
        const strikeY = e.y + Math.sin(currentArc) * e.radius;

        // Arc trail
        this._gfx.lineStyle(4, color, 0.6 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.radius, arcStart, currentArc);
        this._gfx.strokePath();

        // Strike point
        this._gfx.fillStyle(color, 0.8 * alpha);
        this._gfx.fillCircle(strikeX, strikeY, 12);

        // Upper impact
        this._gfx.fillStyle(0xffffff, 0.4 * alpha);
        this._gfx.fillCircle(strikeX, strikeY - 5, 6);
      }

      if (e.type === 'pierce') {
        // R: 파천권 - piercing straight strike
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.15));
        const progress = 1 - (e.ttl / 0.15);

        // Long thin piercing line
        const pierceLength = e.radius * 1.5;
        const pierceStart = progress * pierceLength * 0.3;
        const pierceEnd = pierceStart + pierceLength * 0.7;

        // Main pierce line (thin and long)
        this._gfx.lineStyle(2, 0xffffff, 0.9 * alpha);
        this._gfx.beginPath();
        this._gfx.moveTo(
          e.x + Math.cos(e.angle) * pierceStart,
          e.y + Math.sin(e.angle) * pierceStart
        );
        this._gfx.lineTo(
          e.x + Math.cos(e.angle) * pierceEnd,
          e.y + Math.sin(e.angle) * pierceEnd
        );
        this._gfx.strokePath();

        // Piercing tip glow
        const tipX = e.x + Math.cos(e.angle) * pierceEnd;
        const tipY = e.y + Math.sin(e.angle) * pierceEnd;
        this._gfx.fillStyle(color, 0.7 * alpha);
        this._gfx.fillCircle(tipX, tipY, 6);

        // Trail blur
        for (let i = 1; i <= 5; i++) {
          const blurAlpha = alpha * (0.3 - i * 0.05);
          const blurDist = pierceEnd - i * 8;
          this._gfx.fillStyle(color, blurAlpha);
          this._gfx.fillCircle(
            e.x + Math.cos(e.angle) * blurDist,
            e.y + Math.sin(e.angle) * blurDist,
            2
          );
        }
      }

      if (e.type === 'kick') {
        // V: 폭풍각 - wide sweeping kick
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.3));
        const progress = 1 - (e.ttl / 0.3);

        // Wide arc sweep
        const sweepAngle = Math.PI * 1.5; // 270 degree sweep
        const currentSweep = sweepAngle * progress;
        const startAngle = e.angle - sweepAngle / 2;
        const endAngle = startAngle + currentSweep;

        // Wide sweep arc
        this._gfx.lineStyle(6, color, 0.7 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.radius, startAngle, endAngle);
        this._gfx.strokePath();

        // Kick trail (thick fading arc)
        this._gfx.lineStyle(10, color, 0.3 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.radius * 0.9, startAngle, endAngle);
        this._gfx.strokePath();

        // Foot impact at end of sweep
        const footX = e.x + Math.cos(endAngle) * e.radius;
        const footY = e.y + Math.sin(endAngle) * e.radius;
        this._gfx.fillStyle(0xffffff, 0.6 * alpha);
        this._gfx.fillCircle(footX, footY, 10);
      }

      if (e.type === 'fireAoE') {
        // T: 광염권 - fire explosion (red/orange aoe)
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.5));
        const progress = 1 - alpha;

        // Fire colors
        const fireColors = [0xff4400, 0xff6600, 0xff8800];

        // Expanding fire rings
        for (let i = 0; i < 3; i++) {
          const ringProgress = Math.max(0, (progress * 3 - i));
          if (ringProgress > 0 && ringProgress <= 1) {
            const ringRadius = e.radius * (0.3 + 0.7 * ringProgress);
            const ringAlpha = (1 - ringProgress) * 0.5 * alpha;
            this._gfx.lineStyle(4 - i, fireColors[i], ringAlpha);
            this._gfx.strokeCircle(e.x, e.y, ringRadius);
          }
        }

        // Fire core
        this._gfx.fillStyle(0xff4400, 0.5 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius * 0.4);

        // Fire particles
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + progress * Math.PI;
          const dist = e.radius * (0.3 + 0.7 * Math.sin(progress * Math.PI));
          const px = e.x + Math.cos(angle) * dist;
          const py = e.y + Math.sin(angle) * dist;
          this._gfx.fillStyle(0xffaa00, 0.4 * alpha);
          this._gfx.fillCircle(px, py, 5);
        }
      }

      if (e.type === 'bossWarning') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 2.0));
        const pulse = Math.sin(state.time * 10) * 0.2 + 0.8;

        this._gfx.fillStyle(0xff4444, 0.15 * alpha * pulse);
        this._gfx.fillCircle(e.x, e.y, e.radius);

        this._gfx.lineStyle(4, 0xff6666, 0.6 * alpha * pulse);
        this._gfx.strokeCircle(e.x, e.y, e.radius);

        this._gfx.lineStyle(2, 0xffaaaa, 0.8 * alpha);
        this._gfx.strokeCircle(e.x, e.y, Math.max(0, e.radius - 20));

        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2 + (state.time * 2);
          const px = e.x + Math.cos(angle) * (e.radius * 0.85);
          const py = e.y + Math.sin(angle) * (e.radius * 0.85);
          this._gfx.fillStyle(0xff8888, 0.5 * alpha);
          this._gfx.fillCircle(px, py, 3);
        }

        this._gfx.fillStyle(0xff0000, 0.3 * alpha);
        this._gfx.fillCircle(e.x, e.y, 10);
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

      if (e.type === 'bossPhaseChange') {
        // 75% - Yellow aura for speed up
        const alpha = Math.max(0, Math.min(1, e.ttl / 2.0));
        const pulse = Math.sin(state.time * 8) * 0.3 + 0.7;

        this._gfx.fillStyle(0xffaa00, 0.25 * alpha * pulse);
        this._gfx.fillCircle(e.x, e.y, 100);

        this._gfx.lineStyle(4, 0xffcc00, 0.8 * alpha);
        this._gfx.strokeCircle(e.x, e.y, 80 + pulse * 20);

        // Lightning bolts
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + state.time * 4;
          const len = 60 + 20 * Math.sin(state.time * 5);
          this._gfx.lineStyle(3, 0xffff00, 0.6 * alpha);
          this._gfx.beginPath();
          this._gfx.moveTo(e.x, e.y);
          this._gfx.lineTo(e.x + Math.cos(angle) * len, e.y + Math.sin(angle) * len);
          this._gfx.strokePath();
        }
      }

      if (e.type === 'bossSummon') {
        // 50% - Purple summon circles
        const alpha = Math.max(0, Math.min(1, e.ttl / 1.5));
        const pulse = Math.sin(state.time * 6) * 0.2 + 0.8;

        // Expanding summoning circles
        for (let i = 0; i < 3; i++) {
          const offset = (state.time * 2 + i * 2) % 3;
          const radius = 30 + offset * 25;
          this._gfx.lineStyle(3, 0x9932cc, (3 - offset) / 3 * 0.6 * alpha);
          this._gfx.strokeCircle(e.x, e.y, radius);
        }

        this._gfx.fillStyle(0x9932cc, 0.3 * alpha * pulse);
        this._gfx.fillCircle(e.x, e.y, 40);

        // Summon symbols
        this._gfx.fillStyle(0xff00ff, 0.5 * alpha);
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + state.time;
          const dist = 70;
          const sx = e.x + Math.cos(angle) * dist;
          const sy = e.y + Math.sin(angle) * dist;
          this._gfx.fillCircle(sx, sy, 8);
        }
      }

      if (e.type === 'bossHeal') {
        // 25% - Green heal shield
        const alpha = Math.max(0, Math.min(1, e.ttl / 2.0));
        const pulse = Math.sin(state.time * 4) * 0.2 + 0.8;

        // Shield bubble
        this._gfx.fillStyle(0x00ff88, 0.15 * alpha * pulse);
        this._gfx.fillCircle(e.x, e.y, 120);

        // Shield rings
        for (let i = 0; i < 3; i++) {
          this._gfx.lineStyle(4 - i, 0x00ff88, 0.7 * alpha * (1 - i * 0.2));
          this._gfx.strokeCircle(e.x, e.y, 80 + i * 15 + pulse * 10);
        }

        // Cross symbols for heal
        this._gfx.lineStyle(3, 0x00ffaa, 0.9 * alpha);
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + state.time * 2;
          const dist = 100;
          const hx = e.x + Math.cos(angle) * dist;
          const hy = e.y + Math.sin(angle) * dist;
          const size = 15;
          this._gfx.beginPath();
          this._gfx.moveTo(hx - size, hy);
          this._gfx.lineTo(hx + size, hy);
          this._gfx.moveTo(hx, hy - size);
          this._gfx.lineTo(hx, hy + size);
          this._gfx.strokePath();
        }

        // Heal number
        this._gfx.fillStyle(0x00ff88, 0.8 * alpha);
        this._gfx.fillCircle(e.x, e.y - 60, 20);
        this._gfx.fillStyle(0xffffff, alpha);
        this._gfx.fillCircle(e.x, e.y - 60, 12);
      }

      if (e.type === 'basicAttackCone') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.15));
        const progress = 1 - (e.ttl / 0.15);
        const startAngle = e.angle - e.coneAngle;
        const endAngle = e.angle + e.coneAngle;

        // BASIC ATTACK: Simple quick swipe arc
        // Thin swipe arc
        const swipeAngle = startAngle + (endAngle - startAngle) * progress;
        this._gfx.lineStyle(3, 0xeeeeee, 0.8 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.range * 0.8, startAngle, swipeAngle);
        this._gfx.strokePath();

        // Swipe trail
        this._gfx.lineStyle(2, 0xaaaaaa, 0.4 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.range * 0.6, startAngle, swipeAngle - 0.1);
        this._gfx.strokePath();

        // Quick flash at impact point
        const flashX = e.x + Math.cos(e.angle) * e.range * 0.7;
        const flashY = e.y + Math.sin(e.angle) * e.range * 0.7;
        this._gfx.fillStyle(0xffffff, 0.6 * alpha);
        this._gfx.fillCircle(flashX, flashY, 5);
      }

      if (e.type === 'dash') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.3));
        // Dash: Yellow-orange trail with afterimages
        const trailColor = 0xffaa00; // Orange-yellow

        // Main dash body
        this._gfx.fillStyle(trailColor, 0.6 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius * 0.4);

        // Trail particles behind
        for (let i = 1; i <= 5; i++) {
          const trailX = e.x - Math.cos(e.angle) * i * 15;
          const trailY = e.y - Math.sin(e.angle) * i * 15;
          const trailAlpha = alpha * (1 - i / 6) * 0.5;
          this._gfx.fillStyle(trailColor, trailAlpha);
          this._gfx.fillCircle(trailX, trailY, e.radius * 0.3 * (1 - i / 8));
        }

        // Speed lines forward
        this._gfx.lineStyle(3, trailColor, 0.8 * alpha);
        this._gfx.beginPath();
        this._gfx.moveTo(e.x, e.y);
        this._gfx.lineTo(
          e.x + Math.cos(e.angle) * e.radius * 1.2,
          e.y + Math.sin(e.angle) * e.radius * 1.2
        );
        this._gfx.strokePath();

        // Motion blur streaks
        this._gfx.lineStyle(2, 0xffffff, 0.4 * alpha);
        for (let i = -2; i <= 2; i++) {
          const offsetAngle = e.angle + i * 0.2;
          this._gfx.beginPath();
          this._gfx.moveTo(
            e.x - Math.cos(e.angle) * 10,
            e.y - Math.sin(e.angle) * 10
          );
          this._gfx.lineTo(
            e.x + Math.cos(offsetAngle) * e.radius * 0.9,
            e.y + Math.sin(offsetAngle) * e.radius * 0.9
          );
          this._gfx.strokePath();
        }
      }

      if (e.type === 'counter') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 0.4));
        // Counter: Blue-white parry arc (distinct from dash)
        const counterColor = 0x4d96ff; // Blue

        // Outer parry ring
        this._gfx.lineStyle(4, counterColor, 0.9 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.radius, e.angle - 0.8, e.angle + 0.8);
        this._gfx.strokePath();

        // Inner arc
        this._gfx.lineStyle(2, 0xffffff, 0.7 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.radius * 0.7, e.angle - 0.6, e.angle + 0.6);
        this._gfx.strokePath();

        // Parry "impact" center
        this._gfx.fillStyle(0xffffff, 0.5 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius * 0.25);

        // Sparks around parry zone
        for (let i = 0; i < 6; i++) {
          const sparkAngle = e.angle + (i - 2.5) * 0.25;
          const sparkDist = e.radius + Math.random() * 10;
          this._gfx.fillStyle(0x4d96ff, 0.6 * alpha);
          this._gfx.fillCircle(
            e.x + Math.cos(sparkAngle) * sparkDist,
            e.y + Math.sin(sparkAngle) * sparkDist,
            3
          );
        }
      }

      if (e.type === 'defense' || e.type === 'shield') {
        const alpha = Math.max(0, Math.min(1, e.ttl / 2.0));
        // Defense: Green hexagon shield bubble
        const shieldColor = 0x6bcb77;

        // Shield gradient fill
        this._gfx.fillStyle(shieldColor, 0.2 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius);

        // Outer hexagon border
        this._gfx.lineStyle(3, shieldColor, 0.9 * alpha);
        this._gfx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const px = e.x + Math.cos(angle) * e.radius;
          const py = e.y + Math.sin(angle) * e.radius;
          if (i === 0) this._gfx.moveTo(px, py);
          else this._gfx.lineTo(px, py);
        }
        this._gfx.closePath();
        this._gfx.strokePath();

        // Inner hexagon
        this._gfx.lineStyle(2, shieldColor, 0.5 * alpha);
        this._gfx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const px = e.x + Math.cos(angle) * e.radius * 0.6;
          const py = e.y + Math.sin(angle) * e.radius * 0.6;
          if (i === 0) this._gfx.moveTo(px, py);
          else this._gfx.lineTo(px, py);
        }
        this._gfx.closePath();
        this._gfx.strokePath();

        // Center shield icon
        this._gfx.fillStyle(0xffffff, 0.4 * alpha);
        this._gfx.fillCircle(e.x, e.y, e.radius * 0.2);
      }

      if (e.type === 'arden') {
        // Z (아덴스킬): RED rapid punch barrage
        const alpha = Math.max(0, Math.min(1, e.ttl / (e.hits * e.hitInterval)));
        const progress = 1 - alpha;

        const ardenColor = 0xff3333; // Red
        const numPunches = Math.min(e.hits, Math.floor(progress * e.hits) + 3);

        for (let i = 0; i < numPunches; i++) {
          const punchProgress = i / e.hits;
          const punchDistance = e.radius * (0.2 + 0.8 * punchProgress);
          const punchX = e.x + Math.cos(e.angle) * punchDistance;
          const punchY = e.y + Math.sin(e.angle) * punchDistance;

          const sideOffset = Math.sin(i * 1.5) * 15 * (1 - punchProgress * 0.5);
          const perpAngle = e.angle + Math.PI / 2;
          const finalX = punchX + Math.cos(perpAngle) * sideOffset;
          const finalY = punchY + Math.sin(perpAngle) * sideOffset;

          const fistSize = 12 + 8 * Math.sin(punchProgress * Math.PI);

          // Red fist core
          this._gfx.fillStyle(ardenColor, 0.8 * alpha);
          this._gfx.fillCircle(finalX, finalY, fistSize);

          // White highlight
          this._gfx.fillStyle(0xffaaaa, 0.5 * alpha);
          this._gfx.fillCircle(finalX - 2, finalY - 2, fistSize * 0.5);

          // Shockwave ring
          const shockProgress = (progress * e.hits - i) / 2;
          if (shockProgress > 0 && shockProgress < 1) {
            this._gfx.lineStyle(2, 0xffffff, (1 - shockProgress) * 0.6 * alpha);
            this._gfx.strokeCircle(finalX, finalY, fistSize + shockProgress * 20);
          }

          // Motion blur trail
          const trailLen = 25;
          this._gfx.lineStyle(3, ardenColor, 0.3 * alpha);
          this._gfx.beginPath();
          this._gfx.moveTo(finalX, finalY);
          this._gfx.lineTo(
            finalX - Math.cos(e.angle) * trailLen,
            finalY - Math.sin(e.angle) * trailLen
          );
          this._gfx.strokePath();
        }

        // Arm stance
        const armLength = 30;
        this._gfx.lineStyle(6, ardenColor, 0.7 * alpha);
        this._gfx.beginPath();
        this._gfx.moveTo(e.x, e.y);
        this._gfx.lineTo(
          e.x + Math.cos(e.angle) * armLength,
          e.y + Math.sin(e.angle) * armLength
        );
        this._gfx.strokePath();

        // Subtle cone
        const coneAngle = Math.PI / 3;
        this._gfx.lineStyle(1, ardenColor, 0.15 * alpha);
        this._gfx.beginPath();
        this._gfx.arc(e.x, e.y, e.radius, e.angle - coneAngle, e.angle + coneAngle);
        this._gfx.strokePath();
      }

      if (e.type === 'awakening') {
        // V (각성기): GOLD/PURPLE majestic energy wave
        const alpha = Math.max(0, Math.min(1, e.ttl / (e.hits * e.hitInterval)));
        const progress = 1 - alpha;

        const goldColor = 0xffd700; // Gold
        const purpleColor = 0x9b59b6; // Purple
        const numStrikes = Math.min(e.hits, Math.floor(progress * e.hits) + 3);

        // Central energy beam
        this._gfx.lineStyle(8, goldColor, 0.6 * alpha);
        this._gfx.beginPath();
        this._gfx.moveTo(e.x, e.y);
        this._gfx.lineTo(
          e.x + Math.cos(e.angle) * e.radius,
          e.y + Math.sin(e.angle) * e.radius
        );
        this._gfx.strokePath();

        // Energy core glow
        this._gfx.fillStyle(goldColor, 0.4 * alpha);
        this._gfx.fillCircle(e.x, e.y, 25);

        for (let i = 0; i < numStrikes; i++) {
          const strikeProgress = i / e.hits;
          const strikeDistance = e.radius * (0.1 + 0.9 * strikeProgress);
          const strikeX = e.x + Math.cos(e.angle) * strikeDistance;
          const strikeY = e.y + Math.sin(e.angle) * strikeDistance;

          // Majestic energy blade
          const bladeWidth = 20 + 15 * Math.sin(strikeProgress * Math.PI);
          const perpAngle = e.angle + Math.PI / 2;

          // Gold blade
          this._gfx.fillStyle(goldColor, 0.7 * alpha);
          this._gfx.fillCircle(strikeX, strikeY, bladeWidth * 0.6);

          // Purple inner core
          this._gfx.fillStyle(purpleColor, 0.5 * alpha);
          this._gfx.fillCircle(strikeX, strikeY, bladeWidth * 0.3);

          // Energy particles
          for (let j = 0; j < 4; j++) {
            const particleAngle = e.angle + (j - 1.5) * 0.5;
            const particleDist = 30 + Math.random() * 20;
            this._gfx.fillStyle(0xffffff, 0.6 * alpha);
            this._gfx.fillCircle(
              strikeX + Math.cos(particleAngle) * particleDist,
              strikeY + Math.sin(particleAngle) * particleDist,
              4
            );
          }
        }

        // Outer energy ring
        this._gfx.lineStyle(4, goldColor, 0.4 * alpha);
        this._gfx.strokeCircle(e.x, e.y, e.radius * 0.8 * progress);

        // Purple energy wave front
        const waveX = e.x + Math.cos(e.angle) * e.radius * 0.9;
        const waveY = e.y + Math.sin(e.angle) * e.radius * 0.9;
        this._gfx.fillStyle(purpleColor, 0.3 * alpha);
        this._gfx.fillCircle(waveX, waveY, 40);
      }
    }

    if (this._text) {
      const hp = Math.round(state.player.hp);
      const dialog = state.interactions.dialog ?? '';
      const zone = state.currentZone.toUpperCase();

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

      const moveSpeed = state.player.movementSpeed || 100;
      const atkSpeed = state.player.attackSpeed || 100;

      this._text.setText(
        `Zone: ${zone}\n${zoneInfo}\nLMB: Move\nRMB: Basic Attack\nE: Interact\nI: Upgrade Panel\nHP: ${hp}\nGold: ${state.player.gold}\nSpeed: ${moveSpeed}% | ATK SPD: ${atkSpeed}%\n\n=== CONSUMABLES ===\n${consumableLines.join('\n')}\n\n${dialog}`,
      );
    }

    this._renderSkillSlots(state);

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

  _updateViewportState() {
    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

    const camera = this.scene.cameras.main;
    this._state._render = {
      viewport: {
        left: camera.scrollX,
        top: camera.scrollY,
        scaleX: camera.zoom,
        scaleY: camera.zoom,
      },
    };
  }

  _renderSkillSlots(state) {
    if (!this._scene || !this._gfx || !this._skillSlotTexts.length) return;

    const slotSize = 36;
    const gap = 6;
    const specialGap = 20;

    // Skill layout: QWERT-V (기력/공격 - 파랑), ASDF (충격/이동 - 노랑), Z (수라결), X (호신투기)
    const mainSkillKeys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'v'];
    const mainTotalWidth = (slotSize + gap) * 5 - gap;
    const mainStartX = (this.width - mainTotalWidth) / 2;
    const mainStartY = this.height - 90;

    // Special skills: Z(수라결), X(호신투기)
    const specialSkillKeys = ['z', 'x'];
    const specialColors = {
      z: 0xff3333, // 수라결 - red
      x: 0x6bcb77, // 호신투기 - green
    };
    const specialStartX = mainStartX + mainTotalWidth + specialGap;
    const specialStartY = mainStartY;

    // Sura's Path: Energy(藍/Blue=Attack) vs Impact(黃/Yellow=Movement/Counter)
    const skillColors = {
      // 기력(藍) 스킬 - 주먹/발차기 공격 - Blue
      q: 0x4d96ff, // 맹호권
      w: 0x4d96ff, // 연환격
      e: 0x4d96ff, // 천마파
      r: 0x4d96ff, // 파천권
      t: 0x4d96ff, // 광염권
      v: 0x4d96ff, // 폭풍각
      // 충격(黃) 스킬 - 이동/카운터 - Gold/Yellow
      a: 0xffd700, // 질풍보
      s: 0xffd700, // 역습격
      d: 0xffd700, // 섬광보
      f: 0xffd700, // 회피타
    };

    // Render main skills (QWERT + ASDF + V)
    for (let i = 0; i < mainSkillKeys.length; i++) {
      const key = mainSkillKeys[i];
      const skill = state.player.skills[key];
      const row = Math.floor(i / 5);
      const col = i % 5;
      const x = mainStartX + col * (slotSize + gap);
      const y = mainStartY + row * (slotSize + gap);
      const color = skillColors[key] || 0x4d96ff;

      // Slot background
      this._gfx.fillStyle(0x1a1a2e, 0.95);
      this._gfx.fillRect(x, y, slotSize, slotSize);

      // Slot border with gauge type indicator
      this._gfx.lineStyle(2, color, 1);
      this._gfx.strokeRect(x, y, slotSize, slotSize);

      // Skill icon background
      this._gfx.fillStyle(color, 0.5);
      this._gfx.fillRect(x + 2, y + 2, slotSize - 4, slotSize - 4);

      // Position skill key label
      const label = this._skillSlotTexts[i];
      label.setPosition(x + 4, y + 4);
      label.setVisible(true);

      // Cooldown overlay and text
      const cdText = this._skillCdTexts[i];
      if (skill.remaining > 0) {
        const cooldownPercent = skill.remaining / skill.cooldown;
        this._gfx.fillStyle(0x000000, 0.75);
        this._gfx.fillRect(x, y, slotSize, slotSize * cooldownPercent);

        cdText.setText(skill.remaining.toFixed(1));
        cdText.setPosition(x + slotSize / 2, y + slotSize / 2);
        cdText.setOrigin(0.5);
        cdText.setVisible(true);
      } else {
        cdText.setVisible(false);
      }
    }

    // Render special skills (Z, X)
    for (let i = 0; i < specialSkillKeys.length; i++) {
      const key = specialSkillKeys[i];
      const skill = state.player.skills[key];
      const col = i;
      const x = specialStartX + col * (slotSize + gap);
      const y = specialStartY;
      const color = specialColors[key] || 0xff3333;

      // Slot background
      this._gfx.fillStyle(0x1a1a2e, 0.95);
      this._gfx.fillRect(x, y, slotSize, slotSize);

      // Special slot border (thicker)
      this._gfx.lineStyle(3, color, 1);
      this._gfx.strokeRect(x, y, slotSize, slotSize);

      // Skill icon background
      this._gfx.fillStyle(color, 0.6);
      this._gfx.fillRect(x + 2, y + 2, slotSize - 4, slotSize - 4);

      // Position skill key label
      const labelIndex = mainSkillKeys.length + i;
      const label = this._skillSlotTexts[labelIndex];
      label.setPosition(x + 4, y + 4);
      label.setVisible(true);

      // Cooldown overlay and text
      const cdText = this._skillCdTexts[labelIndex];
      if (skill.remaining > 0) {
        const cooldownPercent = skill.remaining / skill.cooldown;
        this._gfx.fillStyle(0x000000, 0.75);
        this._gfx.fillRect(x, y, slotSize, slotSize * cooldownPercent);

        cdText.setText(skill.remaining.toFixed(1));
        cdText.setPosition(x + slotSize / 2, y + slotSize / 2);
        cdText.setOrigin(0.5);
        cdText.setVisible(true);
      } else {
        cdText.setVisible(false);
      }
    }

    // Render HP and Gauge bars above skill icons
    this._renderStatusBars(state, mainStartX, mainStartY, mainTotalWidth);

    // Render Character Gauge (circular)
    this._renderCharacterGauge(state, specialStartX, specialStartY, slotSize, gap, specialGap);
  }

  _renderCharacterGauge(state, specialStartX, specialStartY, slotSize, gap, specialGap) {
    const gaugeRadius = 28;
    const gaugeX = specialStartX + (slotSize + gap) * 2 + specialGap + gaugeRadius;
    const gaugeY = specialStartY + slotSize / 2;
    
    const gauge = state.player.gauge;
    if (!gauge) return;

    // Character-specific gauge rendering
    if (gauge.type === 'arden') {
      // Sura: Red circular stacks
      this._renderArdenGauge(gauge, gaugeX, gaugeY, gaugeRadius);
    } else if (gauge.type === 'focus') {
      // Lancer: Bronze focus gauge
      this._renderFocusGauge(gauge, gaugeX, gaugeY, gaugeRadius);
    } else if (gauge.type === 'mana') {
      // Sorceress: Blue mana bar
      this._renderManaGauge(gauge, gaugeX, gaugeY, gaugeRadius);
    }
  }

  _renderArdenGauge(gauge, x, y, radius) {
    const percent = gauge.stacks / gauge.maxStacks;
    const isMax = gauge.stacks >= gauge.maxStacks;

    // Background
    this._gfx.fillStyle(0x1a1a2e, 0.95);
    this._gfx.fillCircle(x, y, radius);

    // Border - glow red when max
    const borderColor = isMax ? 0xff3333 : 0x888888;
    this._gfx.lineStyle(isMax ? 4 : 3, borderColor, 1);
    this._gfx.strokeCircle(x, y, radius);

    // Fill arc
    if (percent > 0) {
      const fillColor = isMax ? 0xff3333 : 0xff6666;
      this._gfx.fillStyle(fillColor, 0.8);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * percent);
      this._gfx.slice(x, y, radius - 4, startAngle, endAngle);
      this._gfx.fillPath();
    }

    // Center
    this._gfx.fillStyle(0x0b0f17, 1);
    this._gfx.fillCircle(x, y, radius - 8);

    // Text
    if (this._suraText) {
      this._suraText.setPosition(x, y);
      this._suraText.setOrigin(0.5);
      this._suraText.setText(`${gauge.stacks}`);
      this._suraText.setVisible(true);
      this._suraText.setColor(isMax ? '#ff3333' : '#ffffff');
      this._suraText.setFontSize('16px');
    }
  }

  _renderFocusGauge(gauge, x, y, radius) {
    const percent = gauge.stacks / gauge.maxStacks;
    const isMax = gauge.stacks >= gauge.maxStacks;

    // Background
    this._gfx.fillStyle(0x1a1a2e, 0.95);
    this._gfx.fillCircle(x, y, radius);

    // Border - bronze glow when max
    const borderColor = isMax ? 0xff8c00 : 0xcd853f;
    this._gfx.lineStyle(isMax ? 4 : 3, borderColor, 1);
    this._gfx.strokeCircle(x, y, radius);

    // Fill arc
    if (percent > 0) {
      const fillColor = isMax ? 0xff8c00 : 0xcd853f;
      this._gfx.fillStyle(fillColor, 0.8);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * percent);
      this._gfx.slice(x, y, radius - 4, startAngle, endAngle);
      this._gfx.fillPath();
    }

    // Center
    this._gfx.fillStyle(0x0b0f17, 1);
    this._gfx.fillCircle(x, y, radius - 8);

    // Text - show stacks
    if (this._suraText) {
      this._suraText.setPosition(x, y);
      this._suraText.setOrigin(0.5);
      this._suraText.setText(`${gauge.stacks}`);
      this._suraText.setVisible(true);
      this._suraText.setColor(isMax ? '#ff8c00' : '#ffffff');
      this._suraText.setFontSize('16px');
    }
  }

  _renderManaGauge(gauge, x, y, radius) {
    const percent = gauge.current / gauge.max;

    // Background
    this._gfx.fillStyle(0x1a1a2e, 0.95);
    this._gfx.fillCircle(x, y, radius);

    // Border - blue
    this._gfx.lineStyle(3, 0x4169e1, 1);
    this._gfx.strokeCircle(x, y, radius);

    // Fill arc - blue for mana
    if (percent > 0) {
      this._gfx.fillStyle(0x4169e1, 0.8);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * percent);
      this._gfx.slice(x, y, radius - 4, startAngle, endAngle);
      this._gfx.fillPath();
    }

    // Center
    this._gfx.fillStyle(0x0b0f17, 1);
    this._gfx.fillCircle(x, y, radius - 8);

    // Text - show mana value
    if (this._suraText) {
      this._suraText.setPosition(x, y);
      this._suraText.setOrigin(0.5);
      this._suraText.setText(`${Math.floor(gauge.current)}`);
      this._suraText.setVisible(true);
      this._suraText.setColor('#4169e1');
      this._suraText.setFontSize('14px');
    }
  }

  _renderStatusBars(state, mainStartX, mainStartY, mainTotalWidth) {
    const barWidth = mainTotalWidth;
    const barHeight = 16;
    const hpBarY = mainStartY - 45;
    const gaugeBarY = mainStartY - 25;

    const hpPercent = state.player.hp / state.player.maxHp;
    const gauge = state.player.gauge;

    // HP Bar Background
    this._gfx.fillStyle(0x330000, 1);
    this._gfx.fillRect(mainStartX, hpBarY, barWidth, barHeight);

    // HP Bar Fill (Red to Pink gradient based on HP)
    const hpColor = hpPercent > 0.5 ? 0xff4444 : 0xff2222;
    this._gfx.fillStyle(hpColor, 1);
    this._gfx.fillRect(mainStartX, hpBarY, barWidth * hpPercent, barHeight);

    // HP Bar Border
    this._gfx.lineStyle(2, 0xffffff, 0.8);
    this._gfx.strokeRect(mainStartX, hpBarY, barWidth, barHeight);

    // HP Text
    const hpText = `HP: ${Math.ceil(state.player.hp)} / ${state.player.maxHp}`;
    if (this._suraText) {
      // We'll use the text object temporarily positioned for HP
      // (In real implementation, you'd have separate text objects)
    }

    // Gauge Bar (Character-specific color)
    let gaugePercent = 0;
    let gaugeColor = 0x888888;
    let gaugeLabel = 'GAUGE';

    if (gauge) {
      if (gauge.type === 'arden') {
        gaugePercent = gauge.stacks / gauge.maxStacks;
        gaugeColor = 0xff3333; // Red
        gaugeLabel = 'ARDEN';
      } else if (gauge.type === 'focus') {
        gaugePercent = gauge.stacks / gauge.maxStacks;
        gaugeColor = 0xff8c00; // Bronze
        gaugeLabel = 'FOCUS';
      } else if (gauge.type === 'mana') {
        gaugePercent = gauge.current / gauge.max;
        gaugeColor = 0x4169e1; // Blue
        gaugeLabel = 'MANA';
      } else if (gauge.type === 'hunt') {
        gaugePercent = gauge.stacks / gauge.maxStacks;
        gaugeColor = 0xffd700; // Gold
        gaugeLabel = 'HUNT';
      }
    }

    // Gauge Bar Background
    this._gfx.fillStyle(0x1a1a2e, 1);
    this._gfx.fillRect(mainStartX, gaugeBarY, barWidth, barHeight);

    // Gauge Bar Fill
    this._gfx.fillStyle(gaugeColor, 0.9);
    this._gfx.fillRect(mainStartX, gaugeBarY, barWidth * gaugePercent, barHeight);

    // Gauge Bar Border
    this._gfx.lineStyle(2, gaugeColor, 1);
    this._gfx.strokeRect(mainStartX, gaugeBarY, barWidth, barHeight);

    // Draw text labels on bars
    if (this._suraText) {
      // HP Label
      this._gfx.fillStyle(0xffffff, 1);
      this._gfx.fillRect(mainStartX + 5, hpBarY + 3, 60, 10);
    }
  }
}

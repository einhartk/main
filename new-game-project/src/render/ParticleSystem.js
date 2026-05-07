// Enhanced Particle System for visual effects
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 500; // Performance limit
    this.particlePool = [];
    this.emitters = [];
    this.performanceManager = null;
    
    // Quality settings
    this.qualitySettings = {
      maxParticles: 500,
      particleLifetime: 1.0,
      emissionRate: 1.0,
      size: 1.0,
    };
  }

  // Create particle from pool or new
  createParticle(config) {
    let particle;
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop();
      this.resetParticle(particle, config);
    } else {
      particle = {
        x: config.x || 0,
        y: config.y || 0,
        vx: config.vx || 0,
        vy: config.vy || 0,
        size: config.size || 4,
        color: config.color || 0xffffff,
        alpha: config.alpha || 1,
        ttl: config.ttl || 1,
        maxTtl: config.ttl || 1,
        type: config.type || 'circle',
        gravity: config.gravity || 0,
        friction: config.friction || 0.98,
        scale: config.scale || 1,
        rotation: config.rotation || 0,
        rotationSpeed: config.rotationSpeed || 0,
        fadeOut: config.fadeOut !== false,
        shrink: config.shrink || false,
      };
    }
    return particle;
  }

  resetParticle(particle, config) {
    particle.x = config.x || 0;
    particle.y = config.y || 0;
    particle.vx = config.vx || 0;
    particle.vy = config.vy || 0;
    particle.size = config.size || 4;
    particle.color = config.color || 0xffffff;
    particle.alpha = config.alpha || 1;
    particle.ttl = config.ttl || 1;
    particle.maxTtl = config.ttl || 1;
    particle.type = config.type || 'circle';
    particle.gravity = config.gravity || 0;
    particle.friction = config.friction || 0.98;
    particle.scale = config.scale || 1;
    particle.rotation = config.rotation || 0;
    particle.rotationSpeed = config.rotationSpeed || 0;
    particle.fadeOut = config.fadeOut !== false;
    particle.shrink = config.shrink || false;
  }

  // Add particle to system
  addParticle(config) {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particle
      this.particles.shift();
    }
    
    const particle = this.createParticle(config);
    this.particles.push(particle);
    return particle;
  }

  // Create explosion effect
  createExplosion(x, y, config = {}) {
    const count = config.count || 20;
    const baseSpeed = config.speed || 150;
    const color = config.color || 0xff6600;
    const size = config.size || 3;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = baseSpeed * (0.5 + Math.random() * 0.5);
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size * (0.5 + Math.random()),
        color,
        ttl: 0.8 + Math.random() * 0.4,
        gravity: config.gravity || 200,
        friction: 0.95,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  // Create impact spark effect
  createImpactSparks(x, y, config = {}) {
    const count = config.count || 12;
    const color = config.color || 0xffffff;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 100 + Math.random() * 100;
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color,
        ttl: 0.3 + Math.random() * 0.2,
        gravity: 300,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  // Create trail effect
  createTrail(x, y, targetX, targetY, config = {}) {
    const steps = config.steps || 10;
    const color = config.color || 0x00ffff;
    const size = config.size || 4;
    
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const px = x + (targetX - x) * progress;
      const py = y + (targetY - y) * progress;
      
      this.addParticle({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        size: size * (1 - progress * 0.5),
        color,
        ttl: 0.5 + progress * 0.5,
        alpha: 1 - progress * 0.5,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  // Create healing effect
  createHealEffect(x, y, config = {}) {
    const count = config.count || 15;
    const color = config.color || 0x00ff00;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 50 + Math.random() * 50;
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50, // Upward bias
        size: 3 + Math.random() * 3,
        color,
        ttl: 1.5 + Math.random() * 0.5,
        gravity: -100, // Negative gravity (float up)
        fadeOut: true,
        shrink: true,
      });
    }
  }

  // Create magic circle effect
  createMagicCircle(x, y, radius, config = {}) {
    const points = config.points || 20;
    const color = config.color || 0x9966ff;
    const ttl = config.ttl || 1;
    
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      this.addParticle({
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        size: 4,
        color,
        ttl,
        alpha: 0.8,
        fadeOut: true,
        shrink: false,
        rotation: angle,
        rotationSpeed: 0.1,
      });
    }
  }

  // Update particles
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      
      // Apply physics
      particle.vy += particle.gravity * dt;
      particle.vx *= particle.friction;
      particle.vy *= particle.friction;
      
      // Update rotation
      particle.rotation += particle.rotationSpeed * dt;
      
      // Update TTL
      particle.ttl -= dt;
      
      // Update alpha and size
      if (particle.fadeOut) {
        particle.alpha = particle.ttl / particle.maxTtl;
      }
      
      if (particle.shrink) {
        particle.scale = particle.ttl / particle.maxTtl;
      }
      
      // Remove dead particles
      if (particle.ttl <= 0) {
        this.particles.splice(i, 1);
        this.particlePool.push(particle); // Return to pool
      }
    }
  }

  // Render particles using Phaser graphics
  render(gfx) {
    for (const particle of this.particles) {
      if (!particle) continue; // Skip null particles
      const actualSize = particle.size * particle.scale;
      
      gfx.save();
      gfx.translateCanvas(particle.x, particle.y);
      gfx.rotateCanvas(particle.rotation);
      
      if (particle.type === 'circle') {
        gfx.fillStyle(particle.color, particle.alpha);
        gfx.fillCircle(0, 0, actualSize);
      } else if (particle.type === 'square') {
        gfx.fillStyle(particle.color, particle.alpha);
        gfx.fillRect(-actualSize/2, -actualSize/2, actualSize, actualSize);
      } else if (particle.type === 'star') {
        this.drawStar(gfx, 0, 0, actualSize, 5, particle.color, particle.alpha);
      }
      
      gfx.restore();
    }
  }

  // Draw star shape
  drawStar(gfx, x, y, radius, points, color, alpha) {
    gfx.fillStyle(color, alpha);
    gfx.beginPath();
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * i) / points;
      const r = i % 2 === 0 ? radius : radius * 0.5;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      
      if (i === 0) {
        gfx.moveTo(px, py);
      } else {
        gfx.lineTo(px, py);
      }
    }
    
    gfx.closePath();
    gfx.fillPath();
  }

  // Clear all particles
  clear() {
    this.particles = [];
  }

  // Get particle count
  getParticleCount() {
    return this.particles.length;
  }

  // Set performance manager and update quality settings
  setPerformanceManager(performanceManager) {
    this.performanceManager = performanceManager;
    this.updateQualitySettings();
  }

  // Update quality settings based on performance manager
  updateQualitySettings() {
    if (!this.performanceManager) return;
    
    const settings = this.performanceManager.getParticleSettings();
    this.qualitySettings = settings;
    this.maxParticles = settings.maxParticles;
    
    // Adjust existing particles if needed
    if (this.particles.length > this.maxParticles) {
      // Remove excess particles
      const excess = this.particles.length - this.maxParticles;
      this.particles.splice(0, excess);
    }
  }

  // Enhanced createParticle with quality adjustment
  createParticle(config) {
    // Apply quality settings
    const adjustedConfig = {
      ...config,
      ttl: (config.ttl || 1) * this.qualitySettings.particleLifetime,
      size: (config.size || 4) * this.qualitySettings.size,
    };
    
    // Emission rate check
    if (Math.random() > this.qualitySettings.emissionRate) {
      return null;
    }
    
    let particle;
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop();
      this.resetParticle(particle, adjustedConfig);
    } else {
      particle = {
        x: adjustedConfig.x || 0,
        y: adjustedConfig.y || 0,
        vx: adjustedConfig.vx || 0,
        vy: adjustedConfig.vy || 0,
        size: adjustedConfig.size || 4,
        color: adjustedConfig.color || 0xffffff,
        alpha: adjustedConfig.alpha || 1,
        ttl: adjustedConfig.ttl || 1,
        maxTtl: adjustedConfig.ttl || 1,
        type: adjustedConfig.type || 'circle',
        gravity: adjustedConfig.gravity || 0,
        friction: adjustedConfig.friction || 0.98,
        scale: adjustedConfig.scale || 1,
        rotation: adjustedConfig.rotation || 0,
        rotationSpeed: adjustedConfig.rotationSpeed || 0,
        fadeOut: adjustedConfig.fadeOut !== false,
        shrink: adjustedConfig.shrink || false,
      };
    }
    return particle;
  }

  // Update quality settings periodically
  update(dt) {
    // Update quality settings every second
    if (this.performanceManager && Math.random() < 0.016) { // ~60fps check
      this.updateQualitySettings();
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      if (!particle) continue; // Skip null particles
      
      // Update position
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      
      // Apply physics
      particle.vy += particle.gravity * dt;
      particle.vx *= particle.friction;
      particle.vy *= particle.friction;
      
      // Update rotation
      particle.rotation += particle.rotationSpeed * dt;
      
      // Update TTL
      particle.ttl -= dt;
      
      // Update alpha and size
      if (particle.fadeOut) {
        particle.alpha = particle.ttl / particle.maxTtl;
      }
      
      if (particle.shrink) {
        particle.scale = particle.ttl / particle.maxTtl;
      }
      
      // Remove dead particles
      if (particle.ttl <= 0) {
        this.particles.splice(i, 1);
        this.particlePool.push(particle); // Return to pool
      }
    }
  }
}

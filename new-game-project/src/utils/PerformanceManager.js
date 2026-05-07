// Performance Manager for optimizing game performance
export class PerformanceManager {
  constructor() {
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fpsHistory = [];
    this.maxFpsHistory = 60;
    
    // Performance thresholds
    this.targetFps = 60;
    this.minAcceptableFps = 30;
    this.criticalFps = 20;
    
    // Adaptive quality settings
    this.qualityLevel = 'high'; // high, medium, low
    this.particleQuality = 'high'; // high, medium, low
    this.effectQuality = 'high'; // high, medium, low
    
    // Memory management
    this.memoryCheckInterval = 5000; // 5 seconds
    this.lastMemoryCheck = 0;
    this.maxMemoryUsage = 100 * 1024 * 1024; // 100MB
    
    // Performance monitoring
    this.performanceMetrics = {
      avgFps: 60,
      minFps: 60,
      maxFps: 60,
      frameTime: 0,
      drawCalls: 0,
      particleCount: 0,
    };
  }

  // Update performance metrics
  update(currentTime, particleCount = 0, drawCalls = 0) {
    this.frameCount++;
    
    // Update FPS every second
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
      
      // Update FPS history
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxFpsHistory) {
        this.fpsHistory.shift();
      }
      
      // Calculate performance metrics
      this.updatePerformanceMetrics(particleCount, drawCalls);
      
      // Adjust quality based on performance
      this.adjustQuality();
      
      // Check memory usage
      this.checkMemoryUsage(currentTime);
    }
    
    // Track frame time
    this.performanceMetrics.frameTime = 1000 / this.fps;
    this.performanceMetrics.particleCount = particleCount;
    this.performanceMetrics.drawCalls = drawCalls;
  }

  // Update performance metrics
  updatePerformanceMetrics(particleCount, drawCalls) {
    if (this.fpsHistory.length > 0) {
      this.performanceMetrics.avgFps = 
        this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      this.performanceMetrics.minFps = Math.min(...this.fpsHistory);
      this.performanceMetrics.maxFps = Math.max(...this.fpsHistory);
    }
    
    this.performanceMetrics.particleCount = particleCount;
    this.performanceMetrics.drawCalls = drawCalls;
  }

  // Adjust quality settings based on performance
  adjustQuality() {
    const avgFps = this.performanceMetrics.avgFps;
    
    if (avgFps < this.criticalFps) {
      // Critical performance - reduce quality significantly
      if (this.qualityLevel !== 'low') {
        this.qualityLevel = 'low';
        this.particleQuality = 'low';
        this.effectQuality = 'low';
        console.log('Performance: Switching to LOW quality settings');
      }
    } else if (avgFps < this.minAcceptableFps) {
      // Poor performance - reduce quality
      if (this.qualityLevel === 'high') {
        this.qualityLevel = 'medium';
        this.particleQuality = 'medium';
        this.effectQuality = 'medium';
        console.log('Performance: Switching to MEDIUM quality settings');
      }
    } else if (avgFps >= this.targetFps - 5) {
      // Good performance - can increase quality
      if (this.qualityLevel === 'low' && avgFps >= this.targetFps) {
        this.qualityLevel = 'medium';
        this.particleQuality = 'medium';
        this.effectQuality = 'medium';
        console.log('Performance: Switching to MEDIUM quality settings');
      } else if (this.qualityLevel === 'medium' && avgFps >= this.targetFps - 2) {
        this.qualityLevel = 'high';
        this.particleQuality = 'high';
        this.effectQuality = 'high';
        console.log('Performance: Switching to HIGH quality settings');
      }
    }
  }

  // Check memory usage and clean up if needed
  checkMemoryUsage(currentTime) {
    if (currentTime - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }
    
    this.lastMemoryCheck = currentTime;
    
    // Estimate memory usage (simplified)
    if (performance.memory) {
      const usedMemory = performance.memory.usedJSHeapSize;
      const totalMemory = performance.memory.totalJSHeapSize;
      
      if (usedMemory > this.maxMemoryUsage) {
        console.warn(`High memory usage detected: ${Math.round(usedMemory / 1024 / 1024)}MB`);
        this.performMemoryCleanup();
      }
    }
  }

  // Perform memory cleanup
  performMemoryCleanup() {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      console.log('Forced garbage collection');
    }
    
    // Clear old particle pools
    if (window.particleSystem) {
      window.particleSystem.clear();
      console.log('Cleared particle system');
    }
    
    // Clear effect history
    if (window.lastEffectIds) {
      window.lastEffectIds.clear();
      console.log('Cleared effect history');
    }
  }

  // Get quality settings for systems
  getParticleSettings() {
    switch (this.particleQuality) {
      case 'low':
        return {
          maxParticles: 100,
          particleLifetime: 0.5,
          emissionRate: 0.5,
          size: 0.7,
        };
      case 'medium':
        return {
          maxParticles: 300,
          particleLifetime: 0.8,
          emissionRate: 0.7,
          size: 0.85,
        };
      case 'high':
      default:
        return {
          maxParticles: 500,
          particleLifetime: 1.0,
          emissionRate: 1.0,
          size: 1.0,
        };
    }
  }

  getEffectSettings() {
    switch (this.effectQuality) {
      case 'low':
        return {
          trailLength: 5,
          effectCount: 0.5,
          glowIntensity: 0.6,
          detailLevel: 0.5,
        };
      case 'medium':
        return {
          trailLength: 8,
          effectCount: 0.7,
          glowIntensity: 0.8,
          detailLevel: 0.7,
        };
      case 'high':
      default:
        return {
          trailLength: 12,
          effectCount: 1.0,
          glowIntensity: 1.0,
          detailLevel: 1.0,
        };
    }
  }

  // Get current performance metrics
  getMetrics() {
    return {
      ...this.performanceMetrics,
      currentFps: this.fps,
      qualityLevel: this.qualityLevel,
      particleQuality: this.particleQuality,
      effectQuality: this.effectQuality,
    };
  }

  // Reset performance metrics
  reset() {
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fpsHistory = [];
    this.qualityLevel = 'high';
    this.particleQuality = 'high';
    this.effectQuality = 'high';
    
    this.performanceMetrics = {
      avgFps: 60,
      minFps: 60,
      maxFps: 60,
      frameTime: 0,
      drawCalls: 0,
      particleCount: 0,
    };
  }

  // Enable/disable performance monitoring
  enableMonitoring() {
    this.monitoringEnabled = true;
  }

  disableMonitoring() {
    this.monitoringEnabled = false;
  }
}

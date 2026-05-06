// SoundManager - Handles game audio (sound effects and background music)
// Uses Phaser's built-in sound system

export class SoundManager {
  constructor(scene) {
    this._scene = scene;
    this._sounds = {};
    this._bgm = null;
    this._enabled = true;
    this._volume = 0.5;
    
    // Skill sound mappings (using Phaser sound effects)
    this._skillSounds = {
      'combo': 'punch',
      'spin': 'swing',
      'uppercut': 'heavy_hit',
      'pierce': 'stab',
      'dash': 'whoosh',
      'counter': 'parry',
      'fireAoE': 'fire_explosion',
      'projectile': 'shoot',
      'chain': 'thunder',
      'aoe': 'explosion',
      'awakening': 'ultimate',
      'arden': 'rapid_hits',
      'defense': 'shield',
      'shield': 'barrier',
      'bossSkill': 'roar',
    };
  }

  // Initialize sounds (call in scene preload/create)
  init() {
    if (!this._scene || !this._enabled) return;
    
    // Create procedural sound effects using oscillators
    // Since we don't have external audio files, we'll use simple tones
    this._createProceduralSounds();
  }

  _createProceduralSounds() {
    // Generate simple sound effects
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    this._audioCtx = audioCtx;
    
    // Store audio context for later use
    this._proceduralSounds = {
      punch: () => this._playTone(150, 50, 'square'),
      swing: () => this._playTone(300, 100, 'sawtooth'),
      heavy_hit: () => this._playTone(100, 80, 'square'),
      stab: () => this._playTone(400, 30, 'triangle'),
      whoosh: () => this._playSweep(600, 200, 150),
      parry: () => this._playTone(800, 50, 'sine'),
      fire_explosion: () => this._playNoise(200),
      shoot: () => this._playSweep(800, 400, 50),
      thunder: () => this._playNoise(100),
      explosion: () => this._playNoise(150),
      ultimate: () => this._playChord([440, 554, 659], 500),
      rapid_hits: () => this._playRapidTones([200, 250, 300], 30),
      shield: () => this._playTone(600, 100, 'sine'),
      barrier: () => this._playTone(500, 150, 'sine'),
      roar: () => this._playNoise(300),
      hit: () => this._playTone(120, 60, 'square'),
    };
  }

  _playTone(freq, duration, type = 'sine') {
    if (!this._audioCtx || !this._enabled) return;
    
    const osc = this._audioCtx.createOscillator();
    const gain = this._audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this._audioCtx.currentTime);
    
    gain.gain.setValueAtTime(this._volume * 0.3, this._audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this._audioCtx.currentTime + duration / 1000);
    
    osc.connect(gain);
    gain.connect(this._audioCtx.destination);
    
    osc.start();
    osc.stop(this._audioCtx.currentTime + duration / 1000);
  }

  _playSweep(startFreq, endFreq, duration) {
    if (!this._audioCtx || !this._enabled) return;
    
    const osc = this._audioCtx.createOscillator();
    const gain = this._audioCtx.createGain();
    
    osc.frequency.setValueAtTime(startFreq, this._audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, this._audioCtx.currentTime + duration / 1000);
    
    gain.gain.setValueAtTime(this._volume * 0.2, this._audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this._audioCtx.currentTime + duration / 1000);
    
    osc.connect(gain);
    gain.connect(this._audioCtx.destination);
    
    osc.start();
    osc.stop(this._audioCtx.currentTime + duration / 1000);
  }

  _playNoise(duration) {
    if (!this._audioCtx || !this._enabled) return;
    
    const bufferSize = this._audioCtx.sampleRate * duration / 1000;
    const buffer = this._audioCtx.createBuffer(1, bufferSize, this._audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this._audioCtx.createBufferSource();
    const gain = this._audioCtx.createGain();
    
    noise.buffer = buffer;
    
    // Filter for explosion-like sound
    const filter = this._audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    gain.gain.setValueAtTime(this._volume * 0.3, this._audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this._audioCtx.currentTime + duration / 1000);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this._audioCtx.destination);
    
    noise.start();
  }

  _playChord(frequencies, duration) {
    if (!this._audioCtx || !this._enabled) return;
    
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this._audioCtx.createOscillator();
        const gain = this._audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this._audioCtx.currentTime);
        
        gain.gain.setValueAtTime(this._volume * 0.15, this._audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this._audioCtx.currentTime + duration / 1000);
        
        osc.connect(gain);
        gain.connect(this._audioCtx.destination);
        
        osc.start();
        osc.stop(this._audioCtx.currentTime + duration / 1000);
      }, i * 50);
    });
  }

  _playRapidTones(frequencies, duration) {
    if (!this._audioCtx || !this._enabled) return;
    
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this._playTone(freq, duration, 'square');
      }, i * 40);
    });
  }

  // Play skill sound effect
  playSkill(effectType) {
    if (!this._enabled || !this._proceduralSounds) return;
    
    const soundName = this._skillSounds[effectType];
    if (soundName && this._proceduralSounds[soundName]) {
      this._proceduralSounds[soundName]();
    }
  }

  // Play hit sound
  playHit() {
    if (!this._enabled || !this._proceduralSounds) return;
    this._proceduralSounds.hit();
  }

  // Play boss skill sound
  playBossSkill() {
    if (!this._enabled || !this._proceduralSounds) return;
    this._proceduralSounds.roar();
  }

  // Enable/disable sound
  setEnabled(enabled) {
    this._enabled = enabled;
    
    // Resume audio context if enabling
    if (enabled && this._audioCtx && this._audioCtx.state === 'suspended') {
      this._audioCtx.resume();
    }
  }

  // Set volume (0.0 - 1.0)
  setVolume(volume) {
    this._volume = Math.max(0, Math.min(1, volume));
  }

  // Get current settings
  getSettings() {
    return {
      enabled: this._enabled,
      volume: this._volume,
    };
  }
}

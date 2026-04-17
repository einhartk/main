// Music Player Class
class MusicPlayer {
  constructor() {
    this.songs = [
      { title: "에픽하이 - fly", url: "image/fly.mp3" },
      { title: "에픽하이 - love love love", url: "image/lovelovelove.mp3" },
      { title: "프리스타일 - Y", url: "image/y.mp3" }
    ];
    this.currentSongIndex = 0;
    this.isPlaying = false;
    this.audio = new Audio();
    
    this.init();
  }

  init() {
    // Set up audio element
    this.audio.src = this.songs[this.currentSongIndex].url;
    this.audio.addEventListener('ended', () => this.nextSong());
    
    // Initial render
    this.render();
    
    // Update time display every second
    setInterval(() => this.updateTime(), 1000);
  }

  render() {
    let container = document.getElementById('music-player');
    if (!container) {
      container = document.createElement('div');
      container.id = 'music-player';
      document.body.insertBefore(container, document.body.firstChild);
    }
    
    container.innerHTML = `
      <div class="header">BGM</div>
      <div class="time">${this.getCurrentTime()}</div>
      <div class="search">
        <input type="text" id="search-input" placeholder="검색" />
        <button id="search-btn">검색</button>
      </div>
      <div class="song-info">
        <p>${this.songs[this.currentSongIndex].title}</p>
      </div>
      <div class="controls">
        <button class="btn" id="prev-btn">⏪</button>
        <button class="btn" id="play-btn">${this.isPlaying ? '⏸️ 일시정지' : '🔊 재생'}</button>
        <button class="btn" id="next-btn">⏩</button>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());
    document.getElementById('prev-btn').addEventListener('click', () => this.prevSong());
    document.getElementById('next-btn').addEventListener('click', () => this.nextSong());
    document.getElementById('search-btn').addEventListener('click', () => this.searchSongs());
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch(e => console.error("재생 오류:", e));
      this.isPlaying = true;
    } else {
      this.audio.pause();
      this.isPlaying = false;
    }
    this.render();
  }

  nextSong() {
    this.currentSongIndex = (this.currentSongIndex + 1) % this.songs.length;
    this.loadAndPlay();
  }

  prevSong() {
    this.currentSongIndex = (this.currentSongIndex - 1 + this.songs.length) % this.songs.length;
    this.loadAndPlay();
  }

  loadAndPlay() {
    this.audio.src = this.songs[this.currentSongIndex].url;
    if (this.isPlaying) {
      this.audio.play().catch(e => console.error("재생 오류:", e));
    }
    this.render();
  }

  searchSongs() {
    const query = document.getElementById('search-input').value.toLowerCase();
    if (!query.trim()) return;
    
    const foundIndex = this.songs.findIndex(song => 
      song.title.toLowerCase().includes(query)
    );
    
    if (foundIndex !== -1) {
      this.currentSongIndex = foundIndex;
      this.loadAndPlay();
    } else {
      window.showModal('알림', '검색 결과가 없습니다.', 'info');
    }
  }

  getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  updateTime() {
    const timeElement = document.querySelector('#music-player .time');
    if (timeElement) {
      timeElement.textContent = this.getCurrentTime();
    }
  }
}

// Initialize music player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.musicPlayer = new MusicPlayer();
});

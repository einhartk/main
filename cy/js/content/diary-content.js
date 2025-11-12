// Update today's date
function updateTodayDate() {
  const today = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const todayString = today.toLocaleDateString('ko-KR', options);
  document.getElementById('todayDate').textContent = todayString;
}

// Initialize date list
const dateList = document.getElementById("dateList");
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();
const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

// Generate date list for the current month
for (let i = 1; i <= daysInMonth; i++) {
  const dateItem = document.createElement("div");
  dateItem.className = "date-item";
  dateItem.textContent = i;
  
  // Add 'today' class to today's date
  if (i === today.getDate()) {
    dateItem.classList.add('today');
  }
  
  // Add click event to show diary content
  dateItem.addEventListener('click', function() {
    // Remove active class from all date items
    document.querySelectorAll('.date-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to clicked date
    this.classList.add('active');
    
    // Here you can add code to load diary content for the selected date
    // For example: loadDiaryContent(currentYear, currentMonth, i);
  });
  
  dateList.appendChild(dateItem);
}

// Music player functionality
const bgm = document.getElementById("bgm");
const songTitle = document.getElementById("songTitle");
const songs = [
  { title: "에픽하이 - fly", url: "image/fly.mp3" },
  { title: "에픽하이 - love love love", url: "image/lovelovelove.mp3" },
  { title: "프리스타일 - Y", url: "image/y.mp3" }
];

let currentSongIndex = 0;

// Initialize first song
bgm.src = songs[currentSongIndex].url;
songTitle.textContent = songs[currentSongIndex].title;

// Toggle play/pause
function toggleBGM() {
  if (bgm.paused) {
    bgm.play();
    document.querySelector('.play-pause-btn').textContent = '⏸️ 일시정지';
  } else {
    bgm.pause();
    document.querySelector('.play-pause-btn').textContent = '🔊 재생';
  }
}

// Play next song
function nextSong() {
  currentSongIndex = (currentSongIndex + 1) % songs.length;
  bgm.src = songs[currentSongIndex].url;
  songTitle.textContent = songs[currentSongIndex].title;
  bgm.play();
  document.querySelector('.play-pause-btn').textContent = '⏸️ 일시정지';
}

// Play previous song
function prevSong() {
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  bgm.src = songs[currentSongIndex].url;
  songTitle.textContent = songs[currentSongIndex].title;
  bgm.play();
  document.querySelector('.play-pause-btn').textContent = '⏸️ 일시정지';
}

// Event listeners for music player controls
document.addEventListener('DOMContentLoaded', function() {
  // Update today's date when page loads
  updateTodayDate();
  
  // Set up music player controls
  document.querySelector(".controls .btn:nth-child(1)").addEventListener("click", prevSong);
  document.querySelector(".controls .btn:nth-child(3)").addEventListener("click", nextSong);
  
  // Initialize any other diary-specific functionality here
});

// Function to load content into container
async function loadContent(page) {
  try {
    const container = document.querySelector('.item4') || document.querySelector('.container2');
    if (!container) {
      console.error('Container element not found');
      return;
    }
    
    container.innerHTML = '<div style="text-align: center; padding: 50px;">로딩 중...</div>';
    
    const response = await fetch(page);
    if (!response.ok) throw new Error('페이지를 불러오지 못했습니다.');
    
    const html = await response.text();
    container.innerHTML = html;
    
    // If loading diary content, initialize the calendar
    if (page.includes('diary')) {
      // Remove any existing diary.js scripts to prevent duplicates
      const existingScripts = document.querySelectorAll('script[src*="diary.js"]');
      existingScripts.forEach(script => script.remove());
      
      // Create and append the diary.js script
      const script = document.createElement('script');
      script.src = 'js/diary.js';
      script.onload = function() {
        // Initialize the calendar after the script is loaded
        if (window.updateTodayDate && window.createDateList) {
          updateTodayDate();
          createDateList();
        }
      };
      document.body.appendChild(script);
    }
    
    // Execute any other scripts in the loaded content
    const scripts = container.getElementsByTagName('script');
    for (let script of scripts) {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      document.body.appendChild(newScript).parentNode.removeChild(newScript);
    }
    
    // Update URL hash for bookmarking without page reload
    history.pushState(null, '', '#' + page.split('.')[0]);
    
  } catch (error) {
    console.error('Error loading content:', error);
    const container = document.querySelector('.item4') || document.querySelector('.container2');
    if (container) {
      container.innerHTML = '<div style="text-align: center; padding: 50px; color: red;">콘텐츠를 불러오는 중 오류가 발생했습니다.</div>';
    }
  }
}

// Load content based on URL hash on page load
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.replace('#', '');
  const defaultPage = 'banner-content.html';
  
  if (hash) {
    loadContent(`${hash}.html`).catch(() => loadContent(defaultPage));
  } else {
    // Move the original container2 content to banner-content.html
    const container2 = document.querySelector('.container2');
    container2.innerHTML = '';
    loadContent(defaultPage);
  }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    loadContent(`${hash}.html`);
  } else {
    loadContent('banner-content.html');
  }
});

// Show popup function with animation
function showPopup() {
  const popup = document.getElementById("popup");
  popup.style.display = "flex";
  setTimeout(() => {
    popup.style.opacity = "1";
  }, 10);
}

// Close popup function
function closePopup() {
  const popup = document.getElementById("popup");
  popup.style.opacity = "0";
  setTimeout(() => {
    popup.style.display = "none";
  }, 300);
}

// Close popup when clicking outside the content
document.addEventListener('click', function(event) {
  const popup = document.getElementById("popup");
  const popupContent = document.querySelector('.popup-content');
  
  if (event.target === popup) {
    closePopup();
  }
});

// Initialize Vue app
const app = Vue.createApp({
  data() {
    return {
      newComment: {
        nickname: '',
        password: '',
        comment: ''
      },
      comments: []
    };
  },
  methods: {
    // Add a new comment
    addComment() {
      if (!this.newComment.nickname || !this.newComment.comment) {
        alert('닉네임과 댓글을 모두 입력해주세요.');
        return;
      }
      
      const comment = {
        id: Date.now(),
        nickname: this.newComment.nickname,
        password: this.newComment.password,
        comment: this.newComment.comment,
        date: new Date().toISOString()
      };
      
      this.comments.unshift(comment);
      this.saveComments();
      
      // Reset form
      this.newComment.nickname = '';
      this.newComment.password = '';
      this.newComment.comment = '';
    },
    
    // Delete a comment with password verification
    deleteComment(index) {
      const password = prompt('비밀번호를 입력하세요:');
      if (password === this.comments[index].password) {
        this.comments.splice(index, 1);
        this.saveComments();
      } else if (password !== null) {
        alert('비밀번호가 일치하지 않습니다.');
      }
    },
    
    // Save comments to localStorage
    saveComments() {
      localStorage.setItem('homeComments', JSON.stringify(this.comments));
    },
    
    // Load comments from localStorage
    loadComments() {
      const savedComments = localStorage.getItem('homeComments');
      if (savedComments) {
        this.comments = JSON.parse(savedComments);
      }
    }
  },
  mounted() {
    this.loadComments();
  }
});

// Mount the Vue app
app.mount("#app");

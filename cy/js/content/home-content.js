// Function to load CSS
async function loadCSS(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

// Function to load content into container
async function loadContent(page) {
  try {
    const container = document.querySelector('.item4') || document.querySelector('.container2');
    if (!container) {
      console.error('Container element not found');
      return;
    }
    
    // Ensure required CSS is loaded and applied
    await Promise.all([
      loadCSS('css/style.css'),
      loadCSS('css/container-styles.css')
    ]);
    
    // Force a reflow to ensure styles are applied
    document.body.offsetHeight;
    
    container.innerHTML = '<div style="text-align: center; padding: 50px;">로딩 중...</div>';
    
    // Update home counts if loading home page
    if (page.includes('banner-content.html') && typeof updateHomeCounts === 'function') {
      setTimeout(updateHomeCounts, 100);
    }
    
    const response = await fetch(page);
    if (!response.ok) throw new Error('페이지를 불러오지 못했습니다.');
    
    const html = await response.text();
    container.innerHTML = html;
    
    // Execute inline scripts from the loaded content (in global scope)
    const scripts = container.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.textContent) {
        try {
          // Execute in global scope so functions are available to onclick handlers
          eval.call(window, script.textContent);
        } catch (e) {
          console.error('Script execution error:', e);
        }
      }
    });
    
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
function handleInitialLoad() {
  let hash = window.location.hash.replace('#', '');
  const defaultPage = 'banner-content.html';
  
  // Room is opened in new window, not in SPA
  if (hash === 'room') {
    window.open('room.html', 'room', 'width=1400,height=900,menubar=no,toolbar=no');
    window.location.hash = 'banner-content';
    hash = 'banner-content';
  }
  
  // If no hash, set default and update URL
  if (!hash) {
    hash = 'banner-content';
    window.location.hash = hash;
  }
  
  // Clear container2 for initial load
  const container2 = document.querySelector('.item4');
  if (container2) container2.innerHTML = '';
  
  // Load the content
  loadContent(`${hash}.html`).catch(error => {
    console.error('Error loading content:', error);
    // Fallback to default if there's an error
    if (hash !== 'banner-content') {
      window.location.hash = 'banner-content';
      loadContent(defaultPage);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleInitialLoad);
} else {
  handleInitialLoad();
}

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
  const hash = window.location.hash.replace('#', '');
  
  // Room is opened in new window
  if (hash === 'room') {
    window.open('room.html', 'room', 'width=1400,height=900,menubar=no,toolbar=no');
    window.location.hash = 'banner-content';
    loadContent('banner-content.html');
    return;
  }
  
  if (hash && hash !== 'room') {
    loadContent(`${hash}.html`).catch(error => {
      console.error('Error loading content from history:', error);
      window.location.hash = 'banner-content';
      loadContent('banner-content.html');
    });
  } else {
    window.location.hash = 'banner-content';
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

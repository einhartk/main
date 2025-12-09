// Simple translation implementation
console.log('Translations script loaded - debug version');

// Loading indicator functions
function showLoading() {
    const loader = document.querySelector('.language-loader');
    const loadingText = loader.querySelector('[data-key="loading"]');
    
    // Update loading text based on current language
    const currentLang = localStorage.getItem('preferredLanguage') || 'ko';
    if (currentLang === 'ko') {
        loadingText.textContent = '번역 중...';
    } else if (currentLang === 'en') {
        loadingText.textContent = 'Translating...';
    } else if (currentLang === 'ja') {
        loadingText.textContent = '翻訳中...';
    } else if (currentLang === 'zh-CN') {
        loadingText.textContent = '翻译中...';
    }
    
    loader.classList.add('show');
}

function hideLoading() {
    const loader = document.querySelector('.language-loader');
    loader.classList.remove('show');
}

// Base texts in Korean (original language)
const baseTexts = {
    // Navigation
    "site.name": "사이트 이름",
    "nav.home": "홈",
    "nav.about": "소개",
    "nav.services": "서비스",
    "nav.contact": "문의",
    
    // Home section
    "home.title": "환영합니다",
    "home.subtitle": "더 나은 서비스를 위한 여정을 함께하세요",
    "home.scroll": "스크롤하여 더 보기",
    
    // About section
    "about.title": "소개",
    "about.subtitle": "우리에 대해서",
    "about.text": "저희는 고객 중심의 서비스를 제공하기 위해 노력하고 있습니다. 최신 기술과 트렌드를 반영한 솔루션으로 고객 여러분의 성공을 돕겠습니다.",
    "about.features": "주요 특징",
    "about.feature1": "고품질 서비스 제공",
    "about.feature2": "최신 기술 적용",
    "about.feature3": "고객 맞춤형 솔루션",
    "about.feature4": "신속한 대응",
    
    // Services section
    "services.title": "서비스",
    "service1.title": "웹 개발",
    "service1.desc": "최신 웹 기술을 활용한 반응형 웹사이트 제작",
    "service2.title": "모바일 최적화",
    "service2.desc": "모든 기기에서 완벽하게 작동하는 반응형 디자인",
    "service3.title": "SEO 최적화",
    "service3.desc": "검색 엔진 최적화를 통한 높은 노출",
    
    // Contact section
    "contact.title": "문의하기",
    "contact.info": "연락처 정보",
    "contact.information": "연락처 정보",
    "contact.us": "문의하기",
    "contact.name": "이름",
    "contact.email": "이메일",
    "contact.message": "메시지를 입력하세요",
    "contact.submit": "문의하기"
};

// Simple translation function
async function translateText(text, targetLang) {
    if (!text || targetLang === 'ko') return text;
    
    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|${targetLang}&de=gram@gram.com`
        );
        const data = await response.json();
        return data.responseData.translatedText || text;
    } catch (e) {
        console.error('Translation error:', e);
        return text;
    }
}

// Update page with translated text
async function translatePage(lang) {
    console.log('Translating to:', lang);
    const elements = document.querySelectorAll('[data-key]');
    
    // Show loading indicator
    showLoading();
    
    // Add a small delay to ensure the UI updates before heavy processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Store all translation promises
    const translationPromises = [];
    
    for (const el of elements) {
        const key = el.getAttribute('data-key');
        const originalText = baseTexts[key];
        
        if (originalText) {
            if (lang === 'ko') {
                if ('placeholder' in el) el.placeholder = originalText;
                else el.textContent = originalText;
            } else {
                // Queue up translation promises
                const translationPromise = translateText(originalText, lang)
                    .then(translated => {
                        if ('placeholder' in el) el.placeholder = translated;
                        else el.textContent = translated;
                    });
                translationPromises.push(translationPromise);
            }
        }
    }
    
    // Wait for all translations to complete
    await Promise.all(translationPromises);
    
    // Update active button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-lang') === lang;
        btn.classList.toggle('active', isActive);
        console.log('Button', btn.getAttribute('data-lang'), 'active:', isActive);
    });
    
    // Save preference
    localStorage.setItem('preferredLanguage', lang);
    
    // Hide loading indicator with a small delay for a smoother transition
    setTimeout(hideLoading, 300);
}

// Simple initialization
function init() {
    console.log('Initializing translations...');
    
    // Add click handlers for language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const lang = this.getAttribute('data-lang');
            console.log('Button clicked, language:', lang);
            translatePage(lang).catch(console.error);
            return false;
        };
    });

    // Load saved language or default to Korean
    const savedLang = localStorage.getItem('preferredLanguage') || 'ko';
    console.log('Loading saved language:', savedLang);
    translatePage(savedLang).catch(console.error);
}

// Start when DOM is ready
console.log('Starting translation system...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
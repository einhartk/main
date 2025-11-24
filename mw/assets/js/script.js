const { createApp, markRaw } = Vue;
const VueDraggableNext = window.vuedraggable;

// Function to create a component from template content
function createTemplateComponent(templateContent, templateConfig) {
  return markRaw({
    props: ['textColor'],
    template: `<div :style="{color: textColor}">${templateContent}</div>`,
    data() {
      return {
        // Only add isCollapsed for non-sidebar components
        ...(templateConfig?.isSidebar ? {} : { isCollapsed: templateConfig?.isCollapsed || false })
      };
    },
    methods: {
      toggleCollapse() {
        if (!this.$options.propsData?.isSidebar) {
          this.isCollapsed = !this.isCollapsed;
          if (templateConfig) {
            templateConfig.isCollapsed = this.isCollapsed;
          }
        }
      }
    }
  });
}

// Function to load template from file
async function loadTemplate(templateName) {
  try {
    const response = await fetch(`/mw/templates/${templateName.toLowerCase()}.html`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return null;
  }
}

// Template configuration
const templateConfigs = [
  { 
    id: 1, 
    name: 'header', 
    displayName: 'Header', 
    category: 'Layout', 
    applied: true, 
    alwaysVisible: true, // Add this flag
    props: { textColor: '#3b82f6' },
    isSidebar: false
  },
  { 
    id: 2, 
    name: 'gallery', 
    displayName: 'Gallery', 
    category: 'Layout', 
    applied: true, 
    props: { textColor: '#3b82f6' },
    isSidebar: false
  },
  { 
    id: 3, 
    name: 'form', 
    displayName: 'Form', 
    category: 'Component', 
    applied: false, 
    props: { textColor: '#3b82f6' },
    isSidebar: false
  },
  { 
    id: 4, 
    name: 'card', 
    displayName: 'Card', 
    category: 'Component', 
    applied: false, 
    props: { textColor: '#3b82f6' },
    isSidebar: false
  },
  { 
    id: 5, 
    name: 'portfolio', 
    displayName: 'Portfolio', 
    category: 'Portfolio', 
    applied: false, 
    props: { textColor: '#3b82f6' },
    isSidebar: false
  },
  { 
    id: 6, 
    name: 'blog', 
    displayName: 'Blog', 
    category: 'Content', 
    applied: false, 
    props: { textColor: '#3b82f6' },
    isSidebar: false
  },
  { id: 7, name: 'team', displayName: 'Team', category: 'Content', applied: false, props: { textColor: '#3b82f6' } },
  { id: 8, name: 'pricing', displayName: 'Pricing', category: 'Component', applied: false, props: { textColor: '#3b82f6' } },
  { id: 9, name: 'faq', displayName: 'FAQ', category: 'Component', applied: false, props: { textColor: '#3b82f6' } },
  { id: 10, name: 'testimonial', displayName: 'Testimonial', category: 'Content', applied: false, props: { textColor: '#3b82f6' } },
  { id: 11, name: 'footer', displayName: 'Footer', category: 'Layout', applied: false, props: { textColor: '#3b82f6' } },
  { id: 12, name: 'hero', displayName: 'Hero', category: 'Layout', applied: false, props: { textColor: '#3b82f6' } },
  { id: 13, name: 'stats', displayName: 'Stats', category: 'Content', applied: false, props: { textColor: '#3b82f6' } },
  { id: 14, name: 'services', displayName: 'Services', category: 'Component', applied: false, props: { textColor: '#3b82f6' } },
  { id: 15, name: 'steps', displayName: 'Steps', category: 'Component', applied: false, props: { textColor: '#3b82f6' } },
  { 
    id: 16, 
    name: 'sidebar', 
    displayName: 'Sidebar', 
    category: 'Layout', 
    applied: true, 
    isSidebar: true,
    isSidebarCollapsed: false,  // For the template's internal sidebar
    props: { 
      textColor: '#000000'
    }
  },
  { id: 17, name: 'floating-bar', displayName: 'Floating Bar', category: 'Layout', applied: false, props: { textColor: '#3b82f6' } },
  { id: 18, name: 'newsletter', displayName: 'Newsletter', category: 'Component', applied: false, props: { textColor: '#3b82f6' } },
  { id: 19, name: 'product-grid', displayName: 'Product Grid', category: 'Content', applied: false, props: { textColor: '#3b82f6' } },
  { id: 20, name: 'cover', displayName: 'Cover', category: 'Layout', applied: false, props: { textColor: '#3b82f6' } }
];

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing app...');
  
  // Load all templates
  const loadedTemplates = await Promise.all(templateConfigs.map(async (config) => {
    try {
      const content = await loadTemplate(config.name);
      const component = createTemplateComponent(content, config);
      return {
        ...config,
        component,
        props: { textColor: config.props?.textColor || '#3b82f6' },
        isSidebar: config.isSidebar || false,
        applied: config.applied || false
      };
    } catch (error) {
      console.error(`Error loading template ${config.name}:`, error);
      return null;
    }
  }));

  // Check if Vue is already initialized
  if (!window.vueAppInitialized) {
    const app = createApp({
      components: { draggable: VueDraggableNext },
      data() {
        return {
          chatInput: '',
          chatHistory: [],
          textColor: '#000000',
          categoryFilter: null,
          templates: loadedTemplates.filter(Boolean),
          isDragging: false,
          scrollInterval: null,
          isMainSidebarOpen: localStorage.getItem('mainSidebarCollapsed') !== 'true',
          isPreviewSidebarOpen: true,
          showMobilePreview: false
        };
      },
    computed: {
      hasSidebar() {
        return this.templates.some(t => t.isSidebar && t.applied);
      },
      categories() {
        return [...new Set(this.templates.map(t => t.category))];
      },
      filteredTemplates() {
        return !this.categoryFilter 
          ? this.templates 
          : this.templates.filter(t => t.category === this.categoryFilter);
      },
      appliedTemplates() {
        return this.templates.filter(t => t.applied);
      }
    },
    methods: {
      toggleMainSidebar() {
        this.isMainSidebarOpen = !this.isMainSidebarOpen;
        localStorage.setItem('mainSidebarCollapsed', !this.isMainSidebarOpen);
      },
      togglePreviewSidebar() {
        this.isPreviewSidebarOpen = !this.isPreviewSidebarOpen;
      },
      processCommand(input) {
        input = input.toLowerCase().trim();
        
        // Check for template list command
        if (input.includes('템플릿 종류') || input.includes('템플릿 목록')) {
          const categories = [...new Set(this.templates.map(t => t.category))];
          return `사용 가능한 템플릿 카테고리: ${categories.join(', ')}\n` +
                 '템플릿 목록을 보려면 "[카테고리] 템플릿 보여줘" 라고 입력해주세요.';
        }
        
        // Show templates in a category
        const categoryMatch = input.match(/(.+?)\s*템플릿\s*(보여|보여[주]?[라봐줘]?)/);
        if (categoryMatch) {
          const category = categoryMatch[1].trim();
          const templates = this.templates.filter(t => 
            t.category.toLowerCase() === category.toLowerCase()
          );
          
          if (templates.length === 0) {
            return `'${category}' 카테고리의 템플릿을 찾을 수 없습니다.`;
          }
          
          return `${category} 템플릿 목록:\n` +
                 templates.map(t => 
                   `- ${t.displayName} (${t.applied ? '적용됨' : '미적용'})`
                 ).join('\n') +
                 '\n\n템플릿을 적용하려면 "[템플릿이름] 템플릿 넣어줘" 라고 입력하세요.';
        }
        
        // Add template
        const addMatch = input.match(/(.+?)\s*템플릿\s*(추가|넣[어줘봐]?|적용)/);
        if (addMatch) {
          const templateName = addMatch[1].trim();
          const template = this.templates.find(t => 
            t.name.toLowerCase() === templateName.toLowerCase() ||
            t.displayName.toLowerCase().includes(templateName.toLowerCase())
          );
          
          if (!template) {
            return `'${templateName}' 템플릿을 찾을 수 없습니다.`;
          }
          
          template.applied = true;
          return `'${template.displayName}' 템플릿을 추가했습니다.`;
        }
        
        // Remove template
        const removeMatch = input.match(/(.+?)\s*템플릿\s*(제거|빼[줘봐]?|삭제)/);
        if (removeMatch) {
          const templateName = removeMatch[1].trim();
          const template = this.templates.find(t => 
            t.name.toLowerCase() === templateName.toLowerCase() ||
            t.displayName.toLowerCase().includes(templateName.toLowerCase())
          );
          
          if (!template) {
            return `'${templateName}' 템플릿을 찾을 수 없습니다.`;
          }
          
          template.applied = false;
          return `'${template.displayName}' 템플릿을 제거했습니다.`;
        }
        
        // Change text color
        const colorMatch = input.match(/글자색\s*(을 |를 | )?([^\s]+)(\s*(으|으)?로)?\s*(바꿔|변경|설정)/);
        if (colorMatch) {
          const color = colorMatch[2];
          this.textColor = color.startsWith('#') ? color : `#${color}`;
          this.applyColors();
          return `글자색을 ${this.textColor}로 변경했습니다.`;
        }
        
        // Default response for unknown commands
        return `죄송합니다. 다음 명령어들을 사용해보세요:\n` +
               '- 템플릿 종류 알려줘\n' +
               '- [카테고리] 템플릿 보여줘\n' +
               '- [템플릿이름] 템플릿 넣어줘\n' +
               '- [템플릿이름] 템플릿 빼줘\n' +
               '- 글자색 [색상코드]로 바꿔줘';
      },
      
      sendChat() {
        if (!this.chatInput.trim()) return;
        
        // Add user message
        const userMessage = this.chatInput.trim();
        this.chatHistory.push({ 
          id: Date.now(), 
          type: 'user', 
          text: userMessage 
        });
        
        // Process command and get response
        setTimeout(() => { 
          const response = this.processCommand(userMessage);
          this.chatHistory.push({ 
            id: Date.now() + 1, 
            type: 'ai', 
            text: response
          });
          
          // Auto-scroll to bottom
          this.$nextTick(() => {
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          });
        }, 500);
        
        this.chatInput = '';
      },
      toggleTemplate(tpl) { 
        tpl.applied = !tpl.applied; 
      },
      applyColors() {
        this.templates.forEach(tpl => { 
          if (tpl.applied) tpl.props.textColor = this.textColor; 
        });
      },
      onDragStart() {
        this.isDragging = true;
        const container = document.querySelector('.overflow-auto');
        if (container) {
          this.scrollInterval = setInterval(() => {
            if (!this.isDragging || !container) return;
            
            const rect = container.getBoundingClientRect();
            const scrollSpeed = 10;
            const edgeThreshold = 100;
            
            if (rect.top < edgeThreshold) {
              container.scrollTop -= scrollSpeed;
            }
            if (rect.bottom > window.innerHeight - edgeThreshold) {
              container.scrollTop += scrollSpeed;
            }
          }, 16);
        }
      },
      onDragEnd() {
        this.isDragging = false;
        if (this.scrollInterval) {
          clearInterval(this.scrollInterval);
          this.scrollInterval = null;
        }
      },
      async downloadHTML() {
        try {
          let htmlContent = '';
          
          // Get HTML content of each applied template
          for (const tpl of this.appliedTemplates) {
            const div = document.createElement('div');
            const app = Vue.createApp(tpl.component, {
              ...(tpl.props || {}),
              isCollapsed: tpl.isCollapsed,
              'onUpdate:isCollapsed': (val) => { tpl.isCollapsed = val; }
            });
            const vm = app.mount(div);
            htmlContent += div.innerHTML + '\n\n';
            app.unmount();
          }
          
          // Create and trigger download
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'template-export.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
        } catch (error) {
          console.error('Error generating HTML:', error);
          alert('HTML 생성 중 오류가 발생했습니다: ' + error.message);
        }
      }
    }
      },
      // Mobile preview toggle method
      toggleMobilePreview() {
        this.showMobilePreview = !this.showMobilePreview;
        document.body.style.overflow = this.showMobilePreview ? 'hidden' : '';
      },
      // Toggle main sidebar
      toggleMainSidebar() {
        this.isMainSidebarOpen = !this.isMainSidebarOpen;
        localStorage.setItem('mainSidebarCollapsed', !this.isMainSidebarOpen);
      },
      // Toggle preview sidebar
      togglePreviewSidebar() {
        this.isPreviewSidebarOpen = !this.isPreviewSidebarOpen;
      },
      // ... other existing methods ...
    }
  });

  // Mount the app
  app.mount('#app');
  window.vueAppInitialized = true;
}

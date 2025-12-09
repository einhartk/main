const { createApp, markRaw } = Vue;
const VueDraggableNext = window.vuedraggable;

// Function to validate HTML tags
function validateHTML(html) {
  const doc = document.implementation.createHTMLDocument('temp');
  const div = doc.createElement('div');
  div.innerHTML = html;
  
  // Check for any invalid tags or malformed HTML
  const walker = document.createTreeWalker(
    div,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );
  
  const elements = [];
  let node;
  while (node = walker.nextNode()) {
    elements.push(node);
  }
  
  return div.innerHTML;
}

// Function to create a component from template content
function createTemplateComponent(templateContent, templateConfig) {
  if (!templateContent) {
    console.error('No template content provided for', templateConfig?.name || 'unknown component');
    return null;
  }

  try {
    // Clean the template content
    let cleanTemplate = templateContent;
    
    // Remove DOCTYPE, html, head, and body tags if they exist
    cleanTemplate = cleanTemplate.replace(/<!DOCTYPE[^>]*>\s*/i, '');
    cleanTemplate = cleanTemplate.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '');
    cleanTemplate = cleanTemplate.replace(/<head[\s\S]*?<\/head>/gi, '');
    cleanTemplate = cleanTemplate.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '');
    
    // Process style and script tags
    const extractedStyles = [];
    cleanTemplate = cleanTemplate.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, content) => {
      extractedStyles.push(content);
      return '';
    });
    
    // Remove script tags completely
    cleanTemplate = cleanTemplate.replace(/<script\b[\s\S]*?<\/script>/gi, '');
    
    // Add extracted styles to the head
    if (extractedStyles.length > 0) {
      const styleElement = document.createElement('style');
      styleElement.textContent = extractedStyles.join('\n');
      styleElement.setAttribute('data-template', templateConfig?.name || 'unknown');
      document.head.appendChild(styleElement);
    }
    
    // Remove any HTML comments
    cleanTemplate = cleanTemplate.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove any invalid characters
    cleanTemplate = cleanTemplate.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Remove extra whitespace
    cleanTemplate = cleanTemplate.trim();
    
    // If template is empty after cleaning, log a warning
    if (!cleanTemplate) {
      console.warn(`Template ${templateConfig?.name} is empty after cleaning`);
      return null;
    }
    
        // Create a unique ID for this template instance
    const templateId = `template-${templateConfig?.name || 'unknown'}-${Date.now()}`;
    
    // Create a container for the template
    const templateContainer = document.createElement('div');
    templateContainer.innerHTML = cleanTemplate;
    
    // Create component options with error boundary
    const componentOptions = {
      props: ['textColor'],
      template: `
        <div :id="'${templateId}'" class="template-wrapper" :style="{color: textColor}">
          ${cleanTemplate}
        </div>
      `,
      data() {
        return {
          selectedProject: null,
          hasError: false,
          ...(templateConfig?.isSidebar ? {} : { isCollapsed: templateConfig?.isCollapsed || false })
        };
      },
      errorCaptured(err, vm, info) {
        console.error('Error in template component:', err, info);
        this.hasError = true;
        return false; // Don't stop error propagation
      },
      methods: {
        toggleCollapse() {
          if (!this.$options.propsData?.isSidebar) {
            this.isCollapsed = !this.isCollapsed;
            if (templateConfig) {
              templateConfig.isCollapsed = this.isCollapsed;
            }
          }
        },
        selectProject(projectId) {
          this.selectedProject = projectId;
        }
      },
      mounted() {
        // Initialize any component-specific logic here
      }
    };
    
    return markRaw(componentOptions);
  } catch (error) {
    console.error('Error creating component:', error);
    return null;
  }
}

// Function to clean HTML content
function cleanHtml(html) {
  if (!html) return '';
  
  // Remove any script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove any invalid characters
  clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  return clean.trim();
}

// Function to load template from file
async function loadTemplate(templateName) {
  try {
    const response = await fetch(`/mw/templates/${templateName.toLowerCase()}.html`);
    if (!response.ok) {
      console.error(`Failed to load template ${templateName}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    const cleanedHtml = cleanHtml(html);
    
    // Extract only the body content if it exists
    const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const content = bodyMatch ? bodyMatch[1] : cleanedHtml;
    
    return content || null;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return null;
  }
}

// Template configuration with Korean names for natural language processing
const templateConfigs = [
  { id: 1, name: 'header', displayName: 'Header', koreanNames: ['헤더', '머리말', '상단'], category: 'Layout', applied: true, alwaysVisible: true, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 2, name: 'gallery', displayName: 'Gallery', koreanNames: ['갤러리', '사진첩', '이미지'], category: 'Layout', applied: true, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 3, name: 'form', displayName: 'Form', koreanNames: ['폼', '양식', '입력폼', '서식'], category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 4, name: 'card', displayName: 'Card', koreanNames: ['카드', '카드형', '카드뷰'], category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 5, name: 'portfolio', displayName: 'Portfolio', koreanNames: ['포트폴리오', '작품집', '작품소개'], category: 'Portfolio', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 6, name: 'blog', displayName: 'Blog', koreanNames: ['블로그', '글', '게시글', '포스트'], category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 7, name: 'team', displayName: 'Team', koreanNames: ['팀', '팀원', '구성원', '팀소개'], category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 8, name: 'pricing', displayName: 'Pricing', koreanNames: ['가격', '요금', '가격표', '플랜'], category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 9, name: 'faq', displayName: 'FAQ', koreanNames: ['faq', '자주묻는질문', '질문답변', '문의'], category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 10, name: 'testimonial', displayName: 'Testimonial', koreanNames: ['후기', '추천', '리뷰', '의견'], category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 11, name: 'footer', displayName: 'Footer', koreanNames: ['푸터', '꼬리말', '하단', '바닥'], category: 'Layout', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 12, name: 'hero', displayName: 'Hero', koreanNames: ['히어로', '메인', '메인화면', '첫화면'], category: 'Layout', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 13, name: 'stats', displayName: 'Stats', koreanNames: ['통계', '수치', '데이터', '현황'], category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 14, name: 'services', displayName: 'Services', koreanNames: ['서비스', '서비스소개', '제공'], category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 15, name: 'steps', displayName: 'Steps', koreanNames: ['단계', '과정', '스텝', '순서'], category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 16, name: 'sidebar', displayName: 'Sidebar', koreanNames: ['사이드바', '측면', '옆면', '메뉴'], category: 'Layout', applied: true, isSidebar: true, isSidebarCollapsed: false, props: { textColor: '#000000' }},
  { id: 17, name: 'floating-bar', displayName: 'Floating Bar', koreanNames: ['플로팅바', '플로팅', '고정바', '띄워쓰기'], category: 'Layout', applied: true, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 18, name: 'newsletter', displayName: 'Newsletter', koreanNames: ['뉴스레터', '소식지', '메일링', '구독'], category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 19, name: 'product-grid', displayName: 'Product Grid', koreanNames: ['상품', '제품', '상품목록', '제품소개'], category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 20, name: 'cover', displayName: 'Cover', koreanNames: ['커버', '표지', '덮개', '배경'] }
];

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing app...');
  
  // Load all templates
  const loadedTemplates = [];
  for (const config of templateConfigs) {
    try {
      const content = await loadTemplate(config.name);
      if (content) {
        const component = createTemplateComponent(content, config);
        loadedTemplates.push({
          ...config,
          component,
          props: { textColor: config.props?.textColor || '#3b82f6' },
          isSidebar: config.isSidebar || false,
          applied: config.applied || false
        });
      }
    } catch (error) {
      console.error(`Error loading template ${config.name}:`, error);
    }
  }

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
          templates: loadedTemplates.map(t => ({
            ...t,
            order: t.order || t.id // Use existing order or id as fallback
          })),
          isDragging: false,
          scrollInterval: null,
          isMainSidebarOpen: localStorage.getItem('mainSidebarCollapsed') !== 'true',
          isPreviewSidebarOpen: true,
          showMobilePreview: false,
          currentTheme: localStorage.getItem('selectedTheme') || 'theme-1',
          dragOptions: {
            animation: 200,
            ghostClass: 'ghost',
            chosenClass: 'chosen',
            dragClass: 'sortable-drag',
            fallbackTolerance: 5,
            delayOnTouchOnly: true,
            delay: 100,
            scrollSensitivity: 100,
            forceFallback: true
          }
        };
      },
      computed: {
                appliedTemplates() {
          return this.templates.filter(t => t.applied);
        },
        mainContentTemplates: {
          get() {
            return this.templates
              .filter(t => 
                t.applied && 
                t.component && 
                !t.isSidebar && 
                !t.alwaysVisible && 
                t.name !== 'footer' && 
                t.name !== 'header'
              )
              .sort((a, b) => (a.order || 0) - (b.order || 0));
          },
          set(updatedTemplates) {
            // Update the order of templates based on the new order
            updatedTemplates.forEach((tpl, index) => {
              const template = this.templates.find(t => t.id === tpl.id);
              if (template) {
                template.order = index + 1;
              }
            });
            
            // Force Vue to re-render
            this.templates = [...this.templates];
          }
        },
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
        onDragStart() {
          this.isDragging = true;
          const container = document.querySelector('.overflow-auto');
          if (container) {
            this.scrollInterval = setInterval(() => {
              if (!this.isDragging || !container) return;
              
              const rect = container.getBoundingClientRect();
              const scrollSpeed = 10;
              
              // Check if we're near the top or bottom of the container
              const mouseY = event.clientY;
              const threshold = 100; // pixels from edge
              
              if (mouseY < rect.top + threshold) {
                // Scroll up
                container.scrollTop -= scrollSpeed;
              } else if (mouseY > rect.bottom - threshold) {
                // Scroll down
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
          
          // Save the current order to localStorage
          this.saveTemplateOrder();
        },
        
        saveTemplateOrder() {
          const order = this.templates.reduce((acc, tpl) => {
            acc[tpl.id] = tpl.order || tpl.id;
            return acc;
          }, {});
          localStorage.setItem('templateOrder', JSON.stringify(order));
        },
        
        loadTemplateOrder() {
          const savedOrder = localStorage.getItem('templateOrder');
          if (savedOrder) {
            const orderMap = JSON.parse(savedOrder);
            this.templates.forEach(template => {
              if (orderMap[template.id] !== undefined) {
                template.order = orderMap[template.id];
              }
            });
          }
        },
        getCurrentTime() {
          const now = new Date();
          return now.getHours().toString().padStart(2, '0') + ':' + 
                 now.getMinutes().toString().padStart(2, '0');
        },
        getOrderedTemplates() {
          // Get all templates in the correct order, including header, main content, and footer
          const header = this.templates.find(t => t.name === 'header' && t.applied);
          const footer = this.templates.find(t => t.name === 'footer' && t.applied);
          const sidebar = this.templates.find(t => t.isSidebar && t.applied);
          
          // Get main content templates in the current order
          const mainContent = [...this.mainContentTemplates];
          
          // Return in the correct order: header -> sidebar (if exists) -> main content -> footer
          return [
            ...(header ? [header] : []),
            ...(sidebar ? [sidebar] : []),
            ...mainContent,
            ...(footer ? [footer] : [])
          ];
        },
        
        getCurrentThemeCSS() {
          // Get current theme CSS from the theme CSS file
          const themeCSSLink = document.getElementById('theme-css');
          if (themeCSSLink) {
            // Get the CSS content from the current theme
            const themeName = this.currentTheme || 'theme-1';
            
            // Theme CSS variables based on current theme
            const themeVariables = {
              'theme-1': {
                '--text-color': '#1f2937',
                '--primary-color': '#3b82f6',
                '--primary-hover': '#2563eb',
                '--secondary-color': '#8b5cf6',
                '--success-color': '#10b981',
                '--warning-color': '#f59e0b',
                '--danger-color': '#ef4444',
                '--surface-color': '#ffffff',
                '--background-color': '#f9fafb',
                '--border-color': '#e5e7eb',
                '--text-secondary': '#6b7280'
              },
              'theme-2': {
                '--text-color': '#064e3b',
                '--primary-color': '#059669',
                '--primary-hover': '#047857',
                '--secondary-color': '#0d9488',
                '--success-color': '#059669',
                '--warning-color': '#d97706',
                '--danger-color': '#dc2626',
                '--surface-color': '#ffffff',
                '--background-color': '#ecfdf5',
                '--border-color': '#a7f3d0',
                '--text-secondary': '#047857'
              },
              'theme-3': {
                '--text-color': '#111827',
                '--primary-color': '#1f2937',
                '--primary-hover': '#111827',
                '--secondary-color': '#6b7280',
                '--success-color': '#059669',
                '--warning-color': '#d97706',
                '--danger-color': '#dc2626',
                '--surface-color': '#ffffff',
                '--background-color': '#f9fafb',
                '--border-color': '#e5e7eb',
                '--text-secondary': '#6b7280'
              },
              'theme-4': {
                '--text-color': '#f3f4f6',
                '--primary-color': '#3b82f6',
                '--primary-hover': '#2563eb',
                '--secondary-color': '#8b5cf6',
                '--success-color': '#10b981',
                '--warning-color': '#f59e0b',
                '--danger-color': '#ef4444',
                '--surface-color': '#1f2937',
                '--background-color': '#111827',
                '--border-color': '#374151',
                '--text-secondary': '#9ca3af'
              },
              'theme-5': {
                '--text-color': '#fef3c7',
                '--primary-color': '#f59e0b',
                '--primary-hover': '#d97706',
                '--secondary-color': '#dc2626',
                '--success-color': '#059669',
                '--warning-color': '#f59e0b',
                '--danger-color': '#dc2626',
                '--surface-color': '#78350f',
                '--background-color': '#451a03',
                '--border-color': '#92400e',
                '--text-secondary': '#fbbf24'
              },
              'theme-6': {
                '--text-color': '#1e293b',
                '--primary-color': '#7c3aed',
                '--primary-hover': '#6d28d9',
                '--secondary-color': '#ec4899',
                '--success-color': '#10b981',
                '--warning-color': '#f59e0b',
                '--danger-color': '#ef4444',
                '--surface-color': '#faf5ff',
                '--background-color': '#f3e8ff',
                '--border-color': '#e9d5ff',
                '--text-secondary': '#6b7280'
              },
              'theme-7': {
                '--text-color': '#fef2f2',
                '--primary-color': '#ef4444',
                '--primary-hover': '#dc2626',
                '--secondary-color': '#f97316',
                '--success-color': '#22c55e',
                '--warning-color': '#eab308',
                '--danger-color': '#ef4444',
                '--surface-color': '#7f1d1d',
                '--background-color': '#450a0a',
                '--border-color': '#991b1b',
                '--text-secondary': '#fca5a5'
              },
              'theme-8': {
                '--text-color': '#0f172a',
                '--primary-color': '#14b8a6',
                '--primary-hover': '#0d9488',
                '--secondary-color': '#06b6d4',
                '--success-color': '#22c55e',
                '--warning-color': '#f59e0b',
                '--danger-color': '#ef4444',
                '--surface-color': '#f0fdfa',
                '--background-color': '#ccfbf1',
                '--border-color': '#5eead4',
                '--text-secondary': '#0d9488'
              }
            };
            
            const currentVars = themeVariables[themeName] || themeVariables['theme-1'];
            
            // Generate CSS string
            let cssString = '<style>\n:root {\n';
            for (const [key, value] of Object.entries(currentVars)) {
              cssString += `  ${key}: ${value};\n`;
            }
            cssString += '}\n</style>\n';
            
            return cssString;
          }
          return '';
        },
        
        async downloadHTML() {
          try {
            // Helper function to render a template component to HTML
            const renderTemplate = async (template) => {
            if (!template || !template.component) {
              console.warn('Template or template component is missing:', template?.name || 'unknown');
              return '';
            }
            
            try {
              // Create a temporary container
              const container = document.createElement('div');
              document.body.appendChild(container);
              
              // For header component, ensure required props are provided
              const props = { ...(template.props || {}) };
              
              // Add default props if they don't exist
              if (template.name === 'header') {
                props.title = props.title || 'My Website';
                props.links = props.links || [
                  { name: 'Home', url: '#' },
                  { name: 'About', url: '#' },
                  { name: 'Contact', url: '#' }
                ];
              }
              
              // Create a new Vue app instance for this template
              const app = createApp({
                template: template.component.template,
                data() {
                  return props;
                },
                methods: template.component.methods || {},
                computed: template.component.computed || {},
                mounted() {
                  this.$nextTick(() => {
                    // Ensure any dynamic content is rendered
                    this.$forceUpdate();
                  });
                }
              });
              
              // Mount the component
              const vm = app.mount(container);
              
              // Wait for any async operations to complete
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Get the rendered HTML
              const html = container.innerHTML;
              
              // Clean up
              app.unmount();
              document.body.removeChild(container);
              
              return html;
            } catch (error) {
              console.error(`Error rendering ${template.name || 'template'}:`, error);
              return `
                <div class="error-rendering p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                  <h3 class="font-bold">Error rendering ${template.name || 'template'}</h3>
                  <p class="text-sm">${error.message || 'Unknown error occurred'}</p>
                  <pre class="mt-2 p-2 bg-white text-xs overflow-auto">${error.stack || 'No stack trace available'}</pre>
                </div>`;
            }
          };

            // Get templates in the correct order and render them
            const orderedTemplates = this.getOrderedTemplates();
            const renderedTemplates = await Promise.all(
              orderedTemplates
                .filter(t => t.component)
                .map(template => renderTemplate(template))
            );

            // Get current theme CSS
            const currentThemeCSS = this.getCurrentThemeCSS();
            
            // Generate the complete HTML document
            const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orderedTemplates.find(t => t.name === 'header')?.props?.title || '다운로드된 페이지'}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  ${currentThemeCSS}
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: var(--text-color, #333);
      background-color: var(--background-color, #f9fafb);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .content-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    .template-wrapper {
      margin-bottom: 2rem;
    }
    
    .error-rendering {
      padding: 1rem;
      background-color: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
      border-radius: 0.375rem;
    }
    
    .floating-bar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--primary-color, #3b82f6);
      color: var(--text-color, #ffffff);
      padding: 12px 16px;
      border-radius: 50px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 1000;
      font-size: 14px;
      font-weight: 500;
    }
    
    .floating-bar:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      background-color: var(--primary-hover, #2563eb);
    }
    
    .floating-bar .animate-pulse {
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  </style>
</head>
<body style="background-color: var(--background-color, #ffffff);">
  ${orderedTemplates.find(t => t.name === 'header') ? `
  <header class="template-wrapper">
    ${renderedTemplates[orderedTemplates.findIndex(t => t.name === 'header')]}
  </header>
  ` : ''}

  <div class="flex flex-col md:flex-row min-h-screen">
    ${orderedTemplates.find(t => t.isSidebar) ? `
    <aside id="sidebar" class="w-full md:w-1/4 shadow-lg relative z-10 flex flex-col h-screen" style="background-color: var(--surface-color, #ffffff); border-right: 1px solid var(--border-color, #e5e7eb);">
      <button onclick="document.getElementById('sidebar').classList.add('hidden'); 
                     document.getElementById('menu-button').classList.remove('hidden');" 
              class="absolute right-2 top-2 rounded-full w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0" 
              style="background-color: var(--border-color, #e5e7eb); color: var(--text-color, #1f2937);"
              onmouseover="this.style.backgroundColor='var(--text-secondary, #6b7280)'"
              onmouseout="this.style.backgroundColor='var(--border-color, #e5e7eb)'">
        ✕
      </button>
      <div class="p-4 pt-12 flex-1 overflow-auto">
        ${renderedTemplates[orderedTemplates.findIndex(t => t.isSidebar)]}
      </div>
      <style>
        @media (max-width: 767px) {
          #sidebar { width: 280px; position: fixed; height: 100%; top: 0; left: 0; transition: transform 0.3s ease; }
          #sidebar.hidden { transform: translateX(-100%); }
          main { margin-left: 0 !important; width: 100% !important; }
          #menu-button { display: block; }
          #menu-button.hidden { display: none; }
          @media (min-width: 768px) {
            #menu-button { display: none !important; }
          }
        }
      </style>
    </aside>
    <button id="menu-button" onclick="document.getElementById('sidebar').classList.remove('hidden'); this.classList.add('hidden');" 
            class="hidden fixed left-4 top-4 p-2 rounded z-50 transition-colors"
            style="background-color: var(--primary-color, #3b82f6); color: var(--text-color, #ffffff);"
            onmouseover="this.style.backgroundColor='var(--primary-hover, #2563eb)'"
            onmouseout="this.style.backgroundColor='var(--primary-color, #3b82f6)'">
      ☰ 메뉴
    </button>
    ` : ''}
    <main class="${orderedTemplates.find(t => t.isSidebar) ? 'w-full md:w-3/4 transition-all duration-300' : 'w-full'} p-4">
      ${orderedTemplates.filter(t => !['header', 'footer'].includes(t.name) && !t.isSidebar && !t.alwaysVisible)
        .map((tpl, index) => `
      <section class="template-wrapper mb-8">
        ${renderedTemplates[orderedTemplates.findIndex(t => t.id === tpl.id)]}
      </section>
      `).join('\n')}
    </main>
  </div>

  ${orderedTemplates.find(t => t.name === 'footer') ? `
  <footer class="template-wrapper">
    ${renderedTemplates[orderedTemplates.findIndex(t => t.name === 'footer')]}
  </footer>
  ` : ''}

  <!-- Floating Bar -->
  ${orderedTemplates.find(t => t.name === 'floating-bar') ? `
  ${renderedTemplates[orderedTemplates.findIndex(t => t.name === 'floating-bar')]}
  ` : ''}

  <script src="https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.min.js"><\/script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Page loaded successfully');
      
      // Floating Bar functionality
      const floatingBar = document.querySelector('.floating-bar');
      if (floatingBar) {
        floatingBar.addEventListener('click', function() {
          alert('채팅 기능은 준비 중입니다!');
        });
      }
      
      // Mobile menu toggle
      const menuButton = document.getElementById('menu-button');
      const sidebar = document.getElementById('sidebar');
      
      if (menuButton && sidebar) {
        menuButton.addEventListener('click', function() {
          sidebar.classList.toggle('hidden');
          menuButton.classList.toggle('hidden');
        });
      }
      
      // Sidebar close button
      const closeButton = document.querySelector('#sidebar button');
      if (closeButton) {
        closeButton.addEventListener('click', function() {
          sidebar.classList.add('hidden');
          if (menuButton) menuButton.classList.remove('hidden');
        });
      }
    });
  <\/script>
</body>
</html>`;

            // Create and trigger download
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `website-${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 100);
            
              // Show success message
              if (this.$toast) {
                this.$toast.success('HTML 파일이 다운로드되었습니다.');
              } else {
                alert('HTML 파일이 다운로드되었습니다.');
              }
            } catch (error) {
              console.error('HTML 다운로드 중 오류 발생:', error);
              if (this.$toast) {
                this.$toast.error('HTML 다운로드 중 오류가 발생했습니다.');
              } else {
                alert('HTML 다운로드 중 오류가 발생했습니다.');
              }
            }
        },
        async openMobilePreview() {
          try {
            // Close existing preview window if open
            if (window.previewWindow && !window.previewWindow.closed) {
              window.previewWindow.focus();
              return;
            }
            
            // Get the base URL
            const baseUrl = window.location.href.replace(/\/[^/]*$/, '');
            const previewUrl = `${baseUrl}/mobile-preview.html`;
            
            // Open new popup window
            const width = 375; // iPhone 12 Pro width
            const height = 800; // iPhone 12 Pro height
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            // Open the window first
            window.previewWindow = window.open(
              previewUrl,
              'mobilePreview',
              `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );
            
            if (!window.previewWindow) {
              throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
            }
            
            // Wait for the window to load
            await new Promise(resolve => {
              const checkLoad = setInterval(() => {
                if (window.previewWindow.document.readyState === 'complete') {
                  clearInterval(checkLoad);
                  resolve();
                }
              }, 100);
            });
            
            // Use the already reordered templates from mainContentTemplates
            const templates = this.mainContentTemplates.map(tpl => {
              const element = document.querySelector(`[data-template-id="${tpl.id}"]`);
              return {
                id: tpl.id,
                name: tpl.name || 'Template',
                html: element ? element.outerHTML : `<div>${tpl.name || 'Template'} content not found</div>`
              };
            });
            
            console.log('Sending reordered templates to preview:', templates);
            
            // Send the templates to the preview window
            window.previewWindow.postMessage({
              type: 'updateTemplates',
              templates: templates
            }, '*');
            
            // Focus the window
            window.previewWindow.focus();
            
          } catch (error) {
            console.error('Error in openMobilePreview:', error);
            alert(`모바일 미리보기 열기 실패: ${error.message}`);
          }
        },
        toggleMainSidebar() {
          this.isMainSidebarOpen = !this.isMainSidebarOpen;
          localStorage.setItem('mainSidebarCollapsed', !this.isMainSidebarOpen);
        },
        togglePreviewSidebar() {
          this.isPreviewSidebarOpen = !this.isPreviewSidebarOpen;
        },
        changeTheme() {
          const themeLink = document.getElementById('theme-css');
          if (themeLink) {
            // For themes 5-8, use inline CSS since CSS files don't exist
            if (['theme-5', 'theme-6', 'theme-7', 'theme-8'].includes(this.currentTheme)) {
              const root = document.documentElement;
              const themeVariables = {
                'theme-5': {
                  '--text-color': '#fef3c7',
                  '--primary-color': '#f59e0b',
                  '--primary-hover': '#d97706',
                  '--secondary-color': '#dc2626',
                  '--success-color': '#059669',
                  '--warning-color': '#f59e0b',
                  '--danger-color': '#dc2626',
                  '--surface-color': '#78350f',
                  '--background-color': '#451a03',
                  '--border-color': '#92400e',
                  '--text-secondary': '#fbbf24'
                },
                'theme-6': {
                  '--text-color': '#1e293b',
                  '--primary-color': '#7c3aed',
                  '--primary-hover': '#6d28d9',
                  '--secondary-color': '#ec4899',
                  '--success-color': '#10b981',
                  '--warning-color': '#f59e0b',
                  '--danger-color': '#ef4444',
                  '--surface-color': '#faf5ff',
                  '--background-color': '#f3e8ff',
                  '--border-color': '#e9d5ff',
                  '--text-secondary': '#6b7280'
                },
                'theme-7': {
                  '--text-color': '#fef2f2',
                  '--primary-color': '#ef4444',
                  '--primary-hover': '#dc2626',
                  '--secondary-color': '#f97316',
                  '--success-color': '#22c55e',
                  '--warning-color': '#eab308',
                  '--danger-color': '#ef4444',
                  '--surface-color': '#7f1d1d',
                  '--background-color': '#450a0a',
                  '--border-color': '#991b1b',
                  '--text-secondary': '#fca5a5'
                },
                'theme-8': {
                  '--text-color': '#0f172a',
                  '--primary-color': '#14b8a6',
                  '--primary-hover': '#0d9488',
                  '--secondary-color': '#06b6d4',
                  '--success-color': '#22c55e',
                  '--warning-color': '#f59e0b',
                  '--danger-color': '#ef4444',
                  '--surface-color': '#f0fdfa',
                  '--background-color': '#ccfbf1',
                  '--border-color': '#5eead4',
                  '--text-secondary': '#0d9488'
                }
              };
              
              const currentThemeVars = themeVariables[this.currentTheme];
              if (currentThemeVars) {
                Object.entries(currentThemeVars).forEach(([property, value]) => {
                  root.style.setProperty(property, value);
                });
              }
            } else {
              // For themes 1-4, use CSS files
              themeLink.href = `assets/css/themes/${this.currentTheme}.css`;
            }
            localStorage.setItem('selectedTheme', this.currentTheme);
          }
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
          
          // Change text color - check before template commands
          const colorMatch = input.match(/글자색\s*(을 |를 | )?([^\s]+)(\s*(으|으)?로)?\s*(바꿔|변경|설정|수정|바꿔줘|변경해줘|설정해줘|수정해줘)/);
          if (colorMatch) {
            const color = colorMatch[2];
            this.textColor = color.startsWith('#') ? color : `#${color}`;
            this.applyColors();
            return `글자색을 ${this.textColor}로 변경했습니다.`;
          }
          
          // Change theme - check before template commands
          const themeMatch = input.match(/테마\s*(을 |를 | )?([^\s]+)(\s*(으|으)?로)?\s*(바꿔|변경|설정|수정|바꿔줘|변경해줘|설정해줘|수정해줘)/);
          if (themeMatch) {
            const theme = themeMatch[2].trim();
            const availableThemes = ['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5', 'theme-6', 'theme-7', 'theme-8'];
            
            // Try to find theme by number or name
            let targetTheme = null;
            if (theme.includes('1') || theme.includes('하나')) targetTheme = 'theme-1';
            else if (theme.includes('2') || theme.includes('둘')) targetTheme = 'theme-2';
            else if (theme.includes('3') || theme.includes('셋')) targetTheme = 'theme-3';
            else if (theme.includes('4') || theme.includes('넷')) targetTheme = 'theme-4';
            else if (theme.includes('5') || theme.includes('다섯')) targetTheme = 'theme-5';
            else if (availableThemes.includes(theme)) targetTheme = theme;
            
            // Handle "번" suffix (e.g., "3번" -> "3")
            if (!targetTheme && theme.includes('번')) {
              const numberOnly = theme.replace('번', '').trim();
              if (numberOnly.includes('1')) targetTheme = 'theme-1';
              else if (numberOnly.includes('2')) targetTheme = 'theme-2';
              else if (numberOnly.includes('3')) targetTheme = 'theme-3';
              else if (numberOnly.includes('4')) targetTheme = 'theme-4';
              else if (numberOnly.includes('5')) targetTheme = 'theme-5';
            }
            
            if (!targetTheme) {
              return `사용 가능한 테마: theme-1, theme-2, theme-3, theme-4, theme-5\n테마를 변경하려면 "테마 [번호]로 바꿔줘" 라고 입력하세요.`;
            }
            
            this.currentTheme = targetTheme;
            this.changeTheme();
            return `테마를 ${targetTheme}로 변경했습니다.`;
          }
          
          // Show available themes
          if (input.includes('테마 종류') || input.includes('테마 목록')) {
            return `사용 가능한 테마:\n- theme-1 (기본 테마)\n- theme-2 (다크 테마)\n- theme-3 (블루 테마)\n- theme-4 (그린 테마)\n- theme-5 (퍼플 테마)\n\n테마를 변경하려면 "테마 [번호]로 바꿔줘" 라고 입력하세요.`;
          }
          
          // Add template(s) - support multiple templates with natural Korean expressions
          const addMatch = input.match(/(.+?)\s*(템플릿\s*)?(추가|넣어줘|넣어|적용해줘|적용|설치해줘|설치|설정해줘|설정|바꿔줘|바꿔|수정해줘|수정|변경해줘|변경|만들어줘|만들어|생성해줘|생성|써줘|써|보여줘|보여|달라고|달라|주세요|주세요)/);
          if (addMatch) {
            const templateNames = addMatch[1].trim();
            
            // Split multiple template names by Korean separators and commas
            const names = templateNames
              .split(/(?:와|과|하고|,| 및 )\s*/)
              .map(name => name.trim())
              .filter(name => name.length > 0);
            
            const addedTemplates = [];
            const notFoundTemplates = [];
            
            names.forEach(templateName => {
              const template = this.templates.find(t => 
                t.name.toLowerCase() === templateName.toLowerCase() ||
                t.displayName.toLowerCase().includes(templateName.toLowerCase())
              );
              
              if (template) {
                template.applied = true;
                addedTemplates.push(template.displayName);
              } else {
                notFoundTemplates.push(templateName);
              }
            });
            
            let response = '';
            if (addedTemplates.length > 0) {
              response += `${addedTemplates.join(', ')} 템플릿을 추가했습니다.\n`;
            }
            if (notFoundTemplates.length > 0) {
              response += `${notFoundTemplates.join(', ')} 템플릿을 찾을 수 없습니다.`;
            }
            
            return response.trim();
          }
          
          // Natural language template requests - handle "헤더 보여줘", "갤러리 달라고", etc.
          const naturalMatch = input.match(/(.+?)\s*(보여줘|보여|달라고|달라|주세요|줘|해줘)/);
          if (naturalMatch) {
            const templateNames = naturalMatch[1].trim();
            
            // Split multiple template names by Korean separators and commas
            const names = templateNames
              .split(/(?:와|과|하고|,| 및 )\s*/)
              .map(name => name.trim())
              .filter(name => name.length > 0);
            
            const addedTemplates = [];
            const notFoundTemplates = [];
            
            names.forEach(templateName => {
              const template = this.templates.find(t => 
                t.name.toLowerCase() === templateName.toLowerCase() ||
                t.displayName.toLowerCase().includes(templateName.toLowerCase())
              );
              
              if (template) {
                template.applied = true;
                addedTemplates.push(template.displayName);
              } else {
                notFoundTemplates.push(templateName);
              }
            });
            
            let response = '';
            if (addedTemplates.length > 0) {
              response += `${addedTemplates.join(', ')} 템플릿을 추가했습니다.\n`;
            }
            if (notFoundTemplates.length > 0) {
              response += `${notFoundTemplates.join(', ')} 템플릿을 찾을 수 없습니다.`;
            }
            
            return response.trim();
          }
          
          // Remove template(s) - support multiple templates with natural Korean expressions
          const removeMatch = input.match(/(.+?)\s*(템플릿\s*)?(제거|빼줘|빼|삭제해줘|삭제|제거해줘|없애줘|없애|지워줘|지워|숨겨줘|숨겨|뺴줘|빼)/);
          if (removeMatch) {
            const templateNames = removeMatch[1].trim();
            
            // Split multiple template names by Korean separators and commas
            const names = templateNames
              .split(/(?:와|과|하고|,| 및 )\s*/)
              .map(name => name.trim())
              .filter(name => name.length > 0);
            
            const removedTemplates = [];
            const notFoundTemplates = [];
            
            names.forEach(templateName => {
              const template = this.templates.find(t => 
                t.name.toLowerCase() === templateName.toLowerCase() ||
                t.displayName.toLowerCase().includes(templateName.toLowerCase())
              );
              
              if (template) {
                template.applied = false;
                removedTemplates.push(template.displayName);
              } else {
                notFoundTemplates.push(templateName);
              }
            });
            
            let response = '';
            if (removedTemplates.length > 0) {
              response += `${removedTemplates.join(', ')} 템플릿을 제거했습니다.\n`;
            }
            if (notFoundTemplates.length > 0) {
              response += `${notFoundTemplates.join(', ')} 템플릿을 찾을 수 없습니다.`;
            }
            
            return response.trim();
          }
          
          // Show available themes
          if (input.includes('테마 종류') || input.includes('테마 목록')) {
            return `사용 가능한 테마:\n- theme-1 (기본 테마)\n- theme-2 (다크 테마)\n- theme-3 (블루 테마)\n- theme-4 (그린 테마)\n- theme-5 (퍼플 테마)\n\n테마를 변경하려면 "테마 [번호]로 바꿔줘" 라고 입력하세요.`;
          }
          
          // Default response for unknown commands
          return `죄송합니다. 다음 명령어들을 사용해보세요:\n` +
                 '- 템플릿 종류 알려줘\n' +
                 '- [카테고리] 템플릿 보여줘\n' +
                 '- [템플릿이름] 템플릿 넣어줘\n' +
                 '- [템플릿이름] 템플릿 빼줘\n' +
                 '- 글자색 [색상코드]로 바꿔줘\n' +
                 '- 테마 종류 알려줘\n' +
                 '- 테마 [번호]로 바꿔줘';
        },
        toggleMobilePreview() {
          this.showMobilePreview = !this.showMobilePreview;
          document.body.style.overflow = this.showMobilePreview ? 'hidden' : '';
          
          if (this.showMobilePreview) {
            // Update the template content when opening the modal
            this.$nextTick(() => {
              // Get current order from DOM
              const templateElements = document.querySelectorAll('[data-template-id]');
              const orderedTemplates = [];
              
              templateElements.forEach(element => {
                const templateId = element.getAttribute('data-template-id');
                const template = this.templates.find(t => String(t.id) === templateId);
                
                if (template && !template.isSidebar) {
                  orderedTemplates.push({
                    ...template,
                    _refreshed: Date.now() // Force update
                  });
                }
              });
              
              // Update appliedTemplates with correct order
              this.appliedTemplates = orderedTemplates;
              
              // Add event listener to close modal when clicking outside
              setTimeout(() => {
                const modal = document.querySelector('.mobile-preview-modal');
                if (modal) {
                  modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                      this.toggleMobilePreview();
                    }
                  });
                }
              }, 100);
            });
          }
        },
        toggleTemplate(tpl) { 
          tpl.applied = !tpl.applied; 
        },
        applyColors() {
          this.templates.forEach(tpl => { 
            if (tpl.applied) tpl.props.textColor = this.textColor; 
          });
        },
        sendChat() {
          if (!this.chatInput.trim()) return;
          
          const userMessage = this.chatInput.trim();
          this.chatHistory.push({ 
            id: Date.now(), 
            type: 'user', 
            text: userMessage 
          });
          
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
        toggleMainSidebar() {
          this.isMainSidebarOpen = !this.isMainSidebarOpen;
          localStorage.setItem('mainSidebarCollapsed', !this.isMainSidebarOpen);
        },
        togglePreviewSidebar() {
          this.isPreviewSidebarOpen = !this.isPreviewSidebarOpen;
        },
        changeTheme() {
          const themeLink = document.getElementById('theme-css');
          if (themeLink) {
            themeLink.href = `assets/css/themes/${this.currentTheme}.css`;
            localStorage.setItem('selectedTheme', this.currentTheme);
          }
        },
        toggleMobilePreview() {
          this.showMobilePreview = !this.showMobilePreview;
          document.body.style.overflow = this.showMobilePreview ? 'hidden' : '';
        }
      }
    });

    // Mount the app
    const vm = app.mount('#app');
    window.vueAppInitialized = true;
    
    // Mobile preview window reference and state
    let previewWindow = null;
    let unwatch = null;
    
    // Function to update mobile preview with current templates
    function updateMobilePreview() {
      try {
        if (!previewWindow || previewWindow.closed) return;
        
        // Get all applied templates with their HTML content
        const appliedTemplates = [];

        const templateElements = document.querySelectorAll('[id^="template-"]');
        
        templateElements.forEach(el => {
          const id = el.id.replace('template-', '');
          const template = vm.templates.find(t => String(t.id) === id);
          if (template) {
            appliedTemplates.push({
              ...template,
              html: el.innerHTML || ''
            });
          }
        });
        
        // Send templates to the popup
        console.log('Sending templates to preview:', appliedTemplates);
        previewWindow.postMessage({
          type: 'updateTemplates',
          templates: appliedTemplates
        }, '*');
      } catch (error) {
        console.error('Error updating mobile preview:', error);
      }
    }
    
    // Handle messages from mobile preview
    function handlePreviewMessage(event) {
      try {
        console.log('Received message in parent:', event);
        
        // Verify message origin for security
        // if (event.origin !== window.location.origin) {
        //   console.warn('Message from untrusted origin:', event.origin);
        //   return;
        // }
        
        if (!event.data || typeof event.data !== 'object') {
          console.warn('Received non-object message:', event.data);
          return;
        }
        
        if (event.data.type === 'requestTemplates') {
          console.log('Received requestTemplates message from preview window');
          // Update the preview with current templates
          updateMobilePreview();
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    }
    
    // Handle mobile preview window
    function setupMobilePreview() {
      try {
        // Close existing preview window if open
        if (previewWindow && !previewWindow.closed) {
          previewWindow.close();
        }
        
        // Open the preview window
        previewWindow = window.open(
          'mobile-preview.html',
          'mobilePreview',
          `width=375,height=800,left=${window.screenX + (window.outerWidth - 375) / 2},` +
          `top=${window.screenY + (window.outerHeight - 800) / 2},resizable=yes,scrollbars=yes`
        );

        if (!previewWindow) {
          alert('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
          return null;
        }

        // Check if the popup is loaded
        const checkPopup = setInterval(() => {
          if (previewWindow.closed) {
            clearInterval(checkPopup);
            return;
          }
          
          try {
            if (previewWindow.document.readyState === 'complete') {
              clearInterval(checkPopup);
              previewWindow.focus();
              updateMobilePreview(previewWindow);
            }
          } catch (e) {
            console.log('Waiting for popup to load...');
          }
        }, 100);

        return previewWindow;
      } catch (error) {
        console.error('Error setting up mobile preview:', error);
        return null;
      }
    }
    
    // Update mobile preview function
    function updateMobilePreview(targetWindow = null) {
      // Get all template elements in their current order from the DOM
      const templateElements = document.querySelectorAll('[data-template-id]');
      const templates = [];
      
      templateElements.forEach(element => {
        const templateId = element.getAttribute('data-template-id');
        const template = vm.templates.find(t => String(t.id) === templateId);
        
        if (template && !template.isSidebar) {
          templates.push({
            id: template.id,
            name: template.name || 'Template',
            html: element.outerHTML
          });
        }
      });
      
      const target = targetWindow || previewWindow;
      if (target && !target.closed) {
        target.postMessage({
          type: 'updateTemplates',
          templates: templates
        }, '*');
      }
    }

    // Watch for template changes if not already watching
    if (!unwatch) {
      unwatch = vm.$watch(
        () => vm.appliedTemplates,
        () => {
          if (previewWindow && !previewWindow.closed) {
            updateMobilePreview();
          }
        },
        { deep: true }
      );
    }

    // Handle mobile preview button click
    const handlePreviewClick = (e) => {
      if (e.target.closest('[data-action="mobile-preview"]')) {
        if (!previewWindow || previewWindow.closed) {
          previewWindow = setupMobilePreview();
        } else {
          previewWindow.focus();
        }
      }
    };

    // Add event listeners
    document.addEventListener('click', handlePreviewClick);
    
    console.log('Vue app initialized successfully');
    
    // Cleanup function for when the component is unmounted
    return () => {
      if (unwatch) {
        unwatch();
        unwatch = null;
      }
      window.removeEventListener('message', handlePreviewMessage);
      document.removeEventListener('click', handlePreviewClick);
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
    };
  }
});

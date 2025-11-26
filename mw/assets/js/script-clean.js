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

// Template configuration
const templateConfigs = [
  { id: 1, name: 'header', displayName: 'Header', category: 'Layout', applied: true, alwaysVisible: true, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 2, name: 'gallery', displayName: 'Gallery', category: 'Layout', applied: true, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 3, name: 'form', displayName: 'Form', category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 4, name: 'card', displayName: 'Card', category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 5, name: 'portfolio', displayName: 'Portfolio', category: 'Portfolio', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 6, name: 'blog', displayName: 'Blog', category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 7, name: 'team', displayName: 'Team', category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 8, name: 'pricing', displayName: 'Pricing', category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 9, name: 'faq', displayName: 'FAQ', category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 10, name: 'testimonial', displayName: 'Testimonial', category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 11, name: 'footer', displayName: 'Footer', category: 'Layout', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 12, name: 'hero', displayName: 'Hero', category: 'Layout', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 13, name: 'stats', displayName: 'Stats', category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 14, name: 'services', displayName: 'Services', category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 15, name: 'steps', displayName: 'Steps', category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 16, name: 'sidebar', displayName: 'Sidebar', category: 'Layout', applied: true, isSidebar: true, isSidebarCollapsed: false, props: { textColor: '#000000' }},
  { id: 17, name: 'floating-bar', displayName: 'Floating Bar', category: 'Layout', applied: true, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 18, name: 'newsletter', displayName: 'Newsletter', category: 'Component', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 19, name: 'product-grid', displayName: 'Product Grid', category: 'Content', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false },
  { id: 20, name: 'cover', displayName: 'Cover', category: 'Layout', applied: false, props: { textColor: '#3b82f6' }, isSidebar: false }
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
            themeLink.href = `assets/css/themes/${this.currentTheme}.css`;
            localStorage.setItem('selectedTheme', this.currentTheme);
          }
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
            this.chatHistory.push({ 
              id: Date.now() + 1, 
              type: 'ai', 
              text: `You said: ${userMessage}`
            });
          }, 500);
          
          this.chatInput = '';
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

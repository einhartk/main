async function getClientIP(){
  try { const res = await fetch('https://api.ipify.org?format=json'); return (await res.json()).ip; }
  catch(e){ return '255.255.255.255'; }
}

function maskIP(ip){
  const parts = ip.split('.');
  if(parts.length!==4) return 'xxx.xxx.xxx.xxx';
  return 'xxx.xxx.'+parts[2]+'.'+parts[3];
}

async function hashPassword(pw){
  const enc = new TextEncoder().encode(pw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

Vue.component('sidebar-view', {
  props: ['recentDocs', 'categories', 'popularDocs', 'allTags'],
  data() {
    return {
      activeCategory: null,
      showCategories: true,
      showTags: true,
      expandedSections: {
        categories: true,
        recent: true,
        popular: true,
        tags: true
      }
    }
  },
  computed: {
    tagCounts() {
      return this.allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});
    },
    sortedTags() {
      return Object.entries(this.tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    }
  },
  template: `
    <aside class="sidebar-container bg-white p-3 rounded shadow-sm mb-3">
      <!-- 카테고리 섹션 -->
      <div class="sidebar-section mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="m-0">카테고리</h5>
          <button @click="expandedSections.categories = !expandedSections.categories" 
                  class="btn btn-sm btn-link text-dark p-1" :title="expandedSections.categories ? '접기' : '펼치기'">
            <i class="bi" :class="expandedSections.categories ? 'bi-dash-circle' : 'bi-plus-circle'"></i>
          </button>
        </div>
        <div v-if="expandedSections.categories">
          <div v-for="category in categories" :key="category.id" class="mb-2">
            <div class="fw-bold mb-1" 
                 @click="activeCategory = activeCategory === category.id ? null : category.id" 
                 style="cursor: pointer;">
              <i class="bi" :class="activeCategory === category.id ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
              {{ category.name }}
            </div>
            <ul v-if="activeCategory === category.id" class="list-unstyled ps-3">
              <li v-for="sub in category.subcategories" :key="sub"
                  @click="$emit('filter-category', category.id, sub)"
                  class="py-1 hover-highlight" style="cursor: pointer;">
                {{ sub }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 인기 문서 섹션 -->
      <div class="sidebar-section mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="m-0">인기 문서</h5>
          <button @click="expandedSections.popular = !expandedSections.popular" 
                  class="btn btn-sm btn-link text-dark p-1" :title="expandedSections.popular ? '접기' : '펼치기'">
            <i class="bi" :class="expandedSections.popular ? 'bi-dash-circle' : 'bi-plus-circle'"></i>
          </button>
        </div>
        <div v-if="expandedSections.popular">
          <ul class="list-unstyled">
            <li v-for="doc in popularDocs" @click="$emit('view-doc', doc)" 
                class="p-1 border-bottom border-light hover-highlight" style="cursor:pointer;">
              {{ doc.title }} ({{ doc.views || 0 }}회)
            </li>
          </ul>
        </div>
      </div>

      <!-- 최근 문서 섹션 -->
      <div class="sidebar-section mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="m-0">최근 문서</h5>
          <button @click="expandedSections.recent = !expandedSections.recent" 
                  class="btn btn-sm btn-link text-dark p-1" :title="expandedSections.recent ? '접기' : '펼치기'">
            <i class="bi" :class="expandedSections.recent ? 'bi-dash-circle' : 'bi-plus-circle'"></i>
          </button>
        </div>
        <div v-if="expandedSections.recent">
          <ul class="list-unstyled">
            <li v-for="doc in recentDocs" @click="$emit('view-doc', doc)" 
                class="p-1 border-bottom border-light hover-highlight" style="cursor:pointer;">
              {{ doc.title }} - {{ doc.dateStr }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 태그 클라우드 -->
      <div class="sidebar-section mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="m-0">태그 클라우드</h5>
          <button @click="expandedSections.tags = !expandedSections.tags" 
                  class="btn btn-sm btn-link text-dark p-1" :title="expandedSections.tags ? '접기' : '펼치기'">
            <i class="bi" :class="expandedSections.tags ? 'bi-dash-circle' : 'bi-plus-circle'"></i>
          </button>
        </div>
        <div v-if="expandedSections.tags" class="tag-cloud">
          <span v-for="[tag, count] in sortedTags" 
                :key="tag" 
                @click="$emit('filter-tag', tag)"
                :style="{ fontSize: Math.max(0.8, Math.min(2, 0.8 + count * 0.1)) + 'em' }"
                class="badge bg-secondary me-1 mb-1" 
                style="cursor: pointer;">
            {{ tag }} ({{ count }})
          </span>
        </div>
      </div>

      <!-- 랜덤 문서 버튼 -->
      <button @click="$emit('random-doc')" class="btn btn-outline-primary w-100">
        랜덤 문서 보기
      </button>
    </aside>
  `
});

new Vue({
  el:'#app',
    data:{
    currentView:null,
    currentDoc:null,
    searchMode:false,
    searchQuery:'',
    searchResults:[],
    recentDocs:[],
    popularDocs:[],
    allTags:[],
    loading:false,
    userIdInput:'',
    tempUserId: '',
    editUserId: false,
    categories: defaultCategories,
    selectedCategory: null,
    selectedSubcategory: null,
    discussions: [],
    docHistory: [],
    prevDoc: null,
    nextDoc: null,
    isFloatingBarVisible: true
  },
  computed:{
    floatingLinks() {
      if(this.userIdInput?.trim()) {
        const id = encodeURIComponent(this.userIdInput.trim());
        return [
          `https://legacy.lopec.kr/search/search.html?headerCharacterName=${id}`,
          `https://loawa.com/char/${id}`,
          `https://loatool.taeu.kr/`,
          `https://rloa.gg/studio/my/characters`
        ];
      } else {
        return [
          'https://legacy.lopec.kr/',
          'https://loawa.com/',
          'https://loatool.taeu.kr/',
          'https://rloa.gg/studio/my/characters'
        ];
      }
    }
  },
  created() {
    // Load userId from localStorage on app initialization
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      this.userIdInput = savedUserId;
      this.tempUserId = savedUserId; // Also initialize tempUserId
    }
    
    // Load floating bar visibility state
    const floatingBarVisible = localStorage.getItem('floatingBarVisible');
    this.isFloatingBarVisible = floatingBarVisible === null ? true : JSON.parse(floatingBarVisible);
  },
  methods:{
    toggleFloatingBar() {
      this.isFloatingBarVisible = !this.isFloatingBarVisible;
      localStorage.setItem('floatingBarVisible', this.isFloatingBarVisible);
    },
    
    openHomework() {
      this.currentView = 'homework-view';
      this.searchMode = false;
      this.currentDoc = null;
      this.searchResults = [];
    },
    async loadComponent(path){
      const res=await fetch(path);
      return await res.text();
    },
    async registerComponent(name, path, props=[], extraOptions={}){
      const html=await this.loadComponent(path);
      Vue.component(name, {
        props: props,
        template: html,
        ...extraOptions
      });
    },
    async init(){
      this.loading = true;
      try {
        // Register home-view and view-doc from HTML
        await this.registerComponent('home-view','components/home.html',['searchResults','onView']);
        await this.registerComponent('view-doc','components/view.html',['doc','onEdit','prevDoc','nextDoc','discussions']);
        // editor-view는 editor.js에서 직접 등록
        // 데이터 로드
        await Promise.all([
          this.loadRecentDocs(),
          this.loadPopularDocs(),
          this.loadAllTags()
        ]);

        // 로컬 스토리지에서 사용자 ID 복구
        const storedId = localStorage.getItem('userId');
        if (storedId) {
          this.userIdInput = storedId;
        }

        // 홈 화면으로 이동
        this.goHome();
      } catch(e) {
        console.error('초기화 실패:', e);
        alert('초기화에 실패했습니다.');
      } finally {
        this.loading = false;
      }
    },
    goHome(){ this.currentView='home-view'; this.searchMode=false; this.currentDoc=null; this.searchResults=[]; },
    editDoc(doc=null){ this.currentDoc=doc; this.currentView='EditorView'; },
    async viewDoc(doc){ 
      if (!doc || !doc.id) {
        alert('문서 정보가 올바르지 않습니다.');
        return;
      }
      this.loading = true;
      try {
        // 조회수 증가
        if (doc.id) {
          await db.collection('docs').doc(doc.id).update({
            views: firebase.firestore.FieldValue.increment(1)
          });
          doc.views = (doc.views || 0) + 1;
        }
        // 이전/다음 문서 가져오기 (카테고리/서브카테고리 있을 때만)
        let prevDoc = null, nextDoc = null;
        if (doc.category && doc.subcategory) {
          const snapshot = await db.collection('docs')
            .where('category', '==', doc.category)
            .where('subcategory', '==', doc.subcategory)
            .orderBy('date')
            .get();
          const docs = snapshot.docs.map(d => ({...d.data(), id: d.id}));
          const currentIndex = docs.findIndex(d => d.id === doc.id);
          prevDoc = currentIndex > 0 ? docs[currentIndex - 1] : null;
          nextDoc = currentIndex < docs.length - 1 ? docs[currentIndex + 1] : null;
        }
        // 토론 가져오기
        const discussionsSnapshot = await db.collection('discussions')
          .where('docId', '==', doc.id)
          .orderBy('date')
          .get();
        this.discussions = discussionsSnapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
          dateStr: new Date(d.data().date.seconds * 1000).toLocaleString()
        }));
        this.currentDoc = {...doc, id: doc.id};
        this.prevDoc = prevDoc;
        this.nextDoc = nextDoc;
        this.currentView = 'view-doc';
      } catch(e) {
        console.error('문서 로드 실패:', e);
        alert('문서를 불러오는데 실패했습니다.');
      } finally {
        this.loading = false;
      }
    },
    async saveDoc(doc){
      this.loading=true;
      try{
        const hashed = await hashPassword(doc.password);
        let ip='255.255.255.255';
        try{ ip=maskIP(await getClientIP()); }catch(e){}
        const isEdit = !!doc.id;
        const data = { 
          title: doc.title, 
          content: doc.content, 
          password: hashed, 
          ip: ip,
          category: doc.category,
          subcategory: doc.subcategory,
          createdAt: isEdit ? doc.createdAt : new Date(),
          updatedAt: new Date(),
          views: isEdit ? doc.views : 0,
          creator: isEdit ? doc.creator : (this.userIdInput || '익명'),
          contributors: isEdit ? 
            [...new Set([...doc.contributors, this.userIdInput || '익명'])] : 
            [this.userIdInput || '익명'],
          tags: doc.tags || []
        };
        await db.collection('docs').add(data);
        alert('저장 완료\nIP: '+ip);
        this.goHome(); this.loadRecentDocs();
      } catch(e){ console.error(e); alert('저장 실패'); }
      finally{ this.loading=false; }
    },
    
    async filterByCategory(category, subcategory) {
      if (!category || !subcategory) {
        alert('카테고리/하위카테고리 정보가 올바르지 않습니다.');
        return;
      }
      this.loading = true;
      this.selectedCategory = category;
      this.selectedSubcategory = subcategory;
      this.searchMode = true;
      
      try {
        const snapshot = await db.collection('docs')
          .where('category', '==', category)
          .where('subcategory', '==', subcategory)
          .orderBy('updatedAt', 'desc')
          .get();

        this.searchResults = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
          dateStr: new Date(d.data().updatedAt.seconds*1000).toLocaleString()
        }));
      } catch(e) {
        console.error('카테고리 필터링 실패:', e);
        // If Firestore requires an index, fall back to a non-ordered query and sort locally
        if (e && e.message && e.message.toLowerCase().includes('index')) {
          try {
            const snapshot = await db.collection('docs')
              .where('category', '==', category)
              .where('subcategory', '==', subcategory)
              .get();

            const docs = snapshot.docs.map(d => ({...d.data(), id: d.id}));
            // sort client-side by updatedAt if available
            docs.sort((a, b) => {
              const ta = a.updatedAt ? a.updatedAt.seconds || 0 : 0;
              const tb = b.updatedAt ? b.updatedAt.seconds || 0 : 0;
              return tb - ta;
            });

            this.searchResults = docs.map(d => ({
              ...d,
              dateStr: d.updatedAt ? new Date(d.updatedAt.seconds*1000).toLocaleString() : '-'
            }));
          } catch(innerErr) {
            console.error('카테고리 필터링 폴백 실패:', innerErr);
            alert('문서 필터링에 실패했습니다: ' + (innerErr.message || innerErr));
          }
        } else {
          alert('문서 필터링에 실패했습니다: ' + (e.message || e));
        }
      } finally {
        this.loading = false;
      }
    },

    async filterByTag(tag) {
      if (!tag) {
        alert('태그 정보가 올바르지 않습니다.');
        return;
      }
      this.loading = true;
      this.searchMode = true;
      
      try {
        const snapshot = await db.collection('docs')
          .where('tags', 'array-contains', tag)
          .orderBy('updatedAt', 'desc')
          .get();

        this.searchResults = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
          dateStr: new Date(d.data().updatedAt.seconds*1000).toLocaleString()
        }));
      } catch(e) {
        console.error('태그 필터링 실패:', e);
        if (e && e.message && e.message.toLowerCase().includes('index')) {
          try {
            const snapshot = await db.collection('docs')
              .where('tags', 'array-contains', tag)
              .get();

            const docs = snapshot.docs.map(d => ({...d.data(), id: d.id}));
            docs.sort((a, b) => {
              const ta = a.updatedAt ? a.updatedAt.seconds || 0 : 0;
              const tb = b.updatedAt ? b.updatedAt.seconds || 0 : 0;
              return tb - ta;
            });

            this.searchResults = docs.map(d => ({
              ...d,
              dateStr: d.updatedAt ? new Date(d.updatedAt.seconds*1000).toLocaleString() : '-'
            }));
          } catch(innerErr) {
            console.error('태그 필터링 폴백 실패:', innerErr);
            alert('문서 필터링에 실패했습니다: ' + (innerErr.message || innerErr));
          }
        } else {
          alert('문서 필터링에 실패했습니다: ' + (e.message || e));
        }
      } finally {
        this.loading = false;
      }
    },
    async loadRecentDocs(){
      try {
        const snapshot = await db.collection('docs').orderBy('updatedAt','desc').limit(5).get();
        this.recentDocs = snapshot.docs.map(d=>({
          ...d.data(),
          id: d.id,
          dateStr: new Date(d.data().updatedAt.seconds*1000).toLocaleString()
        }));
      } catch(e) {
        console.error('최근 문서 로드 실패 (ordered):', e);
        // Fallback: try without ordering then sort client-side if possible
        try {
          const snapshot = await db.collection('docs').limit(10).get();
          const docs = snapshot.docs.map(d => ({...d.data(), id: d.id}));
          docs.sort((a,b) => {
            const ta = a.updatedAt ? a.updatedAt.seconds || 0 : 0;
            const tb = b.updatedAt ? b.updatedAt.seconds || 0 : 0;
            return tb - ta;
          });
          this.recentDocs = docs.slice(0,5).map(d => ({
            ...d,
            dateStr: d.updatedAt ? new Date(d.updatedAt.seconds*1000).toLocaleString() : '-'
          }));
        } catch(inner) {
          console.error('최근 문서 로드 폴백 실패:', inner);
          alert('최근 문서 로드에 실패했습니다: ' + (inner.message || inner));
        }
      }
    },

    async loadPopularDocs(){
      try {
        const snapshot = await db.collection('docs').orderBy('views','desc').limit(5).get();
        this.popularDocs = snapshot.docs.map(d=>({...d.data(), id: d.id}));
      } catch(e) {
        console.error('인기 문서 로드 실패 (ordered):', e);
        try {
          const snapshot = await db.collection('docs').limit(10).get();
          const docs = snapshot.docs.map(d => ({...d.data(), id: d.id}));
          docs.sort((a,b) => (b.views || 0) - (a.views || 0));
          this.popularDocs = docs.slice(0,5);
        } catch(inner) {
          console.error('인기 문서 로드 폴백 실패:', inner);
          alert('인기 문서 로드에 실패했습니다: ' + (inner.message || inner));
        }
      }
    },

    async loadAllTags(){
      try {
        const snapshot = await db.collection('docs').get();
        const tags = snapshot.docs.flatMap(d => d.data().tags || []);
        this.allTags = [...new Set(tags)];
      } catch(e) {
        console.error('태그 로드 실패:', e);
        alert('태그 로드에 실패했습니다: ' + (e.message || e));
      }
    },

    async randomDoc(){
      try {
        const snapshot = await db.collection('docs').get();
        if(snapshot.empty) return;
        const docs = snapshot.docs;
        const randomDoc = docs[Math.floor(Math.random() * docs.length)];
        this.viewDoc({...randomDoc.data(), id: randomDoc.id});
      } catch(e) {
        console.error('랜덤 문서 로드 실패:', e);
        alert('랜덤 문서 로드에 실패했습니다: ' + (e.message || e));
      }
    },
    async searchDocs(){
      if(!this.searchQuery || this.searchQuery.trim() === '') {
        this.searchMode = false;
        this.searchResults = [];
        return;
      }
      
      this.loading = true;
      this.searchMode = true;
      
      try {
        const snapshot = await db.collection('docs').get();
        const searchTerm = this.searchQuery.toLowerCase().trim();
        
        this.searchResults = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              dateStr: data.date ? new Date(data.date.seconds * 1000).toLocaleString() : '날짜 없음'
            };
          })
          .filter(doc => {
            const titleMatch = doc.title && doc.title.toLowerCase().includes(searchTerm);
            const contentMatch = doc.content && doc.content.toLowerCase().includes(searchTerm);
            return titleMatch || contentMatch;
          });
          
        // If no results, show a message
        if (this.searchResults.length === 0) {
          console.log('검색 결과가 없습니다.');
        }
      } catch (error) {
        console.error('검색 중 오류가 발생했습니다:', error);
        alert('검색 중 오류가 발생했습니다: ' + (error.message || error));
      } finally {
        this.loading = false;
      }
    },
    toggleEditUserId(){
      if(this.editUserId) {
        this.saveUserId();
      } else {
        this.tempUserId = this.userIdInput; // Initialize tempUserId with current userIdInput when starting to edit
        this.editUserId = true;
      }
    },
    saveUserId() {
      this.userIdInput = this.tempUserId.trim();
      localStorage.setItem('userId', this.userIdInput);
      this.editUserId = false;
      // Trigger any necessary updates that depend on userIdInput
      if (this.currentView === 'homework-view') {
        this.$children.find(c => c.$options._componentTag === 'homework-view').fetchCharacterInfo();
      }
    },

    async viewWikiLink(title) {
      this.loading = true;
      try {
        const snapshot = await db.collection('docs')
          .where('title', '==', title)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          this.viewDoc({...doc.data(), id: doc.id});
        } else {
          // 문서가 없으면 새 문서 작성
          this.editDoc({title: title});
        }
      } catch(e) {
        console.error('위키 링크 처리 실패:', e);
        alert('문서를 불러오는데 실패했습니다.');
      } finally {
        this.loading = false;
      }
    },

    async refreshDiscussions() {
      if (!this.currentDoc?.id) return;
      
      try {
        const snapshot = await db.collection('discussions')
          .where('docId', '==', this.currentDoc.id)
          .orderBy('date')
          .get();
        
        this.discussions = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
          dateStr: new Date(d.data().date.seconds * 1000).toLocaleString()
        }));
      } catch(e) {
        console.error('토론 새로고침 실패:', e);
      }
    }
  },
  mounted(){ this.init(); }
});

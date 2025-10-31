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

Vue.component('sidebar-view',{
  props:['recentDocs'],
  template:`
    <aside class="sidebar-container bg-white p-3 rounded shadow-sm mb-3">
      <h5>최근 등록 문서</h5>
      <ul class="list-unstyled">
        <li v-for="doc in recentDocs" @click="$emit('view-doc', doc)" class="p-1 border-bottom border-light" style="cursor:pointer;">
          {{ doc.title }} - {{ doc.dateStr }}
        </li>
      </ul>
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
    loading:false,
    userIdInput:'',
    editUserId:false
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
  methods:{
    async loadComponent(path){
      const res=await fetch(path);
      return await res.text();
    },
    async registerComponent(name,path,props=[]){
      const html=await this.loadComponent(path);
      Vue.component(name,{
        props:props,
        template: html,
        data(){ return { localDoc:{ title:this.doc?.title||'', content:this.doc?.content||'', password:'' } }; },
        mounted(){
          $(this.$refs.editor).summernote({ height:200 });
          if(this.localDoc.content) $(this.$refs.editor).summernote('code', this.localDoc.content);
        },
        methods:{ save(){ this.localDoc.content=$(this.$refs.editor).summernote('code'); this.$props.onSave(this.localDoc); } }
      });
    },
    async init(){
      await this.registerComponent('home-view','components/home.html',['searchResults','onView']);
      await this.registerComponent('editor-view','components/editor.html',['doc','onSave']);
      await this.registerComponent('view-doc','components/view.html',['doc','onEdit']);
      this.goHome(); this.loadRecentDocs();
      const storedId = localStorage.getItem('userId'); if(storedId) this.userIdInput = storedId;
    },
    goHome(){ this.currentView='home-view'; this.searchMode=false; this.currentDoc=null; this.searchResults=[]; },
    editDoc(doc=null){ this.currentDoc=doc; this.currentView='editor-view'; },
    viewDoc(doc){ this.currentDoc=doc; this.currentView='view-doc'; },
    async saveDoc(doc){
      this.loading=true;
      try{
        const hashed = await hashPassword(doc.password);
        let ip='255.255.255.255';
        try{ ip=maskIP(await getClientIP()); }catch(e){}
        const data={ title: doc.title, content: doc.content, date: new Date(), password:hashed, ip: ip };
        await db.collection('docs').add(data);
        alert('저장 완료\nIP: '+ip);
        this.goHome(); this.loadRecentDocs();
      } catch(e){ console.error(e); alert('저장 실패'); }
      finally{ this.loading=false; }
    },
    async loadRecentDocs(){
      const snapshot = await db.collection('docs').orderBy('date','desc').limit(5).get();
      this.recentDocs = snapshot.docs.map(d=>({...d.data(), dateStr: new Date(d.data().date.seconds*1000).toLocaleString()}));
    },
    async searchDocs(){
      if(!this.searchQuery) return;
      this.loading=true; this.searchMode=true;
      const snapshot = await db.collection('docs').get();
      this.searchResults = snapshot.docs
        .map(d=>({...d.data(), dateStr: new Date(d.data().date.seconds*1000).toLocaleString()}))
        .filter(d=>d.title.includes(this.searchQuery));
      this.loading=false;
    },
    toggleEditUserId(){
      if(this.editUserId){ this.userIdInput=this.userIdInput.trim(); localStorage.setItem('userId', this.userIdInput); }
      this.editUserId=!this.editUserId;
    }
  },
  mounted(){ this.init(); }
});

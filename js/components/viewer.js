Vue.component('document-viewer', {
    props: ['doc', 'prevDoc', 'nextDoc', 'discussions'],
    data() {
        return {
            newDiscussion: '',
            tableOfContents: [],
            wikiLinks: []
        };
    },
    computed: {
        processedContent() {
            if (!this.doc?.content) return '';
            
            // Wiki 링크 처리 [[문서명]]
            let content = this.doc.content;
            const wikiLinkRegex = /\[\[(.+?)\]\]/g;
            this.wikiLinks = [];
            
            content = content.replace(wikiLinkRegex, (match, title) => {
                this.wikiLinks.push(title);
                return `<a href="#" onclick="app.viewWikiLink('${title}'); return false;" class="wiki-link">${title}</a>`;
            });

            // 목차 생성
            this.tableOfContents = [];
            const headingRegex = /<h[2-4][^>]*>(.*?)<\/h[2-4]>/g;
            let sectionIndex = 0;
            
            content = content.replace(headingRegex, (match, heading) => {
                this.tableOfContents.push(heading);
                return `<div id="section-${sectionIndex++}">${match}</div>`;
            });

            return content;
        }
    },
    methods: {
        getCategoryName(categoryId) {
            const category = this.$root.categories.find(c => c.id === categoryId);
            return category ? category.name : categoryId;
        },
        formatDate(date) {
            if (!date) return '-';
            return new Date(date.seconds * 1000).toLocaleString();
        },
        formatContributors(contributors) {
            if (!contributors || contributors.length === 0) return '-';
            return contributors.join(', ');
        },
        async addDiscussion() {
            if (!this.newDiscussion.trim()) return;
            this.$emit('add-discussion', {
                content: this.newDiscussion,
                docId: this.doc.id
            });
            this.newDiscussion = '';
        }
    }
});
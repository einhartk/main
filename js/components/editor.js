Vue.component('EditorView', {
    props: ['doc'],
    template: `
    <div class="editor card p-3 mb-3">
      <h2>{{ doc ? '문서 수정' : '새 문서 작성' }}</h2>
      <!-- 제목 -->
      <input v-model="localDoc.title" placeholder="문서 제목 입력" class="form-control mb-2" />
      <!-- 카테고리 선택 -->
      <div class="row mb-2">
        <div class="col">
          <select v-model="localDoc.category" class="form-select">
            <option value="">카테고리 선택</option>
            <option v-for="cat in $root.categories" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="col">
          <select v-model="localDoc.subcategory" class="form-select" :disabled="!localDoc.category">
            <option value="">하위 카테고리 선택</option>
            <option v-for="subcat in selectedCategorySubcats" :value="subcat.id">{{ subcat.name }}</option>
          </select>
        </div>
      </div>
      <!-- 태그 입력 -->
      <div class="mb-2">
        <div class="d-flex gap-2 mb-1">
          <input v-model="tagInput" @keyup.enter="addTag" placeholder="태그 입력 후 Enter" class="form-control" />
        </div>
        <div class="tags-container">
          <span v-for="tag in localDoc.tags" :key="tag" class="badge bg-secondary me-1">
            {{ tag }}
            <span @click="removeTag(tag)" class="ms-1" style="cursor: pointer;">&times;</span>
          </span>
        </div>
      </div>
      <!-- 에디터 영역 (summernote만 사용) -->
      <div ref="editor" class="mb-2"></div>
      <!-- 편집 요약 및 비밀번호 -->
      <input v-model="editSummary" placeholder="편집 요약 (선택사항)" class="form-control mb-2" />
      <input type="password" v-model="localDoc.password" placeholder="등록/수정 암호 입력" class="form-control mb-2" />
      <!-- 상태 메시지 -->
      <div v-if="statusMessage" class="alert" :class="statusType" role="alert" style="padding: 5px 10px; margin-bottom: 10px;">
        {{ statusMessage }}
      </div>
      
      <!-- 버튼 영역 -->
      <div class="d-flex gap-2">
        <button @click.stop.prevent="save" class="btn btn-primary position-relative" :disabled="isSaving">
          <span v-if="isSaving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          {{ isSaving ? '저장 중...' : '저장' }}
        </button>
        <button v-if="doc" @click.stop.prevent="showHistory" class="btn btn-outline-secondary" :disabled="isSaving">히스토리</button>
      </div>
      <!-- 히스토리 모달 -->
      <div v-if="showingHistory" class="modal">
        <div class="modal-content">
          <h3>문서 히스토리</h3>
          <div v-for="(version, idx) in docHistory" :key="version.timestamp" class="history-item">
            <div class="d-flex justify-content-between">
              <span>{{ formatDate(version.timestamp) }} - {{ version.editor || '익명' }}</span>
              <button v-if="idx < docHistory.length - 1" 
                      @click="showDiff(version, docHistory[idx + 1])" 
                      class="btn btn-sm btn-outline-primary">
                변경사항 보기
              </button>
            </div>
            <div v-if="version.summary" class="text-muted">{{ version.summary }}</div>
          </div>
          <button @click="closeHistory" class="btn btn-secondary mt-2">닫기</button>
        </div>
      </div>
    </div>
    `,
    data() {
        return {
            localDoc: {
                title: this.doc?.title || '',
                content: this.doc?.content || '',
                category: this.doc?.category || '',
                subcategory: this.doc?.subcategory || '',
                password: '',
                tags: this.doc?.tags || [],
                id: this.doc?.id
            },
            tagInput: '',
            editSummary: '',
            isMarkdownMode: false,
            isSaving: false,
            showingHistory: false,
            showingDiff: false,
            currentDiff: '',
            docHistory: [],
            statusMessage: '',
            statusType: 'alert-info'
        };
    },
    computed: {
      selectedCategorySubcats() {
        if (!this.localDoc.category) return [];
        const category = this.$root.categories.find(c => c.id === this.localDoc.category);
        return category ? category.subcategories.map(sub => ({ id: sub, name: sub })) : [];
      }
    },
    methods: {
        async save(event) {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Save button clicked');
            // Prevent multiple submissions
            if (this.isSaving) {
                console.log('Save already in progress');
                return;
            }
            
            try {
                const errors = this.validateBeforeSave();
                if (errors.length > 0) {
                    this.statusMessage = errors.join('\n');
                    this.statusType = 'alert-warning';
                    return;
                }

                this.isSaving = true;
                console.log('Starting save operation...');
                this.statusMessage = '문서를 저장하고 있습니다...';
                this.statusType = 'alert-info';
                console.log('Save data:', {
                    title: this.localDoc.title,
                    category: this.localDoc.category,
                    hasContent: !!this.localDoc.content
                });
                
                if (!this.isMarkdownMode && this.$refs.editor) {
                    this.localDoc.content = $(this.$refs.editor).summernote('code');
                }
                
                this.localDoc.editor = this.$root.userIdInput || '익명';
                
                // Prepare document data
                const docData = {
                    ...this.localDoc,
                    title: this.localDoc.title.trim(),
                    category: this.localDoc.category || '',
                    subcategory: this.localDoc.subcategory || '',
                    tags: this.localDoc.tags || [],
                    content: this.localDoc.content || ''
                };

                console.log('Emitting save event with data:', docData);
                
                // Emit the save event
                try {
                    await this.$root.saveDoc(docData, this.editSummary || '');
                    
                    // Save successful
                    this.statusMessage = '문서가 성공적으로 저장되었습니다. 메인 화면으로 이동합니다...';
                    this.statusType = 'alert-success';
                    
                    // Redirect to main page after a short delay
                    setTimeout(() => {
                        this.$root.goHome();
                        
                    }, 1000);
                } catch (error) {
                    console.error('Save failed:', error);
                    throw error; // This will be caught by the outer try-catch
                }
                
            } catch (error) {
                console.error('저장 중 오류 발생:', error);
                this.statusMessage = '저장 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류');
                this.statusType = 'alert-danger';
            } finally {
                this.isSaving = false;
                // 5초 후 상태 메시지 제거 (성공 메시지만)
                if (this.statusType === 'alert-success') {
                    setTimeout(() => {
                        this.statusMessage = '';
                    }, 3000);
                }
            }
        },
        switchToMarkdown() {
            if (!this.isMarkdownMode) {
                this.localDoc.content = this.htmlToMarkdown($(this.$refs.editor).summernote('code'));
                this.isMarkdownMode = true;
                this.updatePreview();
            }
        },
        switchToRichText() {
            if (this.isMarkdownMode) {
                const html = marked(this.localDoc.content);
                this.isMarkdownMode = false;
                this.$nextTick(() => {
                    $(this.$refs.editor).summernote('code', html);
                });
            }
        },
        updatePreview() {
            this.markdownPreview = marked(this.localDoc.content);
        },
        htmlToMarkdown(html) {
            return html
                .replace(/<h([1-6])>(.*?)<\/h\1>/g, (_, level, content) => '#'.repeat(level) + ' ' + content + '\n\n')
                .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
                .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                .replace(/<em>(.*?)<\/em>/g, '_$1_')
                .replace(/<br\s*\/?>/g, '\n')
                .replace(/<\/?[^>]+(>|$)/g, '');
        },
        addTag() {
            const tag = this.tagInput.trim();
            if (tag && !this.localDoc.tags.includes(tag)) {
                this.localDoc.tags.push(tag);
            }
            this.tagInput = '';
        },
        removeTag(tag) {
            const index = this.localDoc.tags.indexOf(tag);
            if (index > -1) {
                this.localDoc.tags.splice(index, 1);
            }
        },
        async showHistory() {
            this.showingHistory = true;
            try {
                this.docHistory = await documentService.getDocumentHistory(this.localDoc.id);
            } catch(e) {
                console.error('히스토리 로드 실패:', e);
                alert('히스토리를 불러오는데 실패했습니다.');
            }
        },
        formatDate(date) {
            return new Date(date.seconds * 1000).toLocaleString();
        },
        showDiff(newVer, oldVer) {
            const dmp = new diff_match_patch();
            const diff = dmp.diff_main(oldVer.content, newVer.content);
            dmp.diff_cleanupSemantic(diff);
            
            this.currentDiff = diff.map(([type, text]) => {
                switch(type) {
                    case 1:  return `<span class="diff-add bg-success text-white">${text}</span>`;
                    case -1: return `<span class="diff-del bg-danger text-white">${text}</span>`;
                    default: return text;
                }
            }).join('');
            
            this.showingDiff = true;
        },
        closeHistory() {
            this.showingHistory = false;
            this.showingDiff = false;
            this.currentDiff = '';
        },
        validateBeforeSave() {
            const errors = [];
            if (!this.localDoc.title?.trim()) {
                errors.push('제목을 입력해주세요.');
            }
            if (!this.localDoc.category) {
                errors.push('카테고리를 선택해주세요.');
            }
            if (!this.localDoc.subcategory) {
                errors.push('하위 카테고리를 선택해주세요.');
            }
            if (!this.localDoc.password?.trim()) {
                errors.push('수정 비밀번호를 입력해주세요.');
            }
            return errors;
        }
    },
    mounted() {
      // 새 문서일 때 기본 양식 적용
      if (!this.localDoc.id && !this.localDoc.content) {
        this.localDoc.content = `<h2>문서 제목</h2>\n<p>여기에 내용을 입력하세요.</p>\n<ul>\n  <li>항목 1</li>\n  <li>항목 2</li>\n</ul>`;
      }
      $(this.$refs.editor).summernote({ height: 300 });
      if (this.localDoc.content) {
        $(this.$refs.editor).summernote('code', this.localDoc.content);
      }
    }
});
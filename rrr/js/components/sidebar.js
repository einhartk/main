Vue.component('sidebar-view', {
    props: ['recentDocs', 'categories', 'popularDocs', 'allTags'],
    data() {
        return {
            activeCategory: null,
            expandedSections: {
                categories: true,
                recent: true,
                popular: true,
                tags: true
            }
        };
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
                            class="btn btn-sm btn-outline-secondary">
                        {{ expandedSections.categories ? '접기' : '펼치기' }}
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
                            class="btn btn-sm btn-outline-secondary">
                        {{ expandedSections.popular ? '접기' : '펼치기' }}
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
                            class="btn btn-sm btn-outline-secondary">
                        {{ expandedSections.recent ? '접기' : '펼치기' }}
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
                            class="btn btn-sm btn-outline-secondary">
                        {{ expandedSections.tags ? '접기' : '펼치기' }}
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
// API 설정 파일 참조
Vue.component('homework-view', {
    template: `
    <div class="homework-container container py-4">
        <!-- 헤더 -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="h4 mb-0">원정대 숙제 체크</h2>
            <div class="d-flex gap-2">
                <div class="btn-group">
                    <button class="btn btn-sm" :class="{'btn-primary': sortBy === 'level', 'btn-outline-primary': sortBy !== 'level'}"
                            @click="sortBy = 'level'" title="레벨순 정렬">
                        <i class="bi bi-sort-numeric-down"></i> 레벨순
                    </button>
                    <button class="btn btn-sm" :class="{'btn-primary': sortBy === 'name', 'btn-outline-secondary': sortBy !== 'name'}"
                            @click="sortBy = 'name'" title="이름순 정렬">
                        <i class="bi bi-sort-alpha-down"></i> 이름순
                    </button>
                </div>
                <button class="btn btn-sm btn-outline-secondary" @click="fetchCharacters" :disabled="loading" title="새로고침">
                    <i class="bi" :class="{'bi-arrow-repeat': !loading, 'bi-arrow-repeat spin': loading}"></i>
                </button>
            </div>
        </div>

        <!-- 검색창 -->
        <div class="mb-4">
            <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" class="form-control" 
                       v-model="searchText" 
                       placeholder="캐릭터 이름으로 검색..."
                       :disabled="loading">
            </div>
        </div>

        <!-- 로딩 상태 -->
        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">로딩중...</span>
            </div>
            <p class="mt-2 text-muted">캐릭터 정보를 불러오는 중입니다...</p>
        </div>

        <!-- 에러 메시지 -->
        <div v-else-if="error" class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            {{ error }}
        </div>

        <!-- 캐릭터 목록 -->
        <div v-else-if="characters.length > 0" class="row g-4">
            <div v-for="char in filteredCharacters" :key="char.CharacterName" class="col-12 col-sm-6 col-lg-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-header bg-white p-0 overflow-hidden">
                        <div class="character-image" :style="{'background-image': 'url(' + (char.CharacterImage || 'img/default-character.png') + ')'}"></div>
                    </div>
                    <div class="card-body">
                        <!-- 캐릭터 기본 정보 -->
                        <div class="text-center mb-3">
                            <h5 class="card-title mb-1">{{ char.CharacterName }}</h5>
                            <div class="badge" :class="getClassBadgeColor(char.CharacterClassName)">
                                {{ char.CharacterClassName }}
                            </div>
                        </div>
                        
                        <!-- 아이템 레벨 & 전투력 -->
                        <div class="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
                            <div class="text-center">
                                <div class="small text-muted">아이템 레벨</div>
                                <div :class="'fw-bold ' + getItemLevelClass(char.ItemMaxLevel)">
                                    {{ char.ItemMaxLevel || '0' }}
                                </div>
                            </div>
                            <div class="vr"></div>
                            <div class="text-center">
                                <div class="small text-muted">전투력</div>
                                <div class="fw-bold text-primary">
                                    {{ char.CombatPower ? char.CombatPower.toLocaleString() : '0' }}
                                </div>
                            </div>
                        </div>

                        <!-- 일일 숙제 -->
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0 fw-bold border-bottom pb-1">일일 숙제</h6>
                                <div class="form-check form-switch d-flex align-items-center toggle-all">
                                    <input class="form-check-input me-2" type="checkbox" role="switch"
                                           :id="'toggle-all-daily-' + char.CharacterName"
                                           @change="toggleAllDailyTasks(char.CharacterName)"
                                           :checked="['chaos', 'guardian'].every(task => getDailyTask(char.CharacterName, task).completed)">
                                    <label class="form-check-label small" :for="'toggle-all-daily-' + char.CharacterName">
                                        전체
                                    </label>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                           :id="'chaos-' + char.CharacterName"
                                           v-model="getDailyTask(char.CharacterName, 'chaos').completed"
                                           @change="saveDailyTask(char.CharacterName, 'chaos')">
                                    <label class="form-check-label" :for="'chaos-' + char.CharacterName">
                                        카던
                                    </label>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                           :id="'guardian-' + char.CharacterName"
                                           v-model="getDailyTask(char.CharacterName, 'guardian').completed"
                                           @change="saveDailyTask(char.CharacterName, 'guardian')">
                                    <label class="form-check-label" :for="'guardian-' + char.CharacterName">
                                        가토
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- 주간 레이드 -->
                        <div class="mb-2">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0 fw-bold border-bottom pb-1">주간 레이드</h6>
                                <div class="form-check form-switch d-flex align-items-center toggle-all">
                                    <input class="form-check-input me-2" type="checkbox" role="switch"
                                           :id="'toggle-all-weekly-' + char.CharacterName"
                                           @change="toggleAllWeeklyTasks(char.CharacterName)"
                                           :checked="['raid1', 'raid2', 'raid3'].every(task => getWeeklyTask(char.CharacterName, task).completed)">
                                    <label class="form-check-label small" :for="'toggle-all-weekly-' + char.CharacterName">
                                        전체
                                    </label>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                           :id="'raid1-' + char.CharacterName"
                                           v-model="getWeeklyTask(char.CharacterName, 'raid1').completed"
                                           @change="saveWeeklyTask(char.CharacterName, 'raid1')">
                                    <label class="form-check-label" :for="'raid1-' + char.CharacterName">
                                        레이드1
                                    </label>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                           :id="'raid2-' + char.CharacterName"
                                           v-model="getWeeklyTask(char.CharacterName, 'raid2').completed"
                                           @change="saveWeeklyTask(char.CharacterName, 'raid2')">
                                    <label class="form-check-label" :for="'raid2-' + char.CharacterName">
                                        레이드2
                                    </label>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                           :id="'raid3-' + char.CharacterName"
                                           v-model="getWeeklyTask(char.CharacterName, 'raid3').completed"
                                           @change="saveWeeklyTask(char.CharacterName, 'raid3')">
                                    <label class="form-check-label" :for="'raid3-' + char.CharacterName">
                                        레이드3
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 캐릭터 없을 때 -->
        <div v-else class="text-center py-5">
            <div class="text-muted mb-3">
                <i class="bi bi-people fs-1"></i>
            </div>
            <p class="text-muted">캐릭터 정보를 불러오려면 대표 캐릭터 이름을 입력해주세요.</p>
            <button class="btn btn-sm btn-outline-primary" @click="$root.userIdInput = ''">
                <i class="bi bi-person-plus me-1"></i> 캐릭터 설정하기
            </button>
        </div>
    </div>
    </div>
    `,
    data() {
        return {
            loading: false,
            error: null,
            characters: [],
            sortBy: 'level',
            searchText: '',
            dailyTasks: {},
            weeklyTasks: {},
            lastDailyReset: null,
            lastWeeklyReset: null
        };
    },
    computed: {
        filteredCharacters() {
            let result = [...this.characters];
            
            // 검색어로 필터링 (캐릭터 이름만 검색)
            if (this.searchText) {
                const searchLower = this.searchText.toLowerCase();
                result = result.filter(char => 
                    char.CharacterName.toLowerCase().includes(searchLower)
                );
            }

            // 정렬
            result.sort((a, b) => {
                if (this.sortBy === 'level') {
                    // 아이템 레벨(ItemMaxLevel) 기준으로 정렬
                    const itemLevelA = this._safeLevelNumber(a.ItemMaxLevel);
                    const itemLevelB = this._safeLevelNumber(b.ItemMaxLevel);
                    
                    // 아이템 레벨이 같으면 전투력으로 정렬
                    if (itemLevelA === itemLevelB) {
                        const powerA = this._safeLevelNumber(a.CombatPower);
                        const powerB = this._safeLevelNumber(b.CombatPower);
                        return powerB - powerA;
                    }
                    
                    return itemLevelB - itemLevelA; // 내림차순 정렬 (높은 아이템 레벨이 먼저 오도록)
                } else {
                    const na = (a.CharacterName || '').toString();
                    const nb = (b.CharacterName || '').toString();
                    return na.localeCompare(nb);
                }
            });

            return result;
        }
    },
    created() {
        // 로컬 스토리지에서 체크리스트 데이터 로드
        this.loadTasksFromStorage();
        this.checkResetTimes();
        // 매 분마다 리셋 시간 체크
        setInterval(this.checkResetTimes, 60000);
        // 페이지 로드시 한 번만 데이터 로드
        if (window.localStorage.getItem('lastCharacterName')) {
            this.fetchCharacters();
        }
    },
    methods: {
        getDailyResetTimeText() {
            const now = new Date();
            const nextReset = new Date(now);
            nextReset.setHours(6, 0, 0, 0);
            if (now.getHours() >= 6) {
                nextReset.setDate(nextReset.getDate() + 1);
            }
            const hours = Math.floor((nextReset - now) / (1000 * 60 * 60));
            const minutes = Math.floor(((nextReset - now) % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}시간 ${minutes}분 후 초기화`;
        },

        getWeeklyResetTimeText() {
            const now = new Date();
            const nextReset = new Date(now);
            nextReset.setHours(6, 0, 0, 0);
            while (nextReset.getDay() !== 3) { // 3 is Wednesday
                nextReset.setDate(nextReset.getDate() + 1);
            }
            if (now.getDay() === 3 && now.getHours() >= 6) {
                nextReset.setDate(nextReset.getDate() + 7);
            }
            const days = Math.floor((nextReset - now) / (1000 * 60 * 60 * 24));
            const hours = Math.floor(((nextReset - now) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return `${days}일 ${hours}시간 후 초기화`;
        },

        loadTasksFromStorage() {
            const dailyTasks = localStorage.getItem('dailyTasks');
            const weeklyTasks = localStorage.getItem('weeklyTasks');
            const lastDailyReset = localStorage.getItem('lastDailyReset');
            const lastWeeklyReset = localStorage.getItem('lastWeeklyReset');

            if (dailyTasks) this.dailyTasks = JSON.parse(dailyTasks);
            if (weeklyTasks) this.weeklyTasks = JSON.parse(weeklyTasks);
            if (lastDailyReset) this.lastDailyReset = parseInt(lastDailyReset);
            if (lastWeeklyReset) this.lastWeeklyReset = parseInt(lastWeeklyReset);
        },

        checkResetTimes() {
            const now = new Date();
            const todayReset = new Date(now);
            todayReset.setHours(6, 0, 0, 0);
            
            // 일일 초기화 체크
            if (!this.lastDailyReset || now.getTime() >= this.lastDailyReset + 86400000) {
                const nextReset = new Date(now);
                nextReset.setHours(6, 0, 0, 0);
                if (now.getHours() >= 6) {
                    nextReset.setDate(nextReset.getDate() + 1);
                }
                this.lastDailyReset = nextReset.getTime();
                this.dailyTasks = {};
                localStorage.setItem('lastDailyReset', this.lastDailyReset);
                localStorage.setItem('dailyTasks', JSON.stringify(this.dailyTasks));
            }

            // 주간 초기화 체크 (수요일 06시)
            if (!this.lastWeeklyReset || (now.getDay() === 3 && now.getHours() >= 6 && 
                this.lastWeeklyReset < todayReset.getTime())) {
                this.lastWeeklyReset = todayReset.getTime();
                this.weeklyTasks = {};
                localStorage.setItem('lastWeeklyReset', this.lastWeeklyReset);
                localStorage.setItem('weeklyTasks', JSON.stringify(this.weeklyTasks));
            }
        },

        getDailyTask(characterName, taskType) {
            if (!this.dailyTasks[characterName]) {
                this.dailyTasks[characterName] = {};
            }
            if (!this.dailyTasks[characterName][taskType]) {
                this.dailyTasks[characterName][taskType] = { completed: false };
            }
            return this.dailyTasks[characterName][taskType];
        },

        saveDailyTask(characterName, taskType = null) {
            // If taskType is provided, ensure the character exists in the tasks object
            if (taskType && !this.dailyTasks[characterName]) {
                this.dailyTasks[characterName] = {};
            }
            
            // Save to localStorage
            localStorage.setItem('dailyTasks', JSON.stringify(this.dailyTasks));
        },

        getWeeklyTask(characterName, taskType) {
            if (!this.weeklyTasks[characterName]) {
                this.weeklyTasks[characterName] = {};
            }
            if (!this.weeklyTasks[characterName][taskType]) {
                this.weeklyTasks[characterName][taskType] = { completed: false };
            }
            return this.weeklyTasks[characterName][taskType];
        },

        saveWeeklyTask(characterName, taskType = null) {
            // If taskType is provided, ensure the character exists in the tasks object
            if (taskType && !this.weeklyTasks[characterName]) {
                this.weeklyTasks[characterName] = {};
            }
            
            // Save to localStorage
            localStorage.setItem('weeklyTasks', JSON.stringify(this.weeklyTasks));
        },

        // 일일 숙제 전체 토글
        toggleAllDailyTasks(characterName) {
            const tasks = ['chaos', 'guardian'];
            const allCompleted = tasks.every(task => 
                this.getDailyTask(characterName, task).completed
            );
            
            // Update all tasks first
            tasks.forEach(task => {
                this.getDailyTask(characterName, task).completed = !allCompleted;
            });
            
            // Save once after all updates
            this.saveDailyTask(characterName);
            
            // Force Vue to update the view
            this.$forceUpdate();
        },
        
        // 주간 레이드 전체 토글
        toggleAllWeeklyTasks(characterName) {
            const tasks = ['raid1', 'raid2', 'raid3'];
            const allCompleted = tasks.every(task => 
                this.getWeeklyTask(characterName, task).completed
            );
            
            // Update all tasks first
            tasks.forEach(task => {
                this.getWeeklyTask(characterName, task).completed = !allCompleted;
            });
            
            // Save once after all updates
            this.saveWeeklyTask(characterName);
            
            // Force Vue to update the view
            this.$forceUpdate();
        },

        // 캐릭터 정보 가져오기
        async fetchCharacters() {
            if (this.loading) return;
            if (!this.$root.userIdInput) {
                this.error = "대표 캐릭터 이름을 입력해주세요.";
                return;
            }
            this.loading = true;
            this.error = null;
            
            try {
                // 1. 원정대 캐릭터 목록 조회
                const siblings = await this.fetchCharacterFromAPI(
                    `${ENDPOINTS.CHARACTERS}/${encodeURIComponent(this.$root.userIdInput)}/siblings`
                );
                
                // 2. 각 캐릭터의 상세 정보를 병렬로 조회
                const characterPromises = siblings.map(char => 
                    this.fetchCharacterFromAPI(
                        `${ENDPOINTS.ARMORIES}/${encodeURIComponent(char.CharacterName)}/profiles`
                    ).catch(err => {
                        console.warn('failed to fetch profile for', char.CharacterName, err);
                        return null;
                    })
                );

                const results = await Promise.all(characterPromises);
                // normalize and filter out nulls
                this.characters = results.filter(r => r).map(r => this._normalizeProfile(r));
            } catch (err) {
                this.error = err.message;
                console.error('API 호출 에러:', err);
            } finally {
                this.loading = false;
            }
        },

        // helper: convert level string to integer for sorting (removes decimal points)
        _safeLevelNumber(level) {
            if (level === null || level === undefined || level === '') return 0;
            try {
                // Remove all non-digit characters (including commas and decimal points)
                const cleanLevel = String(level).replace(/[^0-9]/g, '');
                // Convert to number (will be integer since we removed all non-digits)
                return parseInt(cleanLevel, 10) || 0;
            } catch (e) {
                console.error('Error converting level:', level, e);
                return 0;
            }
        },

        // normalize API profile shape into expected fields
        _normalizeProfile(raw) {
            // 아이템 레벨 형식 변환 (소수점 및 소수점 이하 모두 제거)
            let itemLevel = '';
            if (raw.ItemAvgLevel) {
                // 소수점을 포함한 모든 문자열을 정수 부분만 남기고 제거 (예: '1234.56' -> '1234')
                itemLevel = String(raw.ItemAvgLevel).split('.')[0];
            }
            // 전투력 (CombatPower) - 소수점 제거
            let combatPower = 0;
            if (raw.CombatPower) {
                // 소수점을 포함한 모든 문자열을 정수 부분만 남기고 제거 (예: '1234.56' -> '1234')
                combatPower = String(raw.CombatPower).split('.')[0];
            }
            // 전투 레벨 (CharacterLevel)
            const combatLevel = raw.CharacterLevel || '';

            return {
                CharacterName: raw.CharacterName || '',
                CharacterClassName: raw.CharacterClassName || '',
                ServerName: raw.ServerName || '',
                ItemMaxLevel: itemLevel,
                CombatLevel: combatLevel,
                CombatPower: combatPower,
                // keep original for debugging
                _raw: raw
            };
        },
        getItemLevelClass(level) {
            const numLevel = this._safeLevelNumber(level);
            if (numLevel >= 1740) return 'text-danger fw-bold';
            if (numLevel >= 1700) return 'text-primary fw-bold';
            if (numLevel >= 1640) return 'text-success fw-bold';
            return 'text-muted';
        },
        getClassBadgeColor(className) {
            const classColors = {
                '버서커': 'bg-danger',
                '디스트로이어': 'bg-danger',
                '워로드': 'bg-danger',
                '홀리나이트': 'bg-danger',
                '건슬링어': 'bg-warning',
                '데빌헌터': 'bg-warning',
                '블래스터': 'bg-warning',
                '호크아이': 'bg-warning',
                '바드': 'bg-success',
                '서머너': 'bg-info',
                '아르카나': 'bg-info',
                '소서리스': 'bg-info',
                '데모닉': 'bg-dark',
                '블레이드': 'bg-dark',
                '리퍼': 'bg-dark',
                '창술사': 'bg-primary',
                '인파이터': 'bg-primary',
                '기상술사': 'bg-primary',
                '스트라이커': 'bg-primary',
                '배틀마스터': 'bg-primary',
                '도화가': 'bg-secondary',
                '기공사': 'bg-secondary'
            };
            return classColors[className] || 'bg-secondary';
        },
        async fetchCharacterFromAPI(url) {
            // API 키가 설정되어 있는지 먼저 확인
            if (!isLostArkApiKeyConfigured()) {
                throw new Error('API 키가 설정되어 있지 않습니다. js/config/api-config.js에 키를 입력하거나 setLostArkApiKey()를 사용하세요.');
            }

            try {
                const res = await axios.get(`${LOSTARK_API_CONFIG.BASE_URL}${url}`, {
                    headers: getLostArkHeaders()
                });
                return res.data;
            } catch (err) {
                // axios 오류 처리
                if (err.response) {
                    if (err.response.status === 401) {
                        throw new Error('Unauthorized (401): API 키가 잘못되었거나 권한이 없습니다. 서버 측 설정 또는 키를 확인하세요. 응답: ' + JSON.stringify(err.response.data));
                    }
                    throw new Error(`API 호출 실패: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
                }
                throw new Error('API 호출 실패: ' + err.message);
            }
        },
        
        async fetchCharacterInfo() {
            const characterName = this.$root.userIdInput;
            if (!characterName) {
                this.error = "대표 캐릭터 이름을 입력해주세요.";
                return;
            }

            this.loading = true;
            this.error = null;
            
            try {
                // 1. 원정대 캐릭터 목록 조회
                const siblings = await this.fetchCharacterFromAPI(
                    `${ENDPOINTS.CHARACTERS}/${encodeURIComponent(characterName)}/siblings`
                );
                
                // 2. 각 캐릭터의 상세 정보를 병렬로 조회 (profiles 엔드포인트 사용)
                const characterPromises = siblings.map(char => 
                    this.fetchCharacterFromAPI(
                        `${ENDPOINTS.ARMORIES}/${encodeURIComponent(char.CharacterName)}/profiles`
                    ).catch(err => {
                        console.warn('failed to fetch profile for', char.CharacterName, err);
                        return null;
                    })
                );

                const results = await Promise.all(characterPromises);
                // normalize and filter out nulls
                this.characters = results.filter(r => r).map(r => this._normalizeProfile(r));
            } catch (err) {
                this.error = err.message;
                console.error('API 호출 에러:', err);
            } finally {
                this.loading = false;
            }
        }
    },
    mounted() {
        if (this.$root.userIdInput) {
            this.fetchCharacterInfo();
        }
    },
    watch: {
        '$root.userIdInput'(newVal) {
            if (newVal) {
                this.fetchCharacterInfo();
            }
        }
    }
});
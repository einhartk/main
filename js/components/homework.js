// API 설정 파일 참조
Vue.component('homework-view', {
    template: `
    <div class="homework-container">
        <h2>원정대 숙제 체크</h2>
        <div v-if="loading" class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">로딩중...</span>
            </div>
        </div>
        <div v-else-if="error" class="alert alert-danger">
            {{ error }}
        </div>
        <div v-else-if="characters.length > 0" class="character-list">
            <!-- 필터 옵션 -->
            <div class="mb-3">
                <div class="btn-group">
                    <button class="btn" :class="{'btn-primary': sortBy === 'level', 'btn-outline-primary': sortBy !== 'level'}"
                            @click="sortBy = 'level'">레벨순</button>
                    <button class="btn" :class="{'btn-primary': sortBy === 'name', 'btn-outline-primary': sortBy !== 'name'}"
                            @click="sortBy = 'name'">이름순</button>
                </div>
                <input type="text" class="form-control d-inline-block ms-2" style="width: 200px;" 
                       v-model="searchText" placeholder="캐릭터 검색...">
            </div>

            <!-- 캐릭터 카드 목록 -->
            <div class="row">
                <div v-for="char in filteredCharacters" :key="char.CharacterName" class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="card-title mb-0">{{ char.CharacterName }}</h5>
                                <div class="text-end">
                                    <div :class="getItemLevelClass(char.ItemMaxLevel)">
                                        아이템 {{ char.ItemMaxLevel }}
                                    </div>
                                    <small class="text-muted">
                                        전투 {{ char.CombatLevel }}
                                    </small>
                                </div>
                            </div>
                            <div class="char-info">
                                <p class="mb-1">
                                    <span class="badge" :class="getClassBadgeColor(char.CharacterClassName)">
                                        {{ char.CharacterClassName }}
                                    </span>
                                    <span class="text-muted ms-2">{{ char.ServerName }}</span>
                                </p>
                                <div class="mt-3">
                                    <div class="daily-tasks mb-2">
                                        <strong class="d-block mb-2">일일 숙제 ({{getDailyResetTimeText()}})</strong>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" 
                                                :id="'chaos-'+char.CharacterName"
                                                v-model="getDailyTask(char.CharacterName, 'chaos').completed"
                                                @change="saveDailyTask(char.CharacterName, 'chaos')">
                                            <label class="form-check-label" :for="'chaos-'+char.CharacterName">
                                                카오스 던전
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" 
                                                :id="'guardian-'+char.CharacterName"
                                                v-model="getDailyTask(char.CharacterName, 'guardian').completed"
                                                @change="saveDailyTask(char.CharacterName, 'guardian')">
                                            <label class="form-check-label" :for="'guardian-'+char.CharacterName">
                                                가디언 토벌
                                            </label>
                                        </div>
                                    </div>
                                    <div class="weekly-tasks">
                                        <strong class="d-block mb-2">주간 레이드 ({{getWeeklyResetTimeText()}})</strong>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" 
                                                :id="'raid1-'+char.CharacterName"
                                                v-model="getWeeklyTask(char.CharacterName, 'raid1').completed"
                                                @change="saveWeeklyTask(char.CharacterName, 'raid1')">
                                            <label class="form-check-label" :for="'raid1-'+char.CharacterName">
                                                레이드 1
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" 
                                                :id="'raid2-'+char.CharacterName"
                                                v-model="getWeeklyTask(char.CharacterName, 'raid2').completed"
                                                @change="saveWeeklyTask(char.CharacterName, 'raid2')">
                                            <label class="form-check-label" :for="'raid2-'+char.CharacterName">
                                                레이드 2
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" 
                                                :id="'raid3-'+char.CharacterName"
                                                v-model="getWeeklyTask(char.CharacterName, 'raid3').completed"
                                                @change="saveWeeklyTask(char.CharacterName, 'raid3')">
                                            <label class="form-check-label" :for="'raid3-'+char.CharacterName">
                                                레이드 3
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="text-center">
            <p>캐릭터 정보를 불러오려면 우측 상단에서 대표 캐릭터 이름을 입력해주세요.</p>
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
            
            // 검색어로 필터링
            if (this.searchText) {
                const searchLower = this.searchText.toLowerCase();
                result = result.filter(char => 
                    char.CharacterName.toLowerCase().includes(searchLower) ||
                    char.CharacterClassName.toLowerCase().includes(searchLower)
                );
            }

            // 정렬
            result.sort((a, b) => {
                if (this.sortBy === 'level') {
                    const na = this._safeLevelNumber(a.ItemMaxLevel);
                    const nb = this._safeLevelNumber(b.ItemMaxLevel);
                    return nb - na;
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
        this.loadTasksFromStorage();
        this.checkResetTimes();
        // 매 분마다 리셋 시간 체크
        setInterval(this.checkResetTimes, 60000);
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

        getWeeklyTask(characterName, taskType) {
            if (!this.weeklyTasks[characterName]) {
                this.weeklyTasks[characterName] = {};
            }
            if (!this.weeklyTasks[characterName][taskType]) {
                this.weeklyTasks[characterName][taskType] = { completed: false };
            }
            return this.weeklyTasks[characterName][taskType];
        },

        saveDailyTask(characterName, taskType) {
            localStorage.setItem('dailyTasks', JSON.stringify(this.dailyTasks));
        },

        saveWeeklyTask(characterName, taskType) {
            localStorage.setItem('weeklyTasks', JSON.stringify(this.weeklyTasks));
        },

        // helper: convert level string (maybe null) to number for sorting
        _safeLevelNumber(level) {
            if (!level && level !== 0) return 0;
            try {
                const s = String(level).replace(/,/g, '');
                const n = parseFloat(s);
                return isNaN(n) ? 0 : n;
            } catch (e) { return 0; }
        },

        // normalize API profile shape into expected fields
        _normalizeProfile(raw) {
            // raw may be the object returned by /profiles endpoint or armory
            // try common property names, fall back to safe defaults
            const name = raw.CharacterName || raw.Name || raw.name || (raw.character && raw.character.name) || '';
            const cls = raw.CharacterClassName || raw.Class || raw.CharacterClass || raw.characterClassName || '';
            const server = raw.ServerName || raw.Server || raw.serverName || raw.server || '';
            // ItemMaxLevel might be under ItemMaxLevel or different keys
            const itemLevel = raw.ItemMaxLevel || raw.itemMaxLevel || raw.item_level || (raw.gear && raw.gear.itemMaxLevel) || '';

            return {
                CharacterName: name,
                CharacterClassName: cls,
                ServerName: server,
                ItemMaxLevel: itemLevel || '' ,
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
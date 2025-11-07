// Party Creation Component - New Version
Vue.component('party-creation', {
    template: `
    <div class="party-creation-container">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="h4 mb-0">공격대 생성기</h2>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary" @click="fetchCharacters()" :disabled="loading">
                    <i class="bi" :class="{'bi-arrow-repeat': !loading, 'spinner-border spinner-border-sm': loading}"></i> 새로고침
                </button>
            </div>
        </div>

        <!-- Character Input Section -->
        <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h3 class="h5 mb-0">캐릭터 입력 (최대 8명)</h3>
                <button class="btn btn-sm btn-outline-primary" @click="fetchAllExpeditions" :disabled="!hasValidCharacters || loading">
                    <i class="bi" :class="{'bi-people': !loading, 'spinner-border spinner-border-sm': loading}"></i> 전체 원정대 조회
                </button>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <div v-for="i in 8" :key="i" class="col-12 col-md-6 col-lg-3">
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">{{ i }}.</span>
                            <input type="text" class="form-control" v-model="characterInputs[i-1]" 
                                   placeholder="캐릭터명" @keyup.enter="() => fetchCharacter(i-1)">
                            <button class="btn btn-outline-secondary" type="button" 
                                    @click="() => fetchExpedition(i-1)" 
                                    :disabled="!characterInputs[i-1] || loading">
                                <i class="bi bi-people"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <small class="text-muted">캐릭터명을 입력하고 <i class="bi bi-people"></i> 버튼을 누르면 해당 캐릭터의 원정대 멤버를 불러옵니다.</small>
            </div>
        </div>

        <!-- Character Display Section -->
        <div class="card mb-4" v-if="characters.length > 0">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h3 class="h5 mb-0">원정대 구성 ({{ characters.length }}/8)</h3>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="showOnlyValid" v-model="showOnlyValid">
                    <label class="form-check-label" for="showOnlyValid">유효한 캐릭터만 표시</label>
                </div>
            </div>
            <div class="card-body">
                <div class="expedition-grid">
                    <div v-for="(expedition, expName, idx) in getLimitedExpeditions()" :key="expName" class="expedition-item">
                        <div class="expedition-header d-flex justify-content-between align-items-center mb-1">
                            <h5 class="expedition-title mb-0">{{ expName }}</h5>
                            <span class="badge bg-secondary">{{ expedition.length }}명</span>
                        </div>
                        <div class="expedition-characters">
                            <div v-for="(char, charIdx) in getTopCharacters(expedition)" :key="charIdx" 
                                 class="character-row" 
                                 :class="{
                                     'in-raid': isInRaid(char),
                                     'support': isSupport(char)
                                 }">
                                <div class="character-info compact">
                                    <span class="character-name">{{ char.CharacterName }}</span>
                                    <span class="character-class">
                                        <span class="class-badge"></span>
                                        {{ char.CharacterClassName }} ({{ char.ItemAvgLevel || '0' }})
                                    </span>
                                </div>
                                <button class="btn btn-sm btn-outline-danger btn-icon" @click.stop="removeCharacter(char.CharacterName)">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Raid Creation Section -->
        <div class="card" v-if="characters.length >= 4">
            <div class="card-header">
                <h3 class="h5 mb-0">공격대 생성</h3>
            </div>
            <div class="card-body">
                <div class="raid-controls mb-3">
                    <div class="input-group me-2" style="max-width: 250px;">
                        <span class="input-group-text">최소 평균 아이템 레벨</span>
                        <input type="number" class="form-control" v-model.number="minLevel" min="0" step="1" value="1640">
                    </div>
                    <button class="btn btn-outline-secondary me-2" @click="resetRaid">
                        <i class="bi bi-arrow-counterclockwise"></i> 초기화
                    </button>
                </div>
                
                <div class="raid-parties">
                    <div class="raid-party">
                        <h4>1파티 ({{ countDps(raidParty1) }}DPS)</h4>
                        <div class="party-members">
                            <div v-for="(char, index) in raidParty1" :key="index" class="party-member"
                                 :class="{'support': isSupport(char)}">
                                {{ char.CharacterName }} (Lv. {{ char.ItemAvgLevel }})
                                <button class="btn btn-sm btn-outline-secondary ms-2" @click="moveToParty2(char)">
                                    <i class="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="raid-party">
                        <h4>2파티 ({{ countDps(raidParty2) }}DPS)</h4>
                        <div class="party-members">
                            <div v-for="(char, index) in raidParty2" :key="index" class="party-member"
                                 :class="{'support': isSupport(char)}">
                                {{ char.CharacterName }} (Lv. {{ char.ItemAvgLevel }})
                                <button class="btn btn-sm btn-outline-secondary ms-2" @click="moveToParty1(char)">
                                    <i class="bi bi-arrow-left"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Raid Party Creation -->
        <div class="card mt-4" v-if="characters.length > 0">
            <div class="card-header">
                <h3 class="h5 mb-0">공격대 편성</h3>
            </div>
            <div class="card-body">
                <div class="row">
                    <!-- Party 1 -->
                    <div class="col-md-6 mb-3">
                        <div class="card h-100">
                            <div class="card-header">
                                <h4 class="h6 mb-0">파티 1 ({{ raidParty1.length }}/4)</h4>
                            </div>
                            <div class="card-body party-dropzone" 
                                 @dragover.prevent 
                                 @drop="onDrop($event, 'party1')">
                                <div class="row g-2">
                                    <div class="col-6" v-for="(char, index) in raidParty1" :key="'p1-'+index">
                                        <div class="character-slot" draggable="true"
                                             @dragstart="onDragStart($event, char, 'party1', index)">
                                            <div class="d-flex align-items-center">
                                                <span class="me-2">{{ char.CharacterName }}</span>
                                                <small class="ms-auto">{{ char.ItemAvgLevel }}</small>
                                                <button class="btn btn-sm btn-link text-danger p-0 ms-2"
                                                        @click="removeFromParty('party1', index)">
                                                    <i class="bi bi-x"></i>
                                                </button>
                                            </div>
                                            <small class="text-muted">{{ char.CharacterClassName }}</small>
                                        </div>
                                    </div>
                                    <div class="col-6" v-for="n in (4 - raidParty1.length)" :key="'empty1-'+n">
                                        <div class="empty-slot" @dragover.prevent @drop="onDrop($event, 'party1')">
                                            <i class="bi bi-plus-lg"></i> 캐릭터를 드래그하세요
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Party 2 -->
                    <div class="col-md-6 mb-3">
                        <div class="card h-100">
                            <div class="card-header">
                                <h4 class="h6 mb-0">파티 2 ({{ raidParty2.length }}/4)</h4>
                            </div>
                            <div class="card-body party-dropzone" 
                                 @dragover.prevent 
                                 @drop="onDrop($event, 'party2')">
                                <div class="row g-2">
                                    <div class="col-6" v-for="(char, index) in raidParty2" :key="'p2-'+index">
                                        <div class="character-slot" draggable="true"
                                             @dragstart="onDragStart($event, char, 'party2', index)">
                                            <div class="d-flex align-items-center">
                                                <span class="me-2">{{ char.CharacterName }}</span>
                                                <small class="ms-auto">{{ char.ItemAvgLevel }}</small>
                                                <button class="btn btn-sm btn-link text-danger p-0 ms-2"
                                                        @click="removeFromParty('party2', index)">
                                                    <i class="bi bi-x"></i>
                                                </button>
                                            </div>
                                            <small class="text-muted">{{ char.CharacterClassName }}</small>
                                        </div>
                                    </div>
                                    <div class="col-6" v-for="n in (4 - raidParty2.length)" :key="'empty2-'+n">
                                        <div class="empty-slot" @dragover.prevent @drop="onDrop($event, 'party2')">
                                            <i class="bi bi-plus-lg"></i> 캐릭터를 드래그하세요
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="d-flex justify-content-between mt-3">
                    <div>
                        <button class="btn btn-primary me-2" @click="autoFillParties" :disabled="!canAutoFill">
                            <i class="bi bi-magic"></i> 자동 편성
                        </button>
                        <button class="btn btn-primary me-2" @click="autoFillPartiesByLevel" :disabled="!canAutoFill">
                            <i class="bi bi-sort-numeric-down"></i> 본1부1
                        </button>
                    </div>
                    <div>
                        <button class="btn btn-success" @click="saveRaidSetup" >
                            <i class="bi bi-save"></i> 공격대 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            characters: [],
            characterInputs: Array(8).fill(''),
            minLevel: 1640,
            loading: false,
            showOnlyValid: true,
            raidParty1: [],
            raidParty2: [],
            draggedItem: null,
            draggedFromParty: null,
            expeditions: {},
            supportClasses: ['바드', '도화가', '홀리나이트', '발키리'],
            inputToExpedition: {} // Maps input index to expedition name
        };
    },
    computed: {
        hasValidCharacters() {
            // Check if there are any non-empty inputs
            return this.characterInputs.some(input => input && input.trim() !== '');
        },
        leftColumn() {
            const filtered = this.showOnlyValid 
                ? this.characters.filter(c => this.isValidCharacter(c))
                : this.characters;
            return filtered.slice(0, Math.ceil(filtered.length / 2));
        },
        rightColumn() {
            const filtered = this.showOnlyValid 
                ? this.characters.filter(c => this.isValidCharacter(c))
                : this.characters;
            return filtered.slice(Math.ceil(filtered.length / 2));
        },
        canGenerateRaid() {
            // Check if there are at least 4 valid characters
            return this.validCharacters.length >= 4;
        },
        averageLevel() {
            if (this.characters.length === 0) return 0;
            const sum = this.characters.reduce((acc, char) => {
                return acc + (parseInt(char.ItemAvgLevel) || 0);
            }, 0);
            return Math.round((sum / this.characters.length) * 10) / 10;
        },
        validCharacters() {
            return this.characters.filter(c => this.isValidCharacter(c));
        },
        canAutoFill() {
            return this.characters.length > 0 && 
                  (this.raidParty1.length < 4 || this.raidParty2.length < 4);
        },
        isRaidComplete() {
            return this.raidParty1.length === 4 && this.raidParty2.length === 4;
        }
    },
    methods: {
        // Helper method to shuffle an array in place
        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        },
        
        // Check if a character class is a support class
        isSupportClass(className) {
            if (!className) return false;
            return this.supportClasses.some(supportClass => 
                className.includes(supportClass)
            );
        },
        
        // Drag and Drop Methods
        onDragStart(event, character, fromParty, index) {
            this.draggedItem = character;
            this.draggedFromParty = fromParty;
            event.dataTransfer.setData('text/plain', ''); // Required for Firefox
        },

        // Check if a character from the same expedition already exists in raid
        isExpeditionInRaid(character) {
            if (!character || !character.ExpeditionName) return false;
            
            const allRaidChars = [...this.raidParty1, ...this.raidParty2];
            const isExpeditionInUse = allRaidChars.some(char => 
                char && char.ExpeditionName && 
                char.ExpeditionName === character.ExpeditionName &&
                char.CharacterName !== character.CharacterName
            );
            
            if (isExpeditionInUse) {
                console.log('Expedition conflict:', {
                    character: character.CharacterName,
                    expedition: character.ExpeditionName,
                    existing: allRaidChars
                        .filter(c => c.ExpeditionName === character.ExpeditionName)
                        .map(c => c.CharacterName)
                });
            }
            
            return isExpeditionInUse;
        },

        // Count support characters in a party
        countSupports(party) {
            return party.filter(char => this.isSupportClass(char.CharacterClassName)).length;
        },

        onDrop(event, toParty) {
            event.preventDefault();
            if (!this.draggedItem) return;

            const targetParty = toParty === 'party1' ? 'raidParty1' : 'raidParty2';
            const otherParty = toParty === 'party1' ? 'raidParty2' : 'raidParty1';
            const isSupport = this.isSupportClass(this.draggedItem.CharacterClassName);
            
            // Check if character from same expedition already in raid (check both parties)
            if (this.isExpeditionInRaid(this.draggedItem)) {
                alert('이미 해당 원정대의 캐릭터가 공격대에 있습니다.\n(1, 2파티 모두 같은 원정대는 1캐릭만 가능합니다)');
                return;
            }
            
            // If this is a move within the same party, allow it
            if ((toParty === 'party1' && this.draggedFromParty === 'party1') || 
                (toParty === 'party2' && this.draggedFromParty === 'party2')) {
                // Just reorder within the same party
                this.draggedItem = null;
                this.draggedFromParty = null;
                return;
            }

            // Check support count if adding a support
            if (isSupport && this.countSupports(this[targetParty]) >= 1) {
                alert('한 파티에는 서포터를 1명만 배치할 수 있습니다.');
                return;
            }

            // If party is full, don't add
            if (this[targetParty].length >= 4) {
                alert('파티는 최대 4명까지 배치할 수 있습니다.');
                return;
            }

            // Remove from source if it was in a party
            if (this.draggedFromParty === 'party1') {
                this.raidParty1 = this.raidParty1.filter(c => c.CharacterName !== this.draggedItem.CharacterName);
            } else if (this.draggedFromParty === 'party2') {
                this.raidParty2 = this.raidParty2.filter(c => c.CharacterName !== this.draggedItem.CharacterName);
            }

            // Add to target party
            this[targetParty].push(this.draggedItem);
            
            this.draggedItem = null;
            this.draggedFromParty = null;
        },

        removeFromParty(party, index) {
            if (party === 'party1') {
                this.raidParty1.splice(index, 1);
            } else if (party === 'party2') {
                this.raidParty2.splice(index, 1);
            }
        },

        resetRaid() {
            this.raidParty1 = [];
            this.raidParty2 = [];
        },

        autoFillParties() {
            this.resetRaid();
            
            // Filter characters that meet the minimum level requirement
            const eligibleChars = this.characters.filter(char => {
                const itemLevel = parseFloat((char.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0;
                return itemLevel >= this.minLevel;
            });
            
            if (eligibleChars.length === 0) {
                alert(`적어도 한 명의 캐릭터가 최소 레벨(${this.minLevel})을 충족해야 합니다.`);
                return;
            }
            
            // Shuffle the eligible characters for random assignment
            const shuffledChars = [...eligibleChars].sort(() => Math.random() - 0.5);
            
            // Track used expeditions across both parties
            const usedExpeditions = new Set();
            
            // First pass: Add one support to each party if available
            const supports = [];
            const seenExpeditions = new Set();
            
            // Get unique supports (one per expedition)
            for (const char of shuffledChars) {
                if (this.isSupportClass(char.CharacterClassName) && 
                    !seenExpeditions.has(char.ExpeditionName)) {
                    supports.push(char);
                    seenExpeditions.add(char.ExpeditionName);
                    if (supports.length >= 2) break; // We only need 2 supports max (one per party)
                }
            }
            
            // Add support to party 1 if available
            if (supports.length > 0) {
                this.raidParty1.push(supports[0]);
                usedExpeditions.add(supports[0].ExpeditionName);
                console.log('Added support to party 1:', supports[0].CharacterName, 'from expedition:', supports[0].ExpeditionName);
            }
            
            // Add support to party 2 if available (from different expedition)
            if (supports.length > 1 && supports[1].ExpeditionName !== supports[0]?.ExpeditionName) {
                this.raidParty2.push(supports[1]);
                usedExpeditions.add(supports[1].ExpeditionName);
                console.log('Added support to party 2:', supports[1].CharacterName, 'from expedition:', supports[1].ExpeditionName);
            }
            
            // Second pass: Get all DPS characters, one per expedition
            const allDps = [];
            const usedExpeditionsForDps = new Set([...usedExpeditions]); // Copy used expeditions from supports
            
            // Get one random DPS from each expedition (excluding already used expeditions)
            const expeditionMap = new Map();
            
            // Find one random DPS for each expedition
            for (const char of shuffledChars) {
                if (this.isSupportClass(char.CharacterClassName)) continue; // Skip supports
                if (usedExpeditionsForDps.has(char.ExpeditionName)) continue; // Skip used expeditions
                
                // Just take the first one we find for each expedition (since the list is shuffled)
                if (!expeditionMap.has(char.ExpeditionName)) {
                    expeditionMap.set(char.ExpeditionName, char);
                }
            }
            
            // Convert to array (already randomized)
            const randomDps = Array.from(expeditionMap.values());
            
            // Function to add character to a party if possible
            const addToParty = (char, party) => {
                // Check if party is full
                if (party.length >= 4) return false;
                
                // Check if expedition is already in any party
                const isExpeditionInUse = [...this.raidParty1, ...this.raidParty1, ...party]
                    .some(c => c.ExpeditionName === char.ExpeditionName);
                
                if (!isExpeditionInUse) {
                    party.push(char);
                    usedExpeditionsForDps.add(char.ExpeditionName);
                    console.log(`Added DPS ${char.CharacterName} (${char.ExpeditionName}) to party`);
                    return true;
                }
                return false;
            };
            
            // Distribute DPS randomly between parties
            for (const char of randomDps) {
                // Skip if this expedition is already in any party
                if (usedExpeditionsForDps.has(char.ExpeditionName)) continue;
                
                // Find the party with fewer members
                const party1Size = this.raidParty1.length;
                const party2Size = this.raidParty2.length;
                
                // Try to add to the smaller party first
                if (party1Size < party2Size) {
                    if (party1Size < 4) {
                        addToParty(char, this.raidParty1);
                        continue;
                    }
                }
                
                // If party1 is full or not the smaller one, try party2
                if (party2Size < 4) {
                    addToParty(char, this.raidParty2);
                } else if (party1Size < 4) {
                    // If party2 is full but party1 isn't, try party1
                    addToParty(char, this.raidParty1);
                }
            }
            
            // Then try to fill remaining slots with any available DPS
            // that don't violate expedition rules
            for (const char of randomDps) {
                // Skip if already in a party
                if (this.isCharacterInRaid(char)) continue;
                
                // Skip if expedition is already in any party
                const isExpeditionInUse = [...this.raidParty1, ...this.raidParty2]
                    .some(c => c.ExpeditionName === char.ExpeditionName);
                
                if (isExpeditionInUse) continue;
                
                // Try to add to party 1 first if not full
                if (this.raidParty1.length < 4) {
                    this.raidParty1.push(char);
                    console.log(`Added remaining DPS ${char.CharacterName} (${char.ExpeditionName}) to party 1`);
                } 
                // Then try party 2 if party 1 is full
                else if (this.raidParty2.length < 4) {
                    this.raidParty2.push(char);
                    console.log(`Added remaining DPS ${char.CharacterName} (${char.ExpeditionName}) to party 2`);
                }
                
                // Stop if both parties are full
                if (this.raidParty1.length >= 4 && this.raidParty2.length >= 4) {
                    break;
                }
            }
            
            // If we have any remaining DPS that couldn't be added (due to expedition conflicts)
            // try to add them to any available slot, even if it means having multiple from same expedition
            const remainingDps = sortedChars.filter(char => 
                !this.isSupportClass(char.CharacterClassName) &&
                !this.isExpeditionInRaid(char) &&
                !this.isCharacterInRaid(char)
            );
            
            for (const char of remainingDps) {
                if (this.raidParty1.length < 4) {
                    this.raidParty1.push(char);
                } else if (this.raidParty2.length < 4) {
                    this.raidParty2.push(char);
                }
            }
            
            // If we didn't get enough supports, try to balance the parties
            if (this.raidParty1.length > 0 && this.raidParty2.length > 0) {
                const p1Supports = this.countSupports(this.raidParty1);
                const p2Supports = this.countSupports(this.raidParty2);
                
                // If one party has no support and the other has two, move one over
                if (p1Supports === 0 && p2Supports === 2) {
                    const supportIndex = this.raidParty2.findIndex(c => this.isSupportClass(c.CharacterClassName));
                    if (supportIndex !== -1 && this.raidParty1.length < 4) {
                        const [support] = this.raidParty2.splice(supportIndex, 1);
                        this.raidParty1.push(support);
                    }
                } else if (p1Supports === 2 && p2Supports === 0) {
                    const supportIndex = this.raidParty1.findIndex(c => this.isSupportClass(c.CharacterClassName));
                    if (supportIndex !== -1 && this.raidParty2.length < 4) {
                        const [support] = this.raidParty1.splice(supportIndex, 1);
                        this.raidParty2.push(support);
                    }
                }
            }
        },

        saveRaidSetup() {
            const raidSetup = {
                party1: this.raidParty1.map(c => c.CharacterName),
                party2: this.raidParty2.map(c => c.CharacterName),
                timestamp: new Date().toISOString()
            };
            
            // Save to localStorage
            localStorage.setItem('raidSetup', JSON.stringify(raidSetup));
            alert('공격대 구성이 저장되었습니다!');
        },

        loadRaidSetup() {
            const saved = localStorage.getItem('raidSetup');
            if (saved) {
                try {
                    const raidSetup = JSON.parse(saved);
                    this.raidParty1 = this.characters.filter(c => 
                        raidSetup.party1.includes(c.CharacterName)
                    );
                    this.raidParty2 = this.characters.filter(c => 
                        raidSetup.party2.includes(c.CharacterName)
                    );
                } catch (e) {
                    console.error('Failed to load raid setup:', e);
                }
            }
        },
        getLimitedExpeditions() {
            // Return first 8 expeditions
            return Object.fromEntries(
                Object.entries(this.expeditions).slice(0, 8)
            );
        },
        getTopCharacters(characters) {
            // Sort by level in descending order and take top 6
            return [...characters]
                .sort((a, b) => {
                    const levelA = parseInt((a.ItemAvgLevel || '0').replace(/,/g, '').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                    const levelB = parseInt((b.ItemAvgLevel || '0').replace(/,/g, '').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                    return levelB - levelA;
                })
                .slice(0, 6);
        },
        async fetchCharacter(index) {
            const characterName = this.characterInputs[index]?.trim();
            if (!characterName) return;

            this.loading = true;
            
            try {
                const existingChar = this.characters.find(c => c.CharacterName === characterName);
                if (existingChar) {
                    alert('이미 추가된 캐릭터입니다.');
                    return;
                }
            
                const response = await axios.get(
                    `${LOSTARK_API_CONFIG.BASE_URL}/characters/${encodeURIComponent(characterName)}/siblings`,
                    { headers: getLostArkHeaders() }
                );
                
                if (response.data && Array.isArray(response.data)) {
                    const expeditionName = `원정대 ${index + 1}`; // Create expedition name based on input index
                    this.inputToExpedition[index] = expeditionName;
                    
                    if (!this.expeditions[expeditionName]) {
                        this.$set(this.expeditions, expeditionName, []);
                    } else {
                        // Clear existing characters from this expedition
                        this.expeditions[expeditionName] = [];
                    }
                    
                    // Process and sort characters by level
                    const sortedChars = response.data
                        .map(char => {
                            const normalized = this._normalizeProfile(char);
                            // Set expedition name for each character
                            if (normalized) {
                                normalized.ExpeditionName = expeditionName;
                            }
                            return normalized;
                        })
                        .filter(Boolean)
                        .sort((a, b) => {
                            const levelA = parseInt((a.ItemAvgLevel || '0').replace(/,/g, '').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                            const levelB = parseInt((b.ItemAvgLevel || '0').replace(/,/g, '').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                            return levelB - levelA;
                        })
                        .slice(0, 6); // Keep only top 6 characters
                    
                    // Remove existing characters from this expedition
                    this.characters = this.characters.filter(c => 
                        !sortedChars.some(sc => sc.CharacterName === c.CharacterName)
                    );
                    
                    // Add the top 6 characters
                    this.characters.push(...sortedChars);
                    this.expeditions[expeditionName] = [...sortedChars];
                    
                    // Sort characters in this expedition
                    this.expeditions[expeditionName].sort((a, b) => {
                        const levelA = parseInt((a.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                        const levelB = parseInt((b.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                        return levelB - levelA;
                    });
                    
                    //this.characterInputs[index] = '';
                    this.saveToLocalStorage();
                }
            } catch (error) {
                console.error('Error fetching character:', error);
                alert('캐릭터 정보를 가져오는 중 오류가 발생했습니다.');
            } finally {
                this.loading = false;
            }
        },
        
        async fetchAllCharacters() {
            this.loading = true;
            try {
                // Store existing characters that aren't in the current inputs
                const existingCharacters = new Map();
                this.characters.forEach(char => {
                    existingCharacters.set(char.CharacterName, char);
                });
                
                // Clear existing data
                this.characters = [];
                this.expeditions = {};
                this.inputToExpedition = {};
                
                // Process each input
                const fetchPromises = [];
                
                for (let i = 0; i < this.characterInputs.length; i++) {
                    const charName = this.characterInputs[i]?.trim();
                    if (charName) {
                        // Check if we already have this character's data
                        const existingChar = existingCharacters.get(charName);
                        if (existingChar) {
                            const expeditionName = `원정대 ${i + 1}`;
                            this.inputToExpedition[i] = expeditionName;
                            
                            if (!this.expeditions[expeditionName]) {
                                this.expeditions[expeditionName] = [];
                            }
                            
                            this.characters.push(existingChar);
                            this.expeditions[expeditionName].push(existingChar);
                        } else {
                            // Only fetch if we don't have the data
                            fetchPromises.push(this.fetchCharacter(i));
                        }
                    }
                }
                
                // Fetch any characters we don't have data for
                await Promise.all(fetchPromises);
                
                // Sort characters in each expedition
                Object.values(this.expeditions).forEach(expedition => {
                    expedition.sort((a, b) => {
                        const levelA = parseInt((a.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                        const levelB = parseInt((b.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                        return levelB - levelA;
                    });
                });
                
                this.saveToLocalStorage();
            } catch (error) {
                console.error('Error fetching all characters:', error);
                alert('캐릭터 정보를 가져오는 중 오류가 발생했습니다.');
            } finally {
                this.loading = false;
            }
        },
        
        removeCharacter(characterName) {
            // Remove from characters
            this.characters = this.characters.filter(c => c.CharacterName !== characterName);
            
            // Remove from expeditions
            for (const [expeditionName, chars] of Object.entries(this.expeditions)) {
                this.expeditions[expeditionName] = chars.filter(c => c.CharacterName !== characterName);
                
                // Remove empty expeditions
                if (this.expeditions[expeditionName].length === 0) {
                    delete this.expeditions[expeditionName];
                }
            }
            
            this.saveToLocalStorage();
        },
        
        async fetchCharacters() {
            if (this.loading) return;
            
            this.loading = true;
            try {
                // Get all non-empty inputs
                const inputs = this.characterInputs.filter(input => input?.trim());
                if (inputs.length === 0) {
                    return;
                }
                
                // Clear existing characters
                this.characters = [];
                
                // Fetch all characters in parallel
                const promises = inputs.map((characterName, index) => 
                    this.fetchCharacter(characterName, index)
                );
                
                await Promise.all(promises);
                this.saveToLocalStorage();
            } catch (error) {
                console.error('Error fetching characters:', error);
                alert('캐릭터 정보를 가져오는 중 오류가 발생했습니다.');
            } finally {
                this.loading = false;
            }
        },
        
        generateRaid() {
            const validChars = this.characters.filter(c => this.isValidCharacter(c));
            
            // Clear existing parties
            this.raidParty1 = [];
            this.raidParty2 = [];
            
            // Separate supports and DPS
            const supports = validChars.filter(c => this.isSupport(c));
            const dps = validChars.filter(c => !this.isSupport(c));
            
            // Distribute supports first
            supports.forEach((support, index) => {
                if (index % 2 === 0) {
                    this.raidParty1.push(support);
                } else {
                    this.raidParty2.push(support);
                }
            });
            
            // Distribute DPS
            dps.forEach((char) => {
                if (this.raidParty1.length <= this.raidParty2.length) {
                    this.raidParty1.push(char);
                } else {
                    this.raidParty2.push(char);
                }
            });
        },
        
        autoFillPartiesByLevel() {
            this.resetRaid();
            
            // Filter characters that meet the minimum level requirement
            const eligibleChars = this.characters
                .filter(char => {
                    const itemLevel = parseFloat((char.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0;
                    return itemLevel >= this.minLevel;
                })
                .sort((a, b) => {
                    // Sort by level in descending order (highest first)
                    const levelA = parseFloat((a.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0;
                    const levelB = parseFloat((b.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0;
                    return levelB - levelA;
                });
            
            if (eligibleChars.length === 0) {
                alert(`적어도 한 명의 캐릭터가 최소 레벨(${this.minLevel})을 충족해야 합니다.`);
                return;
            }
            
            // Track used expeditions across both parties
            const usedExpeditions = new Set();
            
            // First pass: Add one support to each party if available
            const supports = [];
            
            // Find all supports from different expeditions
            const supportExpeditions = new Set();
            for (const char of eligibleChars) {
                if (this.isSupportClass(char.CharacterClassName)) {
                    const level = parseFloat((char.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0;
                    supports.push({...char, level});
                    supportExpeditions.add(char.ExpeditionName);
                }
            }
            
            // Sort supports by level (highest first)
            supports.sort((a, b) => b.level - a.level);
            
            // Add highest level support to party 1
            if (supports.length > 0) {
                const support1 = supports[0];
                this.raidParty1.push(support1);
                usedExpeditions.add(support1.ExpeditionName);
                console.log('Added support to party 1:', support1.CharacterName, 'from expedition:', support1.ExpeditionName);
                
                // Find lowest level support from a different expedition for party 2
                if (supports.length > 1) {
                    const support2 = supports
                        .slice(1)
                        .sort((a, b) => a.level - b.level) // Sort by level ascending
                        .find(s => s.ExpeditionName !== support1.ExpeditionName);
                    
                    if (support2) {
                        this.raidParty2.push(support2);
                        usedExpeditions.add(support2.ExpeditionName);
                        console.log('Added support to party 2:', support2.CharacterName, 'from expedition:', support2.ExpeditionName);
                    }
                }
            }
            
            // First, group all characters by expedition and sort them by level
            const expeditionGroups = new Map();
            const usedExpeditionsForDps = new Set([...usedExpeditions]);
            
            // Group characters by expedition and sort them by level (highest first)
            for (const char of eligibleChars) {
                if (this.isSupportClass(char.CharacterClassName)) continue;
                if (usedExpeditionsForDps.has(char.ExpeditionName)) continue;
                
                if (!expeditionGroups.has(char.ExpeditionName)) {
                    expeditionGroups.set(char.ExpeditionName, []);
                }
                expeditionGroups.get(char.ExpeditionName).push(char);
            }
            
            // Sort characters within each expedition by level (highest first)
            for (const [expedition, chars] of expeditionGroups.entries()) {
                expeditionGroups.set(expedition, chars.sort((a, b) => {
                    const levelA = parseFloat((a.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0;
                    const levelB = parseFloat((b.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0;
                    return levelB - levelA; // Sort descending (highest first)
                }));
            }
            
            // Create a list of expeditions with their highest level character
            const expeditions = Array.from(expeditionGroups.entries())
                .map(([expedition, chars]) => ({
                    expedition,
                    highestChar: chars[0],
                    lowestChar: [...chars].pop(), // Get the lowest level character
                    highestLevel: parseFloat((chars[0]?.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0,
                    lowestLevel: parseFloat(([...chars].pop()?.ItemAvgLevel || '0').toString().replace(/,/g, '')) || 0
                }));
            
            // Calculate how many DPS we need in each party
            const totalDpsNeeded = 8 - (this.raidParty1.length + this.raidParty2.length);
            const dpsPerParty = Math.ceil(totalDpsNeeded / 2);
            
            // Shuffle expeditions randomly first
            const shuffledExpeditions = [...expeditions].sort(() => Math.random() - 0.5);
            
            // Then sort by level within the shuffled list
            const sortedExpeditions = [...shuffledExpeditions].sort((a, b) => b.highestLevel - a.highestLevel);
            
            // Assign DPS characters to parties
            const party1Dps = [];
            const party2Dps = [];
            const assignedExpeditions = new Set();
            
            // First, assign to party 1 and 2 in a round-robin fashion
            for (let i = 0; i < sortedExpeditions.length; i++) {
                const { expedition, highestChar, lowestChar } = sortedExpeditions[i];
                
                if (assignedExpeditions.has(expedition)) continue;
                
                // Randomly decide which party to add to (if both have space)
                const shouldAddToParty1 = party1Dps.length < dpsPerParty && 
                    (party2Dps.length >= dpsPerParty || Math.random() > 0.5);
                
                if (shouldAddToParty1 && party1Dps.length < dpsPerParty) {
                    party1Dps.push(highestChar);
                    assignedExpeditions.add(expedition);
                } else if (party2Dps.length < dpsPerParty) {
                    party2Dps.push(lowestChar);
                    assignedExpeditions.add(expedition);
                }
                // If we've assigned all needed DPS, break early
                if (party1Dps.length + party2Dps.length >= totalDpsNeeded) break;
            }
            
            // If we still have DPS to assign (due to expedition conflicts), distribute remaining
            const remainingExpeditions = sortedExpeditions
                .filter(({ expedition }) => !assignedExpeditions.has(expedition))
                .sort((a, b) => a.lowestLevel - b.lowestLevel); // Sort remaining by lowest level
                
            for (const exp of remainingExpeditions) {
                if (!exp) continue;
                const { expedition, lowestChar } = exp;
                
                if (party1Dps.length < dpsPerParty) {
                    party1Dps.push(lowestChar);
                    assignedExpeditions.add(expedition);
                } else if (party2Dps.length < dpsPerParty) {
                    party2Dps.push(lowestChar);
                    assignedExpeditions.add(expedition);
                } else {
                    break;
                }
            }
            
            // Combine with supports, ensuring we don't exceed party size
            const supports1 = this.raidParty1.filter(c => this.isSupportClass(c.CharacterClassName));
            const supports2 = this.raidParty2.filter(c => this.isSupportClass(c.CharacterClassName));
            
            // Calculate available slots considering supports
            const maxDps1 = 4 - supports1.length;
            const maxDps2 = 4 - supports2.length;
            
            // Assign DPS to parties, respecting the max DPS slots and ensuring even distribution
            this.raidParty1 = [...supports1, ...party1Dps.slice(0, maxDps1)];
            this.raidParty2 = [...supports2, ...party2Dps.slice(0, maxDps2)];
            
            console.log('Party 1 (highest levels):', this.raidParty1.map(c => `${c.CharacterName} (${c.ItemAvgLevel})`));
            console.log('Party 2 (lowest levels):', this.raidParty2.map(c => `${c.CharacterName} (${c.ItemAvgLevel})`));
            return; // Exit early since we've handled the assignment
            
            // Function to add character to a party if possible
            const addToParty = (char, party) => {
                // Check if party is full
                if (party.length >= 4) return false;
                
                // Check if expedition is already in any party
                const isExpeditionInUse = [...this.raidParty1, ...this.raidParty2, ...party]
                    .some(c => c.ExpeditionName === char.ExpeditionName);
                
                if (!isExpeditionInUse) {
                    party.push(char);
                    usedExpeditionsForDps.add(char.ExpeditionName);
                    console.log(`Added DPS ${char.CharacterName} (${char.ExpeditionName}) to party`);
                    return true;
                }
                return false;
            };
            
            // First, assign highest level DPS to party 1 until full or no more unique expeditions
            for (let i = 0; i < dpsList.length; i++) {
                const char = dpsList[i];
                if (this.raidParty1.length >= 4) break;
                if (!usedExpeditionsForDps.has(char.ExpeditionName)) {
                    addToParty(char, this.raidParty1);
                }
            }
            
            // Then, assign remaining DPS to party 2 in reverse order (lowest levels first)
            // but still respecting expedition uniqueness
            for (let i = dpsList.length - 1; i >= 0; i--) {
                const char = dpsList[i];
                if (this.raidParty2.length >= 4) break;
                if (!usedExpeditionsForDps.has(char.ExpeditionName)) {
                    addToParty(char, this.raidParty2);
                }
            }
            
            console.log('Party 1 (highest levels):', this.raidParty1.map(c => `${c.CharacterName} (${c.ItemAvgLevel})`));
            console.log('Party 2 (next highest levels):', this.raidParty2.map(c => `${c.CharacterName} (${c.ItemAvgLevel})`));
        },
        
        resetRaid() {
            this.raidParty1 = [];
            this.raidParty2 = [];
        },
        
        moveToParty1(char) {
            this.raidParty2 = this.raidParty2.filter(c => c.CharacterName !== char.CharacterName);
            if (!this.raidParty1.some(c => c.CharacterName === char.CharacterName)) {
                this.raidParty1.push(char);
            }
        },
        
        moveToParty2(char) {
            this.raidParty1 = this.raidParty1.filter(c => c.CharacterName !== char.CharacterName);
            if (!this.raidParty2.some(c => c.CharacterName === char.CharacterName)) {
                this.raidParty2.push(char);
            }
        },
        
        isSupport(character) {
            return this.supportClasses.includes(character.CharacterClassName);
        },
        
        isValidCharacter(character) {
            const level = parseInt(character.ItemAvgLevel) || 0;
            return level >= this.minLevel;
        },
        
        countDps(party) {
            return party.filter(c => !this.isSupport(c)).length;
        },
        
        getClassTypeClass(className) {
            return `class-${className?.toLowerCase().replace(/\s+/g, '-')}`;
        },
        
        saveToLocalStorage() {
            try {
                // Only save non-empty inputs
                const savedInputs = this.characterInputs.map(input => input?.trim() || '');
                
                // Prepare expedition data for saving and update characters with their expedition names
                const expeditionData = {};
                const characterExpeditionMap = new Map();
                
                // Build expedition data and map characters to their expeditions
                Object.entries(this.expeditions).forEach(([expName, chars]) => {
                    // Save expedition data
                    expeditionData[expName] = chars.map(char => ({
                        CharacterName: char.CharacterName,
                        CharacterClassName: char.CharacterClassName,
                        ItemAvgLevel: char.ItemAvgLevel,
                        ServerName: char.ServerName,
                        ExpeditionName: expName // Include expedition name in character data
                    }));
                    
                    // Map each character to its expedition
                    chars.forEach(char => {
                        characterExpeditionMap.set(char.CharacterName, expName);
                    });
                });
                
                // Update characters with their expedition names
                const updatedCharacters = this.characters.map(char => ({
                    ...char,
                    ExpeditionName: characterExpeditionMap.get(char.CharacterName) || char.ExpeditionName || ''
                }));
                
                const data = {
                    version: 2,
                    characters: updatedCharacters, // Use the updated characters with ExpeditionName
                    characterInputs: savedInputs,
                    minLevel: this.minLevel,
                    raidParty1: this.raidParty1,
                    raidParty2: this.raidParty2,
                    expeditions: expeditionData,
                    inputToExpedition: this.inputToExpedition,
                    lastUpdated: new Date().toISOString()
                };
                
                localStorage.setItem('partyCreationData', JSON.stringify(data));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        },
        
        async fetchExpedition(index) {
            const characterName = this.characterInputs[index]?.trim();
            if (!characterName) return;
            
            try {
                const response = await axios.get(
                    `${LOSTARK_API_CONFIG.BASE_URL}/characters/${encodeURIComponent(characterName)}/siblings`,
                    { headers: getLostArkHeaders() }
                );
                
                if (response.data && Array.isArray(response.data)) {
                    // Sort characters by level (highest first) and take only top 6
                    const topCharacters = response.data
                        .filter(char => char.CharacterName) // Filter out invalid characters
                        .map(char => this._normalizeProfile(char))
                        .sort((a, b) => {
                            // Convert "1,755.00" to 1755 for comparison
                            const parseLevel = (level) => {
                                if (!level) return 0;
                                // Remove commas and convert to float, then round to nearest integer
                                return Math.round(parseFloat(level.toString().replace(/,/g, '')) || 0);
                            };
                            
                            const levelA = parseLevel(a.ItemAvgLevel);
                            const levelB = parseLevel(b.ItemAvgLevel);
                            return levelB - levelA; // Sort descending
                        })
                        .slice(0, 6); // Take only top 6 characters
                    
                    // Create a single expedition group with top 6 characters
                    const expeditionGroups = [topCharacters];
                    
                    // Process each expedition group
                    expeditionGroups.forEach((group, groupIndex) => {
                        const expeditionName = `원정대 ${index + 1}`;
                        
                        // Initialize expedition array if it doesn't exist
                        if (!this.expeditions[expeditionName]) {
                            this.$set(this.expeditions, expeditionName, []);
                        }
                        
                        // Add characters to expedition
                        group.forEach(character => {
                            const exists = this.expeditions[expeditionName].some(
                                c => c.CharacterName === character.CharacterName
                            );
                            
                            if (!exists) {
                                // Add expedition name to character data
                                const characterWithExpedition = {
                                    ...character,
                                    ExpeditionName: expeditionName
                                };
                                this.expeditions[expeditionName].push(characterWithExpedition);
                                this.characters.push(characterWithExpedition);
                                this.inputToExpedition[index] = expeditionName;
                            }
                        });
                    });
                    
                    this.saveToLocalStorage();
                } else if (response.data && response.data.CharacterName) {
                    // Fallback for single character response
                    const character = this._normalizeProfile(response.data);
                    const expeditionName = `원정대 ${index + 1}`;
                    
                    if (!this.expeditions[expeditionName]) {
                        this.$set(this.expeditions, expeditionName, []);
                    }
                    
                    const exists = this.expeditions[expeditionName].some(
                        c => c.CharacterName === character.CharacterName
                    );
                    
                    if (!exists) {
                        // Add expedition name to character data for single character response
                        const characterWithExpedition = {
                            ...character,
                            ExpeditionName: expeditionName
                        };
                        this.expeditions[expeditionName].push(characterWithExpedition);
                        this.characters.push(characterWithExpedition);
                        this.inputToExpedition[index] = expeditionName;
                    }
                    
                    this.saveToLocalStorage();
                }
            } catch (error) {
                console.error(`Error fetching expedition for ${characterName}:`, error);
                throw error;
            }
        },
        
        async fetchAllExpeditions() {
            if (this.loading) return;
            
            this.loading = true;
            try {
                // Get all non-empty inputs
                const inputs = this.characterInputs
                    .map(input => input?.trim())
                    .filter(Boolean);
                
                if (inputs.length === 0) {
                    alert('조회할 캐릭터명을 입력해주세요.');
                    return;
                }
                
                // Clear existing expeditions
                this.expeditions = {};
                this.characters = [];
                
                // Fetch all expeditions in parallel
                const fetchPromises = inputs.map((_, index) => this.fetchExpedition(index));
                await Promise.all(fetchPromises);
                
                this.saveToLocalStorage();
                
            } catch (error) {
                console.error('Error fetching all expeditions:', error);
                alert('원정대 정보를 가져오는 중 오류가 발생했습니다.');
            } finally {
                this.loading = false;
            }
        },
        
        _normalizeProfile(profile) {
            if (!profile) return null;
            
            return {
                CharacterName: profile.CharacterName || '',
                CharacterClassName: profile.CharacterClassName || '',
                ItemAvgLevel: profile.ItemAvgLevel || '0',
                ServerName: profile.ServerName || '',
                ItemMaxLevel: profile.ItemMaxLevel || '0',
                ExpeditionLevel: profile.ExpeditionLevel || 0,
                Title: profile.Title || '',
                GuildName: profile.GuildName || '',
                PvpGradeName: profile.PvpGradeName || '',
                TownLevel: profile.TownLevel || null,
                TownName: profile.TownName || '',
                // Add any other fields you need to normalize
                ...profile // Spread the rest of the properties
            };
        },
        
        isInRaid(character) {
            if (!character) return false;
            const charName = character.CharacterName;
            return [
                ...(this.raidParty1 || []),
                ...(this.raidParty2 || [])
            ].some(char => char.CharacterName === charName);
        },
        
        loadFromLocalStorage() {
            const savedData = localStorage.getItem('partyCreationData');
            if (!savedData) return;
            
            try {
                const data = JSON.parse(savedData);
                
                // Load basic data
                this.characters = data.characters || [];
                this.characterInputs = data.characterInputs || Array(8).fill('');
                this.minLevel = data.minLevel || 1;
                this.raidParty1 = data.raidParty1 || [];
                this.raidParty2 = data.raidParty2 || [];
                this.inputToExpedition = data.inputToExpedition || {};
                
                // Rebuild expeditions
                const expeditions = {};
                const characterMap = new Map(this.characters.map(c => [c.CharacterName, c]));
                
                // Restore from saved expedition data if available
                if (data.expeditions) {
                    Object.entries(data.expeditions).forEach(([expName, chars]) => {
                        if (!expeditions[expName]) {
                            expeditions[expName] = [];
                        }
                        chars.forEach(charData => {
                            const char = characterMap.get(charData.CharacterName);
                            if (char) {
                                expeditions[expName].push(char);
                            }
                        });
                    });
                }
                
                this.expeditions = expeditions;
                
                // Sort characters in each expedition
                Object.values(this.expeditions).forEach(expedition => {
                    expedition.sort((a, b) => {
                        const levelA = parseInt((a.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                        const levelB = parseInt((b.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                        return levelB - levelA;
                    });
                });
                
                // Sort all characters by level
                this.characters.sort((a, b) => {
                    const levelA = parseInt((a.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                    const levelB = parseInt((b.ItemAvgLevel || '0').split('.')[0].replace(/\D/g, '') || '0', 10) || 0;
                    return levelB - levelA;
                });
                
            } catch (e) {
                console.error('Failed to load saved data:', e);
            }
        }
    },
    
    mounted() {
        this.loadFromLocalStorage();
    },
    
    beforeDestroy() {
        this.saveToLocalStorage();
    }
});

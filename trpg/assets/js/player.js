// Player 클래스 정의
class Player {
    constructor(name, job) {
      this.name = name;
      this.job = job;
      this.level = 1;
      this.exp = 0;
      this.gold = 50;
      this.inventory = [];
      this.days = 0;
      this.quests = [];
      this.skillsData = null;
      this.skillsLoaded = false;
      
      // 기본 스탯 설정
      this.stats = {
        strength: 10,    // 힘: 공격력에 영향
        agility: 10,     // 민첩: 회피율, 선공권에 영향
        vitality: 10,    // 체력: 최대 HP에 영향
        intelligence: 10, // 지능: 마법 공격력에 영향
        luck: 10         // 행운: 크리티컬, 드롭율에 영향
      };
      
      // 장비 슬롯 초기화
      this.equipment = {
        weapon: null,      // 무기
        armor: null,       // 방어구
        accessory1: null,  // 악세서리1
        accessory2: null   // 악세서리2
      };
      
      // 스킬 초기화
      this.skills = {
        active: [],  // 액티브 스킬
        passive: []  // 패시브 스킬
      };
      
      // 직업별 스탯 보정
      this.applyJobBonuses();
      
      // HP 계산
      this.maxHp = 80 + (this.stats.vitality * 2);
      this.hp = this.maxHp;
      
      // 스킬 데이터 로드 (비동기로 시작)
      this.loadSkillsData().catch(console.error);
    }
    
    applyJobBonuses() {
      switch(this.job) {
        case '전사':
          this.stats.strength += 3;
          this.stats.vitality += 2;
          break;
        case '도적':
          this.stats.agility += 4;
          this.stats.luck += 1;
          break;
        case '마법사':
          this.stats.intelligence += 4;
          this.stats.agility += 1;
          break;
      }
    }
    
    // 스킬 데이터 로드
    async loadSkillsData() {
      try {
        // 스킬 데이터를 가져옵니다.
        const response = await fetch('assets/data/skills.json');
        if (!response.ok) {
          throw new Error('스킬 데이터를 불러오는데 실패했습니다.');
        }
        this.skillsData = await response.json();
        
        // 직업별 스킬 초기화
        this.initializeSkills();
        this.skillsLoaded = true;
        
        // 스킬 로드 완료 이벤트 발생
        const event = new CustomEvent('skillsLoaded', { detail: { skills: this.skills } });
        document.dispatchEvent(event);
        
        // UI 업데이트
        if (window.ui && window.ui.updateSkillsUI) {
          window.ui.updateSkillsUI(this.skills);
        }
        
        this.onSkillsLoaded();
      } catch (error) {
        console.error('스킬 데이터 로드 오류:', error);
        // 기본 스킬로 초기화
        this.initializeDefaultSkills();
        this.skillsLoaded = true;
        
        // 기본 스킬 로드 시에도 UI 업데이트
        if (window.ui && window.ui.updateSkillsUI) {
          window.ui.updateSkillsUI(this.skills);
        }
      }
      return this.skills;
    }
    
    // 기본 스킬 초기화 (로드 실패 시 사용)
    initializeDefaultSkills() {
      const defaultSkills = {
        warrior: {
          active: ['warrior_power_strike'],
          passive: ['warrior_iron_will']
        },
        thief: {
          active: ['thief_double_attack'],
          passive: ['thief_evasion']
        },
        mage: {
          active: ['mage_fireball'],
          passive: ['mage_arcane_intellect']
        }
      };
      
      // 직업별 기본 스킬 할당
      const jobMap = {
        '전사': 'warrior',
        '도적': 'thief',
        '마법사': 'mage'
      };
      
      const jobKey = jobMap[this.job] || 'warrior';
      const jobSkills = defaultSkills[jobKey];
      
      // 스킬 데이터가 없을 경우 기본 스킬 생성
      if (!this.skillsData) {
        this.skills = {
          active: jobSkills.active.map(id => ({
            id,
            name: id.split('_').slice(1).join(' '),
            level: 1,
            description: '기본 스킬',
            cooldown: 3,
            icon: '✨'
          })),
          passive: jobSkills.passive.map(id => ({
            id: id,
            name: id.split('_').slice(1).join(' '),
            level: 1,
            description: '기본 패시브 스킬',
            icon: '🌟'
          }))
        };
        return;
      }
      
      // 스킬 데이터에서 스킬 로드
      this.initializeSkills();
    };
    
    // 스킬 로드 완료 시 호출될 콜백
    onSkillsLoaded() {
      // 스킬 로드 완료 시 필요한 추가 처리를 여기에 작성
      console.log(`${this.name}의 스킬이 로드되었습니다.`);
      // UI 업데이트나 다른 초기화 코드를 여기에 추가
    }
    
    // 직업별 스킬 초기화
    initializeSkills() {
      if (!this.skillsData) {
        this.initializeDefaultSkills();
        return;
      }
      
      // 직업별 스킬 매핑
      const jobSkillMap = {
        '전사': ['warrior_'],
        '도적': ['thief_'],
        '마법사': ['mage_'],
        '힐러': ['healer_'],
        '궁수': ['archer_']
      };
      
      // 직업에 해당하는 스킬 접두사 가져오기
      const skillPrefixes = jobSkillMap[this.job] || [];
      
      // 직업에 맞는 스킬 필터링
      const filteredSkills = this.skillsData.filter(skill => 
        skillPrefixes.some(prefix => skill.id.startsWith(prefix))
      );
      
      // 액티브/패시브 스킬 분류
      this.skills = {
        active: filteredSkills.filter(skill => skill.type === 'active'),
        passive: filteredSkills.filter(skill => skill.type === 'passive')
      };
      
      // 패시브 스킬 적용
      this.applyPassiveSkills();
    }
    
    // 패시브 스킬 효과 적용
    applyPassiveSkills() {
      this.skills.passive.forEach(skill => {
        if (skill.effect) {
          this.applyPassiveEffect(skill);
        }
      });
    }
    
    // 개별 패시브 스킬 효과 적용
    applyPassiveEffect(skill) {
      switch (skill.id) {
        case 'warrior_iron_will':
          this.maxHp = Math.floor(this.maxHp * 1.2);
          this.hp = Math.min(this.hp, this.maxHp);
          break;
        case 'mage_arcane_intellect':
          this.stats.intelligence += 10;
          break;
        case 'thief_evasion':
        case 'archer_evasion':
          // 회피율은 전투 중에 계산됨
          break;
        case 'archer_sharpshooter':
          // 치명타 확률과 피해는 전투 중에 계산됨
          break;
      }
    }
    
    heal(amount) {
      this.hp = Math.min(this.hp + amount, this.maxHp);
    }
    
    damage(amount) {
      this.hp = Math.max(this.hp - amount, 0);
    }
    
    gainExp(amount) {
      this.exp += amount;
      const expNeeded = this.level * 50;
      
      if (this.exp >= expNeeded) {
        this.levelUp();
        // 남은 경험치 처리
        const remainingExp = this.exp - expNeeded;
        this.exp = 0;
        if (remainingExp > 0) {
          this.gainExp(remainingExp); // 재귀적으로 처리
        }
      }
    }
    
    levelUp() {
      this.level++;
      // 기본 스탯 증가
      this.stats.strength += 1;
      this.stats.agility += 1;
      this.stats.vitality += 1;
      this.stats.intelligence += 1;
      this.stats.luck += 1;
      
      // 직업별 추가 보너스
      switch(this.job) {
        case '전사':
          this.stats.strength += 1;
          this.stats.vitality += 1;
          break;
        case '도적':
          this.stats.agility += 1;
          break;
        case '마법사':
          this.stats.intelligence += 1;
          break;
      }
      
      // 최대 HP 증가
      const oldMaxHp = this.maxHp;
      this.maxHp = 80 + (this.stats.vitality * 2);
      this.hp += (this.maxHp - oldMaxHp); // 최대 체력 증가량만큼 현재 체력도 회복
      
      if (window.UI) {
        UI.showNotification(`🎉 ${this.name}이(가) 레벨 ${this.level}로 성장했습니다!`);
        this.showLevelUpStats();
      }
    }
    
    showLevelUpStats() {
      const statsText = `\n[스탯 증가]\n` +
        `힘: +1\n` +
        `민첩: +1\n` +
        `체력: +1\n` +
        `지능: +1\n` +
        `행운: +1\n` +
        `(직업 보너스 포함)`;
      
      if (window.UI) {
        UI.showNotification(statsText, 'info', 5000);
      }
    }
    
    // 아이템 추가
    addItem(item) {
      // 아이템이 객체가 아닌 경우 기본 형식으로 변환
      const newItem = typeof item === 'string' ? { 
        id: item.toLowerCase().replace(/\s+/g, '_'),
        name: item,
        type: this.getItemType(item)
      } : item;
      
      // 기본 속성 추가
      if (!newItem.type) newItem.type = 'item';
      
      this.inventory.push(newItem);
      
      // UI 업데이트
      if (window.Tabs) {
        Tabs.updateEquipmentView();
      }
      
      return newItem;
    }
    
    // 아이템 타입 판별
    getItemType(itemName) {
      const itemTypes = {
        '검': 'weapon',
        '도끼': 'weapon',
        '지팡이': 'weapon',
        '활': 'weapon',
        '갑옷': 'armor',
        '로브': 'armor',
        '방패': 'armor',
        '반지': 'accessory',
        '목걸이': 'accessory',
        '물약': 'potion',
        '포션': 'potion',
        '스크롤': 'scroll',
        '퀘스트': 'quest',
        '열쇠': 'key'
      };
      
      for (const [key, type] of Object.entries(itemTypes)) {
        if (itemName.includes(key)) {
          return type;
        }
      }
      
      return 'material';
    }
    
    // 아이템 장착
    equipItem(item) {
      if (!item || !item.type) return false;
      
      let slot = '';
      
      // 아이템 타입에 따른 슬롯 결정
      switch(item.type) {
        case 'weapon':
          slot = 'weapon';
          break;
        case 'armor':
          slot = 'armor';
          break;
        case 'accessory':
          // 빈 악세서리 슬롯 찾기
          slot = this.equipment.accessory1 ? 'accessory2' : 'accessory1';
          break;
        default:
          return false; // 장착 불가능한 아이템
      }
      
      // 기존 장비 해제 (있을 경우)
      const oldItem = this.unequipItem(slot);
      
      // 새 아이템 장착
      this.equipment[slot] = item;
      
      // 인벤토리에서 제거
      const itemIndex = this.inventory.findIndex(i => i === item);
      if (itemIndex !== -1) {
        this.inventory.splice(itemIndex, 1);
      }
      
      // 스탯 적용
      if (item.stats) {
        Object.entries(item.stats).forEach(([stat, value]) => {
          if (this.stats[stat] !== undefined) {
            this.stats[stat] += value;
          }
        });
      }
      
      // UI 업데이트
      if (window.Tabs) {
        Tabs.updateEquipmentView();
      }
      
      return true;
    }
    
    // 아이템 장착 해제
    unequipItem(slot) {
      const item = this.equipment[slot];
      if (!item) return null;
      
      // 스탯 제거
      if (item.stats) {
        Object.entries(item.stats).forEach(([stat, value]) => {
          if (this.stats[stat] !== undefined) {
            this.stats[stat] -= value;
          }
        });
      }
      
      // 인벤토리에 추가
      this.inventory.push(item);
      
      // 장비 슬롯 비우기
      this.equipment[slot] = null;
      
      // UI 업데이트
      if (window.Tabs) {
        Tabs.updateEquipmentView();
      }
      
      return item;
    }
    
    spendGold(amount) {
      if (this.gold >= amount) {
        this.gold -= amount;
        return true;
      }
      return false;
    }
    
    nextDay() {
      this.days++;
      if (document.getElementById("gameDay")) {
        document.getElementById("gameDay").textContent = `지나간 날: ${this.days}일째`;
      }
    }
  }
  
  // 전역에서 접근 가능하도록 설정
  if (typeof window !== 'undefined') {
    window.Player = Player;
  }
  
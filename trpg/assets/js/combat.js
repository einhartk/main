// Combat module with UI injection
const Combat = (() => {
  let UI;
  
  return {
  // Initialize the combat module with UI
  init: function(ui) {
    UI = ui;
  },
  
    currentEnemy: null,
    isPlayerTurn: true,
    combatLog: [],
    
    async start(player, enemyData) {
      // Validate enemy data
      if (!enemyData || typeof enemyData !== 'object') {
        console.error('Invalid enemy data:', enemyData);
        UI.updateEventLog('전투를 시작할 수 없습니다: 적 데이터가 유효하지 않습니다.');
        return;
      }

      // Set default values if missing
      this.currentEnemy = {
        name: enemyData.name || '알 수 없는 적',
        hp: Number(enemyData.hp) || 30,
        maxHp: Number(enemyData.hp) || 30,
        attack: Number(enemyData.attack) || 8,
        defense: Number(enemyData.defense) || 2,
        gold: Number(enemyData.gold) || 10,
        exp: Number(enemyData.exp) || 20,
        level: Number(enemyData.level) || 1,
        // Add agility and strength with default values if not provided
        agility: Number(enemyData.agility) || 10,
        strength: Number(enemyData.strength) || 10
      };
      
      this.isPlayerTurn = true;
      this.combatLog = [];
      
      // Clear previous combat UI
      const combatUI = document.getElementById('combatUI');
      if (combatUI) combatUI.remove();
      
      // Create combat UI
      this.createCombatUI();
      
      // Show initial message
      this.addToCombatLog(`🐺 ${this.currentEnemy.name}이(가) 나타났다!`, 'combat');
      
      // Update enemy display
      this.updateEnemyDisplay();
    },
    
    // Create combat UI elements
    createCombatUI: function() {
      const eventLog = document.getElementById('eventLog');
      
      // Create combat container
      const combatUI = document.createElement('div');
      combatUI.id = 'combatUI';
      combatUI.className = 'combat-ui';
      
      // Enemy display
      const enemyDisplay = document.createElement('div');
      enemyDisplay.id = 'enemyDisplay';
      enemyDisplay.className = 'enemy-display';
      
      // Combat log
      const combatLog = document.createElement('div');
      combatLog.id = 'combatLog';
      combatLog.className = 'combat-log';
      
      // Action buttons
      const actionButtons = document.createElement('div');
      actionButtons.className = 'combat-actions';
      
      const attackBtn = document.createElement('button');
      attackBtn.textContent = '⚔️ 공격하기';
      attackBtn.onclick = () => this.playerAttack();
      
      const skillBtn = document.createElement('button');
      skillBtn.textContent = '✨ 스킬 사용';
      skillBtn.onclick = () => this.useSkill();
      
      const itemBtn = document.createElement('button');
      itemBtn.textContent = '🎒 아이템 사용';
      itemBtn.onclick = () => this.useItem();
      
      const runBtn = document.createElement('button');
      runBtn.textContent = '🏃 도망가기';
      runBtn.onclick = () => this.attemptEscape();
      
      actionButtons.appendChild(attackBtn);
      actionButtons.appendChild(skillBtn);
      actionButtons.appendChild(itemBtn);
      actionButtons.appendChild(runBtn);
      
      combatUI.appendChild(enemyDisplay);
      combatUI.appendChild(combatLog);
      combatUI.appendChild(actionButtons);
      
      // Add to event log
      eventLog.appendChild(combatUI);
      
      // Add some styles
      const style = document.createElement('style');
      style.textContent = `
        .combat-ui {
          margin: 15px 0;
          padding: 15px;
          background: #2c2c2c;
          border-radius: 8px;
          color: #fff;
        }
        .enemy-display {
          text-align: center;
          margin-bottom: 15px;
          padding: 10px;
          background: #3a3a3a;
          border-radius: 5px;
        }
        .combat-log {
          height: 150px;
          overflow-y: auto;
          margin-bottom: 15px;
          padding: 10px;
          background: #1a1a1a;
          border-radius: 5px;
          font-family: monospace;
        }
        .combat-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .combat-actions button {
          padding: 8px 15px;
          border: none;
          border-radius: 5px;
          background: #4a6bdf;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .combat-actions button:hover {
          background: #3a56c4;
          transform: translateY(-2px);
        }
        .combat-actions button:active {
          transform: translateY(1px);
        }
        .hp-bar {
          height: 20px;
          background: #4a4a4a;
          border-radius: 10px;
          margin: 5px 0;
          overflow: hidden;
        }
        .hp-fill {
          height: 100%;
          background: #e74c3c;
          transition: width 0.3s;
          text-align: right;
          padding-right: 5px;
          color: white;
          font-size: 12px;
          line-height: 20px;
        }
      `;
      document.head.appendChild(style);
    },
    
    // Update enemy display with HP bar
    updateEnemyDisplay: function() {
      const enemyDisplay = document.getElementById('enemyDisplay');
      if (!enemyDisplay) return;
      
      const hpPercent = (this.currentEnemy.hp / this.currentEnemy.maxHp) * 100;
      
      enemyDisplay.innerHTML = `
        <h3>${this.currentEnemy.name} (Lv.${this.currentEnemy.level})</h3>
        <div class="hp-bar">
          <div class="hp-fill" style="width: ${hpPercent}%">
            ${this.currentEnemy.hp}/${this.currentEnemy.maxHp}
          </div>
        </div>
      `;
    },
    
    // Add message to combat log
    addToCombatLog: function(message, type = 'info') {
      const combatLog = document.getElementById('combatLog');
      if (!combatLog) return;
      
      const messageElement = document.createElement('div');
      messageElement.className = `combat-message ${type}`;
      messageElement.textContent = message;
      
      combatLog.appendChild(messageElement);
      combatLog.scrollTop = combatLog.scrollHeight;
      
      // Also add to main event log for reference if UI is available
      if (UI && typeof UI.addLog === 'function') {
        UI.addLog(`[전투] ${message}`, 'combat');
      } else {
        console.log(`[전투] ${message}`);
      }
    },
    
    // Player attacks enemy
    playerAttack: async function() {
      if (!this.isPlayerTurn || !this.currentEnemy) return;
      
      this.isPlayerTurn = false;
      
      // Roll for attack (d20 + agility mod)
      const playerAgility = window.player.stats?.agility || 10;
      const playerStrength = window.player.stats?.strength || 10;
      const agilityMod = Math.max(0, Math.floor((playerAgility - 10) / 2));
      const attackRoll = Dice.roll(20) + agilityMod;
      
      // 적중 필요 수치: 10 + 적의 방어력 + (적의 민첩 보너스)
      const enemyAgility = this.currentEnemy.agility || 10;
      const enemyDodgeMod = Math.max(0, Math.floor((enemyAgility - 10) / 2));
      const attackNeeded = 10 + (this.currentEnemy.defense || 0) + enemyDodgeMod;
      
      this.addToCombatLog(`당신의 공격! (필요: ${attackNeeded}+)`);
      
      // Show dice roll
      const resultContainer = document.createElement('div');
      document.getElementById('combatLog').appendChild(resultContainer);
      
      const rollResult = await DiceUI.roll(resultContainer, {
        sides: 20,
        modifier: agilityMod,
        stat: agilityMod,
        statName: '민첩'
      });
      
      if (rollResult >= attackNeeded) {
        // Hit! Roll for damage (based on strength and weapon)
        const strengthMod = Math.max(0, Math.floor((playerStrength - 10) / 2));
        
        // 무기 데미지 (기본 1d6, 무기가 있으면 그에 맞는 주사위 사용)
        const weapon = window.player.equipment?.weapon;
        let damageDice = '1d6'; // 기본 주사위
        let damageBonus = 0;
        
        if (weapon) {
          damageDice = weapon.damage || '1d6';
          damageBonus = weapon.damageBonus || 0;
        }
        
        // 주사위 굴리기
        const [diceCount, diceSides] = damageDice.split('d').map(Number);
        let baseDamage = 0;
        
        // 다이스 굴리기 애니메이션
        const damageResultContainer = document.createElement('div');
        damageResultContainer.className = 'damage-roll';
        document.getElementById('combatLog').appendChild(damageResultContainer);
        
        // 데미지 주사위 애니메이션
        for (let i = 0; i < diceCount; i++) {
          const diceResult = Dice.roll(diceSides);
          baseDamage += diceResult;
          await DiceUI.roll(damageResultContainer, {
            sides: diceSides,
            result: diceResult,
            small: true,
            delay: i * 200  // 주사위가 순차적으로 보이도록 딜레이 추가
          });
          await new Promise(resolve => setTimeout(resolve, 100)); // 애니메이션을 위한 지연
        }
        
        // 최종 데미지 계산 (기본 데미지 + 힘 보정 + 무기 보너스)
        const totalDamage = Math.max(1, baseDamage + strengthMod + damageBonus);
        
        // 디버그 로그
        console.log(`공격 성공!`);
        console.log(`- 주사위: ${rollResult} (필요: ${attackNeeded})`);
        console.log(`- 민첩 보정: ${agilityMod}, 힘 보정: ${strengthMod}`);
        console.log(`- 무기: ${weapon?.name || '맨손'} (${damageDice}${damageBonus > 0 ? '+' + damageBonus : ''})`);
        console.log(`- 주사위 결과: ${baseDamage} + 힘(${strengthMod}) + 무기(${damageBonus}) = ${totalDamage} 데미지`);
        
        // 적 체력 감소
        this.currentEnemy.hp = Math.max(0, this.currentEnemy.hp - totalDamage);
        
        // 데미지 메시지 표시
        const damageText = weapon ? 
          `${weapon.name}으로 ${totalDamage} 피해를 입혔습니다!` : 
          `맨손 공격으로 ${totalDamage} 피해를 입혔습니다!`;
        
        this.addToCombatLog(`💥 ${damageText}`, 'damage');
        this.updateEnemyDisplay();
        
        // Check if enemy is defeated
        if (this.currentEnemy.hp <= 0) {
          this.defeatEnemy();
          return;
        }
      } else {
        this.addToCombatLog('공격이 빗나갔습니다!', 'miss');
      }
      
      // Enemy's turn
      await UI.sleep(1000);
      this.enemyTurn();
    },
    
    // Enemy's turn to attack
    enemyTurn: async function() {
      if (!this.currentEnemy || this.currentEnemy.hp <= 0) return;
      
      this.addToCombatLog(`[${this.currentEnemy.name}의 턴]`);
      
      // Simple enemy AI: 80% chance to attack, 20% chance to do something else
      if (Math.random() < 0.8) {
        // Enemy attacks (using enemy's agility for hit chance)
        const enemyAgilityMod = Math.floor((this.currentEnemy.agility || 10 - 10) / 2);
        const enemyAttack = Dice.roll(20) + enemyAgilityMod;
        const playerAC = 10 + Math.floor((window.player.agility - 10) / 2);
        
        if (enemyAttack >= playerAC) {
          // Hit! Roll damage (using enemy's strength for damage)
          const enemyStrengthMod = Math.floor((this.currentEnemy.strength || 10 - 10) / 2);
          const damage = Math.max(1, Dice.roll(6) + enemyStrengthMod);
          window.player.hp = Math.max(0, window.player.hp - damage);
          
          this.addToCombatLog(`💥 ${this.currentEnemy.name}이(가) 당신에게 ${damage} 피해를 입혔습니다!`, 'enemy-damage');
          UI.updatePlayerInfo(window.player);
          
          // Check if player is defeated
          if (window.player.hp <= 0) {
            this.addToCombatLog('💀 당신은 쓰러졌습니다...', 'defeat');
            UI.showNotification('패배했습니다... 여관에서 회복하세요.');
            this.endCombat(false);
            return;
          }
        } else {
          this.addToCombatLog(`${this.currentEnemy.name}의 공격을 피했습니다!`, 'dodge');
        }
      } else {
        // Enemy does something else (heal, buff, etc.)
        this.addToCombatLog(`${this.currentEnemy.name}이(가) 당신을 노려보고 있습니다...`, 'enemy-action');
      }
      
      // Player's turn again
      this.isPlayerTurn = true;
    },
    
    // Attempt to escape from combat
    attemptEscape: async function() {
      if (!this.isPlayerTurn) return;
      
      this.isPlayerTurn = false;
      this.addToCombatLog('도망을 시도합니다...');
      
      // Roll for escape (DC 10 + enemy level + enemy's agility mod)
      const enemyAgilityMod = Math.floor((this.currentEnemy.agility || 10 - 10) / 2);
      const escapeDC = 10 + this.currentEnemy.level + enemyAgilityMod;
      const agilityMod = Math.floor((window.player.agility - 10) / 2);
      
      // Show dice roll
      const resultContainer = document.createElement('div');
      document.getElementById('combatLog').appendChild(resultContainer);
      
      const rollResult = await DiceUI.roll(resultContainer, {
        sides: 20,
        modifier: agilityMod,
        stat: agilityMod,
        statName: '민첩'
      });
      
      if (rollResult >= escapeDC) {
        // Successful escape
        this.addToCombatLog('성공적으로 도망쳤습니다!', 'success');
        await UI.sleep(1000);
        this.endCombat(false); // End combat without rewards
      } else {
        // Failed escape
        this.addToCombatLog('도망치지 못했습니다!', 'fail');
        await UI.sleep(1000);
        this.enemyTurn(); // Enemy gets a free turn
      }
    },
    
    // Enemy is defeated
    defeatEnemy: async function() {
      const expGained = this.currentEnemy.exp;
      const goldGained = this.currentEnemy.gold;
      
      window.player.exp += expGained;
      window.player.gold += goldGained;
      
      this.addToCombatLog(`🎉 ${this.currentEnemy.name}을(를) 물리쳤습니다!`, 'victory');
      this.addToCombatLog(`경험치 ${expGained}와 ${goldGained}G를 획득했습니다!`, 'reward');
      
      // Check for level up
      if (window.player.exp >= window.player.expToNextLevel) {
        window.player.levelUp();
        this.addToCombatLog(`🎉 레벨 업! Lv.${window.player.level}이 되었습니다!`, 'level-up');
      }
      
      UI.updatePlayerInfo(window.player);
      await UI.sleep(2000);
      this.endCombat(true);
    },
    
    // End combat and clean up
    endCombat: function(victory) {
      const combatUI = document.getElementById('combatUI');
      if (combatUI) combatUI.remove();
      
      // Reset combat state
      this.currentEnemy = null;
      this.isPlayerTurn = true;
      this.combatLog = [];
      
      // Save game state
      saveGameState();
    },
    
    // Placeholder for skill usage
    useSkill: async function() {
      if (!this.isPlayerTurn) return;
      
      this.addToCombatLog('아직 사용 가능한 스킬이 없습니다.', 'info');
      // TODO: Implement skills
    },
    
    // Placeholder for item usage
    useItem: async function() {
      if (!this.isPlayerTurn) return;
      
      this.addToCombatLog('인벤토리를 열려면 인벤토리 버튼을 사용하세요.', 'info');
      // TODO: Implement item usage in combat
    }
  };
})();
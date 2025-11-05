const UI = {
    // 로그 관련 함수들
    addLog(message, type = 'info') {
      const logContainer = document.getElementById('logContainer');
      if (!logContainer) return;
      
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${type}`;
      
      const timeStamp = document.createElement('span');
      timeStamp.className = 'log-time';
      timeStamp.textContent = `[${new Date().toLocaleTimeString()}] `;
      
      const logContent = document.createElement('span');
      logContent.className = 'log-content';
      logContent.textContent = message;
      
      logEntry.appendChild(timeStamp);
      logEntry.appendChild(logContent);
      
      logContainer.prepend(logEntry);
      
      // 최대 로그 수 제한 (100개)
      while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.lastChild);
      }
      
      // 스크롤을 최상단으로 유지
      logContainer.scrollTop = 0;
      
      return logEntry;
    },
    
    updatePlayerInfo(player) {
      try {
        // 상단 상태 바 업데이트
        document.getElementById("playerStatus").innerText =
          `${player.name} (${player.job}) | HP ${player.hp}/${player.maxHp} | Lv.${player.level} | Gold ${player.gold}`;
        
        // 캐릭터 기본 정보 업데이트
        document.getElementById("charName").textContent = player.name;
        document.getElementById("charJob").textContent = player.job;
        document.getElementById("charLevel").textContent = player.level;
        document.getElementById("charHp").textContent = `${player.hp} / ${player.maxHp}`;
        document.getElementById("charExp").textContent = `${player.exp} / ${player.level * 50}`;
        document.getElementById("charGold").textContent = `${player.gold} G`;
        
        // 스탯 업데이트
        document.getElementById("statStr").textContent = player.stats.strength;
        document.getElementById("statAgi").textContent = player.stats.agility;
        document.getElementById("statVit").textContent = player.stats.vitality;
        document.getElementById("statInt").textContent = player.stats.intelligence;
        document.getElementById("statLuk").textContent = player.stats.luck;
        
        // 인벤토리 업데이트
        const inventoryElement = document.getElementById("inventory");
        if (player.inventory && player.inventory.length > 0) {
          inventoryElement.innerHTML = player.inventory
            .map(item => `<div class="inventory-item">${item}</div>`)
            .join('');
        } else {
          inventoryElement.textContent = "비어 있음";
        }
        
        // 상태 업데이트 로그 추가 (디버그용)
        // this.addLog(`플레이어 상태가 업데이트되었습니다. (HP: ${player.hp}/${player.maxHp}, Lv: ${player.level})`, 'system');
      } catch (e) {
        console.error('플레이어 정보 업데이트 실패:', e);
      }
    },
  
    updateEventLog(text) {
      try {
        const logEl = document.getElementById("eventLog");
        if (!logEl) return;
        
        // 기존 내용에 새로운 내용 추가 (최신 내용이 위로 오도록)
        const newContent = document.createElement('div');
        newContent.className = 'event-entry';
        newContent.textContent = text;
        
        logEl.insertBefore(newContent, logEl.firstChild);
        
        // 최대 50개 이벤트만 유지
        while (logEl.children.length > 50) {
          logEl.removeChild(logEl.lastChild);
        }
        
        logEl.classList.add("fade-in");
        setTimeout(() => logEl.classList.remove("fade-in"), 400);
        
        // 로그에도 기록
        this.addLog(`이벤트: ${text}`, 'event');
      } catch (e) {
        console.error('이벤트 로그 업데이트 실패:', e);
      }
    },
  
    updateQuestBoard(quests) {
      try {
        const el = document.getElementById("questBoard");
        if (!el) return;
        
        if (!quests || quests.length === 0) {
          el.innerHTML = "<div class='no-quests'>진행 중인 퀘스트가 없습니다.</div>";
          return;
        }
        
        el.innerHTML = quests.map(q => `
          <div class='quest-item'>
            <h4>${q.name}</h4>
            <p>${q.description || '설명이 없습니다.'}</p>
            <div class='quest-progress'>
              <div class='progress-bar' style='width: ${(q.progress / q.requiredProgress) * 100}%'></div>
              <span>${q.progress} / ${q.requiredProgress}</span>
            </div>
            <button class='quest-complete' onclick="QuestSystem.completeQuest(window.player, ${q.id})" 
                    ${q.progress < q.requiredProgress ? 'disabled' : ''}>
              완료하기
            </button>
          </div>
        `).join('');
        
        this.addLog(`퀘스트 보드가 업데이트되었습니다. (${quests.length}개 진행 중)`, 'quest');
      } catch (e) {
        console.error('퀘스트 보드 업데이트 실패:', e);
      }
    },
  
    showNotification(msg, type = 'info', duration = 5000) {
      // Remove any existing notifications
      document.querySelectorAll('.toast').forEach(toast => {
        toast.remove();
      });
      
      const notification = document.createElement('div');
      notification.className = `toast ${type} show`;
      
      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', '알림 닫기');
      
      // Add message content
      const message = document.createElement('div');
      message.className = 'toast-message';
      message.textContent = msg;
      
      // Assemble the notification
      notification.appendChild(message);
      notification.appendChild(closeBtn);
      
      // Add to document
      document.body.appendChild(notification);
      
      // Close functionality
      const closeNotification = () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      };
      
      // Click to close
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeNotification();
      });
      
      // Auto close after duration
      let timeoutId = setTimeout(closeNotification, duration);
      
      // Pause auto-close on hover
      notification.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
      });
      
      // Resume auto-close when mouse leaves
      notification.addEventListener('mouseleave', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(closeNotification, 1000);
      });
      
      // Allow clicking the notification to close it
      notification.addEventListener('click', closeNotification);
      
      return {
        close: closeNotification
      };
    },
    
    clearLogs() {
      const logContainer = document.getElementById('logContainer');
      if (logContainer) {
        logContainer.innerHTML = '';
      }
    },
    
    // 스킬 UI 업데이트
    updateSkillsUI(skills) {
      try {
        // 액티브 스킬 목록 업데이트
        const activeSkillsList = document.getElementById('active-skills-list');
        const passiveSkillsList = document.getElementById('passive-skills-list');
        
        if (!activeSkillsList || !passiveSkillsList) return;
        
        // 기존 스킬 목록 초기화
        activeSkillsList.innerHTML = '';
        passiveSkillsList.innerHTML = '';
        
        // 스킬이 없을 경우
        if (!skills || (!skills.active.length && !skills.passive.length)) {
          activeSkillsList.innerHTML = '<div class="no-skills">사용 가능한 스킬이 없습니다.</div>';
          return;
        }
        
        // 액티브 스킬 추가
        if (skills.active && skills.active.length > 0) {
          skills.active.forEach(skill => {
            const skillElement = this.createSkillElement(skill);
            activeSkillsList.appendChild(skillElement);
          });
        } else {
          activeSkillsList.innerHTML = '<div class="no-skills">사용 가능한 액티브 스킬이 없습니다.</div>';
        }
        
        // 패시브 스킬 추가
        if (skills.passive && skills.passive.length > 0) {
          skills.passive.forEach(skill => {
            const skillElement = this.createSkillElement(skill, true);
            passiveSkillsList.appendChild(skillElement);
          });
        } else {
          passiveSkillsList.innerHTML = '<div class="no-skills">보유 중인 패시브 스킬이 없습니다.</div>';
        }
        
        // 스킬 툴팁 초기화
        this.initializeSkillTooltips();
        
      } catch (e) {
        console.error('스킬 UI 업데이트 실패:', e);
      }
    },
    
    // 스킬 요소 생성
    createSkillElement(skill, isPassive = false) {
      const skillElement = document.createElement('div');
      skillElement.className = `skill-item ${isPassive ? 'passive' : 'active'}`;
      skillElement.dataset.skillId = skill.id;
      
      // 스킬 아이콘
      const icon = document.createElement('span');
      icon.className = 'skill-icon';
      icon.textContent = skill.icon || (isPassive ? '🌟' : '✨');
      
      // 스킬 정보
      const info = document.createElement('div');
      info.className = 'skill-info';
      
      const name = document.createElement('div');
      name.className = 'skill-name';
      name.textContent = skill.name;
      
      const level = document.createElement('div');
      level.className = 'skill-level';
      level.textContent = `Lv. ${skill.level || 1}`;
      
      info.appendChild(name);
      info.appendChild(level);
      
      // 쿨다운 표시 (액티브 스킬인 경우)
      if (!isPassive) {
        const cooldown = document.createElement('div');
        cooldown.className = 'skill-cooldown';
        cooldown.textContent = `쿨타임: ${skill.cooldown || 0}턴`;
        info.appendChild(cooldown);
        
        // 마나/코스트가 있는 경우 표시
        if (skill.cost) {
          const cost = document.createElement('div');
          cost.className = 'skill-cost';
          cost.textContent = `소모: ${skill.cost} MP`;
          info.appendChild(cost);
        }
      }
      
      // 툴팁을 위한 데이터 속성 설정
      skillElement.dataset.tooltip = this.createSkillTooltip(skill, isPassive);
      
      // 요소 조립
      skillElement.appendChild(icon);
      skillElement.appendChild(info);
      
      // 액티브 스킬인 경우 클릭 이벤트 추가
      if (!isPassive) {
        skillElement.addEventListener('click', () => {
          // 스킬 사용 로직은 게임 로직에서 처리
          this.useSkill(skill);
        });
      }
      
      return skillElement;
    },
    
    // 스킬 툴팁 생성
    createSkillTooltip(skill, isPassive = false) {
      let tooltip = `<div class="skill-tooltip">
        <div class="skill-tooltip-header">
          <span class="skill-icon">${skill.icon || (isPassive ? '🌟' : '✨')}</span>
          <span class="skill-name">${skill.name}</span>
          <span class="skill-level">Lv. ${skill.level || 1}</span>
        </div>
        <div class="skill-type">${isPassive ? '패시브 스킬' : '액티브 스킬'}</div>
        <div class="skill-description">${skill.description || '설명이 없습니다.'}</div>`;
      
      if (!isPassive) {
        tooltip += `
        <div class="skill-details">
          <div>쿨타임: <span>${skill.cooldown || 0}턴</span></div>
          ${skill.cost ? `<div>소모 MP: <span>${skill.cost}</span></div>` : ''}
          ${skill.power ? `<div>공격력: <span>${skill.power * 100}%</span></div>` : ''}
        </div>`;
      }
      
      if (skill.effect) {
        tooltip += `
        <div class="skill-effect">
          <div class="effect-title">효과:</div>
          <div class="effect-description">${this.getEffectDescription(skill.effect)}</div>
        </div>`;
      }
      
      tooltip += `</div>`;
      return tooltip;
    },
    
    // 효과 설명 생성
    getEffectDescription(effect) {
      if (!effect) return '';
      
      switch(effect.type) {
        case 'poison':
          return `${effect.duration}턴 동안 매 턴 ${effect.damage}의 독 피해 (${effect.chance}% 확률)`;
        case 'freeze':
          return `${effect.duration}턴 동안 ${effect.chance}% 확률로 빙결`;
        case 'taunt':
          return `${effect.duration}턴 동안 적의 공격을 유도 (${effect.chance}% 확률)`;
        case 'barrier':
          return `${effect.turns}턴 동안 ${effect.amount}의 피해를 흡수하는 보호막`;
        case 'damageReduction':
          return `${effect.turns}턴 동안 받는 피해 ${effect.amount}% 감소`;
        default:
          return '특수 효과가 적용됩니다.';
      }
    },
    
    // 스킬 툴팁 초기화
    initializeSkillTooltips() {
      // 기존 툴팁 이벤트 제거
      document.querySelectorAll('.skill-item').forEach(item => {
        item.removeEventListener('mouseenter', this.showTooltip);
        item.removeEventListener('mouseleave', this.hideTooltip);
        item.addEventListener('mouseenter', this.showTooltip);
        item.addEventListener('mouseleave', this.hideTooltip);
      });
    },
    
    // 툴팁 표시
    showTooltip(e) {
      const tooltip = document.createElement('div');
      tooltip.className = 'skill-tooltip-container';
      tooltip.innerHTML = this.dataset.tooltip;
      
      // 기존 툴팁 제거
      const existingTooltip = document.querySelector('.skill-tooltip-container');
      if (existingTooltip) existingTooltip.remove();
      
      document.body.appendChild(tooltip);
      
      // 툴팁 위치 조정
      const rect = this.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let top = rect.bottom + window.scrollY;
      let left = rect.left + window.scrollX;
      
      // 화면 밖으로 나가지 않도록 조정
      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      
      if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 10 + window.scrollY;
      }
      
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      
      // 클릭 이벤트로 툴팁 제거 방지
      tooltip.addEventListener('click', (e) => e.stopPropagation());
    },
    
    // 툴팁 숨기기
    hideTooltip() {
      const tooltip = document.querySelector('.skill-tooltip-container');
      if (tooltip) tooltip.remove();
    },
    
    // 스킬 사용
    useSkill(skill) {
      // 게임 로직에서 처리할 수 있도록 이벤트 발생
      const event = new CustomEvent('skillUsed', { detail: { skill } });
      document.dispatchEvent(event);
      
      // 스킬 사용 피드백
      this.showNotification(`${skill.name} 스킬을 사용했습니다!`, 'info');
      this.addLog(`[스킬] ${skill.name}을(를) 사용했습니다.`, 'skill');
    },
  
    sleep(ms) {
      return new Promise(res => setTimeout(res, ms));
    }
  };
const QuestSystem = {
    quests: [
      { 
        id: 1, 
        name: "마을 경비 요청", 
        description: "마을 주변을 순찰하며 위험요소를 제거하세요.",
        type: "combat",
        target: { type: "any", count: 3 },
        progress: 0,
        requiredProgress: 3,
        rewardGold: 30, 
        rewardExp: 20 
      },
      { 
        id: 2, 
        name: "숲속 약초 채집", 
        description: "숲속에서 치유 약초 5개를 모아오세요.",
        type: "gather",
        target: { type: "herb", count: 5 },
        progress: 0,
        requiredProgress: 5,
        rewardGold: 25, 
        rewardExp: 15 
      },
      { 
        id: 3, 
        name: "늑대 무리 소탕", 
        description: "위험한 늑대 무리 3마리를 처치하세요.",
        type: "combat",
        target: { type: "늑대", count: 3 },
        progress: 0,
        requiredProgress: 3,
        rewardGold: 40, 
        rewardExp: 30 
      },
      { 
        id: 4, 
        name: "도적단 소탕", 
        description: "도적단원 2명을 처치하세요.",
        type: "combat",
        target: { type: "도적단원", count: 2 },
        progress: 0,
        requiredProgress: 2,
        rewardGold: 50, 
        rewardExp: 35 
      }
    ],
  
    assignRandomQuest(player) {
      if (!player.quests) player.quests = [];
      
      // 이미 가지고 있는 퀘스트는 제외하고 랜덤 선택
      const availableQuests = this.quests.filter(q => 
        !player.quests.some(pq => pq.id === q.id)
      );
      
      if (availableQuests.length === 0) {
        UI.showNotification("더 이상 받을 수 있는 퀘스트가 없습니다.");
        return;
      }
      
      const q = JSON.parse(JSON.stringify(availableQuests[Math.floor(Math.random() * availableQuests.length)]));
      player.quests.push(q);
      this.updateQuestUI(player);
      UI.showNotification(`새 퀘스트: ${q.name} - ${q.description}`);
    },
    
    checkCombatQuests(player, enemy) {
      if (!player.quests || player.quests.length === 0) return;
      
      let updated = false;
      
      player.quests.forEach(quest => {
        if (quest.type === "combat" && 
            (quest.target.type === "any" || enemy.name.includes(quest.target.type))) {
          quest.progress++;
          updated = true;
          
          if (quest.progress >= quest.requiredProgress) {
            this.completeQuest(player, quest.id);
          }
        }
      });
      
      if (updated) {
        this.updateQuestUI(player);
      }
    },
    
    updateQuestUI(player) {
      if (!player.quests || player.quests.length === 0) {
        document.getElementById("questBoard").innerHTML = "진행 중인 퀘스트가 없습니다.";
        return;
      }
      
      const questHTML = player.quests.map(quest => {
        const progressText = quest.type === "combat" 
          ? `(${quest.progress}/${quest.requiredProgress} 처리)` 
          : '';
        return `
          <div class="quest-item">
            <h4>${quest.name} ${progressText}</h4>
            <p>${quest.description}</p>
            <div class="quest-progress">
              <div class="progress-bar" style="width: ${(quest.progress / quest.requiredProgress) * 100}%"></div>
            </div>
            <button onclick="QuestSystem.completeQuest(window.player, ${quest.id})" 
                    ${quest.progress < quest.requiredProgress ? 'disabled' : ''}>
              완료하기
            </button>
          </div>
        `;
      }).join('');
      
      document.getElementById("questBoard").innerHTML = questHTML;
    },
  
    completeQuest(player, questId) {
      const questIndex = player.quests.findIndex(q => q.id === questId);
      if (questIndex === -1) return;
      
      const quest = player.quests[questIndex];
      
      // Check if quest requirements are met
      if (quest.progress < quest.requiredProgress) {
        UI.showNotification(`퀘스트 완료 조건을 충족하지 못했습니다! (${quest.progress}/${quest.requiredProgress})`);
        return;
      }
      
      // Give rewards
      player.gold += quest.rewardGold;
      player.gainExp(quest.rewardExp);
      
      // Remove quest
      player.quests.splice(questIndex, 1);
      
      // Update UI
      this.updateQuestUI(player);
      UI.showNotification(`퀘스트 완료! 보상: ${quest.rewardGold}G, ${quest.rewardExp} 경험치`);
      UI.updatePlayerInfo(player);
    }
  };
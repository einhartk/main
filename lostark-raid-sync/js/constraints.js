// 제약 조건 유효성 검사 함수들
const Constraints = {
  // 캐릭터 중복 확인 (최대 4개까지 허용)
  isCharacterDuplicate: function(characterName, parties = null) {
    const targetParties = parties || getCurrentTabParties();
    let count = 0;
    targetParties.forEach(party => {
      party.members.forEach(member => {
        if (member && member.name === characterName) {
          count++;
        }
      });
    });
    return count >= 4; // 4개 이상이면 중복으로 간주
  },

  // 캐릭터 사용 횟수 확인
  getCharacterUsageCount: function(characterName, parties = null) {
    let count = 0;

    if (parties) {
      parties.forEach((party) => {
        party.members.forEach(member => {
          if (member && (member.name === characterName || member.id === characterName)) {
            count++;
          }
        });
      });
    } else {
      if (state.raidTabs) {
        Object.keys(state.raidTabs).forEach(raidId => {
          Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
            const parties = state.raidTabs[raidId][difficultyId];
            parties.forEach(party => {
              party.members.forEach(member => {
                if (member && (member.name === characterName || member.id === characterName)) {
                  count++;
                }
              });
            });
          });
        });
      }
    }

    return count;
  },

  // 1공격대 = 1원정대 제약 확인 (원정대 슬롯당 1캐릭터)
  exceedsOneRaidOneExpedition: function() {
    const usedCharacters = {};

    // 현재 공격대의 모든 파티 확인
    getCurrentTabParties().forEach(party => {
      party.members.forEach(member => {
        if (member) {
          // 각 캐릭터가 어느 원정대 슬롯에서 왔는지 확인
          state.expeditionSlots.forEach((slot, slotIndex) => {
            if (slot.some(char => char && char.name === member.name)) {
              if (!usedCharacters[slotIndex]) {
                usedCharacters[slotIndex] = [];
              }
              usedCharacters[slotIndex].push(member.name);
            }
          });
        }
      });
    });

    // 각 원정대 슬롯에서 1캐릭터 초과 확인
    for (const slotIndex in usedCharacters) {
      if (usedCharacters[slotIndex].length > 1) {
        return true; // 위반
      }
    }

    return false; // 정상
  },

  getExpeditionSlotIndexByCharacterName: function(characterName) {
    for (let slotIndex = 0; slotIndex < state.expeditionSlots.length; slotIndex++) {
      const slot = state.expeditionSlots[slotIndex];
      if (slot && slot.some(c => c && (c.name === characterName || c.id === characterName))) {
        return slotIndex;
      }
    }
    return null;
  },

  // 원정대 슬롯당 1캐릭 제약: "공격대(=party.id)" 단위로만 적용
  exceedsOneRaidOneExpeditionForCharacter: function(characterName, party) {
    const slotIndex = this.getExpeditionSlotIndexByCharacterName(characterName);
    if (slotIndex === null) return false;
    if (!party) return false;

    let usedCount = 0;
    
    // 현재 파티의 멤버 중 같은 원정대 슬롯의 캐릭터 수 확인
    party.members.forEach(member => {
      if (!member) return;
      const memberSlotIndex = this.getExpeditionSlotIndexByCharacterName(member.name);
      if (memberSlotIndex === slotIndex) usedCount++;
    });

    return usedCount >= 1;
  },

  // 같은 레이드 탭, 같은 캐릭터명 제약 확인
  exceedsSameRaidSameCharacter: function(characterName, currentRaidName = null, currentParties = null) {
    if (!currentRaidName) currentRaidName = state.selectedRaid?.name;
    if (!currentRaidName) return false;

    let count = 0;

    if (currentParties && currentParties.length > 0) {
      currentParties.forEach((party) => {
        party.members.forEach(member => {
          if (member && (member.name === characterName || member.id === characterName)) {
            count++;
          }
        });
      });
    } else {
      Object.keys(state.raidTabs).forEach(raidId => {
        const raid = state.raidsData.find(r => r.id === raidId);
        if (!raid) return;
        if (raid.name !== currentRaidName) return;

        Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
          const parties = state.raidTabs[raidId][difficultyId] || [];
          
          parties.forEach(party => {
            party.members.forEach(member => {
              if (member && (member.name === characterName || member.id === characterName)) {
                count++;
              }
            });
          });
        });
      });
    }

    return count >= 1; // 같은 레이드 탭에서는 1곳만 허용
  },

  // 캐릭터 배치 가능 여부 확인
  canAddCharacterToParty: function(party, character, currentParties = null) {
    const currentCount = this.getCharacterUsageCount(character.name, currentParties);

    if (currentCount >= 4) {
      const message = `${character.name} 캐릭터는 최대 4개의 공격대에만 배치할 수 있습니다. (현재: ${currentCount}/4)`;
      return { valid: false, reason: 'duplicate_limit', message };
    }

    const sameRaidExceeded = this.exceedsSameRaidSameCharacter(character.name, state.selectedRaid?.name, currentParties);

    if (sameRaidExceeded) {
      const message = `${character.name} 캐릭터는 ${state.selectedRaid?.name || '이 레이드'}에서 1곳에만 배치할 수 있습니다.`;
      return { valid: false, reason: 'same_raid_same_character', message };
    }

    const expeditionExceeded = this.exceedsOneRaidOneExpeditionForCharacter(character.name, party);

    if (expeditionExceeded) {
      return { valid: false, reason: 'one_raid_one_expedition', message: '1원정대 슬롯당 1캐릭터만 사용할 수 있습니다.' };
    }

    // 아이템 레벨 제한 확인
    const characterIlvl = parseCompareNumber(character.ilvl || '0');
    const requiredIlvl = party.minIlvl || 0;
    if (characterIlvl < requiredIlvl) {
      const message = `${character.name} 캐릭터의 아이템 레벨(${characterIlvl})이 부족합니다. 필요 레벨: ${requiredIlvl} 이상`;
      return { valid: false, reason: 'ilvl_requirement', message };
    }

    // 전투력 제한 확인
    const characterCp = parseCompareNumber(character.combatPower || '0');
    const requiredCp = party.minCombatPower || 0;
    if (characterCp < requiredCp) {
      const message = `${character.name} 캐릭터의 전투력(${characterCp.toLocaleString()})이 부족합니다. 필요 전투력: ${requiredCp.toLocaleString()} 이상`;
      return { valid: false, reason: 'cp_requirement', message };
    }

    // 서폿 제한 확인 (4인 1명, 8인 2명)
    const maxSupports = party.size === 8 ? 2 : (party.maxSupports ?? 1);
    const supportExceeded = this.exceedsSupportLimit(party, character, maxSupports);

    if (supportExceeded) {
      const message = `이 파티에는 서포터를 ${maxSupports}명만 배치할 수 있습니다.`;
      return { valid: false, reason: 'support_limit', message };
    }

    const successMessage = '제약 조건을 모두 만족합니다.';
    return { valid: true, message: successMessage };
  },

  // 서폿 제한 확인 (maxSupports: 4인 1, 8인 2). 파티 멤버는 { id, name }만 있으므로 원정대 상세에서 role 조회
  exceedsSupportLimit: function(party, newCharacter = null, maxSupports = null) {
    const limit = maxSupports != null ? maxSupports : (party.size === 8 ? 2 : (party.maxSupports ?? 1));
    const getDetails = typeof window.getCharacterDetailsFromExpedition === 'function' ? window.getCharacterDetailsFromExpedition : null;
    const currentSupports = getDetails
      ? party.members.filter(m => m && getDetails(m.name || m.id)?.role === 'support').length
      : 0;
    const additionalSupport = newCharacter?.role === 'support' ? 1 : 0;
    return (currentSupports + additionalSupport) > limit;
  },

  // 원정대당 1캐릭터 제한 확인
  exceedsExpeditionLimit: function() {
    const usedCharacters = new Set();
    let totalCharacters = 0;

    state.expeditionSlots.forEach(slot => {
      slot.forEach(char => {
        if (char) {
          totalCharacters++;
          usedCharacters.add(char.name);
        }
      });
    });

    return totalCharacters > 8; // 원정대 슬롯 수 초과
  },

  // 원정대 중복 캐릭터 확인
  hasDuplicateInExpedition: function() {
    const usedCharacters = new Set();
    const duplicates = [];

    state.expeditionSlots.forEach(slot => {
      slot.forEach(char => {
        if (char) {
          if (usedCharacters.has(char.name)) {
            duplicates.push(char.name);
          } else {
            usedCharacters.add(char.name);
          }
        }
      });
    });

    return duplicates;
  },

  // 파티 크기에 따른 서폿 제한: 4인 1명, 8인 2명
  getSupportLimit: function(partySize) {
    return partySize === 8 ? 2 : 1;
  },

  // 모든 파티의 캐릭터 중복 확인
  getDuplicateCharacters: function() {
    const characterCounts = {};
    const duplicates = [];

    getCurrentTabParties().forEach(party => {
      party.members.forEach(member => {
        if (member) {
          characterCounts[member.name] = (characterCounts[member.name] || 0) + 1;
          if (characterCounts[member.name] > 4) {
            if (!duplicates.includes(member.name)) {
              duplicates.push(member.name);
            }
          }
        }
      });
    });

    return duplicates;
  },

  // 원정대에서 사용 가능한 캐릭터 목록 (모든 제약 조건 적용)
  getAvailableCharacters: function() {
    const usedCharacters = {};
    const availableCharacters = [];
    const currentRaidName = state.selectedRaid?.name;

    // 현재 공격대에서 사용 중인 캐릭터 횟수 확인 (현재 공격대만)
    if (currentRaidName) {
      Object.keys(state.raidTabs).forEach(raidId => {
        const raid = state.raidsData.find(r => r.id === raidId);
        if (!raid) return;
        if (raid.name !== currentRaidName) return;

        Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
          const parties = state.raidTabs[raidId][difficultyId] || [];
          parties.forEach(party => {
            party.members.forEach(member => {
              if (member) {
                usedCharacters[member.name] = (usedCharacters[member.name] || 0) + 1;
              }
            });
          });
        });
      });
    }

    // 원정대에서 제약 조건에 맞는 캐릭터 수집
    state.expeditionSlots.forEach((slot, slotIndex) => {
      slot.forEach(char => {
        if (char) {
          // 4개 제한 확인 (전체 공격대)
          if (this.getCharacterUsageCount(char.name) >= 4) return;

          // 같은 레이드 탭, 같은 캐릭터명 제한 확인
          if (this.exceedsSameRaidSameCharacter(char.name, currentRaidName)) return;

          // 아이템 레벨과 전투력 필터링 (모든 파티의 최소 요구사항 확인)
          let meetsRequirements = false;
          const currentTabParties = getCurrentTabParties();

          for (const party of currentTabParties) {
            const characterIlvl = parseCompareNumber(char.ilvl || '0');
            const requiredIlvl = party.minIlvl || 0;
            const characterCp = parseCompareNumber(char.combatPower || '0');
            const requiredCp = party.minCombatPower || 0;

            if (characterIlvl >= requiredIlvl && characterCp >= requiredCp) {
              meetsRequirements = true;
              break;
            }
          }

          if (!meetsRequirements) return;

          availableCharacters.push(char);
          usedCharacters[char.name] = (usedCharacters[char.name] || 0) + 1; // 중복 방지를 위해 카운트 증가
        }
      });
    });

    return availableCharacters;
  },

  // 제약 조건 위반 메시지 생성
  getViolationMessage: function(violation, characterName = '', partyName = '') {
    const messages = {
      duplicate_limit: `${characterName} 캐릭터는 최대 4개의 공격대에만 배치할 수 있습니다.`,
      same_raid_same_character: `${characterName} 캐릭터는 ${state.selectedRaid?.name || '이 레이드'}에서 1곳에만 배치할 수 있습니다.`,
      one_raid_one_expedition: '1원정대 슬롯당 1캐릭터만 사용할 수 있습니다.',
      ilvl_requirement: `${characterName} 캐릭터의 아이템 레벨이 부족합니다.`,
      cp_requirement: `${characterName} 캐릭터의 전투력이 부족합니다.`,
      duplicate: `${characterName} 캐릭터는 이미 배치되어 있습니다.`,
      support_limit: `${partyName} 파티의 서포터 제한을 초과했습니다.`,
      expedition_limit: '원정대당 1캐릭터만 사용할 수 있습니다.'
    };

    return messages[violation] || '제약 조건을 위반했습니다.';
  }
};

// 제약 조건 적용 헬퍼 함수
function applyConstraints(character, party, operation = 'add') {
  // 파티가 없는 경우
  if (!party) {
    return { valid: false, reason: 'no_party', message: '파티가 존재하지 않습니다.' };
  }

  // 모든 제약/요구사항은 canAddCharacterToParty로 단일화
  return Constraints.canAddCharacterToParty(party, character);
}

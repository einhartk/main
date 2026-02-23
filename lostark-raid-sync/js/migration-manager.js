// === 마이그레이션 관리자 ===

class MigrationManager {
  constructor() {
    this.isPartialSyncEnabled = false;
    this.originalFunctions = new Map();
    this.migrationInProgress = false;
  }

  static isV2ModeEnabled() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const v2 = urlParams.get('v2');
      const mode = urlParams.get('mode');
      return v2 === '1' || v2 === 'true' || mode === 'v2';
    } catch (_) {
      return false;
    }
  }

  // 부분 동기화 활성화
  async enablePartialSync(enabled = true) {
    this.isPartialSyncEnabled = enabled;
    
    if (enabled) {
      console.log('✅ [MIGRATION] 부분 동기화 모드 활성화');
      
      // partialSyncManager 초기화
      if (window.partialSyncManager && window.realtimeSync) {
        const syncCode = window.realtimeSync.getSyncCode();
        if (syncCode) {
          window.partialSyncManager.init(syncCode);
          window.partialSyncManager.setupPartialListeners();
        }
      }
    } else {
      console.log('📝 [MIGRATION] 부분 동기화 모드 비활성화');
      
      // partialSyncManager 정리
      if (window.partialSyncManager) {
        window.partialSyncManager.cleanup();
      }
    }
  }

  // 기존 함수 백업
  backupOriginalFunctions() {
    // 주요 함수들 백업
    const functionsToBackup = [
      'addNewRaid',
      'removeRaid',
      'updateRaidSize',
      'updateRaidRequirements',
      'autoAssign',
      'balancedAssign'
    ];

    functionsToBackup.forEach(funcName => {
      if (typeof window[funcName] === 'function') {
        this.originalFunctions.set(funcName, window[funcName]);
      }
    });

    console.log('💾 [MIGRATION] 기존 함수 백업 완료');
  }

  // 호환성 모드 활성화
  enableCompatibilityMode() {
    if (!this.isPartialSyncEnabled) {
      console.log('📝 [MIGRATION] 호환성 모드 비활성화 (부분 동기화가 아님)');
      return;
    }

    console.log('🔄 [MIGRATION] 호환성 모드 활성화');
    
    // 기존 함수들을 부분 동기화 방식으로 패치
    this.patchFunctions();
  }

  // 함수 패치
  patchFunctions() {
    // addNewRaid 패치
    if (typeof window.addNewRaid === 'function') {
      window.addNewRaid = async (...args) => {
        if (this.isPartialSyncEnabled && window.partialSyncManager) {
          return await this.addNewRaidPartial();
        } else {
          const originalFunc = this.originalFunctions.get('addNewRaid');
          return await originalFunc.apply(window, args);
        }
      };
    }

    // removeRaid 패치
    if (typeof window.removeRaid === 'function') {
      window.removeRaid = async (...args) => {
        if (this.isPartialSyncEnabled && window.partialSyncManager) {
          return await this.removeRaidPartial(...args);
        } else {
          const originalFunc = this.originalFunctions.get('removeRaid');
          return await originalFunc.apply(window, args);
        }
      };
    }

    console.log('🔧 [MIGRATION] 함수 패치 완료');
  }

  // 부분 동기화 방식으로 레이드 추가
  async addNewRaidPartial() {
    try {
      const raidId = state.selectedRaid?.id;
      const difficultyId = state.selectedDifficulty?.id;
      if (!raidId || !difficultyId) {
        console.error('❌ [MIGRATION] 선택된 레이드 또는 난이도가 없습니다.');
        return false;
      }

      const raid = state.raidsData.find(r => r.id === raidId);
      const difficulty = raid?.difficulties.find(d => d.id === difficultyId);
      
      if (!raid || !difficulty) {
        console.error('❌ [MIGRATION] 레이드 또는 난이도를 찾을 수 없음:', { raidId, difficultyId });
        return false;
      }

      const partyId = `P${Date.now()}`;
      const newParty = {
        id: partyId,
        uniqueId: `${raidId}-${difficultyId}-${partyId}`,
        displayName: `${raid.name} ${difficulty.name} ${partyId}`,
        name: `${raid.name} ${difficulty.name} ${partyId}`,
        raidId: raidId,
        difficultyId: difficultyId,
        raidName: raid.name,
        difficultyName: difficulty.name,
        order: (state.raidTabs[raidId]?.[difficultyId]?.length || 0), // 🔥 기존 파티 개수로 order 설정
        cleared: false,
        scheduledWeekday: null,
        scheduledHour: null,
        scheduledTime: null,
        scheduledTimeDisplay: '',
        createdAt: new Date().toISOString(),
        members: Array(difficulty.defaultSize || 4).fill(null),
        maxSupports: difficulty.maxSupports || 1,
        size: difficulty.defaultSize || 4,
        minIlvl: difficulty.minIlvl || 0,
        minCombatPower: difficulty.minCombatPower || 0
      };

      // 부분 동기화로 저장
      const result = await window.partialSyncManager.syncParty(
        raidId,
        difficultyId,
        partyId,
        'add',
        newParty
      );

      if (result) {
        // state 업데이트
        if (!state.raidTabs[raidId]) {
          state.raidTabs[raidId] = {};
        }
        if (!state.raidTabs[raidId][difficultyId]) {
          state.raidTabs[raidId][difficultyId] = [];
        }
        
        state.raidTabs[raidId][difficultyId].push(newParty);
        
        // UI 업데이트 (v2 모드에서도 즉시 렌더링)
        if (typeof renderRaidTabs === 'function') {
          renderRaidTabs();
        }
        if (typeof renderRaidParties === 'function') {
          renderRaidParties(true); // 즉시 렌더링
        }
        if (typeof scheduleAutoSave === 'function') {
          scheduleAutoSave();
        }
      }

      return result;
    } catch (error) {
      console.error('❌ [MIGRATION] 부분 동기화 레이드 추가 실패:', error);
      return false;
    }
  }

  // 부분 동기화 방식으로 레이드 삭제
  async removeRaidPartial(partyId) {
    try {
      // 파티 찾기
      let targetParty = null;
      let targetRaidId = null;
      let targetDifficultyId = null;

      for (const [raidId, difficulties] of Object.entries(state.raidTabs || {})) {
        for (const [difficultyId, parties] of Object.entries(difficulties || {})) {
          const party = parties.find(p => p && (p.id === partyId || p.uniqueId === partyId));
          if (party) {
            targetParty = party;
            targetRaidId = raidId;
            targetDifficultyId = difficultyId;
            break;
          }
        }
        if (targetParty) break;
      }

      if (!targetParty) {
        console.error('❌ [MIGRATION] 삭제할 파티를 찾을 수 없음:', partyId);
        return false;
      }

      // 확인 모달
      const confirmed = await new Promise(resolve => {
        window.modalManager.showConfirm({
          title: '공격대 삭제 확인',
          message: `${targetParty.displayName} 공격대를 정말 삭제하시겠습니까?`,
          confirmText: '삭제',
          cancelText: '취소',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (!confirmed) return false;

      // 부분 동기화로 삭제
      const result = await window.partialSyncManager.syncParty(
        targetRaidId,
        targetDifficultyId,
        targetParty.id || targetParty.uniqueId || partyId,
        'delete'
      );

      if (result) {
        // state 업데이트
        const parties = state.raidTabs[targetRaidId][targetDifficultyId];
        const index = parties.findIndex(p => p && p.id === targetParty.id);
        if (index !== -1) {
          parties.splice(index, 1);
        }

        // UI 업데이트 (v2 모드에서도 즉시 렌더링)
        if (typeof renderRaidTabs === 'function') {
          renderRaidTabs();
        }
        if (typeof renderRaidParties === 'function') {
          renderRaidParties(true); // 즉시 렌더링
        }
        if (typeof scheduleAutoSave === 'function') {
          scheduleAutoSave();
        }
      }

      return result;
    } catch (error) {
      console.error('❌ [MIGRATION] 부분 동기화 레이드 삭제 실패:', error);
      return false;
    }
  }

  // 롤백
  rollback() {
    console.log('🔄 [MIGRATION] 롤백 시작...');
    
    // 기존 함수 복원
    this.originalFunctions.forEach((originalFunc, funcName) => {
      window[funcName] = originalFunc;
    });

    // 부분 동기화 비활성화
    this.enablePartialSync(false);
    
    // partialSyncManager 정리
    if (window.partialSyncManager) {
      window.partialSyncManager.cleanup();
    }

    console.log('✅ [MIGRATION] 롤백 완료');
  }
}

// 전역으로 내보내기
window.MigrationManager = MigrationManager;

// 전역 인스턴스 생성
if (!window.migrationManager) {
  window.migrationManager = new MigrationManager();
}

// v2 테스트 모드일 때 자동으로 부분 동기화 활성화 + 기존 함수 패치
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!window.migrationManager || !window.partialSyncManager || !window.realtimeSync) return;
    if (!MigrationManager.isV2ModeEnabled()) return;

    // enablePartialSync는 내부에서 partialSyncManager.init + 리스너 설정 수행
    await window.migrationManager.enablePartialSync(true);

    // 기존 UI 액션(add/remove 등)을 partialSync 기반으로 연결
    window.migrationManager.backupOriginalFunctions();
    window.migrationManager.enableCompatibilityMode();
  } catch (e) {
    console.error('❌ [MIGRATION] v2 auto-enable failed:', e);
  }
});

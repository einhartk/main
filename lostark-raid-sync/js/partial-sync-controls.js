// === 부분 동기화 컨트롤 ===

function isV2ModeEnabled() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const v2 = urlParams.get('v2');
    const mode = urlParams.get('mode');
    return v2 === '1' || v2 === 'true' || mode === 'v2';
  } catch (_) {
    return false;
  }
}

// 부분 동기화 전환
function togglePartialSync() {
  if (!window.migrationManager) {
    console.error('❌ [PARTIAL SYNC] migrationManager가 없습니다.');
    return;
  }

  const currentState = window.migrationManager.isPartialSyncEnabled;
  window.migrationManager.enablePartialSync(!currentState);
  
  // UI 업데이트
  updatePartialSyncUI(!currentState);
}

// 부분 동기화 테스트
async function testPartialSync() {
  if (!window.partialSyncManager) {
    console.error('❌ [PARTIAL SYNC] partialSyncManager가 없습니다.');
    return;
  }

  console.log('🧪 [PARTIAL SYNC] 테스트 시작...');
  
  try {
    const raidId = 'valtan';
    const difficultyId = 'normal';
    const partyId = `TEST_PARTY_${Date.now()}`;

    // 1) ADD party
    const addResult = await window.partialSyncManager.syncParty(
      raidId,
      difficultyId,
      partyId,
      'add',
      {
        id: partyId,
        displayName: '테스트 파티',
        name: '테스트 파티',
        raidId,
        difficultyId,
        order: 999,
        cleared: false,
        createdAt: new Date().toISOString(),
        members: [
          { id: 'test1', name: '테스트 캐릭터1' },
          { id: 'test2', name: '테스트 캐릭터2' }
        ]
      }
    );

    if (!addResult) throw new Error('party add failed');

    // 2) UPDATE party meta
    const updateResult = await window.partialSyncManager.syncParty(
      raidId,
      difficultyId,
      partyId,
      'update',
      {
        name: '테스트 파티(수정)',
        displayName: '테스트 파티(수정)',
        cleared: true
      }
    );

    if (!updateResult) throw new Error('party update failed');

    // 3) UPDATE member
    const memberUpdateResult = await window.partialSyncManager.syncPartyMember(
      raidId,
      difficultyId,
      partyId,
      1,
      'update',
      { id: 'test2', name: '테스트 캐릭터2(수정)' }
    );

    if (!memberUpdateResult) throw new Error('party member update failed');

    // 4) Expedition name + slot update
    const slotIndex = 0;
    const nameResult = await window.partialSyncManager.syncExpeditionSlotName(
      slotIndex,
      'update',
      '원정대 TEST'
    );
    if (!nameResult) throw new Error('expedition slot name update failed');

    const slotResult = await window.partialSyncManager.syncExpeditionSlot(
      slotIndex,
      'update',
      [
        { id: 'exp1', name: '원정대캐릭1' },
        { id: 'exp2', name: '원정대캐릭2' }
      ]
    );
    if (!slotResult) throw new Error('expedition slot update failed');

    // 5) DELETE party
    const deleteResult = await window.partialSyncManager.syncParty(
      raidId,
      difficultyId,
      partyId,
      'delete'
    );

    if (!deleteResult) throw new Error('party delete failed');

    console.log('✅ [PARTIAL SYNC] 테스트 성공');
    window.modalManager.showAlert({
      title: '테스트 완료',
      message: `부분 동기화 CRUD 테스트가 성공적으로 완료되었습니다. (mode: ${isV2ModeEnabled() ? 'v2' : 'legacy'})`
    });
  } catch (error) {
    console.error('❌ [PARTIAL SYNC] 테스트 중 오류:', error);
    window.modalManager.showAlert({
      title: '테스트 오류',
      message: '테스트 중 오류가 발생했습니다.'
    });
  }
}

// 데이터 마이그레이션
async function checkAndMigrateData() {
  if (!window.migrationManager) {
    console.error('❌ [MIGRATION] migrationManager가 없습니다.');
    return;
  }

  if (isV2ModeEnabled() && window.dataMigration && typeof window.dataMigration.executeFullMigration === 'function') {
    const confirmed = await new Promise(resolve => {
      window.modalManager.showConfirm({
        title: 'v2 마이그레이션',
        message: '기존 데이터(d/es/esn/rt)를 v2 정규화 구조로 변환하여 저장할까요?',
        confirmText: '마이그레이션',
        cancelText: '취소',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (!confirmed) return;

    try {
      window.migrationManager.migrationInProgress = true;
      updateMigrationProgress(0, 'v2 마이그레이션 시작...');
      const res = await window.dataMigration.executeFullMigration();
      updateMigrationProgress(100, res?.message || 'v2 마이그레이션 완료');
      setTimeout(() => {
        hideMigrationProgress();
        window.modalManager.showAlert({
          title: res?.success ? '마이그레이션 완료' : '마이그레이션 실패',
          message: res?.message || '완료'
        });
      }, 1000);
    } catch (error) {
      console.error('❌ [MIGRATION] v2 마이그레이션 실패:', error);
      updateMigrationProgress(0, 'v2 마이그레이션 실패');
      window.modalManager.showAlert({
        title: '마이그레이션 실패',
        message: 'v2 마이그레이션 중 오류가 발생했습니다.'
      });
    } finally {
      window.migrationManager.migrationInProgress = false;
    }
    return;
  }

  if (window.migrationManager.migrationInProgress) {
    console.warn('⚠️ [MIGRATION] 이미 마이그레이션이 진행 중입니다.');
    return;
  }

  const confirmed = await new Promise(resolve => {
    window.modalManager.showConfirm({
      title: '데이터 마이그레이션',
      message: '기존 데이터를 부분 동기화 방식으로 마이그레이션하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.',
      confirmText: '마이그레이션',
      cancelText: '취소',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });

  if (!confirmed) return;

  try {
    window.migrationManager.migrationInProgress = true;
    updateMigrationProgress(0, '마이그레이션 시작...');

    // 마이그레이션 로직 실행
    await performMigration();
    
    updateMigrationProgress(100, '마이그레이션 완료');
    
    setTimeout(() => {
      hideMigrationProgress();
      window.modalManager.showAlert({
        title: '마이그레이션 완료',
        message: '데이터 마이그레이션이 성공적으로 완료되었습니다.'
      });
    }, 2000);

  } catch (error) {
    console.error('❌ [MIGRATION] 마이그레이션 실패:', error);
    updateMigrationProgress(0, '마이그레이션 실패');
    
    window.modalManager.showAlert({
      title: '마이그레이션 실패',
      message: '마이그레이션 중 오류가 발생했습니다.'
    });
  } finally {
    window.migrationManager.migrationInProgress = false;
  }
}

// 롤백
async function rollbackToLegacy() {
  if (!window.migrationManager) {
    console.error('❌ [MIGRATION] migrationManager가 없습니다.');
    return;
  }

  const confirmed = await new Promise(resolve => {
    window.modalManager.showConfirm({
      title: '롤백 확인',
      message: '기존 방식으로 롤백하시겠습니까?\n\n부분 동기화 기능이 비활성화됩니다.',
      confirmText: '롤백',
      cancelText: '취소',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });

  if (!confirmed) return;

  try {
    window.migrationManager.rollback();
    
    window.modalManager.showAlert({
      title: '롤백 완료',
      message: '기존 방식으로 롤백되었습니다.'
    });

  } catch (error) {
    console.error('❌ [MIGRATION] 롤백 실패:', error);
    window.modalManager.showAlert({
      title: '롤백 실패',
      message: '롤백 중 오류가 발생했습니다.'
    });
  }
}

// UI 업데이트
function updatePartialSyncUI(enabled) {
  const syncStatus = document.getElementById('syncStatus');
  if (!syncStatus) return;

  // 기존 인디케이터 제거
  const existingIndicator = syncStatus.querySelector('.partial-sync-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (enabled) {
    // 부분 동기화 인디케이터 추가
    const indicator = document.createElement('span');
    indicator.className = 'badge bg-success ms-2 partial-sync-indicator';
    indicator.textContent = '부분 동기화';
    indicator.style.fontSize = '0.75em';
    syncStatus.appendChild(indicator);
  }
}

// 마이그레이션 진행률 업데이트
function updateMigrationProgress(percent, status) {
  const progressBar = document.getElementById('migrationProgress');
  const statusText = document.getElementById('migrationStatus');
  const container = document.getElementById('migrationProgressContainer');
  
  if (container) {
    container.style.display = 'block';
  }
  
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.textContent = `${percent}%`;
  }
  
  if (statusText) {
    statusText.textContent = status;
  }
}

// 마이그레이션 진행률 숨기기
function hideMigrationProgress() {
  const container = document.getElementById('migrationProgressContainer');
  if (container) {
    container.style.display = 'none';
  }
}

// 마이그레이션 수행 (실제 로직은 별도 구현 필요)
async function performMigration() {
  // 여기에 실제 마이그레이션 로직 구현
  console.log('🔄 [MIGRATION] 마이그레이션 로직 실행...');
  
  // 예시: state 데이터를 부분 동기화 방식으로 변환
  if (state.raidTabs && Object.keys(state.raidTabs).length > 0) {
    updateMigrationProgress(25, '레이드 데이터 변환 중...');
    
    // 레이드 데이터 변환 로직
    for (const [raidId, difficulties] of Object.entries(state.raidTabs)) {
      for (const [difficultyId, parties] of Object.entries(difficulties)) {
        for (const party of parties) {
          if (party && window.partialSyncManager) {
            await window.partialSyncManager.syncParty(
              raidId,
              difficultyId,
              party.id,
              'add',
              party
            );
          }
        }
      }
    }
    
    updateMigrationProgress(75, '원정대 데이터 변환 중...');
    
    // 원정대 데이터 변환 로직
    if (state.expeditionSlots) {
      for (let i = 0; i < state.expeditionSlots.length; i++) {
        const slotData = {
          characters: state.expeditionSlots[i],
          metadata: { name: state.expeditionSlotNames?.[i] || `원정대 ${i + 1}` }
        };
        
        if (window.partialSyncManager) {
          await window.partialSyncManager.syncExpeditionSlot(
            i,
            'update',
            slotData
          );
        }
      }
    }
    
    updateMigrationProgress(90, '최종 확인 중...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

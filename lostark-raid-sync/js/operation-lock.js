// 작업 잠금 관리 시스템

// 작업 상태 관리
const operationLock = {
  isLocked: false,
  currentOperation: null,
  lockQueue: [],
  
  // 작업 잠금 획득
  async acquire(operationName, timeout = 30000) {
    if (this.isLocked) {
      console.log(`🔒 [LOCK] ${operationName} waiting for lock. Current: ${this.currentOperation}`);
      return false;
    }
    
    this.isLocked = true;
    this.currentOperation = operationName;
    
    console.log(`🔒 [LOCK] ${operationName} acquired`);
    
    // 타임아웃 설정
    if (timeout > 0) {
      setTimeout(() => {
        if (this.isLocked && this.currentOperation === operationName) {
          console.warn(`⚠️ [LOCK] ${operationName} timeout, releasing lock`);
          this.release(operationName);
        }
      }, timeout);
    }
    
    return true;
  },
  
  // 작업 잠금 해제
  release(operationName) {
    if (!this.isLocked || this.currentOperation !== operationName) {
      console.warn(`⚠️ [LOCK] Attempted to release lock by non-owner: ${operationName}, current: ${this.currentOperation}`);
      return false;
    }
    
    this.isLocked = false;
    const releasedOperation = this.currentOperation;
    this.currentOperation = null;
    
    console.log(`🔓 [LOCK] ${releasedOperation} released`);
    
    // 대기 중인 작업 처리
    this.processQueue();
    
    return true;
  },
  
  // 작업 잠금 상태 확인
  isLockedBy(operationName = null) {
    if (operationName) {
      return this.isLocked && this.currentOperation === operationName;
    }
    return this.isLocked;
  },
  
  // 현재 작업 정보
  getCurrentOperation() {
    return this.currentOperation;
  },
  
  // 대기열에 작업 추가
  addToQueue(operationName, callback) {
    this.lockQueue.push({ operationName, callback });
    console.log(`📝 [LOCK] ${operationName} added to queue. Queue size: ${this.lockQueue.length}`);
  },
  
  // 대기열 처리
  processQueue() {
    if (this.lockQueue.length > 0) {
      const next = this.lockQueue.shift();
      console.log(`🔄 [LOCK] Processing next in queue: ${next.operationName}`);
      setTimeout(() => next.callback(), 100); // 약간의 지연으로 UI 업데이트 허용
    }
  },
  
  // 강제 잠금 해제 (비상용)
  forceRelease() {
    const wasLocked = this.isLocked;
    const operation = this.currentOperation;
    
    this.isLocked = false;
    this.currentOperation = null;
    this.lockQueue = [];
    
    if (wasLocked) {
      console.warn(`🚨 [LOCK] Force released lock from ${operation}`);
    }
  }
};

// 작업 잠금 래퍼 함수
async function withOperationLock(operationName, operation, timeout = 30000) {
  // 잠금 획득 시도
  const acquired = await operationLock.acquire(operationName, timeout);
  
  if (!acquired) {
    // 잠금을 획득하지 못한 경우
    window.modalManager.showAlert({
      title: '작업 중',
      message: `현재 다른 작업(${operationLock.getCurrentOperation()})이 진행 중입니다. 잠시 후 다시 시도해주세요.`,
      confirmText: '확인'
    });
    return false;
  }
  
  try {
    // 작업 실행
    console.log(`🔄 [LOCK] Executing ${operationName}`);
    const result = await operation();
    console.log(`✅ [LOCK] ${operationName} completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ [LOCK] ${operationName} failed:`, error);
    window.modalManager.showAlert({
      title: '오류',
      message: `${operationName} 중 오류가 발생했습니다: ${error.message}`,
      confirmText: '확인'
    });
    throw error;
  } finally {
    // 잠금 해제
    operationLock.release(operationName);
  }
}

// 작업 잠금 상태 표시
function showOperationLockStatus() {
  if (operationLock.isLocked) {
    const statusDiv = document.getElementById('operationLockStatus');
    if (!statusDiv) {
      const div = document.createElement('div');
      div.id = 'operationLockStatus';
      div.className = 'alert alert-warning position-fixed top-0 start-50 translate-middle-x mt-2';
      div.style.zIndex = '9999';
      div.style.minWidth = '300px';
      div.innerHTML = `
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <span>${operationLock.getCurrentOperation()} 중...</span>
        </div>
      `;
      document.body.appendChild(div);
    }
  } else {
    const statusDiv = document.getElementById('operationLockStatus');
    if (statusDiv) {
      statusDiv.remove();
    }
  }
}

// 작업 잠금 상태 모니터링
setInterval(showOperationLockStatus, 100);

// 주요 작업 함수들에 잠금 적용
const lockedOperations = {
  // 레이드 관련 작업
  async addRaid() {
    return withOperationLock('레이드 추가', async () => {
      return await addNewRaid();
    });
  },
  
  async removeRaid(partyId) {
    return withOperationLock('레이드 삭제', async () => {
      return await removeRaid(partyId);
    });
  },
  
  async updateRaidSize(partyId, size) {
    return withOperationLock('레이드 크기 변경', async () => {
      return await setRaidSize(partyId, size);
    });
  },
  
  async updateRaidRequirements(partyId, field, value) {
    return withOperationLock('레이드 요구사항 변경', async () => {
      return await updateRaidRequirements(partyId, field, value);
    });
  },
  
  // 캐릭터 관련 작업
  async autoAssign() {
    return withOperationLock('자동 추천', async () => {
      return await autoAssign();
    });
  },
  
  async balancedAssign() {
    return withOperationLock('균등 분배', async () => {
      return await balancedAssign();
    });
  },
  
  // 레이드 관련 작업
  async selectRaid(raidId) {
    return withOperationLock('레이드 선택', async () => {
      return await selectRaid(raidId);
    });
  },
  
  async selectDifficulty(difficultyId) {
    return withOperationLock('난이도 선택', async () => {
      return await selectDifficulty(difficultyId);
    });
  },
  
  // 히스토리 관련 작업
  async refreshHistory() {
    return withOperationLock('히스토리 새로고침', async () => {
      return await refreshHistory();
    });
  },
  
  async clearHistory() {
    return withOperationLock('히스토리 정리', async () => {
      return await clearHistory();
    });
  }
};

// 전역으로 내보내기
window.operationLock = operationLock;
window.lockedOperations = lockedOperations;
window.withOperationLock = withOperationLock;

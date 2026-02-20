// State Manager - 동시성 문제 해결을 위한 상태 관리
class StateManager {
  constructor() {
    this.state = {};
    this.locks = new Map();
    this.pendingOperations = new Map();
    this.operationQueue = [];
    this.isProcessing = false;
  }

  // 상태 잠금 획득
  async acquireLock(key, timeout = 5000) {
    const lockKey = `lock_${key}`;
    const startTime = Date.now();
    
    while (this.locks.has(lockKey)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Lock timeout for key: ${key}`);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.locks.set(lockKey, {
      acquired: Date.now(),
      timeout: timeout
    });
    
    return lockKey;
  }

  // 상태 잠금 해제
  releaseLock(lockKey) {
    this.locks.delete(lockKey);
  }

  // 원자적 상태 업데이트
  async atomicUpdate(key, updateFn, options = {}) {
    const { 
      recordHistory = false, 
      autoSave = true, 
      renderUI = true,
      historyData = null 
    } = options;

    const lockKey = await this.acquireLock(key);
    
    try {
      // 현재 상태 복사
      const currentState = this.getDeepCopy(key);
      
      // 업데이트 함수 실행
      const newState = await updateFn(currentState);
      
      // 상태 업데이트
      this.setState(key, newState);
      
      // 히스토리 기록
      if (recordHistory && typeof window.recordHistory === 'function') {
        await window.recordHistory(
          'update',
          historyData?.type || { type: 'state_update', path: key },
          currentState,
          newState,
          historyData?.description || `State updated: ${key}`
        );
      }
      
      // UI 렌더링
      if (renderUI) {
        this.renderUIForKey(key);
      }
      
      // 자동 저장
      if (autoSave) {
        if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
          await window.realtimeSync.syncToFirebaseWithLock();
        } else {
          await window.autoSaveToDatabase();
        }
      }
      
      return newState;
    } finally {
      this.releaseLock(lockKey);
    }
  }

  // 깊은 복사
  getDeepCopy(key) {
    const value = this.getNestedValue(key);
    return value ? JSON.parse(JSON.stringify(value)) : null;
  }

  // 중첩 값 가져오기
  getNestedValue(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  // 중첩 값 설정
  setNestedValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);
    target[lastKey] = value;
  }

  // 상태 설정
  setState(key, value) {
    this.setNestedValue(key, value);
  }

  // 상태 가져오기
  getState(key) {
    return this.getNestedValue(key);
  }

  // 키에 따른 UI 렌더링
  renderUIForKey(key) {
    switch (key) {
      case 'raidTabs':
        if (typeof window.renderRaidParties === 'function') {
          window.renderRaidParties();
        }
        break;
      case 'expeditionSlots':
        if (typeof window.renderExpedition === 'function') {
          window.renderExpedition();
        }
        break;
      case 'expeditionSlotNames':
        if (typeof window.renderExpedition === 'function') {
          window.renderExpedition();
        }
        if (typeof window.renderExpeditionModal === 'function') {
          window.renderExpeditionModal();
        }
        break;
      default:
        // 전체 UI 렌더링
        if (typeof window.renderRaidParties === 'function') {
          window.renderRaidParties();
        }
        if (typeof window.renderExpedition === 'function') {
          window.renderExpedition();
        }
    }
  }

  // 작업 큐에 추가
  enqueueOperation(operation) {
    this.operationQueue.push(operation);
    this.processQueue();
  }

  // 작업 큐 처리
  async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      try {
        await operation();
      } catch (error) {
        console.error('❌ [STATE MANAGER] Operation failed:', error);
      }
    }

    this.isProcessing = false;
  }

  // 충돌 감지
  detectConflict(key, expectedValue) {
    const currentValue = this.getState(key);
    return JSON.stringify(currentValue) !== JSON.stringify(expectedValue);
  }

  // 충돌 해지 전략
  async resolveConflict(key, localState, remoteState) {
    // 1. 타임스탬프 기반 우선
    // 2. 사용자 우선순위
    // 3. 병합 전략
    
    // 현재는 원격 상태 우선 (나중에 개선 가능)
    this.setState(key, remoteState);
    return remoteState;
  }
}

// 전역 State Manager 인스턴스
window.stateManager = new StateManager();

// State Manager 임시 비활성화 - 충돌 방지

// 기존 state 객체를 State Manager와 연동 (비활성화)
// Object.defineProperty(window, 'state', {
//   get: function() {
//     return window.stateManager.state || window._originalState;
//   },
//   set: function(newValue) {
//     if (window.stateManager) {
//       window.stateManager.state = newValue;
//     } else {
//       window._originalState = newValue;
//     }
//   }
// });

// 현재 state를 State Manager로 이동 (비활성화)
// if (window.state && !window.stateManager.state) {
//   window.stateManager.state = {...window.state};
//   window._originalState = window.state;
// }

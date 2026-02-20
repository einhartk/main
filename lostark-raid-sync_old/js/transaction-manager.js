// Transaction Manager - Firebase 트랜잭션 관리
class TransactionManager {
  constructor() {
    this.pendingTransactions = new Map();
    this.retryCount = new Map();
    this.maxRetries = 3;
  }

  // 트랜잭션 실행
  async executeTransaction(transactionFn, options = {}) {
    const {
      key = 'default',
      timeout = 10000,
      retryOnConflict = true
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.pendingTransactions.set(transactionId, {
      key,
      startTime: Date.now(),
      status: 'pending'
    });

    try {
      const result = await this.runWithRetry(transactionFn, transactionId, {
        timeout,
        retryOnConflict,
        maxRetries: this.maxRetries
      });

      this.pendingTransactions.set(transactionId, {
        key,
        startTime: Date.now(),
        status: 'completed',
        result
      });

      // 완료된 트랜잭션 정리
      setTimeout(() => {
        this.pendingTransactions.delete(transactionId);
      }, 5000);

      return result;
    } catch (error) {
      this.pendingTransactions.set(transactionId, {
        key,
        startTime: Date.now(),
        status: 'failed',
        error: error.message
      });

      // 실패한 트랜잭션 정리
      setTimeout(() => {
        this.pendingTransactions.delete(transactionId);
      }, 10000);

      throw error;
    }
  }

  // 재시도 로직 포함 실행
  async runWithRetry(transactionFn, transactionId, options) {
    const { timeout, retryOnConflict, maxRetries } = options;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 타임아웃 Promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Transaction timeout')), timeout);
        });

        // 트랜잭션 실행
        const transactionPromise = transactionFn();

        // 경합 실행 (타임아웃 또는 트랜잭션 완료)
        const result = await Promise.race([transactionPromise, timeoutPromise]);

        return result;

      } catch (error) {
        lastError = error;
        
        if (!retryOnConflict || !this.isRetryableError(error)) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // 지수 백오프
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // 재시료 가능한 에러 확인
  isRetryableError(error) {
    const retryableErrors = [
      'transaction timeout',
      'connection lost',
      'permission denied',
      'network error',
      'write conflict'
    ];

    return retryableErrors.some(retryableError => 
      error.message.toLowerCase().includes(retryableError)
    );
  }

  // 공지 트랜잭션
  async broadcastTransaction(notification) {
    return this.executeTransaction(async () => {
      if (!window.realtimeSync || !window.realtimeSync.dbRef) {
        throw new Error('Realtime sync not available');
      }

      const broadcastRef = window.realtimeSync.dbRef.child('broadcast');
      
      // 트랜잭션으로 공지 전송
      await broadcastRef.transaction((currentData) => {
        // 이미 공지가 있고 만료되지 않았으면 실패
        if (currentData && currentData.isBroadcast) {
          const now = Date.now();
          if (!currentData.expiry || now <= currentData.expiry) {
            return; // 트랜잭션 취소 (기존 공지 유지)
          }
        }
        
        // 새 공지 설정
        return notification;
      });

      return notification;
    }, {
      key: 'broadcast',
      timeout: 5000,
      retryOnConflict: true
    });
  }

  // 데이터 동기화 트랜잭션
  async syncTransaction(compressedData) {
    return this.executeTransaction(async () => {
      if (!window.realtimeSync || !window.realtimeSync.dbRef) {
        throw new Error('Realtime sync not available');
      }

      const dataRef = window.realtimeSync.dbRef;
      
      // 트랜잭션으로 데이터 업데이트
      await dataRef.transaction((currentData) => {
        const current = currentData || {};
        
        // 활동 시간 업데이트
        return {
          ...current,
          d: compressedData,
          a: Date.now()
        };
      });

      return compressedData;
    }, {
      key: 'sync',
      timeout: 10000,
      retryOnConflict: true
    });
  }

  // 편집 잠금 트랜잭션
  async editLockTransaction(lockData) {
    return this.executeTransaction(async () => {
      if (!window.realtimeSync || !window.realtimeSync.dbRef) {
        throw new Error('Realtime sync not available');
      }

      const lockRef = window.realtimeSync.dbRef.child('editLock');
      
      // 트랜잭션으로 잠금 설정
      await lockRef.transaction((currentLock) => {
        // 이미 잠금이 있고 만료되지 않았으면 실패
        if (currentLock) {
          const now = Date.now();
          const lockTime = currentLock.timestamp || 0;
          const lockTimeout = 30000; // 30초 타임아웃
          
          if (now - lockTime < lockTimeout) {
            return; // 트랜잭션 취소 (잠금 유지)
          }
        }
        
        // 새 잠금 설정
        return lockData;
      });

      return lockData;
    }, {
      key: 'editLock',
      timeout: 3000,
      retryOnConflict: false
    });
  }

  // 슬롯 잠금 트랜잭션
  async slotLockTransaction(slotKey, lockData) {
    return this.executeTransaction(async () => {
      if (!window.realtimeSync || !window.realtimeSync.dbRef) {
        throw new Error('Realtime sync not available');
      }

      const lockRef = window.realtimeSync.dbRef.child(`slotLocks/${slotKey}`);
      
      // 트랜잭션으로 슬롯 잠금 설정
      await lockRef.transaction((currentLock) => {
        // 이미 잠금이 있고 만료되지 않았으면 실패
        if (currentLock) {
          const now = Date.now();
          const lockTime = currentLock.ts || 0;
          const ttl = currentLock.ttlMs || 30000;
          
          if (now - lockTime < ttl) {
            return; // 트랜잭션 취소 (잠금 유지)
          }
        }
        
        // 새 잠금 설정
        return lockData;
      });

      return lockData;
    }, {
      key: `slotLock_${slotKey}`,
      timeout: 3000,
      retryOnConflict: false
    });
  }

  // 대기 중인 트랜잭션 상태 확인
  getTransactionStatus(transactionId) {
    return this.pendingTransactions.get(transactionId);
  }

  // 모든 대기 중인 트랜잭션 확인
  getAllTransactions() {
    return Array.from(this.pendingTransactions.entries()).map(([id, tx]) => ({
      id,
      ...tx
    }));
  }

  // 트랜잭션 정리
  cleanup() {
    const now = Date.now();
    const expiredTransactions = [];

    for (const [id, tx] of this.pendingTransactions.entries()) {
      const age = now - tx.startTime;
      
      // 30초 이상 된 대기 중 트랜잭션 정리
      if (tx.status === 'pending' && age > 30000) {
        expiredTransactions.push(id);
      }
      
      // 10초 이상 된 완료/실패 트랜잭션 정리
      if ((tx.status === 'completed' || tx.status === 'failed') && age > 10000) {
        expiredTransactions.push(id);
      }
    }

    expiredTransactions.forEach(id => {
      this.pendingTransactions.delete(id);
    });
  }
}

// 전역 Transaction Manager 인스턴스
window.transactionManager = new TransactionManager();

// 주기적 정리
setInterval(() => {
  window.transactionManager.cleanup();
}, 60000); // 1분마다 정리

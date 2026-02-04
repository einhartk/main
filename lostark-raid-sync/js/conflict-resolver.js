// Conflict Resolver - 데이터 충돌 감지 및 해결
class ConflictResolver {
  constructor() {
    this.conflictHistory = [];
    this.resolutionStrategies = {
      'last_writer_wins': this.lastWriterWins.bind(this),
      'merge': this.merge.bind(this),
      'user_priority': this.userPriority.bind(this),
      'timestamp_priority': this.timestampPriority.bind(this),
      'manual': this.manualResolution.bind(this)
    };
  }

  // 충돌 감지
  detectConflict(localData, remoteData, path = '') {
    const conflicts = [];
    
    // 기본 타입 비교
    if (typeof localData !== typeof remoteData) {
      conflicts.push({
        path,
        type: 'type_mismatch',
        local: typeof localData,
        remote: typeof remoteData
      });
      return conflicts;
    }
    
    // null/undefined 처리
    if (localData === null || localData === undefined || remoteData === null || remoteData === undefined) {
      if (localData !== remoteData) {
        conflicts.push({
          path,
          type: 'null_undefined_mismatch',
          local: localData,
          remote: remoteData
        });
      }
      return conflicts;
    }
    
    // 객체 비교
    if (typeof localData === 'object' && !Array.isArray(localData)) {
      const localKeys = Object.keys(localData);
      const remoteKeys = Object.keys(remoteData);
      const allKeys = new Set([...localKeys, ...remoteKeys]);
      
      for (const key of allKeys) {
        const subPath = path ? `${path}.${key}` : key;
        const subConflicts = this.detectConflict(localData[key], remoteData[key], subPath);
        conflicts.push(...subConflicts);
      }
    }
    // 배열 비교
    else if (Array.isArray(localData)) {
      const maxLength = Math.max(localData.length, remoteData.length);
      
      for (let i = 0; i < maxLength; i++) {
        const subPath = `${path}[${i}]`;
        const subConflicts = this.detectConflict(localData[i], remoteData[i], subPath);
        conflicts.push(...subConflicts);
      }
    }
    // 기본값 비교
    else if (localData !== remoteData) {
      conflicts.push({
        path,
        type: 'value_mismatch',
        local: localData,
        remote: remoteData
      });
    }
    
    return conflicts;
  }

  // 충돌 해결
  async resolveConflict(conflicts, strategy = 'last_writer_wins', context = {}) {
    const resolutionFn = this.resolutionStrategies[strategy];
    if (!resolutionFn) {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }

    const resolution = await resolutionFn(conflicts, context);
    
    // 충돌 기록
    this.conflictHistory.push({
      timestamp: Date.now(),
      conflicts: conflicts,
      strategy: strategy,
      resolution: resolution,
      context: context
    });

    return resolution;
  }

  // 마지막 쓰기 우선 전략
  lastWriterWins(conflicts, context) {
    const resolution = {};
    
    for (const conflict of conflicts) {
      // 원격 데이터 우선 (서버가 최신이라고 가정)
      this.setNestedValue(resolution, conflict.path, conflict.remote);
    }
    
    return resolution;
  }

  // 병합 전략
  merge(conflicts, context) {
    const resolution = {};
    
    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'value_mismatch':
          // 숫자는 더 큰 값 우선
          if (typeof conflict.local === 'number' && typeof conflict.remote === 'number') {
            const mergedValue = Math.max(conflict.local, conflict.remote);
            this.setNestedValue(resolution, conflict.path, mergedValue);
          }
          // 문자열은 결합 (길이 제한)
          else if (typeof conflict.local === 'string' && typeof conflict.remote === 'string') {
            const mergedValue = conflict.local.length > conflict.remote.length ? conflict.local : conflict.remote;
            this.setNestedValue(resolution, conflict.path, mergedValue);
          }
          // 그 외에는 원격 우선
          else {
            this.setNestedValue(resolution, conflict.path, conflict.remote);
          }
          break;
          
        case 'array_mismatch':
          // 배열은 긴 쪽 우선
          const localArray = Array.isArray(conflict.local) ? conflict.local : [];
          const remoteArray = Array.isArray(conflict.remote) ? conflict.remote : [];
          const mergedArray = localArray.length > remoteArray.length ? localArray : remoteArray;
          this.setNestedValue(resolution, conflict.path, mergedArray);
          break;
          
        default:
          // 기본적으로 원격 우선
          this.setNestedValue(resolution, conflict.path, conflict.remote);
      }
    }
    
    return resolution;
  }

  // 사용자 우선 전략
  userPriority(conflicts, context) {
    const resolution = {};
    const currentUser = context.currentUser || 'unknown';
    
    for (const conflict of conflicts) {
      // 사용자 정보가 있는 경우 확인
      if (conflict.localUser === currentUser) {
        this.setNestedValue(resolution, conflict.path, conflict.local);
      } else {
        this.setNestedValue(resolution, conflict.path, conflict.remote);
      }
    }
    
    return resolution;
  }

  // 타임스탬프 우선 전략
  timestampPriority(conflicts, context) {
    const resolution = {};
    
    for (const conflict of conflicts) {
      const localTime = conflict.localTimestamp || 0;
      const remoteTime = conflict.remoteTimestamp || 0;
      
      if (localTime > remoteTime) {
        this.setNestedValue(resolution, conflict.path, conflict.local);
      } else {
        this.setNestedValue(resolution, conflict.path, conflict.remote);
      }
    }
    
    return resolution;
  }

  // 수동 해결 (사용자 선택)
  async manualResolution(conflicts, context) {
    return new Promise((resolve) => {
      const conflictModal = this.createConflictModal(conflicts, (selectedResolutions) => {
        const resolution = {};
        
        for (const { path, choice } of selectedResolutions) {
          const conflict = conflicts.find(c => c.path === path);
          if (conflict) {
            const value = choice === 'local' ? conflict.local : conflict.remote;
            this.setNestedValue(resolution, path, value);
          }
        }
        
        resolve(resolution);
      });
      
      conflictModal.show();
    });
  }

  // 충돌 해결 모달 생성
  createConflictModal(conflicts, onResolve) {
    const modalId = `conflictModal_${Date.now()}`;
    
    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-exclamation-triangle text-warning"></i>
                데이터 충돌 감지
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning">
                <strong>${conflicts.length}개의 충돌이 감지되었습니다.</strong>
                해결할 방법을 선택하세요.
              </div>
              <div class="conflict-list">
                ${conflicts.map((conflict, index) => `
                  <div class="card mb-2">
                    <div class="card-body">
                      <h6 class="card-title">${conflict.path}</h6>
                      <div class="row">
                        <div class="col-md-6">
                          <label class="form-label">
                            <input type="radio" name="conflict_${index}" value="local" checked>
                            <strong>로컬:</strong>
                          </label>
                          <div class="border p-2 bg-light">
                            <pre>${JSON.stringify(conflict.local, null, 2)}</pre>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">
                            <input type="radio" name="conflict_${index}" value="remote">
                            <strong>원격:</strong>
                          </label>
                          <div class="border p-2 bg-light">
                            <pre>${JSON.stringify(conflict.remote, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
              <button type="button" class="btn btn-primary" id="${modalId}_resolve">해결 적용</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    
    // 해결 버튼 이벤트
    document.getElementById(`${modalId}_resolve`).addEventListener('click', () => {
      const selectedResolutions = conflicts.map((conflict, index) => {
        const choice = document.querySelector(`input[name="conflict_${index}"]:checked`).value;
        return { path: conflict.path, choice };
      });
      
      onResolve(selectedResolutions);
      modal.hide();
    });
    
    // 모달 정리
    modalElement.addEventListener('hidden.bs.modal', () => {
      modalElement.remove();
    }, { once: true });
    
    return {
      show: () => modal.show()
    };
  }

  // 중첩 값 설정
  setNestedValue(obj, path, value) {
    const keys = path.split(/[\.\[\]]/).filter(key => key !== '');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // 충돌 기록 확인
  getConflictHistory(limit = 10) {
    return this.conflictHistory.slice(-limit);
  }

  // 충돌 통계
  getConflictStats() {
    const stats = {
      total: this.conflictHistory.length,
      byStrategy: {},
      byType: {},
      recent: this.conflictHistory.slice(-5)
    };

    for (const conflict of this.conflictHistory) {
      stats.byStrategy[conflict.strategy] = (stats.byStrategy[conflict.strategy] || 0) + 1;
      
      for (const c of conflict.conflicts) {
        stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
      }
    }

    return stats;
  }
}

// 전역 Conflict Resolver 인스턴스
window.conflictResolver = new ConflictResolver();

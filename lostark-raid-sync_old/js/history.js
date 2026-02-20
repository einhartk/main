// 히스토리 관련 함수

// 객체 변경 감지 및 diff 생성
function generateDiff(before, after, path = '') {
  const changes = {};
  
  // null/undefined 처리 - 명확한 구분
  const isBeforeNull = before === null || before === undefined;
  const isAfterNull = after === null || after === undefined;
  
  // 둘 다 null이면 변경 없음
  if (isBeforeNull && isAfterNull) {
    return changes;
  }
  
  // 한쪽만 null이면 전체 변경
  if (isBeforeNull !== isAfterNull) {
    // Firebase에 저장할 수 있는 키로 변환 (특수문자 제거)
    // path가 비어있으면 기본 키 사용
    const safeKey = (path || 'root').replace(/[.#$\[\]]/g, '_');
    if (safeKey) {  // 빈 키가 아닌 경우만 추가
      changes[safeKey] = {
        before: before,
        after: after
      };
    }
    return changes;
  }
  
  // 둘 다 객체인 경우
  const beforeObj = before;
  const afterObj = after;
  
  // after의 모든 키 확인
  for (const key in afterObj) {
    const beforeValue = beforeObj[key];
    const afterValue = afterObj[key];
    
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      if (typeof afterValue === 'object' && afterValue !== null && !Array.isArray(afterValue)) {
        const nestedChanges = generateDiff(beforeValue, afterValue, `${path}.${key}`);
        Object.assign(changes, nestedChanges);
      } else {
        // Firebase에 저장할 수 있는 키로 변환
        const fullPath = path ? `${path}.${key}` : key;
        const safeKey = fullPath.replace(/[.#$\[\]]/g, '_');
        if (safeKey) {  // 빈 키가 아닌 경우만 추가
          changes[safeKey] = {
            before: beforeValue,
            after: afterValue
          };
        }
      }
    }
  }
  
  // before에만 있고 after에는 없는 키 확인 (삭제된 경우)
  for (const key in beforeObj) {
    if (!(key in afterObj)) {
      const beforeValue = beforeObj[key];
      
      if (typeof beforeValue === 'object' && beforeValue !== null && !Array.isArray(beforeValue)) {
        const nestedChanges = generateDiff(beforeValue, null, `${path}.${key}`);
        Object.assign(changes, nestedChanges);
      } else {
        // Firebase에 저장할 수 있는 키로 변환
        const fullPath = path ? `${path}.${key}` : key;
        const safeKey = fullPath.replace(/[.#$\[\]]/g, '_');
        if (safeKey) {  // 빈 키가 아닌 경우만 추가
          changes[safeKey] = {
            before: beforeValue,
            after: null
          };
        }
      }
    }
  }
  
  return changes;
}

// 히스토리 엔트리 생성
function createHistoryEntry(action, target, before, after, description) {
  const userId = window.realtimeSync ? 
    window.realtimeSync.getBaseUserKey(window.realtimeSync.currentUser) : 
    'local_user';
    
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    userId,
    action,
    target,
    before: before,
    after: after,
    changes: generateDiff(before, after),
    description
  };
}

// 히스토리에 변경 기록
async function recordHistory(action, target, before, after, description) {
  try {
    const entry = createHistoryEntry(action, target, before, after, description);

    // 디버깅: 히스토리 기록 시도
    console.log('📝 [HISTORY] 히스토리 기록 시도:', {
      action,
      description,
      hasBefore: !!entry.before,
      hasAfter: !!entry.after,
      beforeType: typeof entry.before,
      afterType: typeof entry.after
    });

    // 추가/삭제 작업은 before가 없어도 기록
    if (action === 'add' || action === 'delete') {
      console.log('📝 [HISTORY] 추가/삭제 작업: before 데이터 없어도 기록');
    } else {
      // 수정 작업은 before/after가 모두 있어야 함
      if (!entry.before || !entry.after || JSON.stringify(entry.before) === JSON.stringify(entry.after)) {
        console.log('📝 [HISTORY] 히스토리 기록 건너뜀: 데이터 동일 또는 없음');
        return;
      }
    }

    state.history.entries.push(entry);

    while (state.history.entries.length > state.history.maxEntries) {
      state.history.entries.shift();
    }

    if (window.realtimeSync && typeof window.realtimeSync.isSyncActive === 'function' && window.realtimeSync.isSyncActive()) {
      const cleanEntry = JSON.parse(JSON.stringify(entry, (key, value) => {
        if (value === undefined) return null;
        return value;
      }));

      const hasUndefined = JSON.stringify(cleanEntry).includes('undefined');
      if (hasUndefined) {
        console.error('📝 [HISTORY] 경고: 정제된 데이터에 여전히 undefined 값이 있습니다!');
      }

      const historyRef = window.realtimeSync.dbRef.child('history');

      try {
        await historyRef.push(cleanEntry);
        console.log('📝 [HISTORY] Firebase 히스토리 저장 성공:', description);
      } catch (error) {
        console.error('📝 [HISTORY] Firebase 저장 실패:', error);
        if (error.message.includes('undefined')) {
          return;
        }
      }

      await cleanupFirebaseHistory();
    }
    
    // 히스토리 리스트 즉시 업데이트
    if (typeof renderHistoryList === 'function') {
      renderHistoryList();
    }
  } catch (error) {
    console.error('📝 [HISTORY] 히스토리 기록 실패:', error);
  }
}

// Firebase 히스토리 정리
async function cleanupFirebaseHistory() {
  let beforeCount = state.history.entries.length;
  try {
    if (!window.realtimeSync || typeof window.realtimeSync.isSyncActive !== 'function' || !window.realtimeSync.isSyncActive()) {
      return;
    }
    
    const historyRef = window.realtimeSync.dbRef.child('history');
    const snapshot = await historyRef.once('value');
    const allHistory = snapshot.val() || {};
    
    // Firebase 히스토리를 배열로 변환하고 정렬
    const historyArray = Object.values(allHistory)
      .filter(entry => entry && entry.timestamp)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // **강화된 정리: 최대 개수 + 7일 이상 된 데이터 삭제**
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000); // 7일 전
    const maxEntries = state.history.maxEntries;
    
    let toRemove = [];
    
    // 1. 7일 이상 된 데이터 모두 제거
    const oldEntries = historyArray.filter(entry => entry.timestamp < sevenDaysAgo);
    toRemove.push(...oldEntries);
    
    // 2. 최대 개수 초과 데이터 제거 (7일 이내 데이터만 대상)
    const recentEntries = historyArray.filter(entry => entry.timestamp >= sevenDaysAgo);
    if (recentEntries.length > maxEntries) {
      const excessEntries = recentEntries.slice(maxEntries);
      toRemove.push(...excessEntries);
    }
    
    // 중복 제거 - ID나 timestamp로 고유한 항목만 남기기
    const uniqueMap = new Map();
    for (const entry of toRemove) {
      const key = entry.id || entry.timestamp;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, entry);
      }
    }
    const uniqueToRemove = Array.from(uniqueMap.values());
    
    // 정리 전 개수 기록
    const afterCount = Object.keys(allHistory).length;
    
    if (uniqueToRemove.length > 0) {
      console.log(` [HISTORY] Firebase 히스토리 정리: ${uniqueToRemove.length}개 항목 삭제`);
      
      // Firebase 키를 직접 사용하여 일괄 삭제
      const allFirebaseKeys = Object.keys(allHistory);
      console.log(` [HISTORY] 전체 Firebase 키: ${allFirebaseKeys.length}개`);
      
      // 삭제할 키 목록 생성
      const keysToDelete = [];
      for (const entry of uniqueToRemove) {
        // 1. ID로 먼저 찾기
        let matchingKey = allFirebaseKeys.find(key => {
          const item = allHistory[key];
          return item && item.id === entry.id;
        });
        
        // 2. ID로 못 찾으면 timestamp로 찾기
        if (!matchingKey) {
          matchingKey = allFirebaseKeys.find(key => {
            const item = allHistory[key];
            return item && item.timestamp === entry.timestamp;
          });
        }
        
        // 3. 그래도 못 찾으면 여러 방법 시도
        if (!matchingKey) {
          // 콘솔에 디버깅 정보 추가
          console.warn(` [HISTORY] 키를 찾을 수 없음:`, {
            entryId: entry.id,
            entryTimestamp: entry.timestamp,
            availableKeys: allFirebaseKeys.slice(0, 10) // 처음 10개만 표시
          });
          continue;
        }
        
        keysToDelete.push(matchingKey);
      }
      
      // 중복 제거
      const uniqueKeysToDelete = Array.from(new Set(keysToDelete));
      
      if (uniqueKeysToDelete.length > 0) {
        console.log(` [HISTORY] 일괄 삭제 시작: ${uniqueKeysToDelete.length}개 키`);
        
        // 일괄 삭제 실행
        const deletePromises = uniqueKeysToDelete.map(key => 
          historyRef.child(key).remove()
            .then(() => console.log(` [HISTORY] 일괄 삭제 완료: ${key}`))
            .catch(error => console.error(` [HISTORY] 일괄 삭제 실패: ${key}`, error))
        );
        
        await Promise.all(deletePromises);
        console.log(` [HISTORY] 일괄 삭제 완료: ${uniqueKeysToDelete.length}개 항목`);
        
        // 삭제 확인
        const afterSnapshot = await historyRef.once('value');
        const afterCount = Object.keys(afterSnapshot.val() || {}).length;
        console.log(` [HISTORY] 정리 결과:`);
        console.log(`- 시도 삭제: ${uniqueToRemove.length}개`);
        console.log(`- 성공 삭제: ${uniqueKeysToDelete.length}개`);
        console.log(`- 정리 후 남은 항목: ${afterCount}개`);
        console.log(`- 실제 삭제된: ${Object.keys(allHistory).length - afterCount}개`);
      } else {
        console.log(' [HISTORY] 삭제할 항목 없음');
      }
    }
    
  } catch (error) {
    console.error(' [HISTORY] Firebase 히스토리 정리 실패:', error);
  }
  
  const afterCount = state.history.entries.length;
  const removedCount = beforeCount - afterCount;
  
  if (removedCount > 0) {
    console.log(` [HISTORY] 로컬 히스토리 정리: ${removedCount}개 항목 삭제`);
  }
}

// 로컬 히스토리 정리
function cleanupLocalHistory() {
  const maxEntries = state.history.maxEntries;
  
  while (state.history.entries.length > maxEntries) {
    state.history.entries.shift();
  }
}

// 히스토리 통계 정보
function getHistoryStats() {
  const entries = state.history.entries;
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const stats = {
    total: entries.length,
    maxEntries: state.history.maxEntries,
    usage: Math.round((entries.length / state.history.maxEntries) * 100),
    last24h: entries.filter(e => e.timestamp > oneDayAgo).length,
    lastWeek: entries.filter(e => e.timestamp > oneWeekAgo).length,
    oldestEntry: entries.length > 0 ? new Date(entries[0].timestamp).toLocaleString() : '없음',
    newestEntry: entries.length > 0 ? new Date(entries[entries.length - 1].timestamp).toLocaleString() : '없음',
    operations: {}
  };
  
  // 작업 유형별 통계
  entries.forEach(entry => {
    const op = entry.operation || 'unknown';
    stats.operations[op] = (stats.operations[op] || 0) + 1;
  });
  
  return stats;
}

// 원정대에서 이름으로 캐릭터 찾기
function findCharacterByNameInExpedition(characterName) {
  for (const slot of state.expeditionSlots) {
    for (const character of slot) {
      if (character && character.name === characterName) {
        return {
          id: character.id,
          name: character.name,
          ilvl: character.ilvl || '0',
          combatPower: character.combatPower || '0',
          role: character.role,
          image: character.image || 'img/default-character.png',
          className: character.className,
          level: character.level
        };
      }
    }
  }
  return null;
}

// 히스토리 모달 표시
function showHistoryModal() {
  const modalHtml = `
    <div class="modal fade" id="historyModal" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-clock-history"></i> 수정 히스토리
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- 히스토리 통계 -->
            <div class="alert alert-info mb-3" id="historyStats">
              <div class="row">
                <div class="col-md-3">
                  <small class="text-muted">전체 개수</small>
                  <div class="fw-bold" id="historyTotalCount">0</div>
                </div>
                <div class="col-md-3">
                  <small class="text-muted">사용률</small>
                  <div class="fw-bold" id="historyUsage">0%</div>
                </div>
                <div class="col-md-3">
                  <small class="text-muted">최근 24시간</small>
                  <div class="fw-bold" id="historyLast24h">0</div>
                </div>
                <div class="col-md-3">
                  <small class="text-muted">최근 7일</small>
                  <div class="fw-bold" id="historyLastWeek">0</div>
                </div>
              </div>
            </div>
            
            <div class="row mb-3">
              <div class="col-md-4">
                <label class="form-label small">필터</label>
                <select class="form-select form-select-sm" id="historyFilter">
                  <option value="all">전체</option>
                  <option value="add">추가</option>
                  <option value="update">수정</option>
                  <option value="delete">삭제</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label small">기능</label>
                <div class="btn-group btn-group-sm w-100">
                  <button class="btn btn-sm btn-outline-primary" onclick="refreshHistory()">
                    <i class="bi bi-arrow-clockwise"></i> 새로고침
                  </button>
                  <button class="btn btn-sm btn-outline-warning" onclick="clearHistory()">
                    <i class="bi bi-trash"></i> 정리
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="cleanupFirebaseHistory()">
                    <i class="bi bi-database"></i> DB 정리
                  </button>
                </div>
              </div>
              <div class="col-md-4">
                <label class="form-label small">최대 개수</label>
                <div class="input-group input-group-sm">
                  <input type="number" class="form-control" id="historyMaxEntries" value="50" min="10" max="500">
                  <button class="btn btn-outline-secondary" onclick="updateHistoryMaxEntries()">적용</button>
                </div>
              </div>
            </div>
            <div id="historyList" class="list-group">
              <!-- 히스토리 목록 -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById('historyModal');
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 모달 열기
  const modal = new bootstrap.Modal(document.getElementById('historyModal'));
  modal.show();

  // 히스토리 로드
  loadHistory();
}

// 히스토리 로드
async function loadHistory() {
  try {
    // Firebase에서 히스토리 로드 (실시간 동기화 시)
    if (window.realtimeSync && typeof window.realtimeSync.isSyncActive === 'function' && window.realtimeSync.isSyncActive()) {
      const historyRef = window.realtimeSync.dbRef.child('history');
      const snapshot = await historyRef.once('value');
      const remoteHistory = snapshot.val() || {};

      // 원격 히스토리만 사용 (중복 방지)
      const remoteEntries = Object.values(remoteHistory)
        .map((entry, index) => {
          
          // Firebase에서 로드된 데이터에 id가 없는 경우 생성
          if (!entry.id) {
            entry.id = `firebase_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
          }
          
          // 필수 필드 확인
          if (!entry.action) entry.action = 'unknown';
          if (!entry.timestamp) entry.timestamp = Date.now();
          if (!entry.userId) entry.userId = 'unknown_user';
          if (!entry.description) entry.description = '알 수 없는 작업';
          if (!entry.changes) entry.changes = {};
          if (!entry.target) entry.target = { type: 'unknown' };
          
          return entry;
        })
        .sort((a, b) => b.timestamp - a.timestamp);
      
      state.history.entries = remoteEntries.slice(0, state.history.maxEntries);
      
    }
  } catch (error) {
    console.error('히스토리 로드 실패:', error);
  }
  
  // 필터 옵션 업데이트
  updateFilterOptions();
  renderHistoryList();
  
  // 통계 정보 업데이트
  updateHistoryStats();
}

// 히스토리 목록 렌더링
function renderHistoryList() {
  const container = document.getElementById('historyList');
  if (!container) return;
  
  let entries = state.history.entries.sort((a, b) => b.timestamp - a.timestamp);
  entries = applyFilters(entries);
  
  const html = entries.map((entry, index) => {
    const date = new Date(entry.timestamp).toLocaleString('ko-KR');
    const actionIcon = {
      'add': 'bi-plus-circle text-success',
      'update': 'bi-pencil-square text-warning',
      'delete': 'bi-trash text-danger'
    }[entry.action] || 'bi-info-circle';
    
    // id가 없는 경우 생성 (더 안전한 방법)
    if (!entry.id) {
      entry.id = `entry_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // HTML 이스케이프 처리
    const safeId = String(entry.id).replace(/'/g, "\\'");
    const safeDescription = String(entry.description || '').replace(/'/g, "\\'");
    const safeUserId = String(entry.userId || '').replace(/'/g, "\\'");
    
    return `
      <div class="list-group-item" data-entry-id="${entry.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-2">
              <i class="bi ${actionIcon} me-2"></i>
              <strong>${safeDescription}</strong>
            </div>
            <div class="small text-muted mb-2">
              ${renderChangesPreview(entry.changes)}
            </div>
            <div class="d-flex justify-content-between">
              <small class="text-muted">
                <i class="bi bi-person"></i> ${safeUserId}
              </small>
              <small class="text-muted">
                <i class="bi bi-clock"></i> ${date}
              </small>
            </div>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-info btn-sm" onclick="showHistoryDetail('${safeId}')" title="상세 보기">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-warning btn-sm" onclick="rollbackToHistory('${safeId}')" title="이 시점으로 롤백">
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html || '<div class="text-muted p-3">히스토리가 없습니다.</div>';
  
  // 이벤트 리스너 추가 (더 안전한 방법)
  container.querySelectorAll('[onclick*="showHistoryDetail"]').forEach(button => {
    const entryId = button.getAttribute('onclick').match(/showHistoryDetail\('([^']+)'\)/)?.[1];
    if (entryId) {
      button.removeAttribute('onclick');
      button.addEventListener('click', () => showHistoryDetail(entryId));
    }
  });
  
  container.querySelectorAll('[onclick*="rollbackToHistory"]').forEach(button => {
    const entryId = button.getAttribute('onclick').match(/rollbackToHistory\('([^']+)'\)/)?.[1];
    if (entryId) {
      button.removeAttribute('onclick');
      button.addEventListener('click', () => rollbackToHistory(entryId));
    }
  });
}

// 변경 내역 미리보기
function renderChangesPreview(changes) {
  if (!changes || typeof changes !== 'object') {
    return '<div class="small text-muted">변경 내역 없음</div>';
  }
  
  const items = Object.entries(changes).slice(0, 3); // 최대 3개만 표시
  
  if (items.length === 0) {
    return '<div class="small text-muted">변경 내역 없음</div>';
  }
  
  return items.map(([safePath, change]) => {
    // 안전한 키를 다시 원래 경로로 변환 (밑줄을 점으로 되돌리기)
    const originalPath = safePath.replace(/_/g, '.');
    
    return `
      <div class="small text-muted">
        <code>${originalPath}</code>
        <br>
        <span class="text-danger">${JSON.stringify(change.before)}</span>
        →
        <span class="text-success">${JSON.stringify(change.after)}</span>
      </div>
    `;
  }).join('');
}

// 히스토리 통계 업데이트
function updateHistoryStats() {
  const stats = getHistoryStats();
  
  document.getElementById('historyTotalCount').textContent = stats.total;
  document.getElementById('historyUsage').textContent = `${stats.usage}%`;
  document.getElementById('historyLast24h').textContent = stats.last24h;
  document.getElementById('historyLastWeek').textContent = stats.lastWeek;
  document.getElementById('historyMaxEntries').value = stats.maxEntries;
  
  // 사용률에 따른 색상 변경
  const usageElement = document.getElementById('historyUsage');
  if (stats.usage >= 90) {
    usageElement.className = 'fw-bold text-danger';
  } else if (stats.usage >= 70) {
    usageElement.className = 'fw-bold text-warning';
  } else {
    usageElement.className = 'fw-bold text-success';
  }
}

// 히스토리 최대 개수 변경
function updateHistoryMaxEntries() {
  const input = document.getElementById('historyMaxEntries');
  const newMax = parseInt(input.value);
  
  if (isNaN(newMax) || newMax < 10 || newMax > 500) {
    window.modalManager.showAlert({
      title: '오류',
      message: '최대 개수는 10에서 500 사이의 숫자여야 합니다.',
      confirmText: '확인'
    });
    return;
  }
  
  const oldMax = state.history.maxEntries;
  state.history.maxEntries = newMax;
  
  // 새로운 최대 개수에 맞게 히스토리 정리
  cleanupLocalHistory();
  
  // 통계 업데이트
  updateHistoryStats();
  
  window.modalManager.showAlert({
    title: '설정 변경',
    message: `히스토리 최대 개수가 ${oldMax}에서 ${newMax}으로 변경되었습니다.`,
    confirmText: '확인'
  });
}

// 히스토리 새로고침
async function refreshHistory() {
  await loadHistory();
  updateHistoryStats();
  
  window.modalManager.showAlert({
    title: '새로고침 완료',
    message: `히스토리를 새로고쳤습니다. (${state.history.entries.length}개 항목)`,
    confirmText: '확인'
  });
}

// 필터 옵션 업데이트
function updateFilterOptions() {
  const userFilter = document.getElementById('userFilter');
  if (!userFilter) return;
  
  // 고유한 사용자 목록 추출
  const users = [...new Set(state.history.entries.map(entry => entry.userId))];
  
  // 기존 옵션 저장
  const currentValue = userFilter.value;
  
  // 옵션 업데이트
  userFilter.innerHTML = '<option value="">모든 사용자</option>' +
    users.map(user => `<option value="${user}">${user}</option>`).join('');
  
  // 이전 선택 복원
  userFilter.value = currentValue;
}

// 필터링 적용
function applyFilters(entries) {
  const userFilter = document.getElementById('userFilter')?.value || '';
  const actionFilter = document.getElementById('actionFilter')?.value || '';
  
  return entries.filter(entry => {
    if (userFilter && entry.userId !== userFilter) return false;
    if (actionFilter && entry.action !== actionFilter) return false;
    return true;
  });
}

// 필터링 변경
function filterHistory() {
  renderHistoryList();
}

// 히스토리 상세 보기
function showHistoryDetail(entryId) {
  const entry = state.history.entries.find(e => e.id === entryId);
  if (!entry) return;
  
  const modalHtml = `
    <div class="modal fade" id="historyDetailModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-clock-history"></i> 히스토리 상세 정보
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-md-6">
                <strong>설명:</strong> ${entry.description}
              </div>
              <div class="col-md-6">
                <strong>사용자:</strong> ${entry.userId}
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-md-6">
                <strong>시간:</strong> ${new Date(entry.timestamp).toLocaleString('ko-KR')}
              </div>
              <div class="col-md-6">
                <strong>액션:</strong> ${entry.action}
              </div>
            </div>
            <div class="mb-3">
              <strong>변경 내역:</strong>
              <div class="mt-2">
                ${renderDetailedChanges(entry.changes)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById('historyDetailModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 모달 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // 모달 열기
  const modal = new bootstrap.Modal(document.getElementById('historyDetailModal'));
  modal.show();
}

// 상세 변경 내역 렌더링
function renderDetailedChanges(changes) {
  if (!changes || typeof changes !== 'object') {
    return '<div class="text-muted">변경 내역 없음</div>';
  }
  
  return Object.entries(changes).map(([safePath, change]) => {
    const originalPath = safePath.replace(/_/g, '.');
    
    return `
      <div class="card mb-2">
        <div class="card-header py-2">
          <small><code>${originalPath}</code></small>
        </div>
        <div class="card-body py-2">
          <div class="row">
            <div class="col-md-6">
              <small class="text-muted">변경 전:</small>
              <pre class="bg-light p-2 rounded small">${JSON.stringify(change.before, null, 2)}</pre>
            </div>
            <div class="col-md-6">
              <small class="text-muted">변경 후:</small>
              <pre class="bg-light p-2 rounded small">${JSON.stringify(change.after, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 롤백 기능
async function rollbackToHistory(entryId) {
  
  // entryId 유효성 검사
  if (!entryId || typeof entryId !== 'string') {
    console.error('🔄 [ROLLBACK] Invalid entryId:', entryId);
    window.modalManager.showAlert({
      title: '롤백 실패',
      message: '유효하지 않은 히스토리 항목입니다.'
    });
    return;
  }
  
  const entry = state.history.entries.find(e => e.id === entryId);
  if (!entry) {
    console.error('🔄 [ROLLBACK] Entry not found for entryId:', entryId);
    // ID로 찾지 못하면 인덱스로 시도
    const index = parseInt(entryId.replace(/^[^0-9]*/, ''));
    if (!isNaN(index) && index >= 0 && index < state.history.entries.length) {
      const fallbackEntry = state.history.entries[index];
      if (fallbackEntry) {
        await performRollbackWithConfirmation(fallbackEntry);
        return;
      }
    }
    
    window.modalManager.showAlert({
      title: '롤백 실패',
      message: '히스토리 항목을 찾을 수 없습니다.'
    });
    return;
  }
  
  await performRollbackWithConfirmation(entry);
}

// 롤백 확인 및 수행
async function performRollbackWithConfirmation(entry) {
  // 액션별 메시지 설정
  let actionText = '';
  switch (entry.action) {
    case 'add':
      actionText = '추가한 캐릭터를 다시 제거하시겠습니까?';
      break;
    case 'delete':
      actionText = '삭제한 캐릭터를 다시 배치하시겠습니까?';
      break;
    case 'update':
      actionText = '수정한 내용을 되돌리시겠습니까?';
      break;
    default:
      actionText = '이 작업을 취소하시겠습니까?';
  }
  
  window.modalManager.showConfirm({
    title: '작업 취소 확인',
    message: `${actionText}\n\n${entry.description}`,
    confirmText: '취소',
    cancelText: '취소',
    confirmClass: 'btn-warning',
    onConfirm: async () => {
      try {
        await performRollback(entry);
        window.modalManager.showAlert({
          title: '취소 완료',
          message: '작업이 성공적으로 취소되었습니다.'
        });
      } catch (error) {
        console.error('작업 취소 실패:', error);
        window.modalManager.showAlert({
          title: '취소 실패',
          message: '작업 취소 중 오류가 발생했습니다: ' + error.message
        });
      }
    }
  });
}

// 롤백 수행 - 단일 히스토리 취소
async function performRollback(entry) {
  // 액션별 롤백 처리
  switch (entry.action) {
    case 'add':
      await rollbackAdd(entry);
      break;
    case 'delete':
      await rollbackDelete(entry);
      break;
    case 'update':
      await rollbackUpdate(entry);
      break;
    case 'rollback':
      // 롤백 히스토리는 롤백 불가능
      window.modalManager.showAlert({
        title: '롤백 불가',
        message: '롤백 작업은 되돌릴 수 없습니다.'
      });
      return;
    default:
      window.modalManager.showAlert({
        title: '롤백 실패',
        message: '알 수 없는 작업 유형입니다.'
      });
      return;
  }
  
  // UI 업데이트
  renderRaidParties();
  renderExpedition();
  
  // 롤백 히스토리 기록
  await recordHistory(
    'rollback',
    { type: 'system', path: 'rollback', id: entry.id },
    null,
    { rollbackTo: entry.id, description: entry.description },
    `${entry.description} 작업 취소`
  );
  
  // 자동 저장
  scheduleAutoSave();
}

// 생성 작업 롤백 (삭제)
async function rollbackAdd(entry) {
  // 생성된 항목 찾아서 삭제
  if (entry.target.type === 'character') {
    // 캐릭터 추가 롤백 - 공격대에서 제거
    const partyId = entry.target.id?.match(/(.+?)_slot\d+/)?.[1];
    const slotIndex = parseInt(entry.target.path?.match(/party\.members\[(.+?)\]/)?.[1]);
    
    if (partyId && !isNaN(slotIndex)) {
      const parties = getCurrentTabParties();
      const party = parties.find(p => p.id === partyId);
      
      if (party && party.members[slotIndex]) {
        const removedCharacter = party.members[slotIndex];
        
        // 히스토리 기록 (추가 취소)
        await recordHistory(
          'delete',
          {
            type: 'character',
            id: `${partyId}_slot${slotIndex}`,
            path: `party.members[${slotIndex}]`
          },
          removedCharacter,
          null,
          `${partyId} 파티 ${slotIndex}번 슬롯에서 ${removedCharacter.name} 캐릭터 추가 취소`
        );
        
        party.members[slotIndex] = null;
      }
    }
  } else if (entry.target.type === 'raid') {
    // 레이드 생성 롤백
    const raidId = entry.target.id;
    const difficultyId = entry.target.path?.match(/raidTabs\[(.+?)\]\[(.+?)\]/)?.[2];
    
    if (raidId && difficultyId && state.raidTabs[raidId]?.[difficultyId]) {
      const parties = state.raidTabs[raidId][difficultyId];
      const partyIndex = parties.findIndex(p => p.id === entry.target.id);
      
      if (partyIndex !== -1) {
        parties.splice(partyIndex, 1);
      }
    }
  } else if (entry.target.type === 'expedition') {
    // 원정대 생성 롤백
    const slotIndex = parseInt(entry.target.path?.match(/expeditionSlots\[(.+?)\]/)?.[1]);
    
    if (!isNaN(slotIndex) && state.expeditionSlots[slotIndex]) {
      state.expeditionSlots[slotIndex] = [];
    }
  }
}

// 삭제 작업 롤백 (재생성)
async function rollbackDelete(entry) {
  if (entry.target.type === 'character') {
    const partyId = entry.target.id?.match(/(.+?)_slot\d+/)?.[1];
    const slotIndex = parseInt(entry.target.path?.match(/party\.members\[(.+?)\]/)?.[1]);

    if (partyId && !isNaN(slotIndex)) {
      const parties = getCurrentTabParties();
      const party = parties.find(p => p.id === partyId);
      
      if (party && !party.members[slotIndex]) {
        // before 데이터에서 삭제된 캐릭터 정보 찾아 복원
        // 실제 히스토리 데이터 구조: {root: {before: {name: 'CharmingDo'}}}
        let deletedCharacter = null;
        
        // 경로 1: root.before에서 캐릭터 정보 찾기
        const rootBefore = entry.changes['root']?.before;
        if (rootBefore && rootBefore.name) {
          // 원정대에서 캐릭터 정보 찾기 (name으로 검색)
          deletedCharacter = findCharacterByNameInExpedition(rootBefore.name);
        }

        // 경로 2: 다른 키 구조 시도 (이전 로직 유지)
        if (!deletedCharacter) {
          const firebaseKey = `party_members_${slotIndex}`;
          deletedCharacter = entry.changes[firebaseKey]?.before;
        }
        
        if (!deletedCharacter) {
          deletedCharacter = entry.changes['party.members']?.before?.[slotIndex];
        }
        
        // 경로 3: 모든 키에서 찾기
        if (!deletedCharacter) {
          for (const [key, change] of Object.entries(entry.changes)) {
            if (key.includes('party') && change.before) {
              if (Array.isArray(change.before)) {
                const indexMatch = key.match(/_(\d+)$/);
                const index = indexMatch ? parseInt(indexMatch[1]) : -1;
                if (index === slotIndex) {
                  deletedCharacter = change.before;
                  break;
                }
              }
            }
          }
        }
        
        // 경로 4: 배열 before에서 직접 찾기
        if (!deletedCharacter) {
          for (const [key, change] of Object.entries(entry.changes)) {
            if (key.includes('party') && change.before && Array.isArray(change.before)) {
              deletedCharacter = change.before[slotIndex];
              if (deletedCharacter) break;
            }
          }
        }
        
        if (deletedCharacter) {
          // 히토리 기록 (삭제 취소)
          await recordHistory(
            'add',
            {
              type: 'character',
              id: `${partyId}_slot${slotIndex}`,
              path: `party.members[${slotIndex}]`
            },
            null,
            deletedCharacter,
            `${partyId} 파티 ${slotIndex}번 슬롯에서 ${deletedCharacter.name} 캐릭터 삭제 취소`
          );
          
          party.members[slotIndex] = deletedCharacter;
        } else {
          console.error('🔄 [ROLLBACK] No deleted character data found in changes');
        }
      } else {
        console.error('🔄 [ROLLBACK] Party or slot not found');
      }
    }
  } else if (entry.target.type === 'raid') {
    // 레이드 삭제 롤백
    const raidId = entry.target.id;
    const difficultyId = entry.target.path?.match(/raidTabs\[(.+?)\]\[(.+?)\]/)?.[2];
    
    if (raidId && difficultyId && state.raidTabs[raidId]?.[difficultyId]) {
      const parties = state.raidTabs[raidId][difficultyId];
      
      // before 데이터에서 삭제된 파티 정보 찾아 복원
      const deletedParty = entry.changes['party']?.before;
      if (deletedParty) {
        // 삭제된 위치에 다시 추가
        const insertIndex = parseInt(entry.target.path?.match(/\[(.+?)\]$/)?.[1]) || parties.length;
        parties.splice(insertIndex, 0, deletedParty);
      }
    }
  }
}

// 수정 작업 롤백 (재수정)
async function rollbackUpdate(entry) {
  // 수정된 항목 복원
  for (const [safePath, change] of Object.entries(entry.changes)) {
    const originalPath = safePath.replace(/_/g, '.');
    
    if (originalPath.includes('raidTabs')) {
      // 레이드 데이터 수정 롤백
      await restoreRaidData(originalPath, change.before);
    } else if (originalPath.includes('expedition')) {
      // 원정대 데이터 수정 롤백
      await restoreExpeditionData(originalPath, change.before);
    }
  }
}

// 레이드 데이터 복원
async function restoreRaidData(path, value) {
  // 경로 파싱: raidTabs[raidId][difficultyId][partyIndex]
  const match = path.match(/raidTabs\[(.+?)\]\[(.+?)\]\[(.+?)\]/);
  if (!match) return;
  
  const [, raidId, difficultyId, partyIndex] = match;
  
  if (!state.raidTabs[raidId]) state.raidTabs[raidId] = {};
  if (!state.raidTabs[raidId][difficultyId]) state.raidTabs[raidId][difficultyId] = [];
  
  const index = parseInt(partyIndex);
  if (value === null) {
    // 삭제된 경우
    state.raidTabs[raidId][difficultyId].splice(index, 1);
  } else {
    // 수정된 경우
    state.raidTabs[raidId][difficultyId][index] = value;
  }
}

// 원정대 데이터 복원
async function restoreExpeditionData(path, value) {
  // 경로 파싱: expeditionSlots[slotIndex][charIndex]
  const match = path.match(/expeditionSlots\[(.+?)\]\[(.+?)\]/);
  if (!match) return;
  
  const [, slotIndex, charIndex] = match;
  
  const slot = parseInt(slotIndex);
  const char = parseInt(charIndex);
  
  if (value === null) {
    // 삭제된 경우
    state.expeditionSlots[slot].splice(char, 1);
  } else {
    // 수정된 경우
    state.expeditionSlots[slot][char] = value;
  }
}

// 히스토리 정리
function clearHistory() {
  window.modalManager.showConfirm({
    title: '히스토리 정리',
    message: '모든 히스토리를 정리하시겠습니까?',
    confirmText: '정리',
    cancelText: '취소',
    confirmClass: 'btn-warning',
    onConfirm: () => {
      state.history.entries = [];
      
      // Firebase에서도 삭제 (실시간 동기화 시)
      if (window.realtimeSync && typeof window.realtimeSync.isSyncActive === 'function' && window.realtimeSync.isSyncActive()) {
        const historyRef = window.realtimeSync.dbRef.child('history');
        historyRef.remove();
      }
      
      renderHistoryList();
      window.modalManager.showAlert({
        title: '정리 완료',
        message: '히스토리를 정리했습니다.'
      });
    }
  });
}

// 전역 함수 노출
window.clearHistory = clearHistory;
window.cleanupFirebaseHistory = cleanupFirebaseHistory;
window.showHistoryModal = showHistoryModal;

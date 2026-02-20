// ID 관리자 - ID 충돌 방지를 위한 고유 ID 생성
class IDManager {
  constructor() {
    this.usedIds = new Set();
    this.prefixCounter = {};
  }

  // 고유 ID 생성
  generateId(prefix = '') {
    let counter = this.prefixCounter[prefix] || 1;
    let id;
    
    do {
      id = prefix + counter;
      counter++;
    } while (this.usedIds.has(id));
    
    this.prefixCounter[prefix] = counter;
    this.usedIds.add(id);
    
    return id;
  }

  // ID 사용 등록
  registerId(id) {
    if (this.usedIds.has(id)) {
      return false;
    }
    this.usedIds.add(id);
    return true;
  }

  // ID 해제
  unregisterId(id) {
    return this.usedIds.delete(id);
  }

  // ID 사용 여부 확인
  isIdUsed(id) {
    return this.usedIds.has(id);
  }

  // 모든 ID 초기화
  clearAll() {
    this.usedIds.clear();
    this.prefixCounter = {};
  }

  // 접두사별 카운터 리셋
  resetCounter(prefix) {
    this.prefixCounter[prefix] = 1;
  }

  // 현재 사용 중인 ID 수
  getUsedCount() {
    return this.usedIds.size;
  }
}

// 전역 ID 관리자 인스턴스
window.idManager = new IDManager();

// 고유 ID 생성 헬퍼 함수
function generateUniqueId(prefix) {
  return window.idManager.generateId(prefix);
}

// ID 등록 헬퍼 함수
function registerId(id) {
  return window.idManager.registerId(id);
}

// ID 해제 헬퍼 함수
function unregisterId(id) {
  return window.idManager.unregisterId(id);
}

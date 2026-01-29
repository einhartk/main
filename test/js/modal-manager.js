// 모달 관리자
class ModalManager {
  constructor() {
    this.modalCounter = 0;
    this.activeModals = new Map();
  }

  // 고유 ID 생성
  generateId() {
    return `modal_${++this.modalCounter}_${Date.now()}`;
  }

  // 확인 모달창 표시 (동기식)
  showConfirmSync(options = {}) {
    const {
      title = '확인',
      message = '계속하시겠습니까?',
      confirmText = '확인',
      cancelText = '취소',
      confirmClass = 'btn-primary',
      cancelClass = 'btn-secondary',
      zIndex = 1050,
      size = 'modal-sm' // modal-sm, modal-lg, modal-xl
    } = options;

    return new Promise((resolve) => {
      const modalId = this.generateId();
      
      const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" style="z-index: ${zIndex};">
          <div class="modal-dialog ${size} modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                ${message}
              </div>
              <div class="modal-footer">
                <button type="button" class="btn ${cancelClass}" data-bs-dismiss="modal">${cancelText}</button>
                <button type="button" class="btn ${confirmClass}" id="${modalId}_confirm">${confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // 모달을 body에 추가
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // 모달 인스턴스 생성
      const modalElement = document.getElementById(modalId);
      const modal = new bootstrap.Modal(modalElement);
      
      // 확인 버튼 이벤트
      const confirmBtn = document.getElementById(`${modalId}_confirm`);
      confirmBtn.addEventListener('click', () => {
        modal.hide();
        resolve(true);
      });
      
      // 취소 버튼 이벤트 (닫기 버튼 포함)
      modalElement.addEventListener('hidden.bs.modal', () => {
        this.cleanupModal(modalId);
        resolve(false);
      });
      
      this.activeModals.set(modalId, modal);
      
      // 모달 표시
      modal.show();
    });
  }

  // 확인 모달창 표시 (비동기식 - 기존과 호환)
  showConfirm(options = {}) {
    const {
      onConfirm = null,
      onCancel = null,
      ...restOptions
    } = options;

    this.showConfirmSync(restOptions).then(result => {
      if (result && onConfirm) {
        onConfirm();
      } else if (!result && onCancel) {
        onCancel();
      }
    });
  }

  // 알림 모달창 표시
  showAlert(options = {}) {
    const {
      title = '알림',
      message = '',
      buttonText = '확인',
      buttonClass = 'btn-primary',
      zIndex = 1050,
      onClose = null,
      size = 'modal-sm'
    } = options;

    const modalId = this.generateId();
    
    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" style="z-index: ${zIndex};">
        <div class="modal-dialog ${size} modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${message}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn ${buttonClass}" data-bs-dismiss="modal">${buttonText}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 모달을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 인스턴스 생성
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    
    // 모달 표시
    modal.show();
    
    // 모달이 닫힐 때 정리
    modalElement.addEventListener('hidden.bs.modal', () => {
      if (onClose) onClose();
      this.cleanupModal(modalId);
    });
    
    this.activeModals.set(modalId, modal);
    return modal;
  }

  // 입력 모달창 표시
  showInput(options = {}) {
    const {
      title = '입력',
      message = '',
      placeholder = '',
      defaultValue = '',
      confirmText = '확인',
      cancelText = '취소',
      confirmClass = 'btn-primary',
      cancelClass = 'btn-secondary',
      zIndex = 1050,
      onConfirm = null,
      onCancel = null,
      size = 'modal-sm'
    } = options;

    const modalId = this.generateId();
    
    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" style="z-index: ${zIndex};">
        <div class="modal-dialog ${size} modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${message ? `<p>${message}</p>` : ''}
              <input type="text" class="form-control" id="${modalId}_input" placeholder="${placeholder}" value="${defaultValue}">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn ${cancelClass}" data-bs-dismiss="modal">${cancelText}</button>
              <button type="button" class="btn ${confirmClass}" id="${modalId}_confirm">${confirmText}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 모달을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 인스턴스 생성
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    const inputElement = document.getElementById(`${modalId}_input`);
    
    // Enter 키 처리
    inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const value = inputElement.value.trim();
        if (value && onConfirm) onConfirm(value);
        modal.hide();
      }
    });
    
    // 확인 버튼 이벤트
    const confirmBtn = document.getElementById(`${modalId}_confirm`);
    confirmBtn.addEventListener('click', () => {
      const value = inputElement.value.trim();
      if (value && onConfirm) onConfirm(value);
      modal.hide();
    });
    
    // 모달 표시 및 포커스
    modal.show();
    setTimeout(() => inputElement.focus(), 200);
    
    // 모달이 닫힐 때 정리
    modalElement.addEventListener('hidden.bs.modal', () => {
      if (onCancel) onCancel();
      this.cleanupModal(modalId);
    });
    
    this.activeModals.set(modalId, modal);
    return modal;
  }

  // 프로그레스 모달창 표시
  showProgress(options = {}) {
    const {
      title = '처리 중...',
      message = '잠시만 기다려주세요.',
      zIndex = 1090,
      backdrop = true,
      keyboard = false
    } = options;

    const modalId = this.generateId();
    
    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" style="z-index: ${zIndex};" ${backdrop ? 'data-bs-backdrop="static"' : ''} ${keyboard ? '' : 'data-bs-keyboard="false"'}>
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body text-center py-4">
              <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
              </div>
              <h5 class="modal-title">${title}</h5>
              <p class="text-muted mb-0">${message}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // 모달을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 인스턴스 생성
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    
    // 모달 표시
    modal.show();
    
    this.activeModals.set(modalId, modal);
    return {
      modal,
      updateMessage: (newMessage) => {
        const messageElement = modalElement.querySelector('.text-muted');
        if (messageElement) messageElement.textContent = newMessage;
      },
      updateTitle: (newTitle) => {
        const titleElement = modalElement.querySelector('.modal-title');
        if (titleElement) titleElement.textContent = newTitle;
      },
      close: () => {
        // 즉시 강제 제거
        this.cleanupModal(modalId);
      }
    };
  }

  // 모든 모달 닫기
  closeAll() {
    this.activeModals.forEach((modal, id) => {
      modal.hide();
    });
    this.activeModals.clear();
    
    // 항상 모든 backdrop 강제 제거
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.remove();
    });
    
    // 항상 body 스타일 정리
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    
    // 추가: Bootstrap 모달 상태 초기화
    document.body.removeAttribute('style');
    
    // 추가: 남아있을 수 있는 모든 모달 관련 클래스 제거
    document.body.classList.remove('modal-open', 'show');
    
    // 추가: 스크롤바 복원을 위한 강제 스타일 제거
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // 특정 모달 닫기
  close(modalId) {
    const modal = this.activeModals.get(modalId);
    if (modal) {
      modal.hide();
      this.activeModals.delete(modalId);
    }
  }

  // 긴급 backdrop 정리 함수 (남아있는 backdrop 강제 제거)
  forceCleanupBackdrops() {
    console.log('🧹 긴급 backdrop 정리 실행...');
    
    // 모든 backdrop 제거
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.remove();
    });
    
    // 모든 모달 요소 제거
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
      modal.style.display = 'none';
    });
    
    // body 완전 초기화
    document.body.classList.remove('modal-open', 'show');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.removeAttribute('style');
    
    // html 요소도 정리
    document.documentElement.style.overflow = '';
    
    console.log('✅ 긴급 backdrop 정리 완료');
  }

  // 모달 정리 헬퍼 함수
  cleanupModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.remove();
    }
    this.activeModals.delete(modalId);
    
    // 항상 모든 backdrop 강제 제거
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.remove();
    });
    
    // 항상 body 스타일 정리
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    
    // 추가: Bootstrap 모달 상태 초기화
    document.body.removeAttribute('style');
    
    // 추가: 남아있을 수 있는 모든 모달 관련 클래스 제거
    document.body.classList.remove('modal-open', 'show');
    
    // 추가: 스크롤바 복원을 위한 강제 스타일 제거
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

// 전역 모달 관리자 인스턴스 생성
window.modalManager = new ModalManager();

// 긴급 정리 함수를 전역에 노출 (개발자 도구에서 직접 호출 가능)
window.forceCleanupBackdrops = () => {
  window.modalManager.forceCleanupBackdrops();
};

// 페이지 로드 시 긴급 정리 실행
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.modalManager.forceCleanupBackdrops();
  }, 100);
});

// 기존 confirm/alert 함수를 모달로 대체하는 헬퍼 함수
window.confirmModal = (message, title = '확인', onConfirm = null, onCancel = null) => {
  return window.modalManager.showConfirm({
    title,
    message,
    onConfirm,
    onCancel
  });
};

window.alertModal = (message, title = '알림', onClose = null) => {
  return window.modalManager.showAlert({
    title,
    message,
    onClose
  });
};

window.promptModal = (message, placeholder = '', defaultValue = '', onConfirm = null, onCancel = null) => {
  return window.modalManager.showInput({
    title: '입력',
    message,
    placeholder,
    defaultValue,
    onConfirm,
    onCancel
  });
};

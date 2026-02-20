// Modal Manager Class
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        // 모달 밖(백드롭) 클릭 시 포커스를 먼저 빼서 aria-hidden 경고 방지 (hide.bs.modal보다 먼저 실행되도록 mousedown 사용)
        document.addEventListener('mousedown', this._onBackdropMouseDown = (e) => {
            if (!e.target.classList.contains('modal-backdrop')) return;
            const modal = document.querySelector('.modal.show');
            if (modal) this._moveFocusOutOfModal(modal);
        }, true);
    }

    // Confirm 모달 표시
    showConfirm(options) {
        const {
            title = '확인',
            message = '진행하시겠습니까?',
            confirmText = '확인',
            cancelText = '취소',
            confirmClass = 'btn-primary',
            onConfirm = null,
            onCancel = null,
            zIndex = 9999
        } = options;

        const modalId = generateUniqueId('confirmModal_');
        
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" style="z-index: ${zIndex};">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>
                            <button type="button" class="btn ${confirmClass}" id="${modalId}Confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);
        
        modalElement.addEventListener('hide.bs.modal', () => this._moveFocusOutOfModal(modalElement), { once: true });
        
        // 확인 버튼 이벤트
        document.getElementById(`${modalId}Confirm`).addEventListener('click', () => {
            if (onConfirm) onConfirm();
            modal.hide();
        });
        
        // 모달이 닫힐 때 정리
        modalElement.addEventListener('hidden.bs.modal', () => {
            this.cleanupModal(modalId);
        });
        
        this.activeModals.set(modalId, modal);
        modal.show();
        
        return modal;
    }

    // 동기 Confirm 모달 (Promise 기반)
    showConfirmSync(options) {
        return new Promise((resolve) => {
            const {
                title = '확인',
                message = '진행하시겠습니까?',
                confirmText = '확인',
                cancelText = '취소',
                confirmClass = 'btn-primary',
                zIndex = 9999
            } = options;

            const modalId = generateUniqueId('confirmSyncModal_');
            
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" style="z-index: ${zIndex};">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>${message}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="${modalId}Cancel">${cancelText}</button>
                                <button type="button" class="btn ${confirmClass}" id="${modalId}Confirm">${confirmText}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);
            
            modalElement.addEventListener('hide.bs.modal', () => this._moveFocusOutOfModal(modalElement), { once: true });
            
            // 확인 버튼 이벤트
            document.getElementById(`${modalId}Confirm`).addEventListener('click', () => {
                resolve(true);
                modal.hide();
            });
            
            // 취소 버튼 이벤트
            document.getElementById(`${modalId}Cancel`).addEventListener('click', () => {
                resolve(false);
                modal.hide();
            });
            
            // 모달이 닫힐 때 정리
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.cleanupModal(modalId);
            });
            
            this.activeModals.set(modalId, modal);
            modal.show();
        });
    }

    // Alert 모달 표시
    showAlert(options) {
        const {
            title = '알림',
            message = '',
            buttonText = '확인',
            buttonClass = 'btn-primary',
            onClose = null,
            zIndex = 9999
        } = options;

        const modalId = generateUniqueId('alertModal_');
        
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" style="z-index: ${zIndex};">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn ${buttonClass}" data-bs-dismiss="modal">${buttonText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);
        
        modalElement.addEventListener('hide.bs.modal', () => this._moveFocusOutOfModal(modalElement), { once: true });
        
        // 모달이 닫힐 때 정리
        modalElement.addEventListener('hidden.bs.modal', () => {
            if (onClose) onClose();
            this.cleanupModal(modalId);
        });
        
        this.activeModals.set(modalId, modal);
        modal.show();
        
        return modal;
    }

    // Input 모달 표시
    showInput(options) {
        const {
            title = '입력',
            message = '',
            placeholder = '',
            defaultValue = '',
            confirmText = '확인',
            cancelText = '취소',
            confirmClass = 'btn-primary',
            onConfirm = null,
            onCancel = null,
            zIndex = 9999,
            allowEnterKey = false
        } = options;

        const modalId = generateUniqueId('inputModal_');
        
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" style="z-index: ${zIndex};">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                            <input type="text" class="form-control" id="${modalId}Input" placeholder="${placeholder}" value="${defaultValue}">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>
                            <button type="button" class="btn ${confirmClass}" id="${modalId}Confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);
        const inputElement = document.getElementById(`${modalId}Input`);
        
        modalElement.addEventListener('hide.bs.modal', () => this._moveFocusOutOfModal(modalElement), { once: true });
        
        // 확인 버튼 이벤트
        document.getElementById(`${modalId}Confirm`).addEventListener('click', () => {
            const value = inputElement.value.trim();
            if (onConfirm) onConfirm(value);
            modal.hide();
        });
        
        // 엔터키 처리 (allowEnterKey가 true인 경우에만)
        if (allowEnterKey) {
            inputElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const value = inputElement.value.trim();
                    if (onConfirm) onConfirm(value);
                    modal.hide();
                }
            });
        }
        
        // 모달이 닫힐 때 정리
        modalElement.addEventListener('hidden.bs.modal', () => {
            if (onCancel) onCancel();
            this.cleanupModal(modalId);
        });
        
        this.activeModals.set(modalId, modal);
        modal.show();
        
        // 입력 필드에 포커스
        setTimeout(() => {
            inputElement.focus();
            inputElement.select();
        }, 200);
        
        return modal;
    }

    // Progress 모달 표시
    showProgress(options) {
        const {
            title = '처리 중...',
            message = '잠시만 기다려주세요.',
            zIndex = 1130
        } = options;

        const modalId = generateUniqueId('progressModal_');
        
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false" style="z-index: ${zIndex};">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body text-center py-4">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                            <p class="text-muted" id="${modalId}Message">${message}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });
        
        modalElement.addEventListener('hide.bs.modal', () => this._moveFocusOutOfModal(modalElement), { once: true });
        
        this.activeModals.set(modalId, modal);
        modal.show();
        
        return {
            updateMessage: (newMessage) => {
                const messageElement = modalElement.querySelector('.text-muted');
                if (messageElement) messageElement.textContent = newMessage;
            },
            updateTitle: (newTitle) => {
                const titleElement = modalElement.querySelector('.modal-title');
                if (titleElement) titleElement.textContent = newTitle;
            },
            close: () => {
                // 먼저 모달을 정상적으로 닫기
                modal.hide();
                
                // 애니메이션이 끝난 후 정리 (안전장치로 타이머 추가)
                setTimeout(() => {
                    this.cleanupModal(modalId);
                }, 300);
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
        document.documentElement.style.overflow = '';
    }

    // 긴급 backdrop 정리 함수
    forceCleanupBackdrops() {
        // 모든 backdrop 제거
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
        });
        
        // body 스타일 정리
        document.body.classList.remove('modal-open', 'show');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        document.body.removeAttribute('style');
        
        // html 스타일 정리
        document.documentElement.style.overflow = '';
        
            }

    // ARIA 경고 방지: 모달 닫기 직전에 포커스를 모달 밖으로 이동 (hide.bs.modal에서 호출)
    _moveFocusOutOfModal(modalElement) {
        const active = document.activeElement;
        if (!active || !modalElement.contains(active)) return;
        active.blur();
        try {
            document.body.setAttribute('tabindex', '-1');
            document.body.focus();
        } catch (_) {}
        requestAnimationFrame(() => document.body.removeAttribute('tabindex'));
    }

    // 모달 정리 헬퍼 함수
    cleanupModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            this._moveFocusOutOfModal(modalElement);
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
        document.documentElement.style.overflow = '';
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

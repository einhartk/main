// 공지사항 모달창 관련 기능

// 공지사항 모달창 표시
function showAnnouncementModal() {
  // 로컬 스토리지에서 공지사항 확인 여부 확인
  const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
  
  // 이미 확인한 경우 표시하지 않음
  if (hasSeenAnnouncement === 'true') {
    return;
  }
  
  // 모달창 HTML 생성
  const modalHtml = `
    <div class="modal fade" id="announcementModal" tabindex="-1" aria-labelledby="announcementModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="announcementModalLabel">
              <i class="bi bi-megaphone-fill me-2"></i>공지사항
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="announcement-content">
              <!-- 여기에 공지사항 내용을 작성하세요 -->
              <h6 class="text-primary mb-3">🎉 로스트아크 공격대 관리 시스템 업데이트</h6>
              
              <div class="mb-3">
                <h6 class="fw-bold">✨ 주요 기능</h6>
                <ul class="list-unstyled">
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>원정대 캐릭터 검색 및 관리</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>공격대 자동 배치 및 관리</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>서포터 수 자동 체크 (4인/8인 공격대)</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>드래그 앤 드롭으로 캐릭터 배치</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>더블클릭으로 캐릭터 정보 수정 및 삭제</li>
                </ul>
              </div>
              
              <div class="mb-3">
                <h6 class="fw-bold">📝 업데이트 내역 </h6>
                <ol>
                  <li>더블클릭으로 캐릭터 전투력,포지션 수정</li>
                  <li>공격대 캐릭터 더블클릭으로 삭제 가능</li>
                  <li>8인 공대 서폿2명 안들어가지던 오류 수정</li>
                  <li> etc </li>
                </ol>
              </div>
              
            </div>
          </div>
          <div class="modal-footer">
            <div class="form-check me-auto">
              <input class="form-check-input" type="checkbox" id="dontShowAgain">
              <label class="form-check-label" for="dontShowAgain">
                다시 보지 않기
              </label>
            </div>
            <button type="button" class="btn btn-primary" onclick="closeAnnouncementModal()">
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 모달을 body에 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Bootstrap 모달 표시
  const modal = new bootstrap.Modal(document.getElementById('announcementModal'));
  modal.show();
}

// 공지사항 강제 표시 (로컬 스토리지 무시)
function forceShowAnnouncement() {
  // 기존 모달이 있다면 제거
  const existingModal = document.getElementById('announcementModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 모달창 HTML 생성 (강제 표시 버전)
  const modalHtml = `
    <div class="modal fade" id="announcementModal" tabindex="-1" aria-labelledby="announcementModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title" id="announcementModalLabel">
              <i class="bi bi-megaphone-fill me-2"></i>공지사항 (강제 표시)
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning mb-3">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>관리자에 의해 강제로 표시된 공지사항입니다.</strong>
            </div>
            <div class="announcement-content">
              <!-- 여기에 공지사항 내용을 작성하세요 -->
              <h6 class="text-primary mb-3">🎉 로스트아크 공격대 관리 시스템 업데이트</h6>
              
              <div class="mb-3">
                <h6 class="fw-bold">✨ 주요 기능</h6>
                <ul class="list-unstyled">
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>원정대 캐릭터 검색 및 관리</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>공격대 자동 배치 및 관리</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>서포터 수 자동 체크 (4인/8인 공격대)</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>드래그 앤 드롭으로 캐릭터 배치</li>
                  <li><i class="bi bi-check-circle-fill text-success me-2"></i>더블클릭으로 캐릭터 정보 수정 및 삭제</li>
                </ul>
              </div>
              
              <div class="mb-3">
                <h6 class="fw-bold">📝 업데이트 내역 </h6>
                <ol>
                  <li>더블클릭으로 캐릭터 전투력,포지션 수정</li>
                  <li>공격대 캐릭터 더블클릭으로 삭제 가능</li>
                  <li>8인 공대 서폿2명 안들어가지던 오류 수정</li>
                  <li> etc </li>
                </ol>
              </div>
              
              
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeAnnouncementModal()">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 모달을 body에 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Bootstrap 모달 표시
  const modal = new bootstrap.Modal(document.getElementById('announcementModal'));
  modal.show();
}

// 공지사항 초기화 (다시 보게 하기)
function resetAnnouncement() {
  localStorage.removeItem('hasSeenAnnouncement');
}

// 공지사항 모달창 닫기
function closeAnnouncementModal() {
  const dontShowAgain = document.getElementById('dontShowAgain');
  
  // '다시 보지 않기' 체크박스가 있는 경우에만 저장
  if (dontShowAgain && dontShowAgain.checked) {
    localStorage.setItem('hasSeenAnnouncement', 'true');
  }
  
  // 모달 닫기
  const modal = bootstrap.Modal.getInstance(document.getElementById('announcementModal'));
  if (modal) {
    modal.hide();
  }
  
  // 모달 요소 제거
  setTimeout(() => {
    const modalElement = document.getElementById('announcementModal');
    if (modalElement) {
      modalElement.remove();
    }
  }, 300);
}

// 페이지 로드 시 공지사항 모달창 표시
document.addEventListener('DOMContentLoaded', function() {
  // 약간의 지연 후 공지사항 표시 (다른 요소들이 로드된 후)
  setTimeout(() => {
    showAnnouncementModal();
  }, 500);
});

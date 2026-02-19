// === 시간 스케줄러 기능 ===

// ClockPicker 초기화 함수
function initializeClockPicker(partyId) {
  // 새 ID 형식으로 모든 시간 입력창 찾기 (partyId로 시작하는 모든 요소)
  const timeInputs = document.querySelectorAll(`[id^="scheduledHour-${partyId}"]`);
  
  timeInputs.forEach(timeInput => {
    if (!timeInput) return;
    
    // 기존 ClockPicker가 있으면 파괴
    if (timeInput._clockpicker) {
      timeInput._clockpicker.remove();
    }
    
    // ClockPicker 초기화
    $(timeInput).clockpicker({
      placement: 'bottom',
      align: 'left',
      donetext: '완료',
      autoclose: true,
      twelvehour: false,
      vibrate: true,
      // 시간 변경 시 이벤트 처리 추가
      afterDone: function() {
        try {
          // timeInput 변수를 직접 사용 (클로저 활용)
          const inputId = timeInput.id;
          
          if (!inputId) {
            console.error('❌ [SCHEDULE] input ID를 찾을 수 없음:', timeInput);
            return;
          }
          
          // input ID에서 partyId와 index 추출 (scheduledHour-partyId-index 형식)
          const idMatch = inputId.match(/^scheduledHour-(.+)-(\d+)$/);
          if (!idMatch) {
            console.error('❌ [SCHEDULE] ID 형식이 올바르지 않음:', inputId);
            return;
          }
          
          const extractedPartyId = idMatch[1];
          const index = idMatch[2];
          
          const weekdaySelect = document.getElementById(`scheduledWeekday-${extractedPartyId}-${index}`);
          const weekday = weekdaySelect ? weekdaySelect.value : null;
          const hour = $(timeInput).val();
          
          // 시간 업데이트 함수 호출
          updateRaidScheduledTime(extractedPartyId, weekday, hour);
        } catch (error) {
          console.error('❌ [SCHEDULE] 시간 업데이트 오류:', error);
        }
      }
    });
    
    // 인스턴스 저장
    timeInput._clockpicker = $(timeInput).data('clockpicker');
  });
}

// 스케줄러 새로고침
function refreshScheduler() {
  loadSchedulerContent();
  showNotification('스케줄러가 새로고침되었습니다.', 'success');
}

// 공격대 약속 시간 업데이트
async function updateRaidScheduledTime(partyId, weekday, hour) {
  // 작업 잠금 확인
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('약속 시간 변경');
  }
  
  if (!acquired) return;
  
  try {
    // 파티 찾기
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    
    if (!party) {
      console.error('❌ [SCHEDULE] 파티를 찾을 수 없음:', partyId);
      return;
    }
    
    // 🔥 **중요 수정**: 변경 전 데이터를 먼저 저장 (가장 중요!)
    const beforeData = {
      scheduledWeekday: party.scheduledWeekday || null,
      scheduledHour: party.scheduledHour || null,
      scheduledTimeDisplay: party.scheduledTimeDisplay || ''
    };
    
    // 요일/시간 업데이트
    party.scheduledWeekday = weekday || null;
    party.scheduledHour = hour || null;
    
    // 표시용 시간 문자열 생성 (기존 호환성)
    if (weekday && hour) {
      const weekdayNames = {
        'monday': '월요일',
        'tuesday': '화요일',
        'wednesday': '수요일',
        'thursday': '목요일',
        'friday': '금요일',
        'saturday': '토요일',
        'sunday': '일요일'
      };
      party.scheduledTimeDisplay = `${weekdayNames[weekday]} ${hour}`;
      
      // 다음 해당 요일의 날짜 계산 (기존 호환성)
      const today = new Date();
      const todayDay = today.getDay(); // 0=일요일, 1=월요일, ...
      const weekdayMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      
      const targetDay = weekdayMap[weekday];
      let daysUntilTarget = targetDay - todayDay;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // 다음 주로
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);
      
      const [hours, minutes] = hour.split(':');
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      party.scheduledTime = targetDate.toISOString();
    } else {
      party.scheduledTimeDisplay = '';
      party.scheduledTime = null;
    }
    
    // UI 업데이트
    renderRaidParties();
    
    // 🔥 **중요 수정**: 변경 후 데이터와 함께 히스토리 기록
    if (typeof recordHistory === 'function') {
      try {
        const weekdayNames = {
          'monday': '월요일',
          'tuesday': '화요일',
          'wednesday': '수요일',
          'thursday': '목요일',
          'friday': '금요일',
          'saturday': '토요일',
          'sunday': '일요일'
        };
        
        const afterData = {
          scheduledWeekday: weekday,
          scheduledHour: hour,
          scheduledTimeDisplay: weekday && hour ? `${weekdayNames[weekday]} ${hour}` : ''
        };
        
        // 🔥 **중요 수정**: 실제 변경된 데이터로 히스토리 기록
        await recordHistory(
          'update',
          {
            type: 'schedule',
            operation: 'update',
            target: { 
              raidId: party.raidId, 
              difficultyId: party.difficultyId, 
              partyId: party.id 
            }
          },
          beforeData,
          afterData,
          `${party.displayName} 스케줄 설정: ${weekday && hour ? `${weekdayNames[weekday]} ${hour}` : '해제'}`
        );
      } catch (error) {
        console.error('❌ [SCHEDULE] 히스토리 기록 오류:', error);
      }
    }
    
    // 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.syncToFirebaseWithLock();
    } else {
      scheduleAutoSave();
    }
    
    // 알림
    const message = (weekday && hour) ? 
      `${party.name || partyId} 약속 시간이 설정되었습니다.` : 
      `${party.name || partyId} 약속 시간이 초기화되었습니다.`;
    
    showNotification(message, 'info');
    
  } finally {
    // 잠금 해제
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('약속 시간 변경');
    }
  }
}

// 약속 시간 초기화
async function clearRaidScheduledTime(partyId) {
  // 새 ID 형식으로 모든 요소 찾기
  const weekdaySelects = document.querySelectorAll(`[id^="scheduledWeekday-${partyId}"]`);
  const hourInputs = document.querySelectorAll(`[id^="scheduledHour-${partyId}"]`);
  
  weekdaySelects.forEach(select => {
    if (select) select.value = '';
  });
  
  hourInputs.forEach(input => {
    if (input) {
      input.value = '';
      // ClockPicker도 초기화
      if (input._clockpicker) {
        $(input).clockpicker('done');
      }
    }
  });
  
  await updateRaidScheduledTime(partyId, null, null);
}

// 시간 스케줄러 모달 열기
function openSchedulerModal() {
  const modalId = 'schedulerModal';
  
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }
  
  // 모달 HTML 생성
  const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calendar-week me-2"></i>
              공격대 스케줄러
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <!-- 탭 내비게이션 -->
            <ul class="nav nav-tabs" id="scheduleTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="scheduleListTab" data-bs-toggle="tab" data-bs-target="#scheduleList" type="button" role="tab">
                  <i class="bi bi-list-ul me-1"></i>스케줄 목록
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="scheduleDetailTab" data-bs-toggle="tab" data-bs-target="#scheduleDetail" type="button" role="tab">
                  <i class="bi bi-card-list me-1"></i>상세 보기
                </button>
              </li>
            </ul>
            
            <!-- 탭 내용 -->
            <div class="tab-content" id="scheduleTabContent">
              <!-- 스케줄 목록 탭 -->
              <div class="tab-pane fade show active" id="scheduleList" role="tabpanel">
                <!-- 정렬 옵션 -->
                <div class="row mb-3">
                  <div class="col-md-12">
                    <div class="d-flex justify-content-between align-items-center">
                      <div class="btn-group" role="group">
                        <input type="radio" class="btn-check" name="scheduleView" id="viewTime" value="time" checked>
                        <label class="btn btn-outline-primary" for="viewTime">
                          <i class="bi bi-clock"></i> 시간순
                        </label>
                        <input type="radio" class="btn-check" name="scheduleView" id="viewOrder" value="order">
                        <label class="btn btn-outline-primary" for="viewOrder">
                          <i class="bi bi-sort-numeric-down"></i> 순번순
                        </label>
                      </div>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="refreshScheduler()">
                          <i class="bi bi-arrow-clockwise"></i> 새로고침
                        </button>
                        <button class="btn btn-outline-success" onclick="exportSchedule()">
                          <i class="bi bi-download"></i> 내보내기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div id="schedulerContent" class="scheduler-container">
                  <!-- 스케줄 내용이 여기에 표시됨 -->
                </div>
              </div>
              
              <!-- 상세 보기 탭 -->
              <div class="tab-pane fade" id="scheduleDetail" role="tabpanel">
                <div id="scheduleDetailContent">
                  <!-- 상세 내용이 여기에 표시됨 -->
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modalElement = document.getElementById(modalId);
  const modal = new bootstrap.Modal(modalElement);
  
  // 모달 표시
  modal.show();

  // 스케줄 내용 로드
  loadSchedulerContent();

  // 정렬 옵션 변경 이벤트
  document.querySelectorAll('input[name="scheduleView"]').forEach(radio => {
    radio.addEventListener('change', () => {
      loadSchedulerContent();
    });
  });

  // 탭 변경 이벤트
  document.getElementById('scheduleDetailTab').addEventListener('shown.bs.tab', () => {
    loadScheduleDetail();
  });

  // 모달 닫힐 때 정리
  modalElement.addEventListener('hidden.bs.modal', () => {
    modalElement.remove();
  }, { once: true });
}

// 스케줄 내용 로드
function loadSchedulerContent() {
  const container = document.getElementById('schedulerContent');
  if (!container) return;

  // 정렬 옵션 확인
  const viewMode = document.querySelector('input[name="scheduleView"]:checked')?.value || 'time';

  // 모든 파티 데이터 수집
  const allParties = [];

  Object.keys(state.raidTabs).forEach(raidId => {
    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
      const parties = state.raidTabs[raidId][difficultyId];
      if (Array.isArray(parties)) {
        parties.forEach((party, index) => {
          // 시간 또는 순번 설정이 있는 파티만 포함
          if (party && (party.scheduledWeekday || party.order !== undefined)) {
            allParties.push({
              ...party,
              raidId,
              difficultyId,
              partyIndex: index
            });
          }
        });
      }
    });
  });

  if (allParties.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-calendar-x" style="font-size: 3rem;"></i>
        <p class="mt-3">예약된 공격대가 없습니다.</p>
        <p>파티에 시간 또는 순번을 설정해주세요.</p>
      </div>
    `;
    return;
  }

  // 정렬 방식에 따라 정렬
  let sortedParties;
  if (viewMode === 'order') {
    // 순번순 정렬
    sortedParties = allParties.sort((a, b) => {
      // 먼저 order로 정렬
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // order가 없는 것들은 뒤로
      if (a.order === undefined && b.order === undefined) {
        return 0;
      }
      return a.order === undefined ? 1 : -1;
    });
  } else {
    // 시간순 정렬 (기존 방식)
    const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    sortedParties = allParties.sort((a, b) => {
      const aWeekdayIndex = weekdayOrder.indexOf(a.scheduledWeekday);
      const bWeekdayIndex = weekdayOrder.indexOf(b.scheduledWeekday);

      if (aWeekdayIndex !== bWeekdayIndex) {
        return aWeekdayIndex - bWeekdayIndex;
      }

      // 같은 요일이면 시간순 정렬 (null 값 처리)
      const aHour = a.scheduledHour || '';
      const bHour = b.scheduledHour || '';
      return aHour.localeCompare(bHour);
    });
  }

  // HTML 생성
  let timelineHtml = '<div class="schedule-container>';

  if (viewMode === 'order') {
    // 순번순 보기
    timelineHtml += '<div class="schedule-by-order>';

    sortedParties.forEach((party, index) => {
      const orderDisplay = party.order !== undefined ? `순번 ${party.order}` : '순번 없음';
      const timeDisplay = party.scheduledWeekday && party.scheduledHour 
        ? `${party.scheduledWeekday} ${party.scheduledHour}` 
        : '시간 미설정';

      timelineHtml += `
        <div class="schedule-item mb-3" data-party-id="${party.id}">
          <div class="card ${party.cleared ? 'bg-light' : ''}">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 class="card-title mb-1">
                    ${party.name || party.displayName || party.id}
                    ${party.cleared ? '<span class="badge bg-success ms-2">클리어</span>' : ''}
                  </h6>
                  <div class="text-muted small">
                    <span class="badge bg-primary me-2">${orderDisplay}</span>
                    <i class="bi bi-geo-alt"></i> ${party.raidName} ${party.difficultyName}
                    <br>
                    <i class="bi bi-clock"></i> ${timeDisplay}
                  </div>
                </div>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-warning" onclick="togglePartyClearInScheduler('${party.id}')" title="클리어 상태 토글">
                    <i class="bi bi-check-circle"></i>
                  </button>
                  <button class="btn btn-outline-info" onclick="editPartyOrder('${party.id}')" title="순번 수정">
                    <i class="bi bi-sort-numeric-down"></i>
                  </button>
                  <button class="btn btn-outline-primary" onclick="showPartyDetailInScheduler('${party.id}')" title="상세 보기">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
              </div>

              <!-- 파티 멤버 정보 -->
              <div class="mt-2">
                <small class="text-muted">
                  멤버: ${party.members.filter(m => m !== null).length}/${party.size}명
                  ${party.members.filter(m => m !== null).length > 0 ? 
                    ` (${party.members.filter(m => m !== null).map(m => m.name).join(', ')})` : 
                    ' (미정)'
                  }
                </small>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    timelineHtml += '</div>';
  } else {
    // 시간순 보기 (기존 방식)
    timelineHtml = '<div class="schedule-by-weekday';

    // 요일별 그룹화
    const partiesByWeekday = {};
    const partiesWithoutTime = []; // 시간 설정 없는 파티들

    sortedParties.forEach(party => {
      if (party.scheduledWeekday) {
        if (!partiesByWeekday[party.scheduledWeekday]) {
          partiesByWeekday[party.scheduledWeekday] = [];
        }
        partiesByWeekday[party.scheduledWeekday].push(party);
      } else {
        // 시간 설정 없는 파티들은 별도로 모으기
        partiesWithoutTime.push(party);
      }
    });

    const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    weekdayOrder.forEach(weekday => {
      const parties = partiesByWeekday[weekday];
      if (parties && parties.length > 0) {
        const weekdayNames = {
          'monday': '월요일',
          'tuesday': '화요일',
          'wednesday': '수요일',
          'thursday': '목요일',
          'friday': '금요일',
          'saturday': '토요일',
          'sunday': '일요일'
        };

        timelineHtml += `
          <div class="weekday-section mb-4">
            <h5 class="weekday-title">
              <i class="bi bi-calendar-week me-2"></i>${weekdayNames[weekday]}
            </h5>
            <div class="row g-3">
        `;

        parties.forEach(party => {
          timelineHtml += `
            <div class="col-md-6 col-lg-4">
              <div class="card ${party.cleared ? 'bg-light' : ''}">
                <div class="card-body">
                  <h6 class="card-title mb-1">
                    ${party.name || party.displayName || party.id}
                    ${party.cleared ? '<span class="badge bg-success ms-2">클리어</span>' : ''}
                  </h6>
                  <p class="card-text text-muted mb-2">
                    <i class="bi bi-geo-alt"></i> ${party.raidName} ${party.difficultyName}
                    <br>
                    <i class="bi bi-clock"></i> ${party.scheduledHour}
                    ${party.order !== undefined ? `<br><i class="bi bi-sort-numeric-down"></i> 순번 ${party.order}` : ''}
                  </p>

                  <!-- 파티 멤버 정보 -->
                  <div class="mt-2">
                    <small class="text-muted">
                      멤버: ${party.members.filter(m => m !== null).length}/${party.size}명
                      ${party.members.filter(m => m !== null).length > 0 ? 
                        ` (${party.members.filter(m => m !== null).map(m => m.name).join(', ')})` : 
                        ' (미정)'
                      }
                    </small>
                  </div>

                  <!-- 버튼 그룹 -->
                  <div class="mt-2">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-warning" onclick="togglePartyClearInScheduler('${party.id}')" title="클리어 상태 토글">
                        <i class="bi bi-check-circle"></i>
                      </button>
                      <button class="btn btn-outline-info" onclick="editPartyOrder('${party.id}')" title="순번 수정">
                        <i class="bi bi-sort-numeric-down"></i>
                      </button>
                      <button class="btn btn-outline-primary" onclick="showPartyDetailInScheduler('${party.id}')" title="상세 보기">
                        <i class="bi bi-eye"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        });

        timelineHtml += `
            </div>
          </div>
        `;
      }
    });

    // 시간 설정 없는 파티들 표시
    if (partiesWithoutTime.length > 0) {
      timelineHtml += `
        <div class="weekday-section mb-4">
          <h5 class="weekday-title">
            <i class="bi bi-clock-history me-2"></i>시간 미설정
          </h5>
          <div class="row g-3">
      `;

      partiesWithoutTime.forEach(party => {
        timelineHtml += `
          <div class="col-md-6 col-lg-4">
            <div class="card ${party.cleared ? 'bg-light' : ''}">
              <div class="card-body">
                <h6 class="card-title mb-1">
                  ${party.name || party.displayName || party.id}
                  ${party.cleared ? '<span class="badge bg-success ms-2">클리어</span>' : ''}
                </h6>
                <p class="card-text text-muted mb-2">
                  <i class="bi bi-geo-alt"></i> ${party.raidName} ${party.difficultyName}
                  <br>
                  <i class="bi bi-clock"></i> 시간 미설정
                  ${party.order !== undefined ? `<br><i class="bi bi-sort-numeric-down"></i> 순번 ${party.order}` : ''}
                </p>

                <!-- 파티 멤버 정보 -->
                <div class="mt-2">
                  <small class="text-muted">
                    멤버: ${party.members.filter(m => m !== null).length}/${party.size}명
                    ${party.members.filter(m => m !== null).length > 0 ? 
                      ` (${party.members.filter(m => m !== null).map(m => m.name).join(', ')})` : 
                      ' (미정)'
                    }
                  </small>
                </div>

                <!-- 버튼 그룹 -->
                <div class="mt-2">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning" onclick="togglePartyClearInScheduler('${party.id}')" title="클리어 상태 토글">
                      <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="editPartyOrder('${party.id}')" title="순번 수정">
                      <i class="bi bi-sort-numeric-down"></i>
                    </button>
                    <button class="btn btn-outline-primary" onclick="showPartyDetailInScheduler('${party.id}')" title="상세 보기">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      timelineHtml += `
          </div>
        </div>
      `;
    }

    timelineHtml += '</div>';
  }

  timelineHtml += '</div>';
  container.innerHTML = timelineHtml;
}

// 스케줄 상세 내용 로드
function loadScheduleDetail() {
  const container = document.getElementById('scheduleDetailContent');
  if (!container) return;
  
  // 순번이 설정되고 클리어되지 않은 파티들만 필터링
  const allParties = [];
  Object.keys(state.raidTabs).forEach(raidId => {
    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
      const parties = state.raidTabs[raidId][difficultyId];
      if (Array.isArray(parties)) {
        parties.forEach((party, index) => {
          if (party && party.order !== undefined && !party.cleared) {
            allParties.push({
              ...party,
              raidId,
              difficultyId,
              partyIndex: index
            });
          }
        });
      }
    });
  });
  
  // 순번순으로 정렬
  const sortedParties = allParties.sort((a, b) => {
    const aOrder = a.order || 999;
    const bOrder = b.order || 999;
    return aOrder - bOrder;
  });
  
  if (sortedParties.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-calendar-check" style="font-size: 3rem;"></i>
        <p class="mt-3">진행할 공격대가 없습니다.</p>
        <p>순번이 설정되고 클리어되지 않은 공격대가 없습니다.</p>
      </div>
    `;
    return;
  }
  
  // 현재 인덱스 확인 (URL 파라미터나 세션에서 가져오기)
  let currentIndex = 0;
  const urlParams = new URLSearchParams(window.location.search);
  const partyIndex = urlParams.get('partyIndex');
  if (partyIndex) {
    currentIndex = parseInt(partyIndex) % sortedParties.length;
  }
  
  const currentParty = sortedParties[currentIndex];
  const nextParty = sortedParties[currentIndex + 1];
  const prevParty = sortedParties[currentIndex - 1];
  
  container.innerHTML = `
    <div class="party-detail-view">
      <!-- 네비게이션 -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <button class="btn btn-outline-secondary ${!prevParty ? 'disabled' : ''}" 
                onclick="navigatePartyDetail(${currentIndex - 1})"
                ${!prevParty ? 'disabled' : ''}>
          <i class="bi bi-chevron-left"></i> 이전
        </button>
        
        <div class="text-center">
          <span class="badge bg-primary fs-6">${currentIndex + 1} / ${sortedParties.length}</span>
          <div class="text-muted small">순번 ${currentParty.order}</div>
        </div>
        
        <button class="btn btn-outline-success" 
                onclick="navigatePartyDetail(${currentIndex + 1})"
                id="nextPartyBtn">
          다음 <i class="bi bi-chevron-right"></i>
        </button>
      </div>
      
      <!-- 현재 파티 카드 -->
      <div class="card mb-4" id="currentPartyCard">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">
            <i class="bi bi-geo-alt me-2"></i>${currentParty.name || currentParty.displayName || currentParty.id}
            <span class="badge bg-warning text-dark ms-2">순번 ${currentParty.order}</span>
          </h5>
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6">
              <h6 class="mb-2"><i class="bi bi-info-circle me-1"></i>레이드 정보</h6>
              <p class="mb-1"><strong>레이드:</strong> ${currentParty.raidName}</p>
              <p class="mb-1"><strong>난이도:</strong> ${currentParty.difficultyName}</p>
              <p class="mb-0"><strong>상태:</strong> <span class="badge bg-warning">진행중</span></p>
            </div>
            <div class="col-md-6">
              <h6 class="mb-2"><i class="bi bi-clock me-1"></i>예약 정보</h6>
              <p class="mb-1"><strong>요일:</strong> ${currentParty.scheduledWeekday || '미설정'}</p>
              <p class="mb-1"><strong>시간:</strong> ${currentParty.scheduledHour || '미설정'}</p>
              <p class="mb-0"><strong>표시:</strong> ${currentParty.scheduledTimeDisplay || '미설정'}</p>
            </div>
          </div>
          
          <hr class="my-3">
          
          <h6 class="mb-3"><i class="bi bi-people me-2"></i>파티 멤버 (${currentParty.members.filter(m => m !== null).length}/${currentParty.size}명)</h6>
          <div class="row g-1">
            ${currentParty.members.map((member, index) => {
              // 원정대에서 캐릭터 상세 정보 가져오기
              const characterDetails = member ? getCharacterDetailsFromExpedition(member.name) : null;
              
              // 파티 크기에 따른 그리드 클래스 동적 설정
              const gridClass = currentParty.size <= 4 ? 'col-xl-3 col-lg-6 col-md-6 col-sm-6' : 'col-xl-3 col-lg-4 col-md-4 col-sm-6';
              
              return `
              <div class="${gridClass}">
                <div class="card ${member ? 'border-primary' : 'bg-light'} h-100">
                  <div class="card-body p-2">
                    ${member ? `
                      <div class="d-flex align-items-center">
                        <!-- 캐릭터 이미지/아이콘 -->
                        <div class="me-3">
                          ${characterDetails?.image ? `
                            <img src="${characterDetails.image}" alt="${member.name}" class="rounded-circle" style="width: ${currentParty.size <= 4 ? '70px' : '55px'}; height: ${currentParty.size <= 4 ? '70px' : '55px'}; object-fit: cover; border: 1px solid #0d6efd;">
                          ` : `
                            <div class="rounded-circle bg-primary d-flex align-items-center justify-content-center" style="width: ${currentParty.size <= 4 ? '70px' : '55px'}; height: ${currentParty.size <= 4 ? '70px' : '55px'}; border: 1px solid #0d6efd;">
                              <i class="bi bi-person-fill text-white" style="font-size: ${currentParty.size <= 4 ? '2rem' : '1.5rem'};"></i>
                            </div>
                          `}
                        </div>
                        <!-- 캐릭터 정보 -->
                        <div class="flex-grow-1">
                          <div class="fw-bold ${currentParty.size <= 4 ? '' : 'small'} mb-1">${member.name}</div>
                          <div class="${currentParty.size <= 4 ? '' : 'small'} text-muted">
                            <div class="mb-1">
                              <i class="bi bi-shield me-2"></i>
                              <span>${truncateText(characterDetails?.className || member.className || '직업', 6)}</span>
                            </div>
                            <div class="mb-1">
                              <i class="bi bi-star me-2"></i>
                              <span>Lv.${characterDetails?.ilvl || member.ilvl || '0'}</span>
                            </div>
                            <div>
                              <i class="bi bi-tag me-2"></i>
                              <span>${characterDetails?.role || member.role || '역할'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ` : `
                      <div class="d-flex align-items-center">
                        <div class="me-3">
                          <div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: ${currentParty.size <= 4 ? '70px' : '55px'}; height: ${currentParty.size <= 4 ? '70px' : '55px'}; border: 1px dashed #ced4da;">
                            <i class="bi bi-person-plus text-muted" style="font-size: ${currentParty.size <= 4 ? '2rem' : '1.5rem'};"></i>
                          </div>
                        </div>
                        <div class="flex-grow-1">
                          <div class="fw-bold ${currentParty.size <= 4 ? '' : 'small'} mb-1">슬롯 ${index + 1}</div>
                          <div class="${currentParty.size <= 4 ? '' : 'small'} text-muted">비어있음</div>
                        </div>
                      </div>
                    `}
                  </div>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
        <div class="card-footer">
          <div class="d-flex justify-content-between">
            <button class="btn btn-outline-secondary" onclick="closeScheduleDetail()">
              <i class="bi bi-x-lg"></i> 닫기
            </button>
            <button class="btn btn-success btn-lg" onclick="clearCurrentPartyAndNext('${currentParty.id}', ${currentIndex})">
              <i class="bi bi-check-circle"></i> 클리어하고 다음으로
            </button>
          </div>
        </div>
      </div>
      
      <!-- 다음 파티 미리보기 -->
      ${nextParty ? `
        <div class="card bg-light">
          <div class="card-body">
            <h6 class="text-muted mb-3">다음 공격대 미리보기</h6>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>${nextParty.name || nextParty.displayName || nextParty.id}</strong><br>
                <small class="text-muted">
                  ${nextParty.raidName} ${nextParty.difficultyName} | 순번 ${nextParty.order}
                </small>
              </div>
              <button class="btn btn-outline-primary btn-sm" onclick="navigatePartyDetail(${currentIndex + 1})">
                바로가기
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  // URL 파라미터 업데이트
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('partyIndex', currentIndex);
  window.history.replaceState({}, '', newUrl);
}

// 스케줄러에서 파티 클리어 상태 토글
async function togglePartyClearInScheduler(partyId) {
  // 작업 잠금 확인
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('클리어 상태 변경');
  }
  
  if (!acquired) return;
  
  try {
    // 파티 찾기
    const party = findPartyById(partyId);
    if (!party) {
      console.error('❌ [SCHEDULE] 파티를 찾을 수 없음:', partyId);
      return;
    }
    
    // 클리어 상태 토글
    party.cleared = !party.cleared;
    
    // UI 업데이트
    renderRaidParties();
    loadSchedulerContent();
    loadScheduleDetail();
    
    // 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.syncToFirebaseWithLock();
    } else {
      scheduleAutoSave();
    }
    
    // 알림
    const message = party.cleared ? 
      `${party.name || partyId}가 클리어 처리되었습니다.` : 
      `${party.name || partyId}의 클리어 상태가 해제되었습니다.`;
    
    showNotification(message, 'info');
    
  } finally {
    // 잠금 해제
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('클리어 상태 변경');
    }
  }
}

// 스케줄러에서 파티 상세 보기
function showPartyDetailInScheduler(partyId) {
  const party = findPartyById(partyId);
  if (!party) {
    console.error('❌ [SCHEDULE] 파티를 찾을 수 없음:', partyId);
    return;
  }
  
  // 상세 보기 탭으로 전환
  const detailTab = document.getElementById('scheduleDetailTab');
  if (detailTab) {
    const tab = new bootstrap.Tab(detailTab);
    tab.show();
    
    // 파티 하이라이트
    setTimeout(() => {
      const partyElement = document.querySelector(`[data-party-id="${partyId}"]`);
      if (partyElement) {
        partyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        partyElement.classList.add('highlight');
        setTimeout(() => {
          partyElement.classList.remove('highlight');
        }, 2000);
      }
    }, 100);
  }
}

// 파티 순번 수정
function editPartyOrder(partyId) {
  const party = findPartyById(partyId);
  if (!party) {
    console.error('❌ [SCHEDULE] 파티를 찾을 수 없음:', partyId);
    return;
  }
  
  const currentOrder = party.order !== undefined ? party.order : '';
  const newOrder = prompt(`${party.name || partyId}의 순번을 입력하세요:`, currentOrder);
  
  if (newOrder === null) return; // 취소
  
  const orderNum = parseInt(newOrder);
  if (isNaN(orderNum) || orderNum < 1) {
    showNotification('유효한 순번을 입력해주세요 (1 이상의 숫자).', 'error');
    return;
  }
  
  // 순번 업데이트
  party.order = orderNum;
  
  // UI 업데이트
  renderRaidParties();
  loadSchedulerContent();
  loadScheduleDetail();
  
  // 동기화
  if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
    window.realtimeSync.syncToFirebaseWithLock();
  } else {
    scheduleAutoSave();
  }
  
  showNotification(`${party.name || partyId}의 순번이 ${orderNum}으로 설정되었습니다.`, 'success');
}

// 상세 보기 닫기
function closeScheduleDetail() {
  const modal = document.getElementById('schedulerModal');
  if (modal) {
    const bsModal = bootstrap.Modal.getInstance(modal);
    if (bsModal) {
      bsModal.hide();
    }
  }
}

// 파티 ID로 파티 찾기
function findPartyById(partyId) {
  for (const raidId in state.raidTabs) {
    for (const difficultyId in state.raidTabs[raidId]) {
      const parties = state.raidTabs[raidId][difficultyId];
      if (Array.isArray(parties)) {
        const party = parties.find(p => p && p.id === partyId);
        if (party) return party;
      }
    }
  }
  return null;
}

// 파티 상세 보기 내비게이션
function navigatePartyDetail(newIndex) {
  // URL 파라미터 업데이트
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('partyIndex', newIndex);
  window.history.replaceState({}, '', newUrl);
  
  // 스케줄 상세 내용 다시 로드
  loadScheduleDetail();
}

// 현재 파티 클리어하고 다음 파티로
async function clearCurrentPartyAndNext(partyId, currentIndex) {
  try {
    const party = findPartyById(partyId);
    if (!party) {
      showNotification('파티를 찾을 수 없습니다.', 'error');
      return;
    }
    
    // 클리어 상태 변경
    if (window.stateManager && typeof window.stateManager.atomicUpdate === 'function') {
      await window.stateManager.atomicUpdate(`raidTabs.${party.raidId}.${party.difficultyId}`, async (currentParties) => {
        const partyIndex = currentParties.findIndex(p => p.id === partyId);
        if (partyIndex !== -1) {
          currentParties[partyIndex].cleared = true;
        }
        return currentParties;
      }, {
        recordHistory: true,
        autoSave: true,
        renderUI: true,
        historyData: {
          type: 'party_clear',
          operation: 'update',
          target: { raidId: party.raidId, difficultyId: party.difficultyId, partyId: partyId },
          description: `${party.name} 클리어 완료 (순번 ${party.order})`
        }
      });
    } else {
      // 기존 방식
      party.cleared = true;
      renderRaidParties();
      scheduleAutoSave();
      
      if (typeof recordHistory === 'function') {
        await recordHistory(
          'update',
          {
            type: 'party_clear',
            operation: 'update',
            target: { raidId: party.raidId, difficultyId: party.difficultyId, partyId: partyId }
          },
          { cleared: false },
          { cleared: true },
          `${party.name} 클리어 완료 (순번 ${party.order})`
        );
      }
    }
    
    // 성공 알림
    showNotification(`${party.name} 클리어 완료!`, 'success');
    
    // 스케줄러 내용 새로고침
    loadSchedulerContent();
    
    // 다음 파티로 이동 (URL 파라미터 업데이트)
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('partyIndex', currentIndex + 1);
    window.history.replaceState({}, '', newUrl);
    
    setTimeout(() => {
      loadScheduleDetail();
    }, 500);
    
  } catch (error) {
    console.error('파티 클리어 오류:', error);
    showNotification('클리어 처리 중 오류가 발생했습니다.', 'error');
  }
}

// 스케줄 내보내기
function exportSchedule() {
  // 모든 파티 데이터 수집
  const allParties = [];
  
  Object.keys(state.raidTabs).forEach(raidId => {
    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
      const parties = state.raidTabs[raidId][difficultyId];
      if (Array.isArray(parties)) {
        parties.forEach((party, index) => {
          if (party && (party.scheduledWeekday || party.order !== undefined)) {
            allParties.push({
              ...party,
              raidId,
              difficultyId,
              partyIndex: index
            });
          }
        });
      }
    });
  });
  
  if (allParties.length === 0) {
    showNotification('내보낼 스케줄이 없습니다.', 'warning');
    return;
  }
  
  // 순번순으로 정렬
  const sortedParties = allParties.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order === undefined && b.order === undefined) {
      return 0;
    }
    return a.order === undefined ? 1 : -1;
  });
  
  // 텍스트 생성
  let exportText = '=== 로스트아크 공격대 스케줄 ===\n\n';
  
  sortedParties.forEach(party => {
    const timeDisplay = party.scheduledWeekday && party.scheduledHour 
      ? `${party.scheduledWeekday} ${party.scheduledHour}` 
      : '시간 미설정';
    
    const members = party.members.filter(m => m !== null);
    const memberNames = members.length > 0 ? members.map(m => m.name).join(', ') : '미정';
    
    exportText += `${party.order !== undefined ? `[${party.order}] ` : ''}${party.name || party.id}\n`;
    exportText += `레이드: ${party.raidName} ${party.difficultyName}\n`;
    exportText += `시간: ${timeDisplay}\n`;
    exportText += `멤버: ${memberNames} (${members.length}/${party.size}명)\n`;
    exportText += `상태: ${party.cleared ? '클리어' : '미클리어'}\n`;
    exportText += '\n';
  });
  
  exportText += `총 ${sortedParties.length}개 공격대\n`;
  exportText += `생성일: ${new Date().toLocaleString('ko-KR')}`;
  
  // 클립보드에 복사
  navigator.clipboard.writeText(exportText).then(() => {
    showNotification('스케줄이 클립보드에 복사되었습니다.', 'success');
  }).catch(err => {
    console.error('클립보드 복사 실패:', err);
    showNotification('클립보드 복사에 실패했습니다.', 'error');
  });
}

// 전역 노출
window.updateRaidScheduledTime = updateRaidScheduledTime;
window.clearRaidScheduledTime = clearRaidScheduledTime;
window.openSchedulerModal = openSchedulerModal;
window.refreshScheduler = refreshScheduler;
window.exportSchedule = exportSchedule;
window.initializeClockPicker = initializeClockPicker;
window.loadScheduleDetail = loadScheduleDetail;
window.togglePartyClearInScheduler = togglePartyClearInScheduler;
window.showPartyDetailInScheduler = showPartyDetailInScheduler;
window.editPartyOrder = editPartyOrder;
window.closeScheduleDetail = closeScheduleDetail;
window.findPartyById = findPartyById;
window.navigatePartyDetail = navigatePartyDetail;
window.clearCurrentPartyAndNext = clearCurrentPartyAndNext;
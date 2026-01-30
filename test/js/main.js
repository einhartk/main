const state = {



  expeditionSlots: Array.from({length:8}, () => []),



  raidsData: [], // 레이드 데이터



  selectedRaid: null, // 선택된 레이드



  selectedDifficulty: null, // 선택된 난이도



  raidTabs: {}, // 탭별 공격대 관리 {raidId: {difficultyId: [parties]}}



  raidPartyCounter: {}, // 탭별 파티 ID 카운터 {raidId: {difficultyId: counter}}



  // 수정 시간 추적

  lastModifiedTimes: {

    expedition: {}, // {slotIndex: timestamp}

    raid: {} // {raidId: {difficultyId: timestamp}}

  }



};



// 수정 시간 관리 유틸리티 함수

function updateModifiedTime(type, key, subKey = null) {

  const timestamp = Date.now();

  if (subKey) {

    if (!state.lastModifiedTimes[type][key]) {

      state.lastModifiedTimes[type][key] = {};

    }

    state.lastModifiedTimes[type][key][subKey] = timestamp;

  } else {

    state.lastModifiedTimes[type][key] = timestamp;

  }

  console.log(`⏰ [TIME TRACKER] ${type} ${subKey ? `${key}.${subKey}` : key} modified at ${new Date(timestamp).toLocaleString()}`);

}



function getModifiedTime(type, key, subKey = null) {

  if (subKey) {

    return state.lastModifiedTimes[type]?.[key]?.[subKey] || null;

  }

  return state.lastModifiedTimes[type]?.[key] || null;

}



// DB 저장 시 수정 시간 비교 함수

async function checkForConflicts(codeName, currentData, type) {

  try {

    // DB에서 기존 데이터 가져오기 (가상 함수 - 실제 DB 연동 필요)

    const existingData = await fetchExistingData(codeName, type);

    

    if (!existingData) {

      return { hasConflict: false, message: '새로운 데이터 저장' };

    }

    

    const existingTimestamp = existingData.lastModified;

    const currentTimestamp = getModifiedTime(type, codeName);

    

    if (existingTimestamp && currentTimestamp && existingTimestamp > currentTimestamp) {

      const existingDate = new Date(existingTimestamp).toLocaleString();

      const currentDate = new Date(currentTimestamp).toLocaleString();

      

      return {

        hasConflict: true,

        message: `⚠️ 충돌 경고!\n다른 사용자가 ${existingDate}에 데이터를 수정했습니다.\n현재 데이터는 ${currentDate}에 마지막으로 수정되었습니다.\n\n덮어쓰시겠습니까?`,

        existingData,

        currentData

      };

    }

    

    return { hasConflict: false, message: '저장 가능' };

  } catch (error) {

    console.error('❌ [CONFLICT CHECK ERROR]:', error);

    return { hasConflict: false, message: '오류로 인한 충돌 확인 불가' };

  }

}



// 가상 DB 저장 함수 (실제 구현 필요)

async function saveToDatabase(codeName, data, type) {

  // 실제로는 여기서 DB나 API를 통해 데이터를 저장해야 함

  // 지금은 localStorage를 사용한 예시

  const storageKey = `${type}_${codeName}`;

  const saveData = {

    ...data,

    codeName,

    type,

    savedAt: Date.now()

  };

  localStorage.setItem(storageKey, JSON.stringify(saveData));

  

  // 수정 시간 기록

  updateModifiedTime(type, codeName);

  

  console.log(`💾 [DB SAVE] ${type} ${codeName} 저장 완료`);

}



// 가상 DB 데이터 가져오기 함수 (실제 구현 필요)

async function fetchExistingData(codeName, type) {

  // 실제로는 여기서 DB나 API를 통해 데이터를 가져와야 함

  // 지금은 localStorage를 사용한 예시

  const storageKey = `${type}_${codeName}`;

  const stored = localStorage.getItem(storageKey);

  return stored ? JSON.parse(stored) : null;

}



// 레이드 데이터 로드



async function loadRaidsData() {



  try {



    const response = await fetch('data/raids.json');



    if (!response.ok) {



      throw new Error(`HTTP error! status: ${response.status}`);



    }



    const data = await response.json();



    state.raidsData = data.raids || [];

    

    // 첫 번째 레이드와 난이도를 기본 선택

    if (state.raidsData.length > 0 && state.raidsData[0].difficulties && state.raidsData[0].difficulties.length > 0) {

      state.selectedRaid = state.raidsData[0];

      state.selectedDifficulty = state.raidsData[0].difficulties[0];

    } else {

      throw new Error('Invalid raid data format');

    }



  } catch (error) {

    console.error('❌ [RAID DATA ERROR]:', error);



    // 기본 데이터 설정



    state.raidsData = [



      {



        id: 'serkaris',



        name: '세르카',



        difficulties: [



          { id: 'nightmare', name: '나이트메어', minIlvl: 1740 },



          { id: 'hard', name: '하드', minIlvl: 1730 },



          { id: 'normal', name: '노말', minIlvl: 1710 }



        ]



      }



    ];



    state.selectedRaid = state.raidsData[0];



    state.selectedDifficulty = state.raidsData[0].difficulties[0];



  }



}







// 레이드 선택



function selectRaid(raidId) {



  const raid = state.raidsData.find(r => r.id === raidId);



  if (raid && raid.difficulties && raid.difficulties.length > 0) {



    state.selectedRaid = raid;



    state.selectedDifficulty = raid.difficulties[0]; // 첫 번째 난이도 선택



    applyRecommendedRequirements();



    renderRaidTabs();



    renderRaidParties();



  } else {



  }



}







// 난이도 선택



function selectDifficulty(difficultyId) {



  if (!state.selectedRaid) return;



  



  const difficulty = state.selectedRaid.difficulties.find(d => d.id === difficultyId);



  if (difficulty) {



    state.selectedDifficulty = difficulty;



    applyRecommendedRequirements();



    renderRaidTabs();



    renderRaidParties();



  }



}







// 권장 요구사항 자동 적용

function applyRecommendedRequirements() {

  if (!state.selectedDifficulty) return;



  const parties = getCurrentTabParties();

  const recommendedIlvl = state.selectedDifficulty.minIlvl || 0;

  const recommendedCombatPower = state.selectedDifficulty.minCombatPower || 0;



  parties.forEach(party => {

    party.minIlvl = recommendedIlvl;

    party.minCombatPower = recommendedCombatPower;

  });

}





// 레이드 탭 렌더링



function renderRaidTabs() {



  const container = document.getElementById('raidTabs');



  if (!container) return;



  



  let tabsHtml = '<ul class="nav nav-tabs mb-3" id="raidTabsList" role="tablist">';



  



  // 레이드 탭



  state.raidsData.forEach((raid, raidIndex) => {



    const isActive = state.selectedRaid?.id === raid.id;



    tabsHtml += `



      <li class="nav-item" role="presentation">



        <button class="nav-link ${isActive ? 'active' : ''}" 



                id="raid-tab-${raid.id}" 



                data-bs-toggle="tab" 



                data-bs-target="#raid-${raid.id}" 



                type="button" 



                role="tab"



                onclick="selectRaid('${raid.id}')">



          ${raid.name}



        </button>



      </li>



    `;



  });



  



  tabsHtml += '</ul>';



  



  // 난이도 탭



  if (state.selectedRaid) {



    tabsHtml += '<ul class="nav nav-pills mb-3" id="difficultyTabsList" role="tablist">';



    



    state.selectedRaid.difficulties.forEach((difficulty, diffIndex) => {



      const isActive = state.selectedDifficulty?.id === difficulty.id;



      tabsHtml += `



        <li class="nav-item" role="presentation">



          <button class="nav-link ${isActive ? 'active' : ''}" 



                  id="diff-tab-${difficulty.id}" 



                  data-bs-toggle="pill" 



                  type="button" 



                  role="tab"



                  onclick="selectDifficulty('${difficulty.id}')">



            ${difficulty.name} (Lv${difficulty.minIlvl})



          </button>



        </li>



      `;



    });



    



    tabsHtml += '</ul>';



  }



  



  container.innerHTML = tabsHtml;



}







// 초기 공격대 파티 2개 생성



async function initializeRaids() {



  await loadRaidsData(); // 레이드 데이터 로드



  



  // 레이드와 난이도가 제대로 선택되었는지 확인



  if (!state.selectedRaid || !state.selectedDifficulty) {



    return;



  }



  



  renderRaidTabs(); // 레이드 탭 렌더링



  addRaidParty(); // 첫 번째 파티



  addRaidParty(); // 두 번째 파티



  // 초기 파티에 권장 요구사항 적용

  applyRecommendedRequirements();



}







// 현재 탭의 공격대 파티 목록 가져오기



function getCurrentTabParties() {



  if (!state.selectedRaid || !state.selectedDifficulty) {

    return [];

  }



  



  const raidId = state.selectedRaid.id;



  const difficultyId = state.selectedDifficulty.id;



  



  if (!raidId || !difficultyId) {

    return [];

  }



  



  if (!state.raidTabs[raidId]) {



    state.raidTabs[raidId] = {};



  }



  if (!state.raidTabs[raidId][difficultyId]) {



    state.raidTabs[raidId][difficultyId] = [];



  }



  if (!state.raidPartyCounter[raidId]) {



    state.raidPartyCounter[raidId] = {};



  }



  if (!state.raidPartyCounter[raidId][difficultyId]) {



    state.raidPartyCounter[raidId][difficultyId] = 0;



  }



  



  return state.raidTabs[raidId][difficultyId];



}







// 공격대 파티 추가



function addRaidParty() {



  // 레이드나 난이도가 선택되지 않은 경우



  if (!state.selectedRaid || !state.selectedDifficulty) {

    window.modalManager.showAlert({

      title: '알림',

      message: '먼저 레이드와 난이도를 선택해주세요.'

    });

    return;

  }



  



  const parties = getCurrentTabParties();



  const raidId = state.selectedRaid.id;



  const difficultyId = state.selectedDifficulty.id;



  



  const partyId = String.fromCharCode(65 + state.raidPartyCounter[raidId][difficultyId]); // A, B, C, ...



  state.raidPartyCounter[raidId][difficultyId]++;



  



  const newParty = {



    id: partyId,



    name: `${state.selectedRaid.name} ${state.selectedDifficulty.name} ${partyId}`,



    raidId: state.selectedRaid.id,



    difficultyId: state.selectedDifficulty.id,



    raidName: state.selectedRaid.name,



    difficultyName: state.selectedDifficulty.name,



    members: Array(4).fill(null), // 기본 4인



    maxSupports: 1, // 4인당 1서폿



    size: 4, // 현재 파티 크기



    minIlvl: state.selectedDifficulty.minIlvl,        // 선택된 난이도의 최소 레벨



    minCombatPower: state.selectedDifficulty.minCombatPower || 0  // 선택된 난이도의 최소 전투력



  };



  



  parties.push(newParty);



  renderRaidParties();



}







// 공격대 파티 삭제



function removeRaidParty(partyId) {



  const parties = getCurrentTabParties();



  



  // 삭제 애니메이션 적용



  const partyCard = document.querySelector(`[data-party="${partyId}"]`).closest('.card');



  if (partyCard) {



    partyCard.classList.add('removing');



    



    // 애니메이션 완료 후 실제 삭제



    setTimeout(() => {



      const index = parties.findIndex(p => p.id === partyId);



      if (index !== -1) {



        parties.splice(index, 1);



      }



      renderRaidParties();



    }, 300);



  } else {



    // 애니메이션을 적용할 수 없는 경우 즉시 삭제



    const index = parties.findIndex(p => p.id === partyId);



    if (index !== -1) {



      parties.splice(index, 1);



    }



    renderRaidParties();



  }



}







// 공격대 파티 이름 업데이트



function updatePartyName(partyId, newName) {



  // 레이드나 난이도가 선택되지 않은 경우



  if (!state.selectedRaid || !state.selectedDifficulty) {

    return;

  }



  



  const parties = getCurrentTabParties();



  const party = parties.find(p => p.id === partyId);



  if (party) {



    party.name = newName.trim() || `${state.selectedRaid.name} ${state.selectedDifficulty.name} ${partyId}`;



    renderRaidParties();



  }



}







// 공격대 요구사항 업데이트



function updatePartyRequirements(partyId, requirementType, value) {



  const parties = getCurrentTabParties();



  const party = parties.find(p => p.id === partyId);



  if (party) {



    party[requirementType] = parseInt(value) || 0;



    renderRaidParties();



  }



}







// 전체 공격대 초기화 (현재 탭만)



function clearAllRaids() {



  const parties = getCurrentTabParties();



  parties.forEach(party => {



    party.members.fill(null);



  });



  renderRaidParties();



}



// 전체 초기화 함수 추가

function clearAllRaidsCompletely() {

  window.modalManager.showConfirm({

    title: '전체 초기화',

    message: '모든 공대 데이터를 초기화하시겠습니까?',

    confirmClass: 'btn-danger',

    onConfirm: () => {

      state.raidTabs = {};

      state.selectedRaid = null;

      state.selectedDifficulty = null;

      renderRaidTabs();

      renderRaidParties();

    }

  });

}



// 공유 및 내려받기 기능 함수 추가



// 공대 데이터 공유

async function shareRaidData() {

  const modal = new bootstrap.Modal(document.getElementById('shareRaidModal'));

  document.getElementById('shareId').value = '';

  modal.show();

}



// 공대 데이터 내려받기

async function downloadRaidData() {

  const modal = new bootstrap.Modal(document.getElementById('downloadRaidModal'));

  document.getElementById('downloadId').value = '';

  modal.show();

}



// 공유 확인

async function confirmShareRaid() {

  const shareId = document.getElementById('shareId').value.trim();

  

  if (!shareId) {

    window.modalManager.showAlert({

      title: '입력 오류',

      message: '공유 ID를 입력하세요.'

    });

    return;

  }

  

  if (shareId.length < 3) {

    window.modalManager.showAlert({

      title: '입력 오류',

      message: '공유 ID는 최소 3자 이상이어야 합니다.'

    });

    return;

  }

  

  // 프로그레스 표시

  const progressModal = window.modalManager.showProgress({

    title: '공유 중...',

    message: '공대 데이터를 공유하고 있습니다.'

  });

  

  try {

    // 툴팁 정보를 제외한 데이터 복사 함수

    const removeTooltipData = (data) => {

      if (!data) return {};

      

      const cleanData = JSON.parse(JSON.stringify(data)); // 깊은 복사

      

      // 원정대 데이터에서 툴팁 제거 및 undefined 값 필터링

      if (cleanData.expedition) {

        Object.keys(cleanData.expedition).forEach(key => {

          if (cleanData.expedition[key]) {

            // json과 effect 안의 툴팁 제거

            if (cleanData.expedition[key].json && cleanData.expedition[key].json.tooltip) {

              delete cleanData.expedition[key].json.tooltip;

            }

            if (cleanData.expedition[key].effect && cleanData.expedition[key].effect.tooltip) {

              delete cleanData.expedition[key].effect.tooltip;

            }

            

            // undefined 값이 있는 속성 제거

            Object.keys(cleanData.expedition[key]).forEach(prop => {

              if (cleanData.expedition[key][prop] === undefined || cleanData.expedition[key][prop] === null) {

                delete cleanData.expedition[key][prop];

              }

            });

          } else {

            // expedition[key]가 undefined/null이면 제거

            delete cleanData.expedition[key];

          }

        });

      }

      

      // 공대 탭 데이터에서 툴팁 제거 및 undefined 값 필터링

      if (cleanData.raidTabs) {

        Object.keys(cleanData.raidTabs).forEach(raidId => {

          Object.keys(cleanData.raidTabs[raidId]).forEach(difficultyId => {

            const parties = cleanData.raidTabs[raidId][difficultyId];

            if (Array.isArray(parties)) {

              parties.forEach(party => {

                if (party.members && Array.isArray(party.members)) {

                  party.members = party.members.filter(member => member !== null && member !== undefined);

                  party.members.forEach(member => {

                    if (member) {

                      // json과 effect 안의 툴팁 제거

                      if (member.json && member.json.tooltip) {

                        delete member.json.tooltip;

                      }

                      if (member.effect && member.effect.tooltip) {

                        delete member.effect.tooltip;

                      }

                      

                      delete member.tooltip;

                      // undefined 값이 있는 속성 제거

                      Object.keys(member).forEach(prop => {

                        if (member[prop] === undefined || member[prop] === null) {

                          delete member[prop];

                        }

                      });

                    }

                  });

                }

              });

            }

          });

        });

      }

      

      return cleanData;

    };

    

    // 원정대 데이터 평탄화 함수

    const flattenExpeditionData = (expeditionSlots) => {

      if (!expeditionSlots || !Array.isArray(expeditionSlots)) return {};

      

      const flattened = {};

      expeditionSlots.forEach((slot, index) => {

        if (slot && Array.isArray(slot)) {

          slot.forEach((character, charIndex) => {

            if (character) {

              const key = `slot${index}_char${charIndex}`;

              flattened[key] = character;

            }

          });

        }

      });

      

      return flattened;

    };

    

    // 원정대 데이터 평탄화 및 툴팁 제거

    const flattenedExpedition = removeTooltipData(flattenExpeditionData(state.expeditionSlots));

    

    // 현재 공대 데이터 수집 (툴팁 제외)

    const raidData = {

      raidTabs: removeTooltipData(state.raidTabs),

      selectedRaid: state.selectedRaid,

      selectedDifficulty: state.selectedDifficulty,

      expedition: flattenedExpedition, // 평탄화된 원정대 데이터 사용

      timestamp: new Date().toISOString(),

      lastModified: Date.now(), // 수정 시간 추가

      sharedBy: window.chatManager?.currentUser || 'Anonymous'

    };

    

    // 충돌 확인 (Firebase에 기존 데이터가 있는지 확인)

    const doc = await window.db.collection('sharedRaids').doc(shareId).get();

    

    if (doc.exists) {

      const existingData = doc.data();

      const existingTimestamp = existingData.lastModified || new Date(existingData.timestamp).getTime();

      const currentTimestamp = raidData.lastModified;

      

      if (existingTimestamp > currentTimestamp) {

        const existingDate = new Date(existingTimestamp).toLocaleString();

        const currentDate = new Date(currentTimestamp).toLocaleString();

        

        const shouldOverride = await window.modalManager.showConfirmSync({

          title: '충돌 경고',

          message: `⚠️ 충돌 경고!\n다른 사용자가 ${existingDate}에 "${shareId}" ID로 데이터를 공유했습니다.\n현재 데이터는 ${currentDate}에 마지막으로 수정되었습니다.\n\n덮어쓰시겠습니까?`,

          confirmClass: 'btn-danger'

        });

        

        if (!shouldOverride) {

          progressModal.close();

          console.log('❌ [SHARE CANCELLED] 사용자가 공유를 취소했습니다.');

          return;

        }

      }

    }

    

    // Firebase에 저장

    await window.db.collection('sharedRaids').doc(shareId).set(raidData);

    

    // 수정 시간 기록

    updateModifiedTime('raid', shareId);

    

    // 프로그레스 닫기

    progressModal.close();

    

    window.modalManager.showAlert({

      title: '공유 완료',

      message: `공대 데이터가 "${shareId}" ID로 공유되었습니다!`,

      zIndex: 1110, // 가장 높은 z-index

      onClose: () => {

        // 모달 닫기

        bootstrap.Modal.getInstance(document.getElementById('shareRaidModal')).hide();

        // 긴급 backdrop 정리

        window.modalManager.forceCleanupBackdrops();

      }

    });

    

  } catch (error) {

    // 프로그레스 닫기

    progressModal.close();

    console.error('공유 실패:', error);

    window.modalManager.showAlert({

      title: '공유 실패',

      message: '공유에 실패했습니다. 다시 시도해주세요.'

    });

  }

}



// 내려받기 확인

async function confirmDownloadRaid() {

  const downloadId = document.getElementById('downloadId').value.trim();

  

  if (!downloadId) {

    window.modalManager.showAlert({

      title: '입력 오류',

      message: '공유 ID를 입력하세요.'

    });

    return;

  }

  

  // 프로그레스 표시

  const progressModal = window.modalManager.showProgress({

    title: '내려받기 중...',

    message: '공대 데이터를 내려받고 있습니다.'

  });

  

  try {

    // Firebase에서 데이터 가져오기

    const doc = await window.db.collection('sharedRaids').doc(downloadId).get();

    

    if (!doc.exists) {

      progressModal.close();

      window.modalManager.showAlert({

        title: '데이터 없음',

        message: '해당 ID의 공유 데이터를 찾을 수 없습니다.'

      });

      return;

    }

    

    const raidData = doc.data();

    

    // 프로그레스 창 닫기

    progressModal.close();

    

    const shouldDownload = await window.modalManager.showConfirmSync({

      title: '내려받기 확인',

      message: `"${downloadId}" ID의 공대 데이터를 내려받겠습니까?\n공유자: ${raidData.sharedBy}\n공유 시간: ${new Date(raidData.timestamp).toLocaleString()}\n\n현재 데이터는 덮어쓰기 됩니다.`,

      confirmClass: 'btn-primary',

      zIndex: 1100 // 프로그레스 창보다 높게 설정

    });

    

    if (!shouldDownload) {

      return;

    }

    

    // 데이터 적용 중 프로그레스 표시

    const applyProgressModal = window.modalManager.showProgress({

      title: '데이터 적용 중...',

      message: '내려받은 데이터를 적용하고 있습니다.'

    });

    

    try {

      // 공대 데이터 적용

      state.raidTabs = raidData.raidTabs || {};

      state.selectedRaid = raidData.selectedRaid;

      state.selectedDifficulty = raidData.selectedDifficulty;

      

      // 원정대 데이터 복원 함수

      const restoreExpeditionData = (flattenedExpedition) => {

        if (!flattenedExpedition) return Array.from({length: 8}, () => []);

        

        const restored = Array.from({length: 8}, () => []);

        

        Object.keys(flattenedExpedition).forEach(key => {

          const match = key.match(/^slot(\d+)_char(\d+)$/);

          if (match) {

            const slotIndex = parseInt(match[1]);

            const charIndex = parseInt(match[2]);

            

            if (!restored[slotIndex]) {

              restored[slotIndex] = [];

            }

            

            restored[slotIndex][charIndex] = flattenedExpedition[key];

          }

        });

        

        return restored;

      };

      

      // 원정대 데이터도 적용

      if (raidData.expedition) {

        state.expeditionSlots = restoreExpeditionData(raidData.expedition); // 평탄화된 데이터 복원

        renderExpedition(); // 원정대 UI 업데이트

      }

      

      // UI 업데이트

      renderRaidTabs();

      renderRaidParties();

      

      // 데이터 적용 완료 - 즉시 프로그레스 창 닫기

      applyProgressModal.close();

      

      // 추가 긴급 정리

      window.modalManager.forceCleanupBackdrops();

      

      // 완료 알림 표시

      window.modalManager.showAlert({

        title: '내려받기 완료',

        message: `"${downloadId}" ID의 공대 데이터를 성공적으로 내려받았습니다!`,

        zIndex: 1110, // 가장 높은 z-index

        onClose: () => {

          // 모달 닫기

          bootstrap.Modal.getInstance(document.getElementById('downloadRaidModal')).hide();

          // 긴급 backdrop 정리

          window.modalManager.forceCleanupBackdrops();

        }

      });

      

    } catch (applyError) {

      // 프로그레스 닫기

      applyProgressModal.close();

      console.error('데이터 적용 실패:', applyError);

      window.modalManager.showAlert({

        title: '데이터 적용 실패',

        message: '내려받은 데이터 적용에 실패했습니다.'

      });

    }

    

  } catch (error) {

    // 프로그레스 닫기

    progressModal.close();

    console.error('내려받기 실패:', error);

    window.modalManager.showAlert({

      title: '내려받기 실패',

      message: '내려받기에 실패했습니다. 다시 시도해주세요.'

    });

  }

}







// 특정 파티의 크기 변경



function changePartySize(partyId, size) {



  const parties = getCurrentTabParties();



  const party = parties.find(p => p.id === partyId);



  



  if (!party || party.size === size) return;



  



  party.size = size;



  



  if (size > party.members.length) {



    // 파티 확장



    party.members.push(...Array(size - party.members.length).fill(null));



  } else {



    // 파티 축소 (초과 멤버 제거)



    party.members = party.members.slice(0, size);



  }



  



  party.maxSupports = Math.ceil(size / 4);



  renderRaidParties();



}







// 공격대 파티 렌더링



function renderRaidParties() {



  const container = document.getElementById('raidParties');



  container.innerHTML = '';



  



  const parties = getCurrentTabParties();



  



  parties.forEach((party, index) => {



    const partyDiv = document.createElement('div');



    partyDiv.className = 'col-12';



    



    // 평균 전투력 계산



    const validMembers = party.members.filter(m => m !== null);



    const avgCombatPower = validMembers.length > 0 



      ? Math.round(validMembers.reduce((sum, m) => sum + parseFloat((m.combatPower || '0').replace(',', '')), 0) / validMembers.length)



      : 0;



    



    const supportCount = party.members.filter(m => m?.role === 'support').length;



    const supportBadge = supportCount > party.maxSupports ? 'bg-danger' : 'bg-secondary';



    



    partyDiv.innerHTML = `



      <div class="card shadow-sm">



        <div class="card-header" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #2c3e50; border-bottom: 1px solid #dee2e6; padding: 15px;">



          <!-- 윗줄: 공대 이름/수정 + 삭제 버튼 -->

          <div class="row align-items-center mb-3">



            <div class="col-md-10">



              <div class="d-flex align-items-center gap-3">



                <div class="input-group" style="width: 350px; font-size: 0.85rem;">



                  <span class="input-group-text" style="background: white; color: #2c3e50; border: 1px solid #ced4da; font-size: 0.85rem;">



                    <i class="bi bi-people-fill"></i>



                  </span>



                  <input type="text" class="form-control" id="partyName-${party.id}" 



                         value="${party.name || `${party.raidName} ${party.difficultyName} ${party.id}`}" 



                         placeholder="공대 이름" 



                         style="font-size: 0.9rem;"



                         onchange="updatePartyName('${party.id}', this.value)">



                  <button class="btn btn-outline-secondary" type="button" onclick="this.previousElementSibling.focus()" style="font-size: 0.85rem;">



                    <i class="bi bi-pencil"></i>



                  </button>



                </div>



              </div>



            </div>



            <div class="col-md-2">



              <div class="d-flex align-items-center justify-content-end">



                <button class="btn btn-sm btn-outline-danger" onclick="removeRaidParty('${party.id}')" style="padding: 6px 10px; font-size: 0.85rem;">



                  <i class="bi bi-x-lg"></i>



                </button>



              </div>



            </div>



          </div>



          <!-- 아래 2줄: 정보 배치 -->

          <div class="row align-items-center">



            <div class="col-md-4">



              <div class="d-flex align-items-center gap-3">



                <span class="badge" style="background: #6c757d; color: white; font-size: 0.8rem; padding: 5px 10px;">



                  <i class="bi bi-lightning-fill me-1"></i>평균 CP ${avgCombatPower.toLocaleString()}



                </span>



              </div>



            </div>



            <div class="col-md-4">



              <div class="d-flex align-items-center justify-content-center">



                <span id="support-${party.id}" class="badge ${supportBadge === 'bg-success' ? 'bg-success' : 'bg-warning'} text-white" style="font-size: 0.8rem; padding: 5px 10px;">



                  <i class="bi bi-shield-fill me-1"></i>서폿 ${supportCount}/${party.maxSupports}



                </span>



              </div>



            </div>



            <div class="col-md-4">



              <div class="d-flex align-items-center justify-content-end gap-2">



                <div class="btn-group btn-group-sm" role="group">



                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size4-${party.id}" value="4" ${party.size === 4 ? 'checked' : ''} onchange="changePartySize('${party.id}', 4)">



                  <label class="btn ${party.size === 4 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size4-${party.id}" style="font-size: 0.8rem;">



                    4인



                  </label>



                  



                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size8-${party.id}" value="8" ${party.size === 8 ? 'checked' : ''} onchange="changePartySize('${party.id}', 8)">



                  <label class="btn ${party.size === 8 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size8-${party.id}" style="font-size: 0.8rem;">



                    8인



                  </label>



                </div>



              </div>



            </div>



          </div>



        </div>



        <div class="card-body">



          <div class="row mb-3">



            <div class="col-12">



              <div class="d-flex flex-column gap-2">



                <div class="input-group input-group-sm" style="flex: 0 0 auto;">



                  <span class="input-group-text">최소 레벨</span>



                  <input type="number" class="form-control" id="minIlvl-${party.id}" 



                         value="${party.minIlvl || 0}" 



                         placeholder="0" 



                         min="0" 



                         style="width: 80px;"



                         onchange="updatePartyRequirements('${party.id}', 'minIlvl', this.value)">



                  <span class="input-group-text">Lv</span>



                </div>



                <div class="input-group input-group-sm" style="flex: 0 0 auto;">



                  <span class="input-group-text">최소 전투력</span>



                  <input type="number" class="form-control" id="minCombatPower-${party.id}" 



                         value="${party.minCombatPower || 0}" 



                         placeholder="0" 



                         min="0" 



                         style="width: 100px;"



                         onchange="updatePartyRequirements('${party.id}', 'minCombatPower', this.value)">



                  <span class="input-group-text">CP</span>



                </div>



              </div>



            </div>



          </div>



          <div class="raid-slots-grid">



            ${party.members.map((char, slotIndex) => {



              const partyNumber = party.size === 8 ? Math.floor(slotIndex / 4) + 1 : 1;



              const isFirstInParty = slotIndex % 4 === 0;



              return `



              <div class="raid-slot-wrapper" data-party="${party.id}" data-slot="${slotIndex}">



                ${isFirstInParty && party.size === 8 ? `<div class="party-label">파티 ${partyNumber}</div>` : ''}



                <div class="raid-slot">



                  ${char ? `



                    <div class="char-box ${char.role} ${!meetsRequirements(char, party) ? 'requirement-failed' : ''}" draggable="true">



                      <div class="fw-bold small">${char.name}</div>



                      <div class="small text-muted">Lv ${char.ilvl || '0'}</div>



                      <div class="small text-muted">CP ${(char.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>



                      <div class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'} mt-1" style="font-size: 0.7rem;">${char.role === 'support' ? '서폿' : '딜러'}</div>



                      ${!meetsRequirements(char, party) ? '<div class="badge bg-danger mt-1" style="font-size: 0.65rem;">조건미달</div>' : ''}



                    </div>



                  ` : ''}



                </div>



              </div>



            `;



            }).join('')}



          </div>



        </div>



      </div>



    `;



    



    container.appendChild(partyDiv);



  });



  



  updateSupportCount();



  setupRaidEventListeners();



}







// 서폿 수 업데이트



function updateSupportCount() {



  const parties = getCurrentTabParties();



  parties.forEach(party => {



    const count = party.members.filter(m => m?.role === "support").length;



    const badge = document.getElementById(`support-${party.id}`);



    if (badge) {



      badge.innerText = `서폿 ${count}/${party.maxSupports}`;



      badge.className = `badge ms-2 ${count > party.maxSupports ? 'bg-danger' : 'bg-secondary'}`;



    }



  });



}







// 캐릭터가 공격대 요구사항을 만족하는지 확인



function meetsRequirements(character, party) {



  const charIlvl = parseFloat((character.ilvl || '0').replace(/,/g, ''));



  const charCombatPower = parseFloat((character.combatPower || '0').replace(/,/g, ''));



  



  return charIlvl >= party.minIlvl && charCombatPower >= party.minCombatPower;



}







// 공격대 데이터 저장



async function saveRaidData() {



  try {



    const saveData = {



      raidTabs: state.raidTabs,



      raidPartyCounter: state.raidPartyCounter,



      expeditionSlots: state.expeditionSlots,



      saveTime: new Date().toISOString(),



      lastModified: Date.now()



    };



    



    // localStorage 중복 확인 (lostArkRaidData 키)



    const existingLocalStorageData = localStorage.getItem('lostArkRaidData');



    if (existingLocalStorageData) {



      const parsedData = JSON.parse(existingLocalStorageData);



      const existingTimestamp = parsedData.lastModified || new Date(parsedData.saveTime).getTime();



      const currentTimestamp = saveData.lastModified;



      



      if (existingTimestamp > currentTimestamp) {



        const existingDate = new Date(existingTimestamp).toLocaleString();



        const currentDate = new Date(currentTimestamp).toLocaleString();



        



        const shouldOverrideLocalStorage = await window.modalManager.showConfirmSync({



          title: 'localStorage 충돌 경고',



          message: `⚠️ localStorage 충돌 경고!\nlocalStorage에 더 최신 데이터가 있습니다.\n기존 데이터: ${existingDate}\n현재 데이터: ${currentDate}\n\n덮어쓰시겠습니까?`,



          confirmClass: 'btn-warning'



        });



        



        if (!shouldOverrideLocalStorage) {



          console.log('❌ [SAVE CANCELLED] 사용자가 저장을 취소했습니다.');



          return;



        }



      }



    }



    // localStorage에 저장



    localStorage.setItem('lostArkRaidData', JSON.stringify(saveData));



    window.modalManager.showAlert({



      title: '저장 완료',



      message: '공격대 정보가 저장되었습니다!\n(원정대 정보 포함)'



    });



    console.log(`✅ [SAVE COMPLETE] localStorage 저장 완료`);



  } catch (error) {



    console.error('❌ [SAVE ERROR]:', error);



    window.modalManager.showAlert({



      title: '저장 오류',



      message: '저장 중 오류가 발생했습니다: ' + error.message



    });



  }



}







// 공격대 데이터 불러오기



function loadRaidData() {



  try {



    const savedData = localStorage.getItem('lostArkRaidData');



    



    if (!savedData) {

      window.modalManager.showAlert({

        title: '데이터 없음',

        message: '저장된 데이터가 없습니다.'

      });

      return;

    }



    



    const data = JSON.parse(savedData);



    



    // 데이터 복원



    state.raidTabs = data.raidTabs || {};



    state.raidPartyCounter = data.raidPartyCounter || {};



    state.expeditionSlots = data.expeditionSlots || Array.from({length:8}, () => []);



    



    // UI 업데이트



    renderRaidParties();



    renderExpedition();



    



    const saveTime = new Date(data.saveTime).toLocaleString('ko-KR');



    window.modalManager.showAlert({

      title: '불러오기 완료',

      message: `공격대 정보가 불러와졌습니다!\n저장 시간: ${saveTime}`

    });



  } catch (error) {



    console.error('❌ [LOAD ERROR]:', error);



    window.modalManager.showAlert({

      title: '불러오기 오류',

      message: '불러오기 중 오류가 발생했습니다: ' + error.message

    });



  }



}







// 공격대 리스트 모달창 표시



function showRaidListModal() {



  // 레이드별로 파티를 그룹화



  const raidGroups = {};



  



  // 모든 레이드와 난이도의 파티를 수집하여 레이드별로 그룹화



  Object.keys(state.raidTabs).forEach(raidId => {



    const raid = state.raidsData.find(r => r.id === raidId);



    if (!raid) return;



    



    raidGroups[raidId] = {



      raidName: raid.name,



      raidId: raidId,



      difficulties: {}



    };



    



    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



      const difficulty = raid?.difficulties.find(d => d.id === difficultyId);



      const parties = state.raidTabs[raidId][difficultyId];



      



      raidGroups[raidId].difficulties[difficultyId] = {



        difficultyName: difficulty?.name || '',



        parties: parties.map(party => ({



          ...party,



          raidName: raid.name,



          difficultyName: difficulty?.name || ''



        }))



      };



    });



  });



  



  // 모달창 HTML 생성



  const modalHtml = `



    <div class="modal fade" id="raidListModal" tabindex="-1" aria-labelledby="raidListModalLabel" aria-hidden="true" style="z-index: 1060;">



      <div class="modal-dialog modal-fullscreen">



        <div class="modal-content">



          <div class="modal-header">



            <h5 class="modal-title" id="raidListModalLabel">전체 공대 리스트</h5>



            <button type="button" class="btn btn-info btn-sm me-2" onclick="captureRaidList()">



              <i class="bi bi-camera-fill me-1"></i>스크린샷



            </button>



            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>



          </div>



          <div class="modal-body p-2" style="height: calc(100vh - 120px); overflow-y: auto;">



            <div class="container-fluid">



              ${Object.keys(raidGroups).map(raidId => {



                const raidGroup = raidGroups[raidId];



                const allRaidParties = [];



                



                // 이 레이드의 모든 파티 수집



                Object.values(raidGroup.difficulties).forEach(difficulty => {



                  allRaidParties.push(...difficulty.parties);



                });



                



                const validMembers = allRaidParties.flatMap(p => p.members.filter(m => m !== null));



                const avgCombatPower = validMembers.length > 0 



                  ? Math.round(validMembers.reduce((sum, m) => sum + parseFloat((m.combatPower || '0').replace(',', '')), 0) / validMembers.length)



                  : 0;



                const supportCount = validMembers.filter(m => m?.role === 'support').length;



                



                return `



                  <div class="row mb-3">



                    <div class="col-12">



                      <div class="card shadow-sm">



                        <div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; py-1;">



                          <div class="row align-items-center">



                            <div class="col-md-8">



                              <h4 class="mb-0">



                                <i class="bi bi-shield-fill me-2"></i>${raidGroup.raidName}



                              </h4>



                            </div>



                            <div class="col-md-4 text-end">



                              <span class="badge" style="background: rgba(255,255,255,0.9); color: #667eea; font-weight: 600;" class="me-2 fs-6">${allRaidParties.length}개 공대</span>



                              <span class="badge" style="background: rgba(255,255,255,0.9); color: #667eea; font-weight: 600;" class="me-2 fs-6">${validMembers.length}명 배치</span>



                              <span class="badge" style="background: #f39c12; color: white; font-weight: 600;" class="me-2 fs-6">${supportCount}명 서폿</span>



                              <span class="badge" style="background: #3498db; color: white; font-weight: 600;" class="fs-6">평균 CP: ${avgCombatPower.toLocaleString()}</span>



                            </div>



                          </div>



                        </div>



                        <div class="card-body p-2">



                          <div class="row g-2">



                            ${Object.entries(raidGroup.difficulties).map(([difficultyId, difficulty]) => `



                              <div class="col-12">



                                <div class="card" style="border: 2px solid ${difficultyId === 'normal' ? '#3498db' : difficultyId === 'hard' ? '#e67e22' : '#e74c3c'};">



                                  <div class="card-header py-2" style="background: ${difficultyId === 'normal' ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' : difficultyId === 'hard' ? 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'}; color: white;">



                                    <h6 class="text-white mb-0">



                                      <i class="bi bi-gear-fill me-2"></i>${difficulty.difficultyName}



                                      <span class="badge ms-2" style="background: rgba(255,255,255,0.9); color: ${difficultyId === 'normal' ? '#3498db' : difficultyId === 'hard' ? '#e67e22' : '#e74c3c'}; font-weight: 600;">${difficulty.parties.length}개 공대</span>



                                    </h6>



                                  </div>



                                  <div class="card-body p-2">



                                    <div class="d-flex flex-wrap gap-2" style="overflow-x: auto;">



                                      ${difficulty.parties.map(party => {



                                        const partyValidMembers = party.members.filter(m => m !== null);



                                        const partyAvgCombatPower = partyValidMembers.length > 0 



                                          ? Math.round(partyValidMembers.reduce((sum, m) => sum + parseFloat((m.combatPower || '0').replace(',', '')), 0) / partyValidMembers.length)



                                          : 0;



                                        const partySupportCount = party.members.filter(m => m?.role === 'support').length;



                                      



                                        return `



                                          <div class="flex-shrink-0" style="min-width: 200px; max-width: 220px;">



                                            <div class="card shadow-sm h-100">



                                              <div class="card-header d-flex justify-content-between align-items-center py-1" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-bottom: 1px solid ${difficultyId === 'normal' ? '#3498db' : difficultyId === 'hard' ? '#e67e22' : '#e74c3c'};">



                                                <div class="flex-grow-1 me-2" style="min-width: 0;">



                                                  <span class="badge me-1" style="background: ${difficultyId === 'normal' ? '#3498db' : difficultyId === 'hard' ? '#e67e22' : '#e74c3c'}; color: white; font-weight: 600; font-size: 0.65rem;">${party.id}</span>



                                                  <strong style="font-size: 0.85rem; color: #2c3e50; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${party.name}</strong>



                                                </div>



                                                <span class="badge flex-shrink-0" style="background: #27ae60; color: white; font-weight: 600; font-size: 0.65rem;">평균 CP: ${partyAvgCombatPower.toLocaleString()}</span>



                                              </div>



                                              <div class="card-body py-1">



                                                <div class="mb-1">

                                                  ${party.size === 8 ? `



                                                    <div class="party-group">



                                                      <div class="party-section mb-1">



                                                        <span class="badge mb-1" style="background: #9b59b6; color: white; font-weight: 600; font-size: 0.55rem;">파티 1</span>



                                                        <div class="d-flex flex-wrap gap-1">



                                                          ${party.members.slice(0, 4).map((char, index) => char ? `



                                                            <span class="badge" style="background: ${char.role === 'support' ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'}; color: white; font-weight: 600; font-size: 0.55rem; min-width: 75px; max-width: 90px;">



                                                              <strong class="d-block" style="font-size: 0.75rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${char.name}</strong>



                                                              <small class="d-block" style="opacity: 0.9; font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${char.className || ''}</small>



                                                              <small class="d-block" style="opacity: 0.8; font-size: 0.55rem;">Lv${char.ilvl || '0'}</small>



                                                              <small class="d-block" style="opacity: 0.8; font-size: 0.55rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">CP${char.combatPower || '0'}</small>



                                                            </span>



                                                          ` : `



                                                            <span class="badge bg-secondary" style="font-size: 0.5rem;">빈 슬롯</span>



                                                          `).join('')}



                                                        </div>



                                                      </div>



                                                      <div class="party-section">



                                                        <span class="badge mb-1" style="background: #9b59b6; color: white; font-weight: 600; font-size: 0.55rem;">파티 2</span>



                                                        <div class="d-flex flex-wrap gap-1">



                                                          ${party.members.slice(4, 8).map((char, index) => char ? `



                                                            <span class="badge" style="background: ${char.role === 'support' ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'}; color: white; font-weight: 600; font-size: 0.55rem; min-width: 75px; max-width: 90px;">



                                                              <strong class="d-block" style="font-size: 0.75rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${char.name}</strong>



                                                              <small class="d-block" style="opacity: 0.9; font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${char.className || ''}</small>



                                                              <small class="d-block" style="opacity: 0.8; font-size: 0.55rem;">Lv${char.ilvl || '0'}</small>



                                                              <small class="d-block" style="opacity: 0.8; font-size: 0.55rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">CP${char.combatPower || '0'}</small>



                                                            </span>



                                                          ` : `



                                                            <span class="badge bg-secondary" style="font-size: 0.5rem;">빈 슬롯</span>



                                                          `).join('')}



                                                        </div>



                                                      </div>



                                                    </div>



                                                  ` : `



                                                    <div class="d-flex flex-wrap gap-1">



                                                      ${party.members.map((char, index) => char ? `



                                                        <span class="badge" style="background: ${char.role === 'support' ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'}; color: white; font-weight: 600; font-size: 0.6rem; min-width: 85px; max-width: 100px;">



                                                          <strong class="d-block" style="font-size: 0.75rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${char.name}</strong>



                                                          <small class="d-block" style="opacity: 0.9; font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${char.className || ''}</small>



                                                          <small class="d-block" style="opacity: 0.8; font-size: 0.55rem;">Lv${char.ilvl || '0'}</small>



                                                          <small class="d-block" style="opacity: 0.8; font-size: 0.55rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">CP${char.combatPower || '0'}</small>



                                                        </span>



                                                      ` : `



                                                        <span class="badge bg-secondary" style="font-size: 0.5rem;">빈 슬롯</span>



                                                      `).join('')}



                                                    </div>



                                                  `}



                                                </div>



                                              </div>



                                            </div>



                                          </div>



                                        `;



                                      }).join('')}



                                    </div>



                                  </div>



                                </div>



                              </div>



                            `).join('')}



                          </div>



                        </div>



                      </div>



                    </div>



                  </div>



                `;



              }).join('')}



              



              <!-- 전체 요약 -->



              <div class="row mt-4">



                <div class="col-12">



                  <div class="card shadow-sm">



                    <div class="card-header bg-dark text-white py-3 sticky-top" style="top: 0; z-index: 10;">



                      <h4 class="mb-0">



                        <i class="bi bi-bar-chart-fill me-2"></i>전체 요약



                      </h4>



                    </div>



                    <div class="card-body py-4">



                      <div class="row">



                        <div class="col-md-3 col-6 mb-3">



                          <div class="card text-center h-100 border-primary">



                            <div class="card-body">



                              <h2 class="card-title text-primary">${Object.values(raidGroups).reduce((sum, raid) => sum + Object.values(raid.difficulties).reduce((sum2, diff) => sum2 + diff.parties.length, 0), 0)}</h2>



                              <p class="card-text fs-5">전체 공대 수</p>



                            </div>



                          </div>



                        </div>



                        <div class="col-md-3 col-6 mb-3">



                          <div class="card text-center h-100 border-success">



                            <div class="card-body">



                              <h2 class="card-title text-success">${Object.values(raidGroups).reduce((sum, raid) => sum + Object.values(raid.difficulties).reduce((sum2, diff) => sum2 + diff.parties.reduce((sum3, party) => sum3 + party.members.filter(m => m !== null).length, 0), 0), 0)}</h2>



                              <p class="card-text fs-5">배치된 캐릭터</p>



                            </div>



                          </div>



                        </div>



                        <div class="col-md-3 col-6 mb-3">



                          <div class="card text-center h-100 border-warning">



                            <div class="card-body">



                              <h2 class="card-title text-warning">${Object.values(raidGroups).reduce((sum, raid) => sum + Object.values(raid.difficulties).reduce((sum2, diff) => sum2 + diff.parties.reduce((sum3, party) => sum3 + party.members.filter(m => m?.role === 'support').length, 0), 0), 0)}</h2>



                              <p class="card-text fs-5">전체 서폿 수</p>



                            </div>



                          </div>



                        </div>



                        <div class="col-md-3 col-6 mb-3">



                          <div class="card text-center h-100 border-info">



                            <div class="card-body">



                              <h2 class="card-title text-info">${Object.values(raidGroups).reduce((sum, raid) => sum + Object.values(raid.difficulties).reduce((sum2, diff) => sum2 + diff.parties.reduce((sum3, party) => sum3 + party.members.filter(m => m?.role === 'dps').length, 0), 0), 0)}</h2>



                              <p class="card-text fs-5">전체 딜러 수</p>



                            </div>



                          </div>



                        </div>



                      </div>



                    </div>



                  </div>



                </div>



              </div>



            </div>



          </div>



          <div class="modal-footer">



            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>



            <button type="button" class="btn btn-primary" onclick="exportRaidList()">내보내기</button>



          </div>



{{ ... }



        </div>



      </div>



    </div>



  `;



  



  // 기존 모달이 있다면 제거



  const existingModal = document.getElementById('raidListModal');



  if (existingModal) {



    existingModal.remove();



  }



  



  // 모달을 body에 추가



  document.body.insertAdjacentHTML('beforeend', modalHtml);



  



  // Bootstrap 모달 표시



  const modal = new bootstrap.Modal(document.getElementById('raidListModal'));



  modal.show();



}







// 공대 리스트 내보내기



function exportRaidList() {



  let exportText = "=== 전체 공대 리스트 ===\n\n";



  



  // 모든 탭의 공격대 파티를 수집



  const allParties = [];



  



  Object.keys(state.raidTabs).forEach(raidId => {



    const raid = state.raidsData.find(r => r.id === raidId);



    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



      const difficulty = raid?.difficulties.find(d => d.id === difficultyId);



      const parties = state.raidTabs[raidId][difficultyId];



      



      parties.forEach(party => {



        allParties.push({



          ...party,



          raidName: raid?.name || '',



          difficultyName: difficulty?.name || ''



        });



      });



    });



  });



  



  allParties.forEach(party => {



    const validMembers = party.members.filter(m => m !== null);



    const avgCombatPower = validMembers.length > 0 



      ? Math.round(validMembers.reduce((sum, m) => sum + parseFloat((m.combatPower || '0').replace(',', '')), 0) / validMembers.length)



      : 0;



    const supportCount = party.members.filter(m => m?.role === 'support').length;



    



    exportText += `【${party.name} (${party.id})】\n`;



    exportText += `레이드: ${party.raidName} ${party.difficultyName}\n`;



    exportText += `크기: ${party.size}인 | 서폿: ${supportCount}/${party.maxSupports} | 평균 전투력: ${avgCombatPower.toLocaleString()}\n`;



    



    party.members.forEach((char, index) => {



      if (char) {



        exportText += `  ${index + 1}. ${char.name} (${char.role === 'support' ? '서폿' : '딜러'}) - Lv ${char.ilvl || '0'} | 전투력 ${char.combatPower || '0'}\n`;



      }



    });



    exportText += "\n";



  });



  



  exportText += `=== 요약 ===\n`;



  exportText += `전체 공대: ${allParties.length}개\n`;



  exportText += `배치된 캐릭터: ${allParties.reduce((sum, party) => sum + party.members.filter(m => m !== null).length, 0)}명\n`;



  exportText += `전체 서폿: ${allParties.reduce((sum, party) => sum + party.members.filter(m => m?.role === 'support').length, 0)}명\n`;



  exportText += `전체 딜러: ${allParties.reduce((sum, party) => sum + party.members.filter(m => m?.role === 'dps').length, 0)}명\n`;



  



  // 텍스트 파일로 다운로드



  const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });



  const url = URL.createObjectURL(blob);



  const a = document.createElement('a');



  a.href = url;



  a.download = `전체공대리스트_${new Date().toISOString().slice(0, 10)}.txt`;



  document.body.appendChild(a);



  a.click();



  document.body.removeChild(a);



  URL.revokeObjectURL(url);



  



    window.modalManager.showAlert({
      title: '내보내기 완료',
      message: '전체 공대 리스트가 내보내기 되었습니다!'
    });



}







// 스크린샷 기능



function captureRaidList() {



  const modalElement = document.getElementById('raidListModal');



  if (!modalElement) {



    window.modalManager.showAlert({
      title: '오류',
      message: '모달창이 열려있지 않습니다.'
    });



    return;



  }



  



  // html2canvas 라이브러리 추가 (필요시)



  if (typeof html2canvas === 'undefined') {



    // html2canvas 라이브러리 동적 로드



    const script = document.createElement('script');



    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';



    script.onload = function() {



      setTimeout(() => captureRaidList(), 100);



    };



    document.head.appendChild(script);



    return;



  }



  



  // 모달창 내용 캡처



  html2canvas(modalElement, {



    backgroundColor: '#ffffff',



    scale: 2, // 고화질을 위해 2배 스케일



    logging: false,



    useCORS: true,



    allowTaint: true



  }).then(canvas => {



    // 이미지 다운로드



    const link = document.createElement('a');



    link.download = `공대리스트_${new Date().toISOString().slice(0, 10)}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '-')}.png`;



    link.href = canvas.toDataURL();



    link.click();



    



    // 성공 메시지



    window.modalManager.showAlert({
      title: '스크린샷 완료',
      message: '스크린샷이 저장되었습니다!'
    });



  }).catch(error => {



    console.error('스크린샷 생성 실패:', error);



    window.modalManager.showAlert({
      title: '스크린샷 실패',
      message: '스크린샷 생성에 실패했습니다: ' + error.message
    });



  });



}







// 공대 리스트 내보내기



function guessRole(cls, arkpassive) {

  // 아크패시브 Effects에서 축복의 여신 확인
  if (arkpassive && arkpassive.Effects) {
    const hasGoddessBlessing = arkpassive.Effects.some(effect => 
      effect.Description && effect.Description.includes("축복의 여신")
    );

    if (hasGoddessBlessing) {
      return "support";
    }
  }
  // 기존 직업명 기준 구분 (백업)
  return ["바드","홀리나이트","도화가"].includes(cls) ? "support" : "dps";
}







function setupRaidEventListeners() {



  document.querySelectorAll('[data-party]').forEach(el => {



    const partyId = el.dataset.party;



    const slotIndex = parseInt(el.dataset.slot);



    



    // 현재 탭의 파티에서 찾기



    const parties = getCurrentTabParties();



    const party = parties.find(p => p.id === partyId);



    const char = party ? party.members[slotIndex] : null;



    const slot = el.querySelector('.raid-slot');







    if (char) {



      const charBox = el.querySelector('.char-box');



        charBox.ondragend = function(e) {

          charBox.classList.remove('dragging');

        };

      

      // 더블클릭으로 캐릭터 제거

      charBox.ondblclick = function(e) {

        e.preventDefault();

        e.stopPropagation();

        

        showRemoveCharacterModal(char, partyId, slotIndex);

      };



    }







    slot.ondragover = e => {

      e.stopPropagation();

      e.preventDefault();

      e.dataTransfer.dropEffect = 'copy';

      slot.classList.add('drag-over');

    };







    slot.ondragleave = () => {



      slot.classList.remove('invalid');



      slot.classList.remove('drag-over');



    };







    slot.ondrop = e => {



      e.preventDefault();



      e.stopPropagation();



      



      try {



        const data = JSON.parse(e.dataTransfer.getData('text/plain'));

        

        if (!data || !data.id) {

          console.error(`❌ [DROP ERROR] Invalid data:`, data);

          window.modalManager.showAlert({
            title: '데이터 오류',
            message: '유효하지 않은 캐릭터 데이터입니다.'
          });

          return;

        }



        



        if (party.members[slotIndex]) {



          window.modalManager.showAlert({
            title: '배치 오류',
            message: '이미 캐릭터가 배치된 슬롯입니다.'
          });

          return;



        }



        



        // 공격대당 1원정대만 가능한지 체크



        const currentExpeditions = new Set();



        party.members.forEach(m => {



          if (m && m.id) {



            // 원정대 인덱스 찾기



            for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {



              const expedition = state.expeditionSlots[expIndex];



              if (expedition.some(c => c && c.id === m.id)) {



                currentExpeditions.add(expIndex);



                break;



              }



            }



          }



        });



        



        // 새 캐릭터의 원정대 인덱스 찾기



        let newCharacterExpeditionIndex = -1;



        for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {



          const expedition = state.expeditionSlots[expIndex];



          if (expedition.some(c => c && c.id === data.id)) {



            newCharacterExpeditionIndex = expIndex;



            break;



          }



        }



        



        if (currentExpeditions.has(newCharacterExpeditionIndex)) {



          window.modalManager.showAlert({
            title: '원정대 중복',
            message: '이미 같은 원정대의 캐릭터가 이 공격대에 있습니다.\n(공격대 1개당 1원정대만 가능합니다)'
          });

          return;



        }



        



        // 1레이드 탭당 1캐릭터만 배치 가능 제한 체크



        let characterInCurrentRaid = false;



        // 현재 선택된 레이드의 모든 난이도 탭에서만 확인



        if (state.selectedRaid) {



          Object.keys(state.raidTabs[state.selectedRaid.id] || {}).forEach(difficultyId => {



            state.raidTabs[state.selectedRaid.id][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === data.id)) {



                characterInCurrentRaid = true;



              }



            });



          });



        }



        



        if (characterInCurrentRaid) {



          window.modalManager.showAlert({
            title: '레이드 중복',
            message: `이 캐릭터는 이미 현재 레이드(${state.selectedRaid?.name})에 배치되어 있습니다.\n(1레이드당 1캐릭터만 가능합니다)`
          });

          return;



        }



        



        // 1캐릭터 최대 3개 공격대 제한 체크



        let characterRaidCount = 0;



        // 모든 탭의 파티를 확인



        Object.keys(state.raidTabs).forEach(raidId => {



          Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



            state.raidTabs[raidId][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === data.id)) {



                characterRaidCount++;



              }



            });



          });



        });



        



        if (characterRaidCount >= 3) {



          window.modalManager.showAlert({
            title: '배치 제한',
            message: '이 캐릭터는 이미 3개의 공격대에 배치되어 있습니다.\n(1캐릭터당 최대 3개 공격대 가능)'
          });

          return;



        }



        



        // 서폿 수 체크 (파티당 1명, 8인은 각 파티별 1명씩)



        if (data.role === 'support') {



          if (party.size === 8) {



            // 8인 공격대: 각 파티별로 서폿 1명씩 체크



            const partyNumber = Math.floor(slotIndex / 4) + 1;



            const partyStartIndex = (partyNumber - 1) * 4;



            const partyEndIndex = partyNumber * 4;



            const partyMembers = party.members.slice(partyStartIndex, partyEndIndex);



            const supportsInParty = partyMembers.filter(m => m?.role === 'support').length;



            



            if (supportsInParty >= 1) {



              window.modalManager.showAlert({
                title: '서포터 제한',
                message: `파티 ${partyNumber}에는 서포터를 1명만 배치할 수 있습니다.`
              });

              return;



            }



          } else {



            // 4인 공격대: 전체 파티에서 서폿 1명 체크



            const currentSupports = party.members.filter(m => m?.role === 'support').length;



            if (currentSupports >= party.maxSupports) {



              window.modalManager.showAlert({
              title: '서포터 제한',
              message: `이 공격대에는 서포터를 ${party.maxSupports}명만 배치할 수 있습니다.`
            });

              return;



            }



          }



        }



        



        console.log(`✅ [DROP SUCCESS] Adding ${data.name} to Party ${partyId}, Slot ${slotIndex}`);



        console.log(`📝 [BEFORE] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));



        



        party.members[slotIndex] = data;



        



        console.log(`📝 [AFTER] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));



        console.log(`🔄 [RENDER] Calling renderRaidParties()`);



        



        renderRaidParties();



        renderExpedition(); // 원정대 UI도 업데이트하여 공격대 배치 갯수 표시



        



        console.log(`✅ [DROP COMPLETE] Character ${data.name} successfully added`);



        



      } catch (error) {



        console.error('❌ Drop error:', error);



        window.modalManager.showAlert({
          title: '캐릭터 추가 오류',
          message: '캐릭터를 추가하는 중 오류가 발생했습니다: ' + error.message
        });



      }



    };



  });



}







function removeCharacterFromRaid(partyId, slotIndex) {



  try {



    console.log(`🗑️ [REMOVE START] Party: ${partyId}, Slot: ${slotIndex}`);



    const parties = getCurrentTabParties();



    const party = parties.find(p => p.id === partyId);



    if (!party) {



      console.error(`❌ [REMOVE ERROR] Party not found: ${partyId}`);



      return;



    }



    



    const removedChar = party.members[slotIndex];



    if (!removedChar) {



      console.log(`ℹ️ [REMOVE INFO] No character to remove at slot: ${slotIndex}`);



      return;



    }



    



    console.log(`🗑️ [REMOVE] Character: ${removedChar.name} from Party ${partyId}, Slot ${slotIndex}`);



    console.log(`📝 [BEFORE REMOVE] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));



    



    // 공격대에서 캐릭터 제거



    party.members[slotIndex] = null;



    



    console.log(`📝 [AFTER REMOVE] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));



    console.log(`🔄 [RENDER] Calling renderRaidParties()`);







    // UI 업데이트



    renderRaidParties();



    renderExpedition(); // 원정대 UI도 업데이트하여 공격대 배치 갯수 표시



    



    console.log(`✅ [REMOVE COMPLETE] Character ${removedChar.name} successfully removed`);



    



  } catch (error) {



    console.error(`❌ [REMOVE ERROR]:`, error);



    window.modalManager.showAlert({
      title: '캐릭터 제거 오류',
      message: '캐릭터를 제거하는 중 오류가 발생했습니다: ' + error.message
    });



  }



}







// 캐릭터 삭제 확인 모달창 표시



function showRemoveCharacterModal(character, partyId, slotIndex) {



  // 모달창 HTML 생성



  const modalHtml = `



    <div class="modal fade" id="removeCharacterModal" tabindex="-1" aria-labelledby="removeCharacterModalLabel" aria-hidden="true" style="z-index: 1070;">



      <div class="modal-dialog modal-sm modal-dialog-centered">



        <div class="modal-content">



          <div class="modal-header">



            <h5 class="modal-title" id="removeCharacterModalLabel">캐릭터 삭제</h5>



            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>



          </div>



          <div class="modal-body">



            <p class="mb-0"><span class="text-danger fw-bold">${character.name}</span> 캐릭터를 공격대에서 제거하시겠습니까?</p>



          </div>



          <div class="modal-footer">



            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>



            <button type="button" class="btn btn-danger" onclick="confirmRemoveCharacter('${partyId}', ${slotIndex})">삭제</button>



          </div>



        </div>



      </div>



    </div>



  `;



  



  // 기존 모달이 있다면 제거



  const existingModal = document.getElementById('removeCharacterModal');



  if (existingModal) {



    existingModal.remove();



  }



  



  // 모달을 body에 추가



  document.body.insertAdjacentHTML('beforeend', modalHtml);



  



  // Bootstrap 모달 표시



  const modal = new bootstrap.Modal(document.getElementById('removeCharacterModal'));



  modal.show();



}







// 캐릭터 삭제 확정



function confirmRemoveCharacter(partyId, slotIndex) {



  try {



    removeCharacterFromRaid(partyId, slotIndex);



    



    // 모달 닫기



    const modal = bootstrap.Modal.getInstance(document.getElementById('removeCharacterModal'));



    modal.hide();



    



  } catch (error) {



    console.error('캐릭터 삭제 중 오류:', error);



    window.modalManager.showAlert({
      title: '캐릭터 삭제 오류',
      message: '캐릭터를 삭제하는 중 오류가 발생했습니다: ' + error.message
    });



  }



}







function renderExpedition() {



  const root = document.getElementById('expedition');



  root.innerHTML = '';



  



  state.expeditionSlots.forEach((chars,i)=>{



    const col = document.createElement('div');



    col.className='expedition-slot';



    col.innerHTML=`



      <div class="card shadow-sm">



        <div class="card-header">



          <input class="form-control expedition-input" placeholder="캐릭터명" data-expedition-index="${i}" onkeypress="handleExpeditionKeyPress(event, ${i})">



          <button class="btn btn-sm btn-primary w-100 mt-1" onclick="fetchExpedition(${i})">검색</button>



        </div>



        <div class="card-body p-2 expedition-drop-zone" data-expedition-index="${i}"></div>



      </div>`;



    const body = col.querySelector('.card-body');







    // 원정대 드롭존 이벤트 추가



    body.ondragover = function(e) {



      console.log(`🔍 [EXPEDITION DRAG OVER] Expedition index: ${i}`);



      e.preventDefault();



      e.stopPropagation();



      body.classList.add('drag-over');



    };







    body.ondragleave = function(e) {



      body.classList.remove('drag-over');



    };







    body.ondrop = function(e) {



      try {



        console.log(`🎯 [EXPEDITION DROP START] Expedition index: ${i}`);



        e.preventDefault();



        e.stopPropagation();



        body.classList.remove('drag-over');



        



        const data = JSON.parse(e.dataTransfer.getData('text/plain'));



        console.log(`📊 [EXPEDITION DROP DATA] Received:`, { name: data.name, id: data.id, fromRaid: data.fromRaid });



        



        // 공격대에서 온 캐릭터인 경우 제거



        if (data.fromRaid) {



          console.log(`🗑️ [EXPEDITION DROP] Removing raid character: ${data.name} from Party ${data.partyId}, Slot ${data.slotIndex}`);



          removeCharacterFromRaid(data.partyId, data.slotIndex);



          return;



        }



        



        // 일반 원정대 캐릭터 드롭은 기존 로직으로 처리



        console.log(`📌 [EXPEDITION DROP] Regular expedition character drop - no action needed`);



        



      } catch (error) {



        console.error(`❌ [EXPEDITION DROP ERROR]:`, error);



      }



    };







    chars.forEach(c=>{



      const div = document.createElement('div');



      div.className='char-item';



      div.draggable=true;



        



      // 해당 캐릭터가 배치된 공격대 갯수 계산



      let raidCount = 0;



      // 모든 탭의 파티를 확인



      Object.keys(state.raidTabs).forEach(raidId => {



        Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



          state.raidTabs[raidId][difficultyId].forEach(party => {



            if (party.members.some(m => m && m.id === c.id)) {



              raidCount++;



            }



          });



        });



      });



      



      // 캐릭터 이미지 또는 기본 아이콘



      const iconHtml = c.image 



        ? `<img src="${c.image}" class="char-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">



           <div class="char-icon ${c.role}" style="display:none;">



             <i class="bi bi-person-fill"></i>



           </div>`



        : `<div class="char-icon ${c.role}">



           <i class="bi bi-person-fill"></i>



         </div>`;



      



      div.innerHTML=`



        ${iconHtml}



        <div class="char-info">



          <div class="char-name-row">



            <span class="char-name">${c.name}</span>



            <span class="badge ${c.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}">${c.role === 'support' ? '서폿' : '딜러'}</span>



            <span class="badge ${raidCount >= 3 ? 'bg-danger' : raidCount > 0 ? 'bg-success' : 'bg-secondary'} ms-1">${raidCount}/3</span>



          </div>



          <span class="char-details">Lv ${c.ilvl || '0'} | 전투력 ${c.combatPower || '0'}</span>



        </div>`;



      



      div.ondragstart = function(e) {



        console.log(`🎯 [DRAG START] Expedition character: ${c.name}`);



        const dragData = JSON.stringify(c);



        e.dataTransfer.setData('text/plain', dragData);



        e.dataTransfer.effectAllowed = 'copy';



        console.log(`📤 [DRAG DATA] Set:`, { name: c.name, id: c.id, role: c.role });



        



        // 드래그 중인 스타일 추가



        div.classList.add('dragging');



      };



      



      div.ondragend = function(e) {



        // 드래그 스타일 제거



        div.classList.remove('dragging');



        console.log(`🏁 [DRAG END] Expedition character: ${c.name}`);



      };



      



      div.ondblclick = function(e) {



        e.preventDefault();



        console.log(`🔄 [DBL CLICK] Character: ${c.name}, Role: ${c.role}`);



        



        // 역할 수정 모달창 표시



        showCharacterEditModal(c, i);



      };



      



      body.appendChild(div);



    });







    // 원정대 슬롯에 추가



    root.appendChild(col);



  });



}







// 캐릭터 수정 모달창 표시



function showCharacterEditModal(character, expeditionIndex) {



  // 모달창 HTML 생성



  const modalHtml = `



    <div class="modal fade" id="characterEditModal" tabindex="-1" aria-labelledby="characterEditModalLabel" aria-hidden="true" style="z-index: 1050;">



      <div class="modal-dialog">



        <div class="modal-content">



          <div class="modal-header">



            <h5 class="modal-title" id="characterEditModalLabel">캐릭터 정보 수정</h5>



            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>



          </div>



          <div class="modal-body">



            <form id="characterEditForm">



              <div class="mb-3">



                <label class="form-label">캐릭터 이름</label>



                <input type="text" class="form-control" id="editName" value="${character.name}" readonly>



              </div>



              <div class="mb-3">



                <label class="form-label">전투력</label>



                <div class="input-group">



                  <input type="number" class="form-control" id="editCombatPower" value="${character.combatPower || '0'}" placeholder="전투력 입력">



                  <span class="input-group-text">원본: ${character.combatPower || '0'}</span>



                </div>



              </div>



              <div class="mb-3">



                <label class="form-label">역할</label>



                <div class="btn-group w-100" role="group">



                  <input type="radio" class="btn-check" name="editRole" id="editRoleDps" value="dps" ${character.role === 'dps' ? 'checked' : ''}>



                  <label class="btn btn-outline-primary" for="editRoleDps">딜러</label>



                  



                  <input type="radio" class="btn-check" name="editRole" id="editRoleSupport" value="support" ${character.role === 'support' ? 'checked' : ''}>



                  <label class="btn btn-outline-warning" for="editRoleSupport">서폿</label>



                </div>



              </div>



            </form>



          </div>



          <div class="modal-footer">



            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>



            <button type="button" class="btn btn-primary" onclick="saveCharacterEdit(${expeditionIndex})">저장</button>



          </div>



        </div>



      </div>



    </div>



  `;



  



  // 기존 모달이 있다면 제거



  const existingModal = document.getElementById('characterEditModal');



  if (existingModal) {



    existingModal.remove();



  }



  



  // 모달을 body에 추가



  document.body.insertAdjacentHTML('beforeend', modalHtml);



  



  // Bootstrap 모달 표시



  const modal = new bootstrap.Modal(document.getElementById('characterEditModal'));



  modal.show();



}







// 캐릭터 정보 저장



function saveCharacterEdit(expeditionIndex) {



  try {



    const character = state.expeditionSlots[expeditionIndex].find(c => c.id === document.getElementById('editName').value);



    



    if (!character) {



      window.modalManager.showAlert({
        title: '오류',
        message: '캐릭터를 찾을 수 없습니다.'
      });



      return;



    }



    



    // 전투력 업데이트



    const newCombatPower = document.getElementById('editCombatPower').value;



    character.combatPower = newCombatPower || '0';



    



    // 역할 업데이트



    const newRole = document.querySelector('input[name="editRole"]:checked').value;



    character.role = newRole;



    



    console.log(`📝 [CHARACTER EDIT] ${character.name}: CombatPower ${character.combatPower}, Role ${character.role}`);



    



    // UI 업데이트



    renderExpedition();



    renderRaidParties();



    



    // 모달 닫기



    const modal = bootstrap.Modal.getInstance(document.getElementById('characterEditModal'));



    modal.hide();



    



    window.modalManager.showAlert({
      title: '수정 완료',
      message: '캐릭터 정보가 수정되었습니다.'
    });



    



  } catch (error) {



    console.error('캐릭터 정보 수정 중 오류:', error);



    window.modalManager.showAlert({
      title: '캐릭터 수정 오류',
      message: '캐릭터 정보 수정 중 오류가 발생했습니다: ' + error.message
    });



  }



}







// 엔터키 처리 함수



function handleExpeditionKeyPress(event, index) {



  if (event.key === 'Enter') {



    event.preventDefault();



    fetchExpedition(index);



  }



}







async function fetchExpedition(index){



  const input = document.querySelector(`.expedition-input[data-expedition-index="${index}"]`);



  const name = input ? input.value.trim() : '';



  



  if(!name) {



    window.modalManager.showAlert({
      title: '입력 오류',
      message: '캐릭터명을 입력해주세요.'
    });



    return;



  }







  // 쉼표로 구분된 여러 아이디 처리



  const names = name.split(',').map(n => n.trim()).filter(n => n);



  



  if (names.length > 1) {



    // 여러 아이디를 처리하는 경우 - 한 슬롯에 모든 캐릭터 합치기



    console.log(`🔍 [MULTI FETCH] Processing ${names.length} expedition IDs: ${names.join(', ')}`);



    



    try {



      // 각 아이디에 대해 원정대 정보 조회



      const expeditionPromises = names.map(async (expeditionName) => {



        try {



          // 1단계: 원정대 캐릭터 목록 조회



          const res = await fetch(`${LOSTARK_API_CONFIG.BASE_URL}/characters/${encodeURIComponent(expeditionName)}/siblings`,



            {headers:getLostArkHeaders()});



          



          if (!res.ok) {



            console.warn(`Failed to fetch expedition ${expeditionName}: ${res.status}`);



            return { expeditionName, success: false, error: `HTTP error! status: ${res.status}` };



          }



          



          const siblingsData = await res.json();



          



          if (!siblingsData || !Array.isArray(siblingsData) || siblingsData.length === 0) {



            console.warn(`No expedition data found for ${expeditionName}`);



            return { expeditionName, success: false, error: '원정대 정보를 찾을 수 없습니다' };



          }







          // 계정당 상위 6명 캐릭터의 상세 정보만 조회



          const topCharacters = siblingsData



            .sort((a,b)=>parseFloat((b.ItemAvgLevel||'0').replace(',',''))-parseFloat((a.ItemAvgLevel||'0').replace(',','')))



            .slice(0,6); // 계정당 6명으로 제한



          



          console.log(`📡 [FETCH] Getting detailed info for ${expeditionName}: ${topCharacters.map(c => c.CharacterName).join(', ')}`);



          



          const characterPromises = topCharacters.map(char => 



            Promise.all([



              fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/profiles`,



                {headers:getLostArkHeaders()})



                .then(res => {



                  if (!res.ok) {



                    console.warn(`Profile API failed for ${char.CharacterName}: ${res.status}`);



                    return null;



                  }



                  return res.json();



                })



                .catch(err => {



                  console.warn(`Profile fetch error for ${char.CharacterName}:`, err);



                  return null;



                }),



              fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/arkpassive`,



                {headers:getLostArkHeaders()})



                .then(res => {



                  if (!res.ok) {



                    console.warn(`ArkPassive API failed for ${char.CharacterName}: ${res.status}`);



                    return null;



                  }



                  return res.json();



                })



                .catch(err => {



                  console.warn(`ArkPassive fetch error for ${char.CharacterName}:`, err);



                  return null;



                })



            ])



          );







          const profiles = await Promise.all(characterPromises);







          // 데이터 결합



          const expeditionData = topCharacters.map((char, idx) => {



            const [profile, arkpassive] = profiles[idx];



            



            return {



              id: char.CharacterName,



              name: char.CharacterName,



              ilvl: char.ItemAvgLevel || '0',



              combatPower: profile?.CombatPower || char.CombatPower || '0', 



              role: guessRole(char.CharacterClassName, arkpassive), 



              image: profile?.CharacterImage || 'img/default-character.png', 



              className: char.CharacterClassName,



              level: char.CharacterLevel,



              arkpassive: arkpassive 



            };



          })



          .sort((a,b)=>parseFloat((b.combatPower||'0').replace(',',''))-parseFloat((a.combatPower||'0').replace(',','')));







          return { expeditionName, success: true, data: expeditionData };



        } catch (error) {



          console.error(`Error processing expedition ${expeditionName}:`, error);



          return { expeditionName, success: false, error: error.message };



        }



      });







      const results = await Promise.all(expeditionPromises);



      



      // 성공한 원정대들의 캐릭터를 모두 합쳐서 한 슬롯에 배치



      let successCount = 0;



      let failCount = 0;



      const failedExpeditions = [];



      const allCharacters = [];



      



      results.forEach((result) => {



        if (result.success) {



          allCharacters.push(...result.data);



          successCount++;



        } else {



          failCount++;



          failedExpeditions.push(`${result.expeditionName}: ${result.error}`);



        }



      });



      



      // 전체 캐릭터를 전투력 순으로 정렬하고 상위 18명만 선택



      const sortedCharacters = allCharacters



        .sort((a,b) => parseFloat((b.ilvl||'0').replace(',','')) - parseFloat((a.ilvl||'0').replace(',','')))



        .slice(0, 18);



      



      // 해당 슬롯에 배치



      if (sortedCharacters.length > 0 && index < 8) {



        state.expeditionSlots[index] = sortedCharacters;



        // 수정 시간 기록

        updateModifiedTime('expedition', index);



        console.log(`✅ [COMBINED EXPEDITION] Slot ${index}: ${sortedCharacters.length} characters from ${successCount} expeditions`);



      }



      



      // UI 업데이트



      renderExpedition();



      



      // 결과 알림



      let message = `원정대 조회 완료!\n성공: ${successCount}개, 실패: ${failCount}개\n총 ${sortedCharacters.length}명의 캐릭터가 슬롯 ${index + 1}에 배치되었습니다.`;



      if (failedExpeditions.length > 0) {



        message += `\n\n실패한 원정대:\n${failedExpeditions.join('\n')}`;



      }



      window.modalManager.showAlert({
        title: '오류',
        message: message
      });



      



      console.log(`✅ [MULTI FETCH COMPLETE] Success: ${successCount}, Failed: ${failCount}, Total Characters: ${sortedCharacters.length}`);



      



    } catch (error) {



      window.modalManager.showAlert({
      title: '원정대 조회 오류',
      message: `여러 원정대 조회 중 오류가 발생했습니다: ${error.message}`
    });



      console.error('Multi expedition fetch error:', error);



    }



    



    return;



  }







  // 단일 아이디 처리 (기존 로직)



  try {



    // 1단계: 원정대 캐릭터 목록 조회



    const res = await fetch(`${LOSTARK_API_CONFIG.BASE_URL}/characters/${encodeURIComponent(name)}/siblings`,



      {headers:getLostArkHeaders()});



    



    if (!res.ok) {



      throw new Error(`HTTP error! status: ${res.status}`);



    }



    



    const siblingsData = await res.json();



    



    if (!siblingsData || !Array.isArray(siblingsData) || siblingsData.length === 0) {



      window.modalManager.showAlert({
        title: '원정대 조회 오류',
        message: `캐릭터 '${name}'의 원정대 정보를 찾을 수 없습니다.`
      });



      return;



    }







    // 2단계: 상위 6명 캐릭터의 상세 정보만 조회 (이미지, 전투력, 각인 포함)



    const topCharacters = siblingsData



      .sort((a,b)=>parseFloat((b.ItemAvgLevel||'0').replace(',',''))-parseFloat((a.ItemAvgLevel||'0').replace(',','')))



      .slice(0,6);



    



    console.log(`� [FETCH] Getting detailed info for: ${topCharacters.map(c => c.CharacterName).join(', ')}`);



    



    const characterPromises = topCharacters.map(char => 



      Promise.all([



        fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/profiles`,



          {headers:getLostArkHeaders()})



          .then(res => {



            if (!res.ok) {



              console.warn(`Profile API failed for ${char.CharacterName}: ${res.status}`);



              return null;



            }



            return res.json();



          })



          .catch(err => {



            console.warn(`Profile fetch error for ${char.CharacterName}:`, err);



            return null;



          }),



        fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/arkpassive`,



          {headers:getLostArkHeaders()})



          .then(res => {



            if (!res.ok) {



              console.warn(`ArkPassive API failed for ${char.CharacterName}: ${res.status}`);



              return null;



            }



            return res.json();



          })



          .catch(err => {



            console.warn(`ArkPassive fetch error for ${char.CharacterName}:`, err);



            return null;



          })



      ])



    );







    const profiles = await Promise.all(characterPromises);







    // 데이터 결합



    state.expeditionSlots[index] = topCharacters.map((char, idx) => {



      const [profile, arkpassive] = profiles[idx];



      



      return {



        id: char.CharacterName,



        name: char.CharacterName,



        ilvl: char.ItemAvgLevel || '0',



        combatPower: profile?.CombatPower || char.CombatPower || '0', 



        role: guessRole(char.CharacterClassName, arkpassive), 



        image: profile?.CharacterImage || 'img/default-character.png', 



        className: char.CharacterClassName,



        level: char.CharacterLevel,



        //arkpassive: arkpassive    //차후 직각정보 필요시 다시 활성화



      };



    })



    .sort((a,b)=>parseFloat((b.ilvl||'0').replace(',',''))-parseFloat((a.ilvl||'0').replace(',','')))



    .slice(0,6);



    // 수정 시간 기록

    updateModifiedTime('expedition', index);



    console.log(`✅ [FETCH COMPLETE] Expedition ${index}: ${state.expeditionSlots[index].length} characters loaded`);



    renderExpedition();



  } catch (error) {



    console.error('Expedition fetch error:', error);



    window.modalManager.showAlert({
      title: '원정대 조회 오류',
      message: `원정대 조회 중 오류가 발생했습니다: ${error.message}`
    });



  }



}







function autoAssign(){



  // 원정대별로 캐릭터 그룹화 및 전투력 순 정렬



  const allChars = [];



  state.expeditionSlots.forEach(expedition => {



    expedition.forEach(char => {



      if (char && !allChars.find(c => c.id === char.id)) {



        allChars.push(char);



      }



    });



  });



  



  const supports = allChars.filter(c => c.role === 'support');



  const dps = allChars.filter(c => c.role === 'dps');



  



  // 현재 탭의 파티에만 배치



  const parties = getCurrentTabParties();



  



  // 각 파티에 서포터 배치 (최대 1명, 1캐릭터당 최대 3공격대 제한)



  parties.forEach((party, partyIndex) => {



    // 이미 서포터가 배치되어 있으면 건너뛰기



    if (party.members[0] && party.members[0].role === 'support') {



      console.log(`ℹ️ [AUTO ASSIGN] Party ${partyIndex + 1} already has support: ${party.members[0].name}`);



      return;



    }



    



    let bestSupport = null;



    



    // 모든 서포터 중에서 가장 적은 공격대에 배치된 서포터 찾기



    for (let supportChar of supports) {



      // 이 서포터가 이미 현재 레이드에 배치되었는지 확인



      let characterInCurrentRaid = false;



      if (state.selectedRaid) {



        Object.keys(state.raidTabs[state.selectedRaid.id] || {}).forEach(difficultyId => {



          state.raidTabs[state.selectedRaid.id][difficultyId].forEach(p => {



            if (p.members.some(m => m && m.id === supportChar.id)) {



              characterInCurrentRaid = true;



            }



          });



        });



      }



      



      // 현재 레이드에 이미 배치된 경우 건너뛰기



      if (characterInCurrentRaid) {



        continue;



      }



      



      // 이 서포터가 이미 3개 공격대에 배치되었는지 확인



      let supportRaidCount = 0;



      // 모든 탭의 파티를 확인



      Object.keys(state.raidTabs).forEach(raidId => {



        Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



          state.raidTabs[raidId][difficultyId].forEach(p => {



            if (p.members.some(m => m && m.id === supportChar.id)) {



              supportRaidCount++;



            }



          });



        });



      });



      



      // 3개 미만으로 배치된 서포터 중에서 전투력이 가장 높은 서포터 선택



      if (supportRaidCount < 3) {



        if (!bestSupport || parseFloat(supportChar.ilvl.replace(/,/g, '')) > parseFloat(bestSupport.ilvl.replace(/,/g, ''))) {



          bestSupport = supportChar;



        }



      }



    }



    



    if (bestSupport) {



      // 레벨 제한 체크



      if (!meetsRequirements(bestSupport, party)) {



        console.log(`❌ [AUTO ASSIGN] Support ${bestSupport.name} does not meet requirements for Party ${partyIndex + 1}`);



        return;



      }



      party.members[0] = bestSupport;



      console.log(`✅ [AUTO ASSIGN] Added support ${bestSupport.name} to Party ${partyIndex + 1}`);



    }



  });



  



  // 나머지 슬롯에 DPS 배치 (각 파티당 다른 원정대, 1캐릭터당 최대 3공격대)



  let assignedCount = 0;



  



  // 각 파티별로 가능한 원정대 인덱스 목록 생성



  parties.forEach((party, partyIndex) => {



    // 이미 이 파티에 배치된 원정대 인덱스 찾기



    const usedExpeditions = new Set();



    party.members.forEach(m => {



      if (m && m.id) {



        for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {



          const expedition = state.expeditionSlots[expIndex];



          if (expedition.some(c => c && c.id === m.id)) {



            usedExpeditions.add(expIndex);



            break;



          }



        }



      }



    });



    



    // 이 파티에 배치 가능한 DPS 찾기 (다른 원정대, 1캐릭터당 최대 3공격대 제한)



    for (let slotIndex = 1; slotIndex < party.members.length; slotIndex++) {



      // 이미 캐릭터가 배치되어 있으면 건너뛰기



      if (party.members[slotIndex]) {



        console.log(`ℹ️ [AUTO ASSIGN] Party ${partyIndex + 1} Slot ${slotIndex} already has: ${party.members[slotIndex].name}`);



        continue;



      }



      



      let foundChar = null;



      



      for (let i = 0; i < dps.length; i++) {



        const dpsChar = dps[i];



        



        // 이 DPS가 이미 현재 레이드에 배치되었는지 확인



        let characterInCurrentRaid = false;



        if (state.selectedRaid) {



          Object.keys(state.raidTabs[state.selectedRaid.id] || {}).forEach(difficultyId => {



            state.raidTabs[state.selectedRaid.id][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === dpsChar.id)) {



                characterInCurrentRaid = true;



              }



            });



          });



        }



        



        // 현재 레이드에 이미 배치된 경우 건너뛰기



        if (characterInCurrentRaid) {



          continue;



        }



        



        // 이 DPS가 이미 3개 공격대에 배치되었는지 확인



        let dpsRaidCount = 0;



        // 모든 탭의 파티를 확인



        Object.keys(state.raidTabs).forEach(raidId => {



          Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



            state.raidTabs[raidId][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === dpsChar.id)) {



                dpsRaidCount++;



              }



            });



          });



        });



        



        if (dpsRaidCount >= 3) continue; // 3공격대 초과시 건너뛰기



        



        // 이 DPS의 원정대 인덱스 찾기



        let dpsExpeditionIndex = -1;



        for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {



          const expedition = state.expeditionSlots[expIndex];



          if (expedition.some(c => c && c.id === dpsChar.id)) {



            dpsExpeditionIndex = expIndex;



            break;



          }



        }



        



        // 이 파티에 아직 이 원정대가 없고, DPS가 아직 이 파티에 배치되지 않은 경우



        if (dpsExpeditionIndex !== -1 && !usedExpeditions.has(dpsExpeditionIndex)) {



          foundChar = dpsChar;



          usedExpeditions.add(dpsExpeditionIndex);



          break;



        }



      }



      



      if (foundChar) {



        // 레벨 제한 체크



        if (!meetsRequirements(foundChar, party)) {



          console.log(`❌ [AUTO ASSIGN] DPS ${foundChar.name} does not meet requirements for Party ${partyIndex + 1}`);



          continue;



        }



        party.members[slotIndex] = foundChar;



        assignedCount++;



        console.log(`✅ [AUTO ASSIGN] Added DPS ${foundChar.name} to Party ${partyIndex + 1} Slot ${slotIndex}`);



      }



    }



  });



  



  renderRaidParties();



  renderExpedition();



  



  // 결과 요약



  const totalAssigned = parties.reduce((sum, party) => 



    sum + party.members.filter(m => m !== null).length, 0



  );



  



  window.modalManager.showAlert({
    title: '공대 자동 추천 완료',
    message: `공대 자동 추천 완료!\n총 ${totalAssigned}명의 캐릭터가 배치되었습니다.\n(기존 배치된 캐릭터 유지, 빈 슬롯만 채움)`
  });



}







// 균등 분배 기능 - 각 원정대 계정당 1명씩 순차적으로 분배



function balancedAssign() {



  // 모든 공격대 파티 초기화하지 않고 기존 배치된 캐릭터 유지



  // state.raidParties.forEach(party => {



  //   party.members.fill(null);



  // });



  



  // 원정대별로 캐릭터 그룹화 및 전투력 순 정렬



  const expeditionGroups = {};



  state.expeditionSlots.forEach((expedition, expIndex) => {



    if (expedition.length > 0) {



      expeditionGroups[expIndex] = expedition



        .filter(char => char !== null)



        .sort((a,b) => parseFloat((b.ilvl||'0').replace(/,/g,'')) - parseFloat((a.ilvl||'0').replace(/,/g,'')));



    }



  });



  



  const expeditionIndices = Object.keys(expeditionGroups).map(Number);



  if (expeditionIndices.length === 0) {



    window.modalManager.showAlert({
      title: '알림',
      message: '분배할 원정대 캐릭터가 없습니다.'
    });



    return;



  }







  console.log(`🔄 [BALANCED ASSIGN] ${expeditionIndices.length}개 원정대로 균등 분배 시작`);







  // 각 파티에 서포터 먼저 배치 (균등 분배)



  const supportSlots = [];



  // 현재 탭의 파티에만 배치



  const parties = getCurrentTabParties();



  parties.forEach((party, partyIndex) => {



    // 이미 서포터가 배치되어 있으면 건너뛰기



    if (party.members[0] && party.members[0].role === 'support') {



      console.log(`ℹ️ [BALANCED ASSIGN] Party ${partyIndex + 1} already has support: ${party.members[0].name}`);



    } else {



      supportSlots.push({ partyIndex, slotIndex: 0, party: party });



    }



  });







  // 서포터 균등 분배



  let supportRound = 0;



  let supportAssigned = 0;







  while (supportAssigned < supportSlots.length && supportRound < 100) { // 무한 루프 방지



    let roundAssigned = false;







    expeditionIndices.forEach(expIndex => {



      if (supportAssigned >= supportSlots.length) return;







      const expedition = expeditionGroups[expIndex];



      const supports = expedition.filter(char => char.role === 'support');







      if (supports.length > 0) {



        const support = supports[0]; // 가장 전투력 높은 서포터







        // 이 서포터가 이미 현재 레이드에 배치되었는지 확인



        let characterInCurrentRaid = false;



        if (state.selectedRaid) {



          Object.keys(state.raidTabs[state.selectedRaid.id] || {}).forEach(difficultyId => {



            state.raidTabs[state.selectedRaid.id][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === support.id)) {



                characterInCurrentRaid = true;



              }



            });



          });



        }



        



        // 현재 레이드에 이미 배치된 경우 건너뛰기



        if (characterInCurrentRaid) {



          return;



        }







        // 이 서포터가 이미 3개 공격대에 배치되었는지 확인



        let raidCount = 0;



        // 모든 탭의 파티를 확인



        Object.keys(state.raidTabs).forEach(raidId => {



          Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



            state.raidTabs[raidId][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === support.id)) {



                raidCount++;



              }



            });



          });



        });







        if (raidCount < 3) {



          const targetSlot = supportSlots[supportAssigned];



          // 레벨 제한 체크



          if (!meetsRequirements(support, targetSlot.party)) {



            console.log(`❌ [BALANCED ASSIGN] Support ${support.name} does not meet requirements for Party ${targetSlot.partyIndex + 1}`);



            return;



          }



          targetSlot.party.members[targetSlot.slotIndex] = support;



          console.log(`✅ [SUPPORT] ${support.name} → Party ${targetSlot.partyIndex + 1}`);



          supportAssigned++;



          roundAssigned = true;







          // 배치된 서포터는 원정대 목록에서 제거



          const charIndex = expedition.findIndex(c => c.id === support.id);



          if (charIndex !== -1) {



            expedition.splice(charIndex, 1);



          }



        }



      }



    });







    if (!roundAssigned) break;



    supportRound++;



  }







  // DPS 균등 분배



  const dpsSlots = [];



  parties.forEach((party, partyIndex) => {



    for (let slotIndex = 1; slotIndex < party.members.length; slotIndex++) {



      // 이미 캐릭터가 배치되어 있으면 건너뛰기



      if (!party.members[slotIndex]) {



        dpsSlots.push({ partyIndex, slotIndex, party: party });



      } else {



        console.log(`ℹ️ [BALANCED ASSIGN] Party ${partyIndex + 1} Slot ${slotIndex} already has: ${party.members[slotIndex].name}`);



      }



    }



  });







  let dpsRound = 0;



  let dpsAssigned = 0;







  while (dpsAssigned < dpsSlots.length && dpsRound < 100) { // 무한 루프 방지



    let roundAssigned = false;







    expeditionIndices.forEach(expIndex => {



      if (dpsAssigned >= dpsSlots.length) return;







      const expedition = expeditionGroups[expIndex];



      const dpsChars = expedition.filter(char => char.role === 'dps');







      if (dpsChars.length > 0) {



        const dps = dpsChars[0]; // 가장 전투력 높은 DPS







        // 이 DPS가 이미 현재 레이드에 배치되었는지 확인



        let characterInCurrentRaid = false;



        if (state.selectedRaid) {



          Object.keys(state.raidTabs[state.selectedRaid.id] || {}).forEach(difficultyId => {



            state.raidTabs[state.selectedRaid.id][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === dps.id)) {



                characterInCurrentRaid = true;



              }



            });



          });



        }



        



        // 현재 레이드에 이미 배치된 경우 건너뛰기



        if (characterInCurrentRaid) {



          return;



        }







        // 이 DPS가 이미 3개 공격대에 배치되었는지 확인



        let raidCount = 0;



        // 모든 탭의 파티를 확인



        Object.keys(state.raidTabs).forEach(raidId => {



          Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



            state.raidTabs[raidId][difficultyId].forEach(p => {



              if (p.members.some(m => m && m.id === dps.id)) {



                raidCount++;



              }



            });



          });



        });







        if (raidCount < 3) {



          const targetSlot = dpsSlots[dpsAssigned];



          // 레벨 제한 체크



          if (!meetsRequirements(dps, targetSlot.party)) {



            console.log(`❌ [BALANCED ASSIGN] DPS ${dps.name} does not meet requirements for Party ${targetSlot.partyIndex + 1}`);



            return;



          }



          targetSlot.party.members[targetSlot.slotIndex] = dps;



          console.log(`✅ [DPS] ${dps.name} → Party ${targetSlot.partyIndex + 1}`);



          dpsAssigned++;



          roundAssigned = true;







          // 배치된 DPS는 원정대 목록에서 제거



          const charIndex = expedition.findIndex(c => c.id === dps.id);



          if (charIndex !== -1) {



            expedition.splice(charIndex, 1);



          }



        }



      }



    });







    if (!roundAssigned) break;



    dpsRound++;



  }







  renderRaidParties();



  renderExpedition();







  // 결과 요약



  const totalAssigned = parties.reduce((sum, party) => 



    sum + party.members.filter(m => m !== null).length, 0);







  window.modalManager.showAlert({
    title: '균등 분배 완료',
    message: `균등 분배 완료!\n총 ${totalAssigned}명의 캐릭터가 배치되었습니다.\n(기존 배치된 캐릭터 유지, 빈 슬롯만 균등 분배)`
  });



}







// ...







document.body.addEventListener('drop', function(e) {



  try {



    console.log(`🎯 [BODY DROP START]`);



    e.preventDefault();



    e.stopPropagation();







    const data = JSON.parse(e.dataTransfer.getData('text/plain'));



    console.log(`📊 [BODY DROP DATA] Received:`, { name: data.name, id: data.id, fromRaid: data.fromRaid });







    // 공격대에서 온 캐릭터인 경우 제거



    if (data.fromRaid) {



      console.log(`🗑️ [BODY DROP] Removing raid character: ${data.name} from Party ${data.partyId}, Slot ${data.slotIndex}`);



      removeCharacterFromRaid(data.partyId, data.slotIndex);



      return true;



    }







    // 원정대 캐릭터가 빈 공간에 드롭된 경우 - 첫 번째 빈 슬롯에 추가



    if (!data.fromRaid) {



      console.log(`🎯 [BODY DROP] Expedition character dropped in empty space, finding first available slot`);







      // 모든 공격대 파티의 빈 슬롯 찾기



      // 모든 탭의 파티를 확인



      Object.keys(state.raidTabs).forEach(raidId => {



        Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {



          state.raidTabs[raidId][difficultyId].forEach(party => {



            for (let i = 0; i < party.members.length; i++) {



              if (!party.members[i]) {



                console.log(`✅ [AUTO ASSIGN] Adding ${data.name} to Party ${party.id}, Slot ${i}`);







                // 유효성 검사



                const currentSupports = party.members.filter(m => m?.role === 'support').length;



                if (data.role === 'support' && currentSupports >= 1) {



                  console.log(`❌ [AUTO ASSIGN ERROR] Support limit reached for Party ${party.id}`);



                  continue;



                }







                party.members[i] = data;



                renderRaidParties();



                renderExpedition(); // 원정대 UI도 업데이트하여 공격대 배치 갯수 표시



                console.log(`✅ [AUTO ASSIGN COMPLETE] ${data.name} added to Party ${party.id}, Slot ${i}`);



                return true;



              }



            }



          });



        });



      });







      console.log(`❌ [AUTO ASSIGN ERROR] No available slots found`);



      window.modalManager.showAlert({
        title: '알림',
        message: '모든 공격대 슬롯이 가득 찼습니다.'
      });



    }







  } catch (error) {



    // 유효한 드래그 데이터가 아닌 경우 무시



    console.log(`ℹ️ [BODY DROP] No valid data:`, error.message);



  }



});







// 디버깅 도구 초기화만 남기고 상세 로그 제거



window.debugRaidSystem = {



  getState: () => state,



  renderDebug: () => {



    renderRaidParties();



    renderExpedition();



  }



};







// 페이지 로드 시 초기화 (저장된 데이터가 없는 경우에만)



window.addEventListener('load', function() {



  // 항상 원정대 렌더링



  renderExpedition();



  



  const savedData = localStorage.getItem('lostArkRaidData');



  



  if (savedData) {



    try {



      const data = JSON.parse(savedData);



      const saveTime = new Date(data.saveTime).toLocaleString('ko-KR');



      



      // 데이터 불러오기 확인 모달창 생성



      const modalHtml = `



        <div class="modal fade" id="loadDataModal" tabindex="-1" aria-labelledby="loadDataModalLabel" aria-hidden="true" style="z-index: 1080;">



          <div class="modal-dialog modal-dialog-centered">



            <div class="modal-content">



              <div class="modal-header">



                <h5 class="modal-title" id="loadDataModalLabel">



                  <i class="bi bi-folder-open me-2"></i>저장된 데이터 발견



                </h5>



              </div>



              <div class="modal-body">



                <div class="alert alert-info" role="alert">



                  <i class="bi bi-info-circle me-2"></i>



                  <strong>저장된 데이터가 있습니다.</strong>



                </div>



                <div class="mb-3">



                  <label class="form-label"><strong>저장 시간:</strong></label>



                  <div class="form-control-plaintext">${saveTime}</div>



                </div>



                <p class="mb-0">이 데이터를 불러오시겠습니까?</p>



              </div>



              <div class="modal-footer">



                <button type="button" class="btn btn-secondary" id="cancelLoadBtn">



                  <i class="bi bi-x-lg me-1"></i>취소



                </button>



                <button type="button" class="btn btn-primary" id="confirmLoadBtn">



                  <i class="bi bi-check-lg me-1"></i>불러오기



                </button>



              </div>



            </div>



          </div>



        </div>



      `;



      



      // 모달을 body에 추가



      document.body.insertAdjacentHTML('beforeend', modalHtml);



      



      // 모달 표시



      const modal = new bootstrap.Modal(document.getElementById('loadDataModal'));



      modal.show();



      



      // 버튼 이벤트 리스너



      document.getElementById('confirmLoadBtn').addEventListener('click', function() {



        // 데이터 복원



        state.raidTabs = data.raidTabs || {};



        state.raidPartyCounter = data.raidPartyCounter || {};



        state.expeditionSlots = data.expeditionSlots || Array.from({length:8}, () => []);







        // 자동 불러오기한 경우에도 레이드 데이터 로드 필요



        loadRaidsData().then(() => {



          renderRaidTabs();



          renderRaidParties();



          renderExpedition(); // 원정대도 다시 렌더링



          console.log('📂 [AUTO LOAD] 저장된 데이터가 자동으로 불러와졌습니다.');



        }).catch((error) => {



          console.error('페이지 로드 시 비동기 함수 호출 에러:', error);



        });



        



        // 모달 닫기



        modal.hide();



      });



      



      document.getElementById('cancelLoadBtn').addEventListener('click', function() {



        // 불러오지 않은 경우 초기화만 실행



        initializeRaids(); // 초기 공격대 파티 생성



        



        // 모달 닫기



        modal.hide();



      });



      



      // 모달이 닫힐 때 제거



      document.getElementById('loadDataModal').addEventListener('hidden.bs.modal', function () {



        this.remove();



      });



      



    } catch (error) {



      console.error('❌ [AUTO LOAD ERROR]:', error);



      // 에러 발생 시 초기화 실행



      initializeRaids();



    }



  } else {



    // 저장된 데이터가 없는 경우 초기화 실행



    initializeRaids(); // 초기 공격대 파티 생성



  }



});
// 통계 기능
let roleChart = null;
let classChart = null;

// 통계 모달 열기
function showStatisticsModal() {
  const modal = new bootstrap.Modal(document.getElementById('statisticsModal'));
  modal.show();
  
  // 통계 데이터 계산 및 표시
  calculateAndDisplayStatistics();
}

// 통계 데이터 계산 및 표시
function calculateAndDisplayStatistics() {
  const stats = calculateStatistics();
  displayBasicStatistics(stats);
  displayStatisticsTable(stats);
  displayExpeditionGold(stats);
  drawCharts(stats);
}

// 클리어 골드 탭만 새로고침
function refreshExpeditionGold() {
  const stats = calculateStatistics();
  displayExpeditionGold(stats);
}

// 통계 데이터 계산
function calculateStatistics() {
  const parties = getCurrentTabPartiesForStats();
  const allCharacters = [];
  const assignedCharacters = [];
  const partyStats = [];

  parties.forEach((party) => {
    const validMembers = party.members.filter(m => m !== null);
    const validMembersWithDetails = validMembers.map(m => getCharacterDetailsFromExpedition(m.name)).filter(m => m !== null);
    
    const avgCombatPower = validMembersWithDetails.length > 0
      ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembersWithDetails.length)
      : 0;

    const supportCount = validMembersWithDetails.filter(m => m?.role === 'support').length;

    partyStats.push({
      partyName: party.name,
      totalMembers: validMembers.length,
      size: party.size || 4,
      avgCombatPower: avgCombatPower,
      supportCount: supportCount,
      cleared: party.cleared === true // 클리어 상태 추가
    });

    allCharacters.push(...validMembersWithDetails);
    assignedCharacters.push(...validMembersWithDetails);
  });

  const totalCharacters = state.expeditionSlots.flat().filter(char => char).length;
  
  // 클래스별 통계 계산
  const classStats = {};
  assignedCharacters.forEach(char => {
    const className = char.className || '알 수 없음';
    classStats[className] = (classStats[className] || 0) + 1;
  });

  return {
    totalCharacters,
    assignedCharacters,
    unassignedCharacters: totalCharacters - assignedCharacters.length,
    partyStats,
    classStats,
    // 클리어 관련 통계 추가
    totalParties: partyStats.length,
    clearedParties: partyStats.filter(p => p.cleared).length,
    unclearedParties: partyStats.filter(p => !p.cleared).length
  };
}

// 기본 통계 표시
function displayBasicStatistics(stats) {
  document.getElementById('totalCharacters').textContent = stats.totalCharacters;
  
  // 배정된 캐릭터 수 계산
  const assignedCount = stats.assignedCharacters ? stats.assignedCharacters.length : 0;
  document.getElementById('assignedCharacters').textContent = assignedCount;
  
  // 서폿/DPS 수 계산
  const totalSupports = stats.assignedCharacters ? stats.assignedCharacters.filter(char => char.role === 'support').length : 0;
  const totalDps = stats.assignedCharacters ? stats.assignedCharacters.filter(char => char.role === 'dps').length : 0;
  
  document.getElementById('totalSupports').textContent = totalSupports;
  document.getElementById('totalDps').textContent = totalDps;
  
  // 미배정 캐릭터 수 표시
  const unassignedElement = document.getElementById('totalEarnedGold');
  if (unassignedElement) {
    unassignedElement.textContent = stats.unassignedCharacters.toLocaleString();
  }
  
  // 완성율 표시
  const completionRate = stats.totalCharacters > 0 ? 
    Math.round((stats.assignedCharacters.length / stats.totalCharacters) * 100) : 0;
  const completionElement = document.getElementById('totalExpeditionGold');
  if (completionElement) {
    completionElement.textContent = `${completionRate}%`;
  }
  
  // 클리어 상태 표시
  const totalPartiesElement = document.getElementById('totalParties');
  if (totalPartiesElement) {
    totalPartiesElement.textContent = stats.totalParties || 0;
  }
  
  const clearedPartiesElement = document.getElementById('clearedParties');
  if (clearedPartiesElement) {
    clearedPartiesElement.textContent = stats.clearedParties || 0;
  }
  
  const unclearedPartiesElement = document.getElementById('unclearedParties');
  if (unclearedPartiesElement) {
    unclearedPartiesElement.textContent = stats.unclearedParties || 0;
  }
}

// 전체 공격대 리스트 표시
function displayCurrentTabParties() {
  const container = document.getElementById('currentTabParties');
  if (!container) return;
  
  let html = '<div class="row g-3">';
  let hasAnyParties = false;
  
  // 모든 레이드와 난이도의 공격대 표시
  state.raidsData.forEach(raid => {
    raid.difficulties.forEach(difficulty => {
      const raidId = raid.id;
      const difficultyId = difficulty.id;
      const parties = state.raidTabs && state.raidTabs[raidId] && state.raidTabs[raidId][difficultyId] 
        ? state.raidTabs[raidId][difficultyId] 
        : [];
      
      if (parties.length > 0) {
        hasAnyParties = true;
        
        // 난이도별 색상 설정
        let difficultyColor = 'text-primary';
        if (difficulty.id === 'nightmare') {
          difficultyColor = 'text-danger';
        } else if (difficulty.id === 'hard') {
          difficultyColor = 'text-warning';
        } else if (difficulty.id === 'normal') {
          difficultyColor = 'text-success';
        }
        
        parties.forEach(party => {
          const validMembers = party.members.filter(m => m !== null);
          const supportCount = validMembers.filter(m => m?.role === 'support').length;
          const completionRate = party.size > 0 ? Math.round((validMembers.length / party.size) * 100) : 0;
          const statusBadge = completionRate === 100 ? 'bg-success' : 
                             completionRate >= 50 ? 'bg-warning' : 'bg-danger';
          const status = completionRate === 100 ? '완성' : 
                        completionRate >= 50 ? '진행중' : '미완성';
          
          // 평균 전투력 계산
          const validMembersWithDetails = validMembers.map(m => getCharacterDetailsFromExpedition(m.name)).filter(m => m !== null);
          const avgCombatPower = validMembersWithDetails.length > 0
            ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembersWithDetails.length)
            : 0;
          
          html += `
            <div class="col-md-6 col-lg-4">
              <div class="card border-0 shadow-sm h-100" style="font-size: 0.8rem;">
                <div class="card-header bg-light py-2">
                  <h6 class="card-title mb-0" style="font-size: 0.85rem;">
                    <i class="bi bi-people-fill me-1"></i>${party.name}
                  </h6>
                </div>
                <div class="card-body p-2">
                  <div class="row g-2 mb-2">
                    <div class="col-6">
                      <div class="text-center">
                        <small class="text-muted d-block">인원</small>
                        <strong>${validMembers.length}/${party.size}</strong>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="text-center">
                        <small class="text-muted d-block">서폿</small>
                        <strong>${supportCount}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div class="row g-2 mb-2">
                    <div class="col-6">
                      <div class="text-center">
                        <small class="text-muted d-block">완성도</small>
                        <strong>${completionRate}%</strong>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="text-center">
                        <small class="text-muted d-block">평균 CP</small>
                        <strong class="text-primary">${avgCombatPower.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div class="text-center">
                    <span class="badge ${statusBadge}">${status}</span>
                  </div>
                  
                  ${validMembers.length > 0 ? `
                    <div class="mt-2 pt-2 border-top">
                      <small class="text-muted d-block mb-2">캐릭터 (${validMembers.length}명)</small>
                      <div class="d-flex flex-wrap gap-1">
                        ${validMembers.slice(0, 3).map(member => {
                          const charDetails = getCharacterDetailsFromExpedition(member.name);
                          const roleIcon = charDetails?.role === 'support' ? '🛡️' : '⚔️';
                          return `
                            <span class="badge bg-light text-dark" style="font-size: 0.65rem;" title="${
                              charDetails ? `${charDetails.ilvl} / ${charDetails.combatPower} / ${charDetails.role}` : '정보 없음'
                            }">
                              ${member.name || '알 수 없음'} ${roleIcon}
                            </span>
                          `;
                        }).join('')}
                        ${validMembers.length > 3 ? `
                          <span class="badge bg-secondary" style="font-size: 0.65rem;">
                            +${validMembers.length - 3}
                          </span>
                        ` : ''}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        });
      }
    });
  });
  
  html += '</div>';
  
  if (!hasAnyParties) {
    container.innerHTML = '<div class="alert alert-light text-center">생성된 공격대가 없습니다.</div>';
  } else {
    container.innerHTML = html;
  }
}

// 통계 테이블 표시
function displayStatisticsTable(stats) {
  const tbody = document.getElementById('statisticsTable');
  tbody.innerHTML = '';
  
  // 모든 레이드와 난이도의 공격대 정보 표시
  let hasAnyParties = false;
  
  state.raidsData.forEach(raid => {
    raid.difficulties.forEach(difficulty => {
      const raidId = raid.id;
      const difficultyId = difficulty.id;
      const parties = state.raidTabs && state.raidTabs[raidId] && state.raidTabs[raidId][difficultyId] 
        ? state.raidTabs[raidId][difficultyId] 
        : [];
      
      if (parties.length > 0) {
        hasAnyParties = true;
        
        parties.forEach(party => {
          const validMembers = party.members.filter(m => m !== null);
          const supportCount = validMembers.filter(m => m?.role === 'support').length;
          const completionRate = party.size > 0 ? Math.round((validMembers.length / party.size) * 100) : 0;
          const statusBadge = completionRate === 100 ? 'bg-success' : 
                             completionRate >= 50 ? 'bg-warning' : 'bg-danger';
          const status = completionRate === 100 ? '완성' : 
                        completionRate >= 50 ? '진행중' : '미완성';
          
          // 평균 전투력 계산
          const validMembersWithDetails = validMembers.map(m => getCharacterDetailsFromExpedition(m.name)).filter(m => m !== null);
          const avgCombatPower = validMembersWithDetails.length > 0
            ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembersWithDetails.length)
            : 0;
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${party.name}</td>
            <td>
              <div class="progress" style="height: 20px;">
                <div class="progress-bar ${completionRate === 100 ? 'bg-success' : 'bg-primary'}" 
                     style="width: ${completionRate}%">${completionRate}%</div>
              </div>
            </td>
            <td>${supportCount} / ${validMembers.length - supportCount}</td>
            <td>-</td>
            <td>${avgCombatPower.toLocaleString()}</td>
            <td><span class="badge bg-info">${validMembers.length}/${party.size}명</span></td>
            <td><span class="badge bg-warning">${supportCount}서폿</span></td>
            <td><span class="badge ${statusBadge}">${status}</span></td>
          `;
          
          tbody.appendChild(row);
        });
      }
    });
  });
  
  if (!hasAnyParties) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="8" class="text-center text-muted">생성된 공격대가 없습니다.</td>
    `;
    tbody.appendChild(row);
  }
}

// 모든 캐릭터의 레이드 배정 정보 한 번에 가져오기 (여러 공격대 지원)
function getAllCharacterRaidAssignments() {
  const assignments = {};
  
  try {
    // state.raidTabs에서 직접 검색
    if (state.raidTabs) {
      Object.keys(state.raidTabs).forEach(raidId => {
        const raidData = state.raidTabs[raidId];
        
        Object.keys(raidData).forEach(difficultyId => {
          const parties = raidData[difficultyId];
          
          parties.forEach(party => {
            if (party.members) {
              party.members.forEach((member, index) => {
                if (member) {
                  // ID가 없으면 이름을 ID로 사용
                  const characterId = member.id || member.name;
                  
                  if (characterId) {
                    const raid = state.raidsData.find(r => r.id === raidId);
                    
                    if (raid) {
                      const difficulty = raid.difficulties.find(d => d.id === difficultyId);
                      
                      if (difficulty && difficulty.clearGold) {
                        // 여러 공격대에 배정된 경우 배열로 저장
                        if (!assignments[characterId]) {
                          assignments[characterId] = [];
                        }
                        
                        assignments[characterId].push({
                          raidId: raidId,
                          raidName: raid.name,
                          difficultyId: difficultyId,
                          difficultyName: difficulty.name,
                          clearGold: difficulty.clearGold,
                          raidSize: raid.size || 4,
                          partyId: party.id
                        });
                      }
                    }
                  }
                }
              });
            }
          });
        });
      });
    }
  } catch (error) {
    console.error(`[ERROR] 캐릭터 배정 정보 조회 중 오류 발생:`, error);
  }
  
  return assignments;
}

// 캐릭터 ID로 배정된 레이드 정보 가져오기 (개별용)
function getCharacterRaidAssignment(characterId) {
  const allAssignments = getAllCharacterRaidAssignments();
  return allAssignments[characterId] || null;
}

// 원정대별 클리어 골드 표시
function displayExpeditionGold(stats) {
  const container = document.getElementById('expeditionGoldContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 각 원정대(0-7)에 대해 처리
  for (let expIndex = 0; expIndex < 8; expIndex++) {
    
    const expeditionDiv = document.createElement('div');
    expeditionDiv.className = 'mb-4'; /* Bootstrap 반응형 클래스 제거 */
    expeditionDiv.style.setProperty('--index', expIndex);
    
    // 이 원정대에 속한 캐릭터들
    const expeditionChars = state.expeditionSlots[expIndex]?.filter(char => char) || [];
    
    let totalGold = 0;
    
    // 모든 캐릭터의 레이드 배정 정보 한 번에 가져오기
    const allAssignments = getAllCharacterRaidAssignments();
    
    // 각 캐릭터의 레이드 배정 정보와 골드 계산
    const charDetails = expeditionChars.map(char => {
      // ID가 없으면 이름을 ID로 사용
      const characterId = char.id || char.name;
      
      // 캐릭터 ID로 배정된 레이드 정보 가져오기
      const assignedRaids = allAssignments[characterId];
      let charGold = 0;
      let raidInfo = [];
      
      if (assignedRaids && assignedRaids.length > 0) {
        // 높은 골드 순으로 정렬 후 상위 3개만 계산
        const sortedRaids = assignedRaids.sort((a, b) => b.clearGold - a.clearGold);
        const topRaids = sortedRaids.slice(0, 3);
        
        topRaids.forEach(raid => {
          charGold += raid.clearGold;
          // 나이트메어를 나메로 줄여서 표시
          const difficultyName = raid.difficultyName === '나이트메어' ? '나메' : raid.difficultyName;
          raidInfo.push(`${raid.raidName} ${difficultyName}`);
        });
        totalGold += charGold;
      }
      
      return {
        ...char,
        assignedRaid: assignedRaids && assignedRaids.length > 0 ? assignedRaids[0] : null,
        assignedRaids: raidInfo,
        charGold
      };
    });
    
    // 원정대 카드 생성
    expeditionDiv.innerHTML = `
      <div class="card h-100">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">${expIndex + 1}번째 원정대</h5>
        </div>
        <div class="card-body p-0">
          <ul class="list-group list-group-flush">
            ${charDetails.length > 0 ? 
              charDetails.map(char => `
                <li class="list-group-item">
                  <div class="d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <div class="d-flex align-items-center">
                        <span class="character-name" 
                              title="${char.name || '알 수 없음'}">
                          ${char.name || '알 수 없음'}
                        </span>
                        <span class="badge bg-warning text-dark ms-2" style="flex-shrink: 0;">
                          ${char.charGold.toLocaleString()}
                        </span>
                        ${(() => {
                          const usageCount = Constraints.getCharacterUsageCount(char.name);
                          const badgeColor = usageCount >= 4 ? 'bg-danger' : usageCount >= 3 ? 'bg-warning' : 'bg-success';
                          return `<span class="badge ${badgeColor} ms-2" style="font-size: 0.65rem;">${usageCount}/4</span>`;
                        })()}
                      </div>
                    </div>
                    ${char.assignedRaids && char.assignedRaids.length > 0 ? `
                      <div class="d-flex flex-wrap gap-1">
                        ${char.assignedRaids.map(raid => `
                          <span class="badge bg-light text-dark" style="font-size: 0.65rem;">
                            ${raid}
                          </span>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                </li>
              `).join('') : 
              '<li class="list-group-item text-muted text-center py-3">원정대에 캐릭터가 없습니다</li>'
            }
            ${charDetails.length > 0 ? `
              <li class="list-group-item bg-light d-flex justify-content-between align-items-center fw-bold">
                <span>총 획득 골드</span>
                <span class="badge bg-success">${totalGold.toLocaleString()}</span>
              </li>
            ` : ''}
          </ul>
        </div>
      </div>
    `;
    
    container.appendChild(expeditionDiv);
  }
}

// 차트 그리기
function drawCharts(stats) {
  // 역할 분포 차트
  drawRoleChart(stats);
  
  // 클래스 분포 차트
  drawClassChart(stats);
}

// 역할 분포 차트
function drawRoleChart(stats) {
  const ctx = document.getElementById('roleChart').getContext('2d');
  
  // 기존 차트가 있으면 파괴
  if (roleChart) {
    roleChart.destroy();
  }
  
  roleChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['서폿', '딜러'],
      datasets: [{
        data: [stats.totalSupports, stats.totalDps],
        backgroundColor: ['#ffc107', '#0dcaf0'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// 클래스 분포 차트
function drawClassChart(stats) {
  const ctx = document.getElementById('classChart').getContext('2d');
  
  // 기존 차트가 있으면 파괴
  if (classChart) {
    classChart.destroy();
  }
  
  const labels = Object.keys(stats.classStats);
  const data = Object.values(stats.classStats);
  
  // 색상 생성
  const colors = generateColors(labels.length);
  
  classChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '캐릭터 수',
        data: data,
        backgroundColor: colors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// 색상 생성기
function generateColors(count) {
  const colors = [];
  const baseColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];
  
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  
  return colors;
}

// 통계 내보내기
function exportStatistics() {
  const stats = calculateStatistics();
  
  // CSV 데이터 생성
  let csvContent = "파티,완성도,서폿,딜러,평균레벨,평균전투력,상태\n";
  
  stats.partyStats.forEach(party => {
    csvContent += `${party.partyName},${party.completionRate}%,${party.supports},${party.dps},${party.avgIlvl},${party.avgCombatPower},${party.status}\n`;
  });
  
  // 파일 다운로드
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `공격대_통계_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 숫자 파싱 헬퍼 함수
function parseCompareNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const parsed = parseInt(raw.replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

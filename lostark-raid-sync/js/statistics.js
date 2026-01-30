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
  
  // 기본 통계 표시
  displayBasicStatistics(stats);
  
  // 테이블 데이터 표시
  displayStatisticsTable(stats);
  
  // 차트 그리기
  drawCharts(stats);
}

// 통계 데이터 계산
function calculateStatistics() {
  const parties = getCurrentTabParties();
  const allCharacters = [];
  const assignedCharacters = [];
  const partyStats = [];
  
  // 원정대 캐릭터 수집
  state.expeditionSlots.forEach(slot => {
    slot.forEach(char => {
      allCharacters.push(char);
    });
  });
  
  // 파티별 통계 계산
  parties.forEach((party, index) => {
    const partyCharacters = [];
    let supports = 0;
    let dps = 0;
    let totalIlvl = 0;
    let totalCombatPower = 0;
    let filledSlots = 0;
    
    party.members.forEach(member => {
      if (member) {
        const charDetails = getCharacterDetailsFromExpedition(member.name);
        if (charDetails) {
          partyCharacters.push(charDetails);
          assignedCharacters.push(charDetails);
          
          if (charDetails.role === 'support') {
            supports++;
          } else {
            dps++;
          }
          
          totalIlvl += parseCompareNumber(charDetails.ilvl || '0');
          totalCombatPower += parseCompareNumber(charDetails.combatPower || '0');
          filledSlots++;
        }
      }
    });
    
    const completionRate = Math.round((filledSlots / party.size) * 100);
    const avgIlvl = filledSlots > 0 ? Math.round(totalIlvl / filledSlots) : 0;
    const avgCombatPower = filledSlots > 0 ? Math.round(totalCombatPower / filledSlots) : 0;
    
    partyStats.push({
      partyName: `파티 ${index + 1}`,
      completionRate,
      supports,
      dps,
      avgIlvl,
      avgCombatPower,
      status: completionRate === 100 ? '완성' : completionRate >= 50 ? '진행중' : '미완성'
    });
  });
  
  // 전체 통계
  const totalSupports = allCharacters.filter(char => char.role === 'support').length;
  const totalDps = allCharacters.filter(char => char.role === 'dps').length;
  
  // 클래스별 통계
  const classStats = {};
  allCharacters.forEach(char => {
    const className = char.className || '알 수 없음';
    classStats[className] = (classStats[className] || 0) + 1;
  });
  
  return {
    totalCharacters: allCharacters.length,
    totalSupports,
    totalDps,
    assignedCharacters: assignedCharacters.length,
    partyStats,
    classStats
  };
}

// 기본 통계 표시
function displayBasicStatistics(stats) {
  document.getElementById('totalCharacters').textContent = stats.totalCharacters;
  document.getElementById('totalSupports').textContent = stats.totalSupports;
  document.getElementById('totalDps').textContent = stats.totalDps;
  document.getElementById('assignedCharacters').textContent = stats.assignedCharacters;
}

// 통계 테이블 표시
function displayStatisticsTable(stats) {
  const tbody = document.getElementById('statisticsTable');
  tbody.innerHTML = '';
  
  stats.partyStats.forEach(party => {
    const row = document.createElement('tr');
    const statusBadge = party.status === '완성' ? 'bg-success' : 
                       party.status === '진행중' ? 'bg-warning' : 'bg-danger';
    
    row.innerHTML = `
      <td>${party.partyName}</td>
      <td>
        <div class="progress" style="height: 20px;">
          <div class="progress-bar ${party.completionRate === 100 ? 'bg-success' : 'bg-primary'}" 
               style="width: ${party.completionRate}%">${party.completionRate}%</div>
        </div>
      </td>
      <td>${party.supports} / ${party.dps}</td>
      <td>${party.avgIlvl}</td>
      <td>${party.avgCombatPower.toLocaleString()}</td>
      <td><span class="badge ${statusBadge}">${party.status}</span></td>
    `;
    
    tbody.appendChild(row);
  });
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

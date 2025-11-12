let currentDate = new Date();
const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월',
                  '7월', '8월', '9월', '10월', '11월', '12월'];
const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

// Dummy diary data
const diaryEntries = {
  '2025-11-01': '11월의 첫날이에요! 새로운 시작입니다.',
  '2025-11-05': '오늘은 프로젝트를 진행했습니다. 잘 되고 있어요!',
  '2025-11-10': '주말을 맞이해서 휴식을 취했어요.',
  '2025-11-15': '중요한 미팅이 있었습니다. 잘 마무리되었어요.',
  '2025-11-20': '새로운 기술을 배우기 시작했어요. 재미있네요!',
  '2025-11-25': '친구들과 만나서 즐거운 시간을 보냈습니다.',
  '2025-11-30': '한 달이 벌써 지나갔네요. 다음 달도 화이팅!'
};

// Format date as YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Display diary entry for selected date
function showDiaryEntry(date) {
  const entryContainer = document.getElementById('diaryEntry');
  if (!entryContainer) return;

  const formattedDate = formatDate(date);
  const entry = diaryEntries[formattedDate] || '이 날짜에 작성된 일기가 없습니다. 새 일기를 작성해보세요!';
  
  entryContainer.innerHTML = `
    <div class="diary-entry">
      <div class="diary-date">${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})</div>
      <div class="diary-content">${entry}</div>
    </div>
  `;
}

// Update the calendar header with month/year
function updateCalendarHeader() {
  const monthYearElement = document.querySelector('.current-month');
  if (monthYearElement) {
    monthYearElement.textContent = `${currentDate.getFullYear()}년 ${monthNames[currentDate.getMonth()]}`;
  }
}

// Update today's date display
function updateTodayDate() {
  const today = new Date();
  const dateToday = document.getElementById('dateToday');
  if (dateToday) {
    dateToday.innerHTML = `
      <div class="current-month">${today.getFullYear()}년 ${monthNames[today.getMonth()]}</div>
      <div class="current-date">${today.getDate()}일 (${dayNames[today.getDay()]})</div>
    `;
  }
}

// Create weekday headers
function createWeekdays() {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekdaysContainer = document.createElement('div');
  weekdaysContainer.className = 'weekdays';
  
  weekdays.forEach(day => {
    const dayElement = document.createElement('div');
    dayElement.textContent = day;
    weekdaysContainer.appendChild(dayElement);
  });
  
  return weekdaysContainer;
}

// Create date list for the calendar
function createDateList() {
  const calendar = document.querySelector('.calendar');
  if (!calendar) return;

  // Clear existing calendar content
  calendar.innerHTML = `
    <div class="calendar-header">
      <button class="calendar-nav" id="prevMonth"><i class="bi bi-chevron-left"></i></button>
      <div class="current-month"></div>
      <button class="calendar-nav" id="nextMonth"><i class="bi bi-chevron-right"></i></button>
    </div>
    <div id="dateToday" class="date-today"></div>
    <div class="date-list" id="dateList"></div>
    <div id="diaryEntry" class="diary-entry-container"></div>
  `;

  // Add event listeners for navigation
  document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
  });

  document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
  });

  updateCalendar();
}

function updateCalendar() {
  const dateList = document.getElementById('dateList');
  if (!dateList) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = (month === today.getMonth() && year === today.getFullYear());
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Update header
  updateCalendarHeader();
  
  // Clear existing dates
  dateList.innerHTML = '';

  // Add days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const dateCell = document.createElement('div');
    dateCell.className = 'date-cell other-month';
    dateCell.textContent = daysInPrevMonth - i;
    dateList.appendChild(dateCell);
  }

  // Add current month's days
  for (let date = 1; date <= daysInMonth; date++) {
    const dateCell = document.createElement('div');
    dateCell.className = 'date-cell';
    dateCell.textContent = date;
    
    // Highlight today's date if it's the current month
    if (isCurrentMonth && date === today.getDate()) {
      dateCell.classList.add('today');
    }
    
    // Add click event to show diary entry
    dateCell.addEventListener('click', () => {
      // Remove active class from all date cells
      document.querySelectorAll('.date-cell').forEach(cell => {
        cell.classList.remove('selected');
      });
      
      // Add active class to clicked cell
      dateCell.classList.add('selected');
      
      // Create and show diary entry
      const selectedDate = new Date(year, month, date);
      showDiaryEntry(selectedDate);
    });
    
    dateList.appendChild(dateCell);
  }

  // Calculate how many days to add from next month
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const nextMonthDays = totalCells - (firstDay + daysInMonth);
  
  // Add days from next month
  for (let i = 1; i <= nextMonthDays; i++) {
    const dateCell = document.createElement('div');
    dateCell.className = 'date-cell other-month';
    dateCell.textContent = i;
    dateList.appendChild(dateCell);
  }
}

// Initialize calendar when the page loads
document.addEventListener('DOMContentLoaded', function() {
  updateTodayDate();
  createDateList();
});

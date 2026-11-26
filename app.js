// ====== НАСТРОЙКИ ======
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwdahigdXXE8kfyvRcyStG4nBb2WbP37ST94JxvRHjPMdkYUSditZ_bWFimsAkjFbJapg/exec';
const TEST_USER_ID = '6645520930';
// =======================

let allPeople = [];
let currentUserId = TEST_USER_ID;

document.addEventListener('DOMContentLoaded', init);

function init() {
  initTheme();
  loadBirthdays();
}

// ====== ЗАГРУЗКА ДАННЫХ ======
async function loadBirthdays() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading">Загрузка...</div>';

  try {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getBirthdays', userId: currentUserId })
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Ошибка доступа');

    allPeople = data.people || [];
    renderMain();
  } catch (e) {
    app.innerHTML = '<div class="error">' + e.message + '</div>';
  }
}

// ====== ГЛАВНЫЙ ЭКРАН ======
function renderMain() {
  const app = document.getElementById('app');
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const todayPeople = allPeople.filter(p => {
    const d = parseDate(p.birthDate);
    return d.month === todayMonth && d.day === todayDay;
  });

  const weekPeople = getThisWeekPeople(today);

  let topHtml = '';

  // Карточка "Сегодня"
  if (todayPeople.length > 0) {
    topHtml += `
      <div class="today-card">
        <div class="today-date">${formatDate(today)}</div>
        <div class="today-list">
          ${todayPeople.map(p => `
            <div class="today-person" onclick="showPerson('${escapeHtml(p.fullName)}')">
              <span class="person-name">${escapeHtml(p.fullName)}</span>
              <span class="person-age">${today.getFullYear() - parseDate(p.birthDate).year} лет</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Карточка "На этой неделе"
  if (weekPeople.length > 0) {
    topHtml += `
      <div class="week-card">
        <div class="section-title">На этой неделе</div>
        ${weekPeople.map(p => {
          const d = parseDate(p.birthDate);
          const monthNames = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
          return `
            <div class="person-row" onclick="showPerson('${escapeHtml(p.fullName)}')">
              <span class="person-name">${escapeHtml(p.fullName)}</span>
              <span class="person-date">${d.day} ${monthNames[d.month-1]}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  app.innerHTML = `
    ${topHtml}
    <section id="allMonths" class="months-container"></section>
  `;
  renderAllMonths();
}

// ====== ПОДРОБНАЯ КАРТОЧКА ======
window.showPerson = function(fullName) {
  const person = allPeople.find(p => p.fullName === fullName);
  if (!person) return;

  const app = document.getElementById('app');
  const today = new Date();
  const birthYear = parseDate(person.birthDate).year;
  const age = today.getFullYear() - birthYear;
  const greeting = generateGreeting(person);
  const tgUser = person.telegramUsername ? person.telegramUsername.replace('@', '') : '';
  const tgLink = tgUser ? `https://t.me/${tgUser}` : '#';

  app.innerHTML = `
    <div style="padding: 10px 0;">
      <button onclick="renderMain()" class="back-btn">← Назад</button>
    </div>
    <div class="today-card person-detail-card">
      <div class="name">${escapeHtml(person.fullName)}</div>
      <div class="age">${age} <span class="age-label">лет</span></div>
      <div class="birth-date">Дата рождения: ${formatDate(new Date(person.birthDate))}</div>
      
      <a href="${tgLink}" target="_blank" class="greet-btn">
        ✈️ Написать в Telegram
      </a>
      
      <div class="greeting-box">
        <div class="greeting-title">Поздравление:</div>
        <div class="greeting-text">${escapeHtml(greeting)}</div>
      </div>
    </div>
  `;
};

// ====== ВСЕ 12 МЕСЯЦЕВ (С ТЕКУЩЕГО) ======
function renderAllMonths() {
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const now = new Date();
  const curMonth = now.getMonth() + 1; // 1-12
  const curDay = now.getDate();

  const container = document.getElementById('allMonths');
  if (!container) return;

  // Формируем порядок: текущий месяц, затем следующие по кругу
  const order = [];
  for (let i = 0; i < 12; i++) {
    let m = curMonth + i;
    if (m > 12) m -= 12;
    order.push(m);
  }

  container.innerHTML = order.map(m => {
    const name = monthNames[m - 1];
    const people = getAllMonthPeople(m);
    
    let rows = '';
    if (people.length === 0) {
      rows = `<div class="month-person empty-month">Нет именинников</div>`;
    } else {
      rows = people.map(p => {
        const d = parseDate(p.birthDate);
        const isPast = m < curMonth || (m === curMonth && d.day < curDay);
        const dateLabel = isPast ? `${d.day} ${getMonthShort(m)} (прошёл)` : `${d.day} ${getMonthShort(m)}`;
        return `
          <div class="month-person ${isPast ? 'past' : ''}" onclick="showPerson('${escapeHtml(p.fullName)}')">
            <span class="month-person-name">${escapeHtml(p.fullName)}</span>
            <span class="month-person-date">${dateLabel}</span>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="month-card">
        <div class="month-header">${name}</div>
        <div class="month-body">${rows}</div>
      </div>
    `;
  }).join('');
}

// ====== УТИЛИТЫ ======
function formatDate(date) {
  const months = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getMonthShort(monthNum) {
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  return months[monthNum - 1];
}

function parseDate(str) {
  if (!str) return { year: 0, month: 0, day: 0 };
  if (str.includes('-')) {
    const [y, m, d] = str.split('-').map(Number);
    return { year: y, month: m, day: d };
  }
  const [d, m, y] = str.split('.').map(Number);
  return { year: y, month: m, day: d };
}

function getAllMonthPeople(month) {
  return allPeople
    .filter(p => parseDate(p.birthDate).month === month)
    .sort((a, b) => parseDate(a.birthDate).day - parseDate(b.birthDate).day);
}

function getThisWeekPeople(today) {
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return allPeople.filter(p => {
    const d = parseDate(p.birthDate);
    const thisYear = today.getFullYear();
    let bd = new Date(thisYear, d.month - 1, d.day);
    return bd >= monday && bd <= sunday;
  });
}

const GREETING_TEMPLATES = [
  '{name}, с днём рождения! Пусть каждый день приносит что-то хорошее.',
  'Поздравляю, {name}! Желаю здоровья, сил и людей рядом, на которых можно положиться.',
  '{name}, с днём рождения! Пусть этот год будет легче и интереснее предыдущего.',
  'С днём рождения, {name}! Желаю, чтобы задуманное сбывалось без лишних усилий.',
  '{name}, поздравляю! Пусть вокруг будет больше поводов для улыбок.',
  'С днём рождения! {name}, желаю спокойствия, ясности и хороших новостей.',
  '{name}, с праздником! Пусть всё важное получается, а мелочи не расстраивают.',
  'Поздравляю с днём рождения, {name}! Желаю тепла, уюта и верных людей рядом.'
];

function generateGreeting(person) {
  const firstName = person.fullName.split(' ')[1] || person.fullName.split(' ')[0];
  const key = `greet_${person.fullName}`;
  let used = JSON.parse(localStorage.getItem(key) || '[]');

  if (used.length >= GREETING_TEMPLATES.length) used = [];

  const available = GREETING_TEMPLATES
    .map((t, i) => ({ t, i }))
    .filter(x => !used.includes(x.i));

  const pick = available[Math.floor(Math.random() * available.length)];
  used.push(pick.i);
  localStorage.setItem(key, JSON.stringify(used));

  return pick.t.replace('{name}', firstName);
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  updateThemeIcon();

  document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    updateThemeIcon();
  });
}

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

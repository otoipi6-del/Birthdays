// ====== НАСТРОЙКИ ======
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwdahigdXXE8kfyvRcyStG4nBb2WbP37ST94JxvRHjPMdkYUSditZ_bWFimsAkjFbJapg/exec';
// =======================

const tg = window.Telegram?.WebApp;
let allPeople = [];
let currentMonth = new Date().getMonth() + 1; // 1-12

// ====== ИНИЦИАЛИЗАЦИЯ ======
document.addEventListener('DOMContentLoaded', init);

async function init() {
  initTheme();
  tg?.ready();
  tg?.expand();

  try {
    const initData = tg?.initData || '';
    if (!initData) {
      showError('Откройте приложение через Telegram');
      return;
    }

    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getBirthdays', initData })
    });

    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Ошибка доступа');

    allPeople = data.people || [];
    render();
  } catch (e) {
    showError(e.message);
  }
}

function render() {
  document.getElementById('loading').classList.add('hidden');
  renderToday();
  renderAllMonths();
}

// ====== КАРТОЧКА 1: СЕГОДНЯ ======
function renderToday() {
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const todayPeople = allPeople.filter(p => {
    const d = parseDate(p.birthDate);
    return d.month === todayMonth && d.day === todayDay;
  });

  const container = document.getElementById('todayCard');

  if (todayPeople.length > 0) {
    container.innerHTML = todayPeople.map(p => {
      const age = today.getFullYear() - parseDate(p.birthDate).year;
      const greeting = generateGreeting(p);
      const tgUser = p.telegramUsername?.replace('@', '') || '';
      const tgLink = tgUser ? `https://t.me/${tgUser}` : '#';

      return `
        <div class="today-card">
          <div class="name">${escapeHtml(p.fullName)}</div>
          <div class="age">${age} <span class="age-label">лет</span></div>
          <a href="${tgLink}" target="_blank" class="greet-btn">
            ✈️ Поздравить в Telegram
          </a>
          <div class="greeting-text">${escapeHtml(greeting)}</div>
        </div>
      `;
    }).join('');
    return;
  }

  // Нет именинников сегодня — проверяем неделю
  const weekPeople = getThisWeekPeople(today);
  if (weekPeople.length > 0) {
    container.innerHTML = '';
    const weekEl = document.getElementById('weekCard');
    weekEl.classList.remove('hidden');
    weekEl.innerHTML = `
      <div class="section-title">На этой неделе</div>
      ${weekPeople.map(p => renderPersonRow(p, false)).join('')}
    `;
    return;
  }

  // Нет на неделе — показываем месяц
  const monthPeople = getAllMonthPeople(todayMonth);
  if (monthPeople.length > 0) {
    container.innerHTML = '';
    const monthEl = document.getElementById('monthCard');
    monthEl.classList.remove('hidden');
    monthEl.innerHTML = `
      <div class="section-title">В этом месяце</div>
      ${monthPeople.map(p => {
        const d = parseDate(p.birthDate);
        const isPast = d.day < todayDay;
        return renderPersonRow(p, isPast);
      }).join('')}
    `;
  } else {
    container.innerHTML = '<div class="loading">Нет дней рождения в этом месяце</div>';
  }
}

// ====== ВСЕ 12 МЕСЯЦЕВ ======
function renderAllMonths() {
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();

  const container = document.getElementById('allMonths');
  container.innerHTML = monthNames.map((name, idx) => {
    const m = idx + 1;
    const people = getAllMonthPeople(m);
    if (people.length === 0) return '';

    const rows = people.map(p => {
      const d = parseDate(p.birthDate);
      const isPast = m < curMonth || (m === curMonth && d.day < curDay);
      return `
        <div class="month-person ${isPast ? 'past' : ''}">
          <span class="day">${d.day}</span>
          <span>${escapeHtml(p.fullName)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="month-card">
        <div class="month-header">${name}</div>
        <div class="month-body">${rows}</div>
      </div>
    `;
  }).join('');
}

// ====== ВСПОМОГАТЕЛЬНЫЕ ======
function parseDate(str) {
  // Ожидается формат YYYY-MM-DD или DD.MM.YYYY
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
  const dayOfWeek = today.getDay(); // 0=Вс
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return allPeople.filter(p => {
    const d = parseDate(p.birthDate);
    const thisYear = today.getFullYear();
    let bd = new Date(thisYear, d.month - 1, d.day);
    // Если ДР уже прошёл на этой неделе — всё равно показываем (в пределах недели)
    return bd >= monday && bd <= sunday;
  });
}

function renderPersonRow(p, isPast) {
  const d = parseDate(p.birthDate);
  const monthNames = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  return `
    <div class="person-row ${isPast ? 'past' : ''}">
      <span class="person-name">${escapeHtml(p.fullName)}</span>
      <span class="person-date">${d.day} ${monthNames[d.month-1]}</span>
    </div>
  `;
}

// ====== ГЕНЕРАЦИЯ ПОЗДРАВЛЕНИЙ (без ИИ) ======
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

  // Если все шаблоны использованы — сбрасываем
  if (used.length >= GREETING_TEMPLATES.length) used = [];

  const available = GREETING_TEMPLATES
    .map((t, i) => ({ t, i }))
    .filter(x => !used.includes(x.i));

  const pick = available[Math.floor(Math.random() * available.length)];
  used.push(pick.i);
  localStorage.setItem(key, JSON.stringify(used));

  return pick.t.replace('{name}', firstName);
}

// ====== ТЕМА ======
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

// ====== УТИЛИТЫ ======
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showError(msg) {
  document.getElementById('loading').classList.add('hidden');
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ====== НАСТРОЙКИ ======
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwdahigdXXE8kfyvRcyStG4nBb2WbP37ST94JxvRHjPMdkYUSditZ_bWFimsAkjFbJapg/exec';
const TEST_USER_ID = '6645520930';
// =======================

let allPeople = [];
let currentUserId = TEST_USER_ID;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initBackToTop();
  loadBirthdays();
});

// ====== КНОПКА "НАВЕРХ" ======
function initBackToTop() {
  const btn = document.createElement('button');
  btn.id = 'backToTopBtn';
  btn.innerHTML = '↑';
  btn.title = 'Наверх';
  document.body.appendChild(btn);

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });
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

  // 1. Карточка "Сегодня"
  if (todayPeople.length > 0) {
    const dateStr = formatDate(today);
    topHtml += `
      <div class="card-block">
        <div class="card-header-today">${dateStr} — Сегодня день рождения</div>
        <div class="card-body">
          ${todayPeople.map(p => {
            const age = today.getFullYear() - parseDate(p.birthDate).year;
            return `
              <div class="row-item" onclick="showPerson('${escapeHtml(p.fullName)}')">
                <span class="row-name">${escapeHtml(p.fullName)}</span>
                <span class="row-date">${age} лет</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 2. Кнопка "Добавить" (сразу под карточкой "Сегодня" или просто сверху)
  topHtml += `
    <div style="margin-bottom: 20px; text-align: center;">
      <button onclick="openAddForm()" class="add-btn">+ Добавить именинника</button>
    </div>
  `;

  // 3. Карточка "На этой неделе"
  if (weekPeople.length > 0) {
    topHtml += `
      <div class="card-block">
        <div class="card-header">На этой неделе</div>
        <div class="card-body">
          ${weekPeople.map(p => {
            const d = parseDate(p.birthDate);
            const isPast = d.day < todayDay;
            const dateLabel = `${d.day} ${getMonthShort(d.month)}`;
            return `
              <div class="row-item ${isPast ? 'past' : ''}" onclick="showPerson('${escapeHtml(p.fullName)}')">
                <span class="row-name">${escapeHtml(p.fullName)}</span>
                <span class="row-date">${dateLabel}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  app.innerHTML = `
    ${topHtml}
    <section id="allMonths" class="months-container"></section>
  `;
  renderAllMonths();
}

// ====== ФОРМА ДОБАВЛЕНИЯ ======
window.openAddForm = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'addModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Добавить именинника</h2>
        <button onclick="closeAddForm()" class="close-btn">&times;</button>
      </div>
      <form id="addForm" onsubmit="submitAddForm(event)">
        <div class="form-group">
          <label>Фамилия *</label>
          <input type="text" id="addSurname" required>
        </div>
        <div class="form-group">
          <label>Имя *</label>
          <input type="text" id="addName" required>
        </div>
        <div class="form-group">
          <label>Отчество</label>
          <input type="text" id="addPatronymic">
        </div>
        <div class="form-group">
          <label>Дата рождения *</label>
          <input type="date" id="addBirthDate" required>
        </div>
        <div class="form-group">
          <label>Telegram (username)</label>
          <input type="text" id="addTelegram" placeholder="@username">
        </div>
        <div class="form-group">
          <label>ID Telegram (без @)</label>
          <input type="text" id="addTelegramId" placeholder="123456789">
        </div>
        <div class="form-group">
          <label>Группа</label>
          <select id="addGroupSelect" onchange="toggleCustomGroup()">
            <option value="">— не указана —</option>
            <option value="Родственники">Родственники</option>
            <option value="Друзья">Друзья</option>
            <option value="Коллеги">Коллеги</option>
            <option value="Другое">Другое (ввести своё)</option>
          </select>
          <input type="text" id="addGroupCustom" placeholder="Своя группа" style="margin-top: 8px; display: none;">
        </div>
        <button type="submit" class="submit-btn" id="addSubmitBtn">Сохранить</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
};

window.toggleCustomGroup = function() {
  const select = document.getElementById('addGroupSelect');
  const customInput = document.getElementById('addGroupCustom');
  if (select.value === 'Другое') {
    customInput.style.display = 'block';
  } else {
    customInput.style.display = 'none';
    customInput.value = '';
  }
};

window.closeAddForm = function() {
  const modal = document.getElementById('addModal');
  if (modal) modal.remove();
};

window.submitAddForm = async function(event) {
  event.preventDefault();
  
  const btn = document.getElementById('addSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Сохранение...';

  const groupSelect = document.getElementById('addGroupSelect').value;
  const groupCustom = document.getElementById('addGroupCustom').value.trim();
  const finalGroup = groupSelect === 'Другое' ? groupCustom : groupSelect;

  const data = {
    surname: document.getElementById('addSurname').value.trim(),
    name: document.getElementById('addName').value.trim(),
    patronymic: document.getElementById('addPatronymic').value.trim(),
    birthDate: document.getElementById('addBirthDate').value,
    telegram: document.getElementById('addTelegram').value.trim(),
    telegramId: document.getElementById('addTelegramId').value.trim(),
    group: finalGroup
  };

  try {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addBirthday', userId: currentUserId, data })
    });
    const result = await resp.json();
    
    if (!result.ok) {
      alert('Ошибка: ' + (result.error || 'Не удалось сохранить'));
      btn.disabled = false;
      btn.textContent = 'Сохранить';
      return;
    }

    closeAddForm();
    loadBirthdays();
  } catch (e) {
    alert('Ошибка соединения: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Сохранить';
  }
};

// ====== ПОДРОБНАЯ КАРТОЧКА ======
window.showPerson = function(fullName) {
  const person = allPeople.find(p => p.fullName === fullName);
  if (!person) return;

  const app = document.getElementById('app');
  const today = new Date();
  const birthYear = parseDate(person.birthDate).year;
  const age = today.getFullYear() - birthYear;
  const greeting = generateGreeting(person);
  
  // Для перехода в чат используем ID, если есть, иначе username
  let tgLink = '#';
  if (person.telegramId) {
    tgLink = `tg://user?id=${person.telegramId}`;
  } else if (person.telegramUsername) {
    tgLink = `https://t.me/${person.telegramUsername.replace('@', '')}`;
  }

  app.innerHTML = `
    <div style="padding: 10px 0;">
      <button onclick="renderMain()" class="back-btn">← Назад</button>
    </div>
    <div class="today-card person-detail-card">
      <div class="name">${escapeHtml(person.fullName)}</div>
      <div class="age">${age} <span class="age-label">лет</span></div>
      <div class="birth-date">Дата рождения: ${formatDate(new Date(person.birthDate))}</div>
      ${person.group ? `<div class="birth-date">Группа: ${escapeHtml(person.group)}</div>` : ''}
      
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

// ====== ВСЕ 12 МЕСЯЦЕВ ======
function renderAllMonths() {
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();

  const container = document.getElementById('allMonths');
  if (!container) return;

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
      rows = `<div class="row-item empty-row">Нет именинников</div>`;
    } else {
      rows = people.map(p => {
        const d = parseDate(p.birthDate);
        const isPast = m < curMonth || (m === curMonth && d.day < curDay);
        const dateLabel = `${d.day} ${getMonthShort(m)}`;
        return `
          <div class="row-item ${isPast ? 'past' : ''}" onclick="showPerson('${escapeHtml(p.fullName)}')">
            <span class="row-name">${escapeHtml(p.fullName)}</span>
            <span class="row-date">${dateLabel}</span>
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
function formatShortName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const surname = parts[0];
  const initials = parts.slice(1).map(p => p[0] + '.').join('');
  return `${surname} ${initials}`;
}

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
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return allPeople.filter(p => {
    const d = parseDate(p.birthDate);
    const thisYear = today.getFullYear();
    let bd = new Date(thisYear, d.month - 1, d.day);
    return bd >= monday && bd <= sunday;
  }).sort((a, b) => {
    const da = parseDate(a.birthDate);
    const db = parseDate(b.birthDate);
    return da.day - db.day;
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

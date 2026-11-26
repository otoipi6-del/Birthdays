// ====== НАСТРОЙКИ ======
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwdahigdXXE8kfyvRcyStG4nBb2WbP37ST94JxvRHjPMdkYUSditZ_bWFimsAkjFbJapg/exec';
const BOT_USERNAME = 'QwikPassBot';
// =======================

let currentUserId = null;
let allPeople = [];

document.addEventListener('DOMContentLoaded', init);

function init() {
  initTheme();
  checkAuth();
}

// ====== АВТОРИЗАЦИЯ ======
function checkAuth() {
  const savedId = localStorage.getItem('tg_user_id');
  if (savedId) {
    currentUserId = parseInt(savedId);
    loadBirthdays();
  } else {
    showLogin();
  }
}

function showLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-container">
      <div class="login-title">Дни рождения</div>
      <div class="login-subtitle">Войдите через Telegram, чтобы продолжить</div>
      <div id="telegram-widget"></div>
    </div>
  `;
  document.getElementById('loading')?.classList.add('hidden');

  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', BOT_USERNAME);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-radius', '12');
  script.setAttribute('data-onauth', 'onTelegramAuth(user)');
  script.setAttribute('data-request-access', 'write');
  document.getElementById('telegram-widget').appendChild(script);

  window.onTelegramAuth = async function(user) {
    try {
      const resp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'login', authData: user })
      });
      
      const data = await resp.json();
      
      // Показываем ВЕСЬ ответ сервера
      alert('Полный ответ сервера:\n' + JSON.stringify(data, null, 2));
      
      // Если это не отладка, а реальный успех — продолжаем
      if (data.ok) {
        currentUserId = data.userId;
        localStorage.setItem('tg_user_id', data.userId);
        loadBirthdays();
      }
    } catch (e) {
      alert('Ошибка соединения: ' + e.message);
    }
  };
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
    render();
  } catch (e) {
    app.innerHTML = '<div class="error">' + e.message + '</div>';
  }
}

// ====== РЕНДЕР ======
function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="padding:20px;text-align:center;">
      <p>Авторизация успешна. ID: ${currentUserId}</p>
      <p>Загружено записей: ${allPeople.length}</p>
    </div>
  `;
}

// ====== ТЕМА ======
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  });
}

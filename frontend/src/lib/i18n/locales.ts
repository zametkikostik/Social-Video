export type LocaleCode =
  | 'en'
  | 'ru'
  | 'bg'
  | 'tr'
  | 'th'
  | 'zh'
  | 'fr'
  | 'it'
  | 'pt-BR'
  | 'es';

export const LOCALES: LocaleCode[] = [
  'en', 'ru', 'bg', 'tr', 'th', 'zh', 'fr', 'it', 'pt-BR', 'es',
];

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  ru: 'Русский',
  bg: 'Български',
  tr: 'Türkçe',
  th: 'ไทย',
  zh: '中文',
  fr: 'Français',
  it: 'Italiano',
  'pt-BR': 'Português (BR)',
  es: 'Español',
};

const en: Record<string, string> = {
  'nav.home': 'Home',
  'nav.shorts': 'Shorts',
  'nav.live': 'Live',
  'nav.upload': 'Upload',
  'nav.search': 'Search',
  'nav.tips': 'Tips',
  'nav.settings': 'Settings',
  'nav.login': 'Login',
  'nav.register': 'Sign up',
  'nav.notifications': 'Notifications',
  'nav.admin': 'Admin',
  'nav.playlists': 'Playlists',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.loginTitle': 'Sign in',
  'auth.registerTitle': 'Create account',
  'upload.title': 'Upload video',
  'upload.submit': 'Upload',
  'watch.like': 'Like',
  'watch.share': 'Share',
  'watch.comments': 'Comments',
  'watch.subscribe': 'Subscribe',
  'watch.subscribed': 'Subscribed',
  'tip.donate': 'Donate',
  'tip.thanks': 'Thank you!',
  'settings.title': 'Settings',
  'settings.payout': 'Payouts & donations',
  'settings.wallet': 'EVM address',
  'live.goLive': 'Go live',
  'live.viewers': 'Viewers',
  'shorts.title': 'Shorts',
  'search.placeholder': 'Search videos…',
  'admin.title': 'Admin Panel',
  'lang.label': 'Language',
};

function merge(over: Record<string, string>): Record<string, string> {
  return { ...en, ...over };
}

export const messages: Record<LocaleCode, Record<string, string>> = {
  en,
  ru: merge({
    'nav.home': 'Главная', 'nav.live': 'Эфир', 'nav.upload': 'Загрузить',
    'nav.search': 'Поиск', 'nav.tips': 'Донаты', 'nav.settings': 'Настройки',
    'nav.login': 'Вход', 'nav.register': 'Регистрация', 'nav.notifications': 'Уведомления',
    'nav.admin': 'Админ', 'nav.playlists': 'Плейлисты',
    'common.save': 'Сохранить', 'common.cancel': 'Отмена', 'common.loading': 'Загрузка…',
    'auth.password': 'Пароль', 'auth.username': 'Имя пользователя',
    'auth.loginTitle': 'Вход', 'auth.registerTitle': 'Регистрация',
    'upload.title': 'Загрузить видео', 'upload.submit': 'Загрузить',
    'watch.like': 'Нравится', 'watch.share': 'Поделиться', 'watch.comments': 'Комментарии',
    'watch.subscribe': 'Подписаться', 'watch.subscribed': 'Вы подписаны',
    'tip.donate': 'Донат', 'tip.thanks': 'Спасибо!',
    'settings.title': 'Настройки', 'settings.payout': 'Выплаты и донаты',
    'settings.wallet': 'EVM-адрес', 'live.goLive': 'В эфир', 'live.viewers': 'Зрители',
    'search.placeholder': 'Поиск видео…', 'admin.title': 'Админ-панель', 'lang.label': 'Язык',
  }),
  bg: merge({
    'nav.home': 'Начало', 'nav.live': 'На живо', 'nav.upload': 'Качване',
    'nav.search': 'Търсене', 'nav.tips': 'Дарения', 'nav.settings': 'Настройки',
    'nav.login': 'Вход', 'nav.register': 'Регистрация', 'common.save': 'Запази',
    'tip.donate': 'Дарение', 'lang.label': 'Език',
  }),
  tr: merge({
    'nav.home': 'Ana sayfa', 'nav.live': 'Canlı', 'nav.upload': 'Yükle',
    'nav.search': 'Ara', 'nav.tips': 'Bağış', 'nav.settings': 'Ayarlar',
    'nav.login': 'Giriş', 'nav.register': 'Kayıt', 'common.save': 'Kaydet',
    'tip.donate': 'Bağış', 'lang.label': 'Dil',
  }),
  th: merge({
    'nav.home': 'หน้าแรก', 'nav.live': 'สด', 'nav.upload': 'อัปโหลด',
    'nav.search': 'ค้นหา', 'nav.tips': 'โดเนท', 'nav.settings': 'ตั้งค่า',
    'nav.login': 'เข้าสู่ระบบ', 'tip.donate': 'โดเนท', 'lang.label': 'ภาษา',
  }),
  zh: merge({
    'nav.home': '首页', 'nav.shorts': '短视频', 'nav.live': '直播', 'nav.upload': '上传',
    'nav.search': '搜索', 'nav.tips': '打赏', 'nav.settings': '设置',
    'nav.login': '登录', 'nav.register': '注册', 'tip.donate': '打赏', 'lang.label': '语言',
  }),
  fr: merge({
    'nav.home': 'Accueil', 'nav.live': 'Live', 'nav.upload': 'Téléverser',
    'nav.search': 'Rechercher', 'nav.tips': 'Dons', 'nav.settings': 'Paramètres',
    'nav.login': 'Connexion', 'tip.donate': 'Donner', 'lang.label': 'Langue',
  }),
  it: merge({
    'nav.home': 'Home', 'nav.live': 'Live', 'nav.upload': 'Carica',
    'nav.search': 'Cerca', 'nav.tips': 'Donazioni', 'nav.settings': 'Impostazioni',
    'nav.login': 'Accedi', 'tip.donate': 'Dona', 'lang.label': 'Lingua',
  }),
  'pt-BR': merge({
    'nav.home': 'Início', 'nav.live': 'Ao vivo', 'nav.upload': 'Enviar',
    'nav.search': 'Buscar', 'nav.tips': 'Doações', 'nav.settings': 'Configurações',
    'nav.login': 'Entrar', 'tip.donate': 'Doar', 'lang.label': 'Idioma',
  }),
  es: merge({
    'nav.home': 'Inicio', 'nav.live': 'En vivo', 'nav.upload': 'Subir',
    'nav.search': 'Buscar', 'nav.tips': 'Donaciones', 'nav.settings': 'Ajustes',
    'nav.login': 'Entrar', 'tip.donate': 'Donar', 'lang.label': 'Idioma',
  }),
};

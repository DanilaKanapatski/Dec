const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'site.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    preview TEXT DEFAULT '',
    content TEXT DEFAULT '[]',
    cover_image TEXT DEFAULT '',
    category TEXT DEFAULT 'Статьи',
    reading_time TEXT DEFAULT '5 мин',
    published_at TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    cover_image TEXT DEFAULT '',
    place TEXT DEFAULT '',
    services TEXT DEFAULT '[]',
    city TEXT DEFAULT '',
    season TEXT DEFAULT '',
    year INTEGER DEFAULT 0,
    published_at TEXT DEFAULT '',
    about_text TEXT DEFAULT '',
    video_src TEXT DEFAULT '',
    tour_src TEXT DEFAULT '',
    presentation_src TEXT DEFAULT '',
    short_desc TEXT DEFAULT '',
    video_duration TEXT DEFAULT '',
    time_of_day TEXT DEFAULT '',
    exterior_renders TEXT DEFAULT '[]',
    interior_renders TEXT DEFAULT '[]',
    next_project_id INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// мягкая миграция для news (если БД уже была)
const newsCols = db.prepare("PRAGMA table_info(news)").all().map(c => c.name);
if (!newsCols.includes('category')) {
    db.exec(`ALTER TABLE news ADD COLUMN category TEXT DEFAULT 'Статьи'`);
}
if (!newsCols.includes('reading_time')) {
    db.exec(`ALTER TABLE news ADD COLUMN reading_time TEXT DEFAULT '5 мин'`);
}

// мягкая миграция для projects
const projCols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
if (!projCols.includes('next_project_id')) {
    db.exec(`ALTER TABLE projects ADD COLUMN next_project_id INTEGER DEFAULT 0`);
}
if (!projCols.includes('tour_src')) {
    db.exec(`ALTER TABLE projects ADD COLUMN tour_src TEXT DEFAULT ''`);
}
if (!projCols.includes('presentation_src')) {
    db.exec(`ALTER TABLE projects ADD COLUMN presentation_src TEXT DEFAULT ''`);
}
if (!projCols.includes('short_desc')) {
    db.exec(`ALTER TABLE projects ADD COLUMN short_desc TEXT DEFAULT ''`);
}
if (!projCols.includes('video_duration')) {
    db.exec(`ALTER TABLE projects ADD COLUMN video_duration TEXT DEFAULT ''`);
}
if (!projCols.includes('time_of_day')) {
    db.exec(`ALTER TABLE projects ADD COLUMN time_of_day TEXT DEFAULT ''`);
}

// Миграция: stat3=255 (Выполненных проектов), stat4=61 (3D роликов) — правильный порядок
// Если stat3=61 — значит была применена старая неверная миграция, откатываем
const stat3row = db.prepare("SELECT value FROM homepage_stats WHERE stat_key='stat3'").get();
if (stat3row && stat3row.value === '61') {
    db.prepare("UPDATE homepage_stats SET value='255', badge='+4 в апреле', label='Выполненных проектов' WHERE stat_key='stat3'").run();
    db.prepare("UPDATE homepage_stats SET value='61', badge='+1 в апреле', label='Сданных 3D роликов' WHERE stat_key='stat4'").run();
}

// админ
const adminExists = db.prepare('SELECT * FROM users WHERE login = ?').get('admin');
if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (login, password_hash) VALUES (?, ?)').run('admin', hash);
}

module.exports = db;

// Сидируем дефолтные значения цифр если таблица пустая
const statsEmpty = db.prepare('SELECT COUNT(*) as cnt FROM homepage_stats').get().cnt === 0;
if (statsEmpty) {
    const defaultStats = [
        { stat_key: 'stat1', value: '42',   badge: '+1 в апреле',  label: 'Девелопера выбрали нас',  sort_order: 1 },
        { stat_key: 'stat2', value: '1741', badge: '+67 в апреле', label: 'Сданных рендеров',         sort_order: 2 },
        { stat_key: 'stat3', value: '255',  badge: '+4 в апреле',  label: 'Выполненных проектов',     sort_order: 3 },
        { stat_key: 'stat4', value: '61',   badge: '+1 в апреле',  label: 'Сданных 3D роликов',       sort_order: 4 },
    ];
    const ins = db.prepare('INSERT INTO homepage_stats (stat_key, value, badge, label, sort_order) VALUES (?,?,?,?,?)');
    defaultStats.forEach(s => ins.run(s.stat_key, s.value, s.badge, s.label, s.sort_order));
}

// Сидируем дефолтных партнёров если таблица пустая
const partnersEmpty = db.prepare('SELECT COUNT(*) as cnt FROM partners').get().cnt === 0;
if (partnersEmpty) {
    const defaultPartners = [
        { name: 'Аквилон',  logo_src: '/assets/images/main-8.svg',  sort_order: 1 },
        { name: 'Dogma',    logo_src: '/assets/images/main-9.svg',  sort_order: 2 },
        { name: 'Семья',    logo_src: '/assets/images/main-10.svg', sort_order: 3 },
        { name: 'Иначе',    logo_src: '/assets/images/main-11.svg', sort_order: 4 },
        { name: 'СК10',     logo_src: '/assets/images/main-12.svg', sort_order: 5 },
        { name: 'GloraX',   logo_src: '/assets/images/main-13.svg', sort_order: 6 },
    ];
    const ins2 = db.prepare('INSERT INTO partners (name, logo_src, sort_order) VALUES (?,?,?)');
    defaultPartners.forEach(p => ins2.run(p.name, p.logo_src, p.sort_order));
}


const catCount = db.prepare('SELECT COUNT(*) as c FROM news_categories').get().c;
if (catCount === 0) {
    const defaults = ['Мероприятия', 'Статьи', 'Работы', 'Культура компании'];
    const ins = db.prepare('INSERT OR IGNORE INTO news_categories (name, sort_order) VALUES (?, ?)');
    defaults.forEach((n, i) => ins.run(n, i));
}

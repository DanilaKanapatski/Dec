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

CREATE TABLE IF NOT EXISTS homepage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_key TEXT UNIQUE NOT NULL,
    value TEXT DEFAULT '',
    badge TEXT DEFAULT '',
    label TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    logo_src TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
);
`);

const newsCols = db.prepare("PRAGMA table_info(news)").all().map(c => c.name);
if (!newsCols.includes('category')) db.exec(`ALTER TABLE news ADD COLUMN category TEXT DEFAULT 'Статьи'`);
if (!newsCols.includes('reading_time')) db.exec(`ALTER TABLE news ADD COLUMN reading_time TEXT DEFAULT '5 мин'`);

const projCols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
if (!projCols.includes('next_project_id')) db.exec(`ALTER TABLE projects ADD COLUMN next_project_id INTEGER DEFAULT 0`);
if (!projCols.includes('tour_src')) db.exec(`ALTER TABLE projects ADD COLUMN tour_src TEXT DEFAULT ''`);
if (!projCols.includes('presentation_src')) db.exec(`ALTER TABLE projects ADD COLUMN presentation_src TEXT DEFAULT ''`);
if (!projCols.includes('short_desc')) db.exec(`ALTER TABLE projects ADD COLUMN short_desc TEXT DEFAULT ''`);
if (!projCols.includes('video_duration')) db.exec(`ALTER TABLE projects ADD COLUMN video_duration TEXT DEFAULT ''`);
if (!projCols.includes('time_of_day')) db.exec(`ALTER TABLE projects ADD COLUMN time_of_day TEXT DEFAULT ''`);

const statsEmpty = db.prepare('SELECT COUNT(*) as cnt FROM homepage_stats').get().cnt === 0;
if (statsEmpty) {
    const ins = db.prepare('INSERT INTO homepage_stats (stat_key, value, badge, label, sort_order) VALUES (?,?,?,?,?)');
    [
        ['stat1', '42',   '+1 в апреле',  'Девелопера выбрали нас', 1],
        ['stat2', '1741', '+67 в апреле', 'Сданных рендеров',        2],
        ['stat3', '255',  '+4 в апреле',  'Выполненных проектов',    3],
        ['stat4', '61',   '+1 в апреле',  'Сданных 3D роликов',      4],
    ].forEach(r => ins.run(...r));
}

const partnersEmpty = db.prepare('SELECT COUNT(*) as cnt FROM partners').get().cnt === 0;
if (partnersEmpty) {
    const ins2 = db.prepare('INSERT INTO partners (name, logo_src, sort_order) VALUES (?,?,?)');
    [
        ['Аквилон', '/assets/images/main-8.svg',  1],
        ['Dogma',   '/assets/images/main-9.svg',  2],
        ['Семья',   '/assets/images/main-10.svg', 3],
        ['Иначе',   '/assets/images/main-11.svg', 4],
        ['СК10',    '/assets/images/main-12.svg', 5],
        ['GloraX',  '/assets/images/main-13.svg', 6],
    ].forEach(r => ins2.run(...r));
}

const catCount = db.prepare('SELECT COUNT(*) as c FROM news_categories').get().c;
if (catCount === 0) {
    const ins3 = db.prepare('INSERT OR IGNORE INTO news_categories (name, sort_order) VALUES (?, ?)');
    ['Мероприятия', 'Статьи', 'Работы', 'Культура компании'].forEach((n, i) => ins3.run(n, i));
}

const adminExists = db.prepare('SELECT * FROM users WHERE login = ?').get('admin');
if (!adminExists) {
    const hash = bcrypt.hashSync('Decard@2025!Admin', 10);
    db.prepare('INSERT INTO users (login, password_hash) VALUES (?, ?)').run('admin', hash);
}

module.exports = db;

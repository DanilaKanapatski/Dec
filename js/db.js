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

// админ
const adminExists = db.prepare('SELECT * FROM users WHERE login = ?').get('admin');
if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (login, password_hash) VALUES (?, ?)').run('admin', hash);
}

module.exports = db;

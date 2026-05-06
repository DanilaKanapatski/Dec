const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const db = require('./db');

const app = express();
const PORT = 3000;
const ROOT = path.join(__dirname, '..');

/* ==================== EMAIL ==================== */
const mailer = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 587,
    secure: true,
    auth: {
        user: 'info@decardstudio.ru',
        pass: 'OaeERssCq9LUN64Vj0W3'
    }
});

async function sendRequestEmail({ name, phone, message, source }) {
    const subject = `Новая заявка с сайта — ${source || 'форма'}`;
    const text = [
        `Имя: ${name || '—'}`,
        `Телефон: ${phone || '—'}`,
        message ? `Сообщение: ${message}` : null
    ].filter(Boolean).join('\n');

    await mailer.sendMail({
        from: '"Decard Сайт" <info@decardstudio.ru>',
        to: 'info@decardstudio.ru',
        subject,
        text
    });
}

const uploadsDir = path.join(ROOT, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
        cb(null, name);
    }
});

// изображения — до 20MB
const uploadImage = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
// видео — до 200MB
const uploadVideo = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });
// медиа (и видео и картинки, для 3D-ролика)
const uploadMedia = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(session({
    secret: 'super-secret-key-change-me',
    resave: false,
    saveUninitialized: false
}));

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(ROOT));

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    if (req.path.startsWith('/admin/api')) {
        return res.status(401).json({ error: 'Not authorized' });
    }
    return res.redirect('/admin/login.html');
}

function slugify(str) {
    const map = {
        а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',
        й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',
        у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',
        ь:'',э:'e',ю:'yu',я:'ya'
    };
    return String(str).toLowerCase().trim().split('')
        .map(ch => map[ch] !== undefined ? map[ch] : ch).join('')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
        .replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function safeJsonStringify(val, fallback = '[]') {
    try {
        if (typeof val === 'string') {
            JSON.parse(val); // валидная JSON-строка
            return val;
        }
        return JSON.stringify(val || JSON.parse(fallback));
    } catch (e) {
        return fallback;
    }
}

/* ==================== AUTH ==================== */
app.post('/admin/login', (req, res) => {
    const { login, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
    if (!user) return res.status(401).send('Неверный логин или пароль');
    if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).send('Неверный логин или пароль');
    }
    req.session.userId = user.id;
    res.redirect('/admin/index.html');
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login.html'));
});

/* ==================== ЗАЩИТА СТРАНИЦ АДМИНКИ ==================== */
const adminPages = ['index.html', 'news.html', 'editor.html', 'projects.html', 'project-editor.html', 'categories.html'];
adminPages.forEach(p => {
    app.get('/admin/' + p, requireAuth, (req, res) => {
        res.sendFile(path.join(ROOT, 'admin', p));
    });
});
app.get('/admin/', requireAuth, (req, res) => res.sendFile(path.join(ROOT, 'admin', 'index.html')));

/* ==================== UPLOAD API ==================== */
app.post('/admin/api/upload', requireAuth, uploadImage.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    res.json({ url: '/uploads/' + req.file.filename });
});

app.post('/admin/api/upload-multi', requireAuth, uploadImage.array('images', 50), (req, res) => {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Файлы не загружены' });
    res.json({ urls: req.files.map(f => '/uploads/' + f.filename) });
});

app.post('/admin/api/upload-media', requireAuth, uploadMedia.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    res.json({
        url: '/uploads/' + req.file.filename,
        type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
        mime: req.file.mimetype
    });
});

/* ==================== NEWS API (публичное + админ) ==================== */
app.get('/api/news', (req, res) => {
    const rows = db.prepare(`
        SELECT * FROM news WHERE status = 'published'
        ORDER BY datetime(COALESCE(NULLIF(published_at, ''), created_at)) DESC
    `).all();
    res.json(rows);
});

// Публичный API: все уникальные категории из опубликованных статей + из таблицы категорий
app.get('/api/news/categories', (req, res) => {
    const dbCats = db.prepare('SELECT name FROM news_categories ORDER BY sort_order, name').all().map(r => r.name);
    const newsCats = db.prepare(`SELECT DISTINCT category FROM news WHERE status='published' AND category != ''`).all().map(r => r.category);
    const all = [...dbCats, ...newsCats.filter(c => !dbCats.includes(c))];
    res.json(all);
});

// ВАЖНО: /api/news/categories должен быть ДО /api/news/:slug,
// иначе Express воспримет "categories" как slug
app.get('/api/news/:slug', (req, res) => {
    const row = db.prepare(`SELECT * FROM news WHERE slug = ? AND status = 'published'`).get(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
});

// Админ: список категорий
app.get('/admin/api/categories', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM news_categories ORDER BY sort_order, name').all());
});

// Админ: добавить категорию
app.post('/admin/api/categories', requireAuth, (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Название обязательно' });
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM news_categories').get().m || 0;
    try {
        const r = db.prepare('INSERT INTO news_categories (name, sort_order) VALUES (?, ?)').run(name.trim(), maxOrder + 1);
        res.json({ success: true, id: r.lastInsertRowid });
    } catch (e) {
        res.status(409).json({ error: 'Такая категория уже есть' });
    }
});

// Админ: удалить категорию
app.delete('/admin/api/categories/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM news_categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.get('/admin/api/news', requireAuth, (req, res) => {
    res.json(db.prepare(`SELECT * FROM news ORDER BY datetime(created_at) DESC`).all());
});

app.get('/admin/api/news/:id', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
});

app.post('/admin/api/news', requireAuth, (req, res) => {
    let { title, slug, preview, content, cover_image, category, reading_time, published_at, status } = req.body;
    slug = slug ? slugify(slug) : slugify(title);
    if (!slug) slug = 'article-' + Date.now();

    // Если slug уже занят — добавляем суффикс
    const base = slug;
    let attempt = 0;
    while (db.prepare('SELECT id FROM news WHERE slug = ?').get(slug)) {
        attempt++;
        slug = base + '-' + attempt;
    }

    try {
        const result = db.prepare(`
            INSERT INTO news (title, slug, preview, content, cover_image, category, reading_time, published_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            title, slug, preview || '',
            safeJsonStringify(content, '[]'),
            cover_image || '', category || 'Статьи', reading_time || '5 мин',
            published_at || '', status || 'draft'
        );
        res.json({ success: true, id: result.lastInsertRowid, slug });
    } catch (e) {
        console.error('news POST error:', e.message);
        res.status(400).json({ error: 'Ошибка создания статьи: ' + e.message });
    }
});

app.put('/admin/api/news/:id', requireAuth, (req, res) => {
    let { title, slug, preview, content, cover_image, category, reading_time, published_at, status } = req.body;
    slug = slug ? slugify(slug) : slugify(title);
    if (!slug) slug = 'article-' + Date.now();

    try {
        db.prepare(`
            UPDATE news SET title=?, slug=?, preview=?, content=?, cover_image=?,
                category=?, reading_time=?, published_at=?, status=?
            WHERE id = ?
        `).run(
            title, slug, preview || '',
            safeJsonStringify(content, '[]'),
            cover_image || '', category || 'Статьи', reading_time || '5 мин',
            published_at || '', status || 'draft', req.params.id
        );
        res.json({ success: true, slug });
    } catch (e) {
        res.status(400).json({ error: 'Ошибка обновления.' });
    }
});

app.delete('/admin/api/news/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

/* ==================== PROJECTS API ==================== */

// Публичное
app.get('/api/projects', (req, res) => {
    const rows = db.prepare(`
        SELECT * FROM projects WHERE status = 'published'
        ORDER BY sort_order ASC, datetime(COALESCE(NULLIF(published_at, ''), created_at)) DESC
    `).all();
    res.json(rows);
});

app.get('/api/projects/:slug', (req, res) => {
    const all = db.prepare(`
        SELECT * FROM projects WHERE status = 'published'
        ORDER BY sort_order ASC, datetime(COALESCE(NULLIF(published_at, ''), created_at)) DESC
    `).all();

    const idx = all.findIndex(p => p.slug === req.params.slug);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });

    const current = all[idx];
    let next = null;

    // сначала пробуем явно выбранный
    if (current.next_project_id) {
        const chosen = all.find(p => p.id === current.next_project_id && p.id !== current.id);
        if (chosen) next = chosen;
    }

    // если не выбран или не найден — следующий по порядку (с зацикливанием)
    if (!next) {
        const candidate = all[idx + 1] || all[0];
        if (candidate && candidate.id !== current.id) next = candidate;
    }

    const nextProject = next ? {
        title: next.title,
        slug: next.slug,
        cover_image: next.cover_image
    } : null;

    res.json({ ...current, nextProject });
});

// Админ
app.get('/admin/api/projects', requireAuth, (req, res) => {
    res.json(db.prepare(`SELECT * FROM projects ORDER BY sort_order ASC, datetime(created_at) DESC`).all());
});

app.get('/admin/api/projects/:id', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
});

app.post('/admin/api/projects', requireAuth, (req, res) => {
    let {
        title, slug, cover_image, place, services, city, season, year,
        published_at, about_text, video_src, tour_src, presentation_src, short_desc,
        video_duration, time_of_day,
        exterior_renders, interior_renders,
        next_project_id, status, sort_order
    } = req.body;

    slug = slug ? slugify(slug) : slugify(title);
    if (!slug) slug = 'project-' + Date.now();

    try {
        const result = db.prepare(`
            INSERT INTO projects (title, slug, cover_image, place, services, city, season, year,
                published_at, about_text, video_src, tour_src, presentation_src, short_desc,
                video_duration, time_of_day,
                exterior_renders, interior_renders,
                next_project_id, status, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            title, slug,
            cover_image || '', place || '',
            safeJsonStringify(services, '[]'),
            city || '', season || '', parseInt(year) || 0,
            published_at || '', about_text || '', video_src || '',
            tour_src || '', presentation_src || '', short_desc || '',
            video_duration || '', time_of_day || '',
            safeJsonStringify(exterior_renders, '[]'),
            safeJsonStringify(interior_renders, '[]'),
            parseInt(next_project_id) || 0,
            status || 'draft', parseInt(sort_order) || 0
        );
        res.json({ success: true, id: result.lastInsertRowid, slug });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: 'Ошибка создания. Slug должен быть уникальным.' });
    }
});

app.put('/admin/api/projects/:id', requireAuth, (req, res) => {
    let {
        title, slug, cover_image, place, services, city, season, year,
        published_at, about_text, video_src, tour_src, presentation_src, short_desc,
        video_duration, time_of_day,
        exterior_renders, interior_renders,
        next_project_id, status, sort_order
    } = req.body;

    slug = slug ? slugify(slug) : slugify(title);
    if (!slug) slug = 'project-' + Date.now();

    try {
        db.prepare(`
            UPDATE projects SET title=?, slug=?, cover_image=?, place=?, services=?, city=?, season=?,
                year=?, published_at=?, about_text=?, video_src=?, tour_src=?, presentation_src=?, short_desc=?,
                video_duration=?, time_of_day=?,
                exterior_renders=?, interior_renders=?, next_project_id=?, status=?, sort_order=?
            WHERE id = ?
        `).run(
            title, slug,
            cover_image || '', place || '',
            safeJsonStringify(services, '[]'),
            city || '', season || '', parseInt(year) || 0,
            published_at || '', about_text || '', video_src || '',
            tour_src || '', presentation_src || '', short_desc || '',
            video_duration || '', time_of_day || '',
            safeJsonStringify(exterior_renders, '[]'),
            safeJsonStringify(interior_renders, '[]'),
            parseInt(next_project_id) || 0,
            status || 'draft', parseInt(sort_order) || 0,
            req.params.id
        );
        res.json({ success: true, slug });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: 'Ошибка обновления.' });
    }
});

app.delete('/admin/api/projects/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

/* ==================== ГЛАВНАЯ: СТАТИСТИКА ==================== */

// Публичный endpoint
app.get('/api/homepage-stats', (req, res) => {
    res.json(db.prepare('SELECT * FROM homepage_stats ORDER BY sort_order ASC').all());
});

// Админ: получить все 4 блока
app.get('/admin/api/homepage-stats', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM homepage_stats ORDER BY sort_order ASC').all());
});

// Админ: сохранить все 4 блока разом
app.post('/admin/api/homepage-stats', requireAuth, (req, res) => {
    const stats = req.body; // массив [{stat_key, value, badge, label}]
    if (!Array.isArray(stats)) return res.status(400).json({ error: 'Expected array' });
    const upd = db.prepare('UPDATE homepage_stats SET value=?, badge=?, label=? WHERE stat_key=?');
    stats.forEach(s => upd.run(s.value || '', s.badge || '', s.label || '', s.stat_key));
    res.json({ success: true });
});

/* ==================== ГЛАВНАЯ: ПАРТНЁРЫ ==================== */

// Публичный endpoint
app.get('/api/partners', (req, res) => {
    res.json(db.prepare('SELECT * FROM partners ORDER BY sort_order ASC').all());
});

// Админ: получить список
app.get('/admin/api/partners', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM partners ORDER BY sort_order ASC').all());
});

// Админ: создать партнёра
app.post('/admin/api/partners', requireAuth, (req, res) => {
    const { name, logo_src } = req.body;
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM partners').get().m || 0;
    const result = db.prepare('INSERT INTO partners (name, logo_src, sort_order) VALUES (?,?,?)').run(name || '', logo_src || '', maxOrder + 1);
    res.json({ success: true, id: result.lastInsertRowid });
});

// Админ: обновить партнёра
app.put('/admin/api/partners/:id', requireAuth, (req, res) => {
    const { name, logo_src, sort_order } = req.body;
    db.prepare('UPDATE partners SET name=?, logo_src=?, sort_order=? WHERE id=?').run(name || '', logo_src || '', parseInt(sort_order) || 0, req.params.id);
    res.json({ success: true });
});

// Админ: удалить партнёра
app.delete('/admin/api/partners/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM partners WHERE id=?').run(req.params.id);
    res.json({ success: true });
});

/* ==================== ПУБЛИЧНЫЕ ФОРМЫ ==================== */

// Универсальный endpoint для всех форм сайта
app.post('/api/request', async (req, res) => {
    const { name, phone, message, source } = req.body || {};

    if (!name && !phone) {
        return res.status(400).json({ error: 'Укажите имя или телефон' });
    }

    try {
        await sendRequestEmail({ name, phone, message, source });
        res.json({ success: true });
    } catch (e) {
        console.error('Email error:', e.message);
        // Не фейлим запрос если почта не ушла — логируем и отвечаем успехом
        // чтобы пользователь видел успешную отправку
        return res.status(500).json({ error: e.message });
    }
});

/* ==================== СТАРТ ==================== */
app.listen(PORT, () => {
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`   Сайт:     http://localhost:${PORT}/`);
    console.log(`   Админка:  http://localhost:${PORT}/admin/login.html`);
    console.log(`   Логин:    admin / admin123\n`);
});

const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = 3000;
const ROOT = path.join(__dirname, '..');

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
const adminPages = ['index.html', 'news.html', 'editor.html', 'projects.html', 'project-editor.html'];
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

app.get('/api/news/:slug', (req, res) => {
    const row = db.prepare(`SELECT * FROM news WHERE slug = ? AND status = 'published'`).get(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
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
        res.status(400).json({ error: 'Ошибка создания. Slug должен быть уникальным.' });
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
        published_at, about_text, video_src, exterior_renders, interior_renders,
        next_project_id, status, sort_order
    } = req.body;

    slug = slug ? slugify(slug) : slugify(title);
    if (!slug) slug = 'project-' + Date.now();

    try {
        const result = db.prepare(`
            INSERT INTO projects (title, slug, cover_image, place, services, city, season, year,
                published_at, about_text, video_src, exterior_renders, interior_renders,
                next_project_id, status, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            title, slug,
            cover_image || '', place || '',
            safeJsonStringify(services, '[]'),
            city || '', season || '', parseInt(year) || 0,
            published_at || '', about_text || '', video_src || '',
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
        published_at, about_text, video_src, exterior_renders, interior_renders,
        next_project_id, status, sort_order
    } = req.body;

    slug = slug ? slugify(slug) : slugify(title);
    if (!slug) slug = 'project-' + Date.now();

    try {
        db.prepare(`
            UPDATE projects SET title=?, slug=?, cover_image=?, place=?, services=?, city=?, season=?,
                year=?, published_at=?, about_text=?, video_src=?, exterior_renders=?,
                interior_renders=?, next_project_id=?, status=?, sort_order=?
            WHERE id = ?
        `).run(
            title, slug,
            cover_image || '', place || '',
            safeJsonStringify(services, '[]'),
            city || '', season || '', parseInt(year) || 0,
            published_at || '', about_text || '', video_src || '',
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

/* ==================== СТАРТ ==================== */
app.listen(PORT, () => {
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`   Сайт:     http://localhost:${PORT}/`);
    console.log(`   Админка:  http://localhost:${PORT}/admin/login.html`);
    console.log(`   Логин:    admin / admin123\n`);
});

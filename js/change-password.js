// Запуск: node js/change-password.js НОВЫЙ_ПАРОЛЬ
// Пример: node js/change-password.js MyNewPassword123!

const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const newPassword = process.argv[2];

if (!newPassword || newPassword.length < 8) {
    console.error('❌ Укажи пароль (минимум 8 символов): node js/change-password.js НОВЫЙ_ПАРОЛЬ');
    process.exit(1);
}

const db = new Database(path.join(__dirname, '..', 'site.db'));
const hash = bcrypt.hashSync(newPassword, 12);
db.prepare('UPDATE users SET password_hash = ? WHERE login = ?').run(hash, 'admin');
console.log('✅ Пароль для admin успешно изменён!');
db.close();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect()
    .then(() => console.log('✅ Успешное подключение к базе данных'))
    .catch(err => console.error('❌ Ошибка подключения:', err));

// Маршрут проверки сервера
app.get('/', (req, res) => {
    res.send('Сервер работает!');
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'Нет доступа' });
    }

    jwt.verify(token.split(' ')[1], 'secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

const bcrypt = require('bcrypt');
// Регистрация пользователя
app.post('/register', async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    try {
        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Записываем пользователя в базу
        const result = await pool.query(
            'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, phone, hashedPassword, role]
        );

        res.status(201).json({ message: 'Пользователь зарегистрирован', user: result.rows[0] });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

const jwt = require('jsonwebtoken');

// Авторизация пользователя
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Введите email и пароль' });
    }

    try {
        // Ищем пользователя в базе
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const user = userResult.rows[0];

        // Проверяем пароль
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Создаём JWT токен
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, 'secret_key', { expiresIn: '24h' });

        res.json({ message: 'Успешный вход', token });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление нового ресторана
app.post('/restaurants/add', authenticateToken, async (req, res) => {
    const { name, address, phone, description, cuisine_type } = req.body;

    if (!name || !address || !phone) {
        return res.status(400).json({ error: 'Название, адрес и телефон обязательны' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO restaurants (name, address, phone, description, cuisine_type, owner_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, address, phone, description, cuisine_type, req.user.id]
        );
        res.status(201).json({ message: 'Ресторан добавлен', restaurant: result.rows[0] });
    } catch (error) {
        console.error('Ошибка добавления ресторана:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление столов в ресторан (ТОЛЬКО АДМИН)
app.post('/restaurants/:id/tables/add', authenticateToken, async (req, res) => {
    const restaurantId = req.params.id;
    const { seats, table_number } = req.body;

    if (!seats || !table_number) {
        return res.status(400).json({ error: 'Нужно указать количество мест и номер стола' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO tables (restaurant_id, seats, table_number, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [restaurantId, seats, table_number, 'available']
        );
        res.status(201).json({ message: 'Стол добавлен', table: result.rows[0] });
    } catch (error) {
        console.error('Ошибка добавления стола:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Бронирование стола
app.post('/book', authenticateToken, async (req, res) => {
    const { restaurant_id, table_id, reservation_time } = req.body;

    if (!restaurant_id || !table_id || !reservation_time) {
        return res.status(400).json({ error: 'Нужно указать ресторан, стол и время брони' });
    }

    try {
        // Проверяем, свободен ли стол
        const tableCheck = await pool.query('SELECT * FROM tables WHERE id = $1 AND status = $2', [table_id, 'available']);
        if (tableCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Этот стол уже забронирован' });
        }

        // Добавляем бронь
        const result = await pool.query(
            'INSERT INTO bookings (user_id, restaurant_id, table_id, reservation_time, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, restaurant_id, table_id, reservation_time, 'confirmed']
        );

        // Обновляем статус стола
        await pool.query('UPDATE tables SET status = $1 WHERE id = $2', ['reserved', table_id]);

        res.status(201).json({ message: 'Стол успешно забронирован', booking: result.rows[0] });
    } catch (error) {
        console.error('Ошибка бронирования:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Отмена бронирования (ТОЛЬКО ВЛАДЕЛЕЦ БРОНИ)
app.post('/cancel-booking', authenticateToken, async (req, res) => {
    const { booking_id } = req.body;

    if (!booking_id) {
        return res.status(400).json({ error: 'Нужно указать ID бронирования' });
    }

    try {
        // Проверяем, принадлежит ли бронирование пользователю
        const bookingCheck = await pool.query(
            'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
            [booking_id, req.user.id]
        );
        if (bookingCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа или бронирование не найдено' });
        }

        const tableId = bookingCheck.rows[0].table_id;

        // Удаляем бронирование
        await pool.query('DELETE FROM bookings WHERE id = $1', [booking_id]);

        // Освобождаем стол
        await pool.query('UPDATE tables SET status = $1 WHERE id = $2', ['available', tableId]);

        res.json({ message: 'Бронирование отменено' });
    } catch (error) {
        console.error('Ошибка отмены бронирования:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT id, name, email, phone, role FROM users WHERE id = $1', [req.user.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(userResult.rows[0]);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка ресторанов
app.get('/restaurants', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM restaurants ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения ресторанов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка столов в ресторане
app.get('/restaurants/:id/tables', async (req, res) => {
    const restaurantId = req.params.id;

    try {
        const result = await pool.query(
            'SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY table_number ASC',
            [restaurantId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения столов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение бронирований текущего пользователя
app.get('/my-bookings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.id, r.name AS restaurant_name, t.table_number, b.reservation_time, b.status 
             FROM bookings b
             JOIN restaurants r ON b.restaurant_id = r.id
             JOIN tables t ON b.table_id = t.id
             WHERE b.user_id = $1
             ORDER BY b.reservation_time DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения бронирований:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение бронирований ресторана (ТОЛЬКО ДЛЯ АДМИНА)
app.get('/restaurant/:id/bookings', authenticateToken, async (req, res) => {
    const restaurantId = req.params.id;

    try {
        // Проверяем, является ли пользователь владельцем ресторана
        const ownerCheck = await pool.query(
            'SELECT * FROM restaurants WHERE id = $1 AND owner_id = $2',
            [restaurantId, req.user.id]
        );
        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа' });
        }

        // Получаем бронирования ресторана
        const result = await pool.query(
            `SELECT b.id, u.name AS customer_name, t.table_number, b.reservation_time, b.status 
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN tables t ON b.table_id = t.id
             WHERE b.restaurant_id = $1
             ORDER BY b.reservation_time DESC`,
            [restaurantId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения бронирований ресторана:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
});

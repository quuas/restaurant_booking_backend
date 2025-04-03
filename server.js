require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

const path = require('path');

// Разрешаем доступ к файлам в папке /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    const { name, address, phone, description, cuisine_type, image_url } = req.body;

    if (!name || !address || !phone) {
        return res.status(400).json({ error: 'Название, адрес и телефон обязательны' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO restaurants (name, address, phone, description, cuisine_type, image_url, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, address, phone, description, cuisine_type, image_url, req.user.id]
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

// Бронирование стола (проверяем занятость)
// Бронирование стола (проверяем занятость)
app.post('/book', authenticateToken, async (req, res) => {
    const { restaurant_id, table_id, reservation_time } = req.body;
    const userId = req.user.id;

    const client = await pool.connect(); // подключаемся вручную для транзакции

    try {
        const formattedReservationTime = new Date(reservation_time).toISOString();

        await client.query('BEGIN'); // старт транзакции

        // Проверка на уже существующее бронирование
        const existingBooking = await client.query(
            `SELECT * FROM bookings WHERE table_id = $1 AND reservation_time = $2`,
            [table_id, formattedReservationTime]
        );

        if (existingBooking.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Этот столик уже забронирован." });
        }

        // Создаём бронирование
        const newBooking = await client.query(
            `INSERT INTO bookings (user_id, restaurant_id, table_id, reservation_time)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [userId, restaurant_id, table_id, formattedReservationTime]
        );

        // Обновляем статус столика (обязательно кастим в text!)
        await client.query(
            'UPDATE tables SET status = $1::text WHERE id = $2',
            ['booked', table_id]
        );

        await client.query('COMMIT'); // успех, сохраняем транзакцию

        res.json({ message: "Бронирование успешно!", booking: newBooking.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK'); // ошибка — откатываем всё
        console.error("Ошибка бронирования:", error);
        res.status(500).json({ error: "Ошибка сервера." });
    } finally {
        client.release(); // освобождаем соединение
    }
});



// Отмена бронирования (ТОЛЬКО ВЛАДЕЛЕЦ БРОНИ)
app.delete('/bookings/:id', authenticateToken, async (req, res) => {
    const bookingId = req.params.id;

    try {
        // Проверяем, принадлежит ли бронирование пользователю
        const bookingCheck = await pool.query(
            'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
            [bookingId, req.user.id]
        );

        if (bookingCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа или бронирование не найдено' });
        }

        const tableId = bookingCheck.rows[0].table_id;

        // Удаляем бронирование
        await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);

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

        // Получаем бронирования пользователя
        const bookingsResult = await pool.query(
            `SELECT b.id, r.name AS restaurant_name, t.table_number, b.reservation_time, b.status 
             FROM bookings b
             JOIN restaurants r ON b.restaurant_id = r.id
             JOIN tables t ON b.table_id = t.id
             WHERE b.user_id = $1
             ORDER BY b.reservation_time DESC`,
            [req.user.id]
        );

        res.json({
            user: userResult.rows[0],
            bookings: bookingsResult.rows,
        });
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
            `SELECT t.id, t.table_number, t.seats,
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.table_id = t.id) 
                        THEN 'booked' 
                        ELSE 'available' 
                    END AS status
            FROM tables t
            WHERE t.restaurant_id = $1
            ORDER BY t.table_number ASC`,
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
            `SELECT b.id, r.name AS restaurant_name, t.table_number, 
                    (b.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS reservation_time
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

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
});

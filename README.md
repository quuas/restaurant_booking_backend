# 🍽️ Restaurant Booking App

Мобильное приложение для бронирования столиков в ресторане. Разработано на **React Native (Expo)** с использованием **Node.js + Express** на бэкенде и базой данных **PostgreSQL**.

## 📱 Функционал

- Регистрация и авторизация пользователей
- Просмотр списка ресторанов
- Детали ресторана и описание
- Бронирование столиков (с проверкой доступности)
- Просмотр активных бронирований
- Отмена брони
- Сохранение токена входа (автоавторизация)

---

## 📂 Структура проекта

restaurant_booking_backend/
│
├── restaurant_booking_app/ # Мобильное приложение (React Native + Expo)
│ ├── screens/ # Экраны: Login, Register, Profile, Booking
│ ├── assets/ # Изображения и иконки
│ └── ...
│
├── server.js # Express backend
├── .env # Настройки (порт, токен, БД)
├── package.json # Скрипты и зависимости
└── ...

---

## 🚀 Установка и запуск

1. Клонируй репозиторий:
```
git clone https://github.com/your-username/restaurant-booking-app.git
cd restaurant-booking-app
```
2. Установи зависимости:
```
npm install
cd restaurant_booking_app
npm install
```
3. Вернись назад и запусти:
```
npm run start
```

⚙️ Технологии
React Native (Expo SDK 52)
Node.js + Express
PostgreSQL
React Navigation
Axios
AsyncStorage
JWT (аутентификация)

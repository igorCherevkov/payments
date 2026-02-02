# 1. Запуск проекта

## Клонирование

```
git clone https://github.com/igorCherevkov/payments.git
cd payments
```

## Настройка переменных окружения

`cp .env.example .env` - нужно создать таблицу и заполнить:

- DB_NAME
- DB_USER
- DB_PASSWORD

## API-роуты

- POST http://localhost:3000/api/payments

```
{
    "userId": 1,
    "subscriptionId": 1,
    "amount": -2,
    "description": "Оплата подписки за февраль",
    "orderId": "37"
}
```

- POST http://localhost:3000/api/payments/webhook

```
{
    "providerPaymentId": "ad995420-0bde-40f6-80d7-7c43f0303a0d", // который пришёл из 1 ручки
    "status": "succeeded",
    "errorMessage": null
}
```

# 2. Структура базы данных

### users

```
id BIGSERIAL PRIMARY KEY,
email TEXT UNIQUE NOT NULL,
password TEXT NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### subscriptions - тарифные планы

```
id BIGSERIAL PRIMARY KEY
plan TEXT NOT NULL
price INTEGER NOT NULL
duration INTEGER
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### payments - платежи

```
id BIGSERIAL PRIMARY KEY
user_id BIGSERIAL REFERENCES users(id)
subscription_id BIGSERIAL REFERENCES subscriptions(id)
provider TEXT NOT NULL
provider_payment_id TEXT UNIQUE
amount INTEGER NOT NULL
currency TEXT DEFAULT 'RUB'
status TEXT CHECK (status IN ('pending','succeeded','failed','canceled'))
error_message TEXT
description TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### user_subscriptions - подписки пользователей

```
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES users(id) ON DELETE CASCADE
subscription_id BIGINT REFERENCES subscriptions(id)
status TEXT CHECK (status IN ('active','inactive','canceled')) DEFAULT 'active'
started_at TIMESTAMP NOT NULL
ended_at TIMESTAMP NOT NULL
```

# 3. Потенциальные проблемы и их решения

- Идемпотентность платежей - защита от дублирования транзакций через уникальные provider_payment_id
- Согласованность данных - использование транзакций
- Конкурентный доступ - блокировки на уровне БД для обновления подписок

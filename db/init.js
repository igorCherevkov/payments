import pool from "./pool.js";

export const initDB = async () => {
  try {
    await pool.query(
      `
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    );

    await pool.query(
      `
        CREATE TABLE IF NOT EXISTS subscriptions (
            id BIGSERIAL PRIMARY KEY,
            plan TEXT NOT NULL,
            price INTEGER NOT NULL,
            duration INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    );

    await pool.query(
      `
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subscription_id BIGINT NOT NULL REFERENCES subscriptions(id),
            status TEXT CHECK (status IN ('active','inactive','canceled')) NOT NULL DEFAULT 'active',
            started_at TIMESTAMP NOT NULL,
            ended_at TIMESTAMP NOT NULL
        );
       `,
    );

    await pool.query(
      `
        CREATE TABLE IF NOT EXISTS payments (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGSERIAL NOT NULL REFERENCES users(id),
            subscription_id BIGSERIAL NOT NULL REFERENCES subscriptions(id),
            provider TEXT NOT NULL,
            provider_payment_id TEXT UNIQUE,
            amount INTEGER NOT NULL,
            currency TEXT DEFAULT 'RUB',
            status TEXT CHECK (status IN ('pending','succeeded','failed', 'canceled')) NOT NULL,
            error_message TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    );

    const { rows: userRows } = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      ["test@example.com"],
    );

    if (userRows.length === 0) {
      await pool.query(
        `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id`,
        ["test@example.com", "hashedpassword"],
      );
    }

    const { rows: subscriptionRows } = await pool.query(
      `SELECT id FROM subscriptions`,
    );

    if (subscriptionRows.length === 0) {
      await pool.query(
        `INSERT INTO subscriptions ( plan, price, duration, created_at)
         VALUES ($1, $2, 30, NOW())`,
        ["basic", 1000],
      );
    }

    console.log("db initialized successfully");
  } catch (error) {
    console.error("db init failed", error);
    process.exit(1);
  }
};

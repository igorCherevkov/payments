import { Router } from "express";
import pool from "../../../db/pool.js";
import { createPayment } from "../billing/billing.service.js";
import { PAYMENT_PROVIDER, PAYMENT_STATUS } from "../../constants/payments.js";
import { AppError } from "../../utils/AppErrors.js";

const router = Router();

router.post("/", async (req, res, next) => {
  const db = await pool.connect();

  try {
    const { userId, subscriptionId, amount, description, orderId } = req.body;

    const { rows: subscriptionRows } = await db.query(
      `SELECT price FROM subscriptions WHERE id = $1`,
      [subscriptionId],
    );

    if (!userId || !subscriptionId || !amount)
      throw new AppError("userId, subscriptionId and amount are required", 400);

    if (subscriptionRows.length === 0)
      throw new AppError("subscription not found", 404);

    const subscriptionPrice = subscriptionRows[0].price;

    if (amount < subscriptionPrice) {
      throw new AppError(`amount cannot be less than subscription price`, 400);
    }

    const payment = await createPayment({ amount, description, orderId });

    await db.query("BEGIN");

    await db.query(
      `
        INSERT INTO payments (
          user_id,
          subscription_id,
          provider,
          provider_payment_id,
          amount,
          status,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        userId,
        subscriptionId,
        PAYMENT_PROVIDER.MOCK,
        payment.providerPaymentId,
        amount,
        payment.status,
        payment.description,
      ],
    );

    await db.query("COMMIT");

    res.status(201).json(payment);
  } catch (error) {
    await db.query("ROLLBACK");
    next(error);
  } finally {
    db.release();
  }
});

router.post("/webhook", async (req, res, next) => {
  const db = await pool.connect();

  try {
    const { providerPaymentId, status, errorMessage } = req.body;

    if (!providerPaymentId || !status)
      throw new AppError("providerPaymentId and status are required", 400);

    await db.query("BEGIN");

    const payment = await db.query(
      `
        UPDATE payments
        SET status = $1,
            error_message = $2
        WHERE provider_payment_id = $3
        RETURNING *
      `,
      [status, errorMessage || null, providerPaymentId],
    );

    const updatedPayment = payment.rows[0];

    if (!updatedPayment) throw new AppError("payment not found", 404);

    if (status === PAYMENT_STATUS.SUCCEEDED) {
      const subscriptionResult = await db.query(
        `SELECT duration FROM subscriptions WHERE id = $1`,
        [updatedPayment.subscription_id],
      );

      if (!subscriptionResult.rows[0])
        throw new AppError("subcription not found", 404);

      const durationDays = subscriptionResult.rows[0].duration;

      if (!durationDays) throw new AppError("subscription error", 400);

      const now = new Date();
      const endedAt = new Date(now);
      endedAt.setDate(now.getDate() + durationDays);

      await db.query(
        `
          INSERT INTO user_subscriptions (user_id, subscription_id, started_at, ended_at, status)
          VALUES ($1, $2, $3, $4, 'active')
        `,
        [updatedPayment.user_id, updatedPayment.subscription_id, now, endedAt],
      );
    }

    await db.query("COMMIT");

    res.status(200).json(updatedPayment);
  } catch (error) {
    await db.query("ROLLBACK");
    next(error);
  } finally {
    db.release();
  }
});

export default router;

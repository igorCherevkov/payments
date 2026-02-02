import express from "express";
import paymentsRouter from "./modules/payments/payments.route.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json());

app.use("/api/payments", paymentsRouter);

app.use(errorMiddleware);

export default app;

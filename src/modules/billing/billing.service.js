import { v4 as uuidv4 } from "uuid";
import { AppError } from "../../utils/AppErrors.js";

export const createPayment = async ({ amount, description, orderId }) => {
  if (!amount || amount <= 0) throw new AppError("invalid amount", 400);

  const providerPaymentId = uuidv4();

  const payment = {
    status: "pending",
    amount: {
      value: amount.toFixed(2),
      currency: "RUB",
    },
    description: description || `Заказ №${orderId || providerPaymentId}`,
    recipient: {
      account_id: "152368",
      gateway_id: "459728",
    },
    created_at: new Date().toISOString(),
    confirmation: {
      type: "redirect",
      confirmation_url: `https://mock-bank/checkout/payments/${providerPaymentId}`,
    },
    test: true,
    paid: false,
    refundable: false,
    metadata: {
      order_id: orderId || null,
    },
    providerPaymentId,
  };

  return payment;
};

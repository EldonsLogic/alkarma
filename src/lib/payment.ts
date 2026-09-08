export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  redirectUrl?: string;
}

export interface PaymentProvider {
  name: string;
  createPayment(params: {
    orderId: string;
    amount: number;
    currency: "EGP";
    customerEmail: string;
    returnUrl: string;
  }): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
}

// Placeholder — swap when a gateway is chosen (Paymob, Fawry, Stripe, etc.)
class PlaceholderPayment implements PaymentProvider {
  name = "placeholder";

  async createPayment(): Promise<PaymentResult> {
    return { success: true, transactionId: `PLH-${Date.now()}` };
  }

  async verifyPayment(id: string): Promise<PaymentResult> {
    return { success: true, transactionId: id };
  }
}

export const paymentProvider: PaymentProvider = new PlaceholderPayment();

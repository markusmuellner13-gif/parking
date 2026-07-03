export type PaymentMethodRow = {
  id: string;
  type: "card" | "paypal" | "googlepay" | "applepay";
  brand: string | null;
  last4: string | null;
  email: string | null;
  isDefault: boolean;
};

export function mapPaymentRow(r: Record<string, unknown>): PaymentMethodRow {
  return {
    id: String(r.id),
    type: String(r.type) as PaymentMethodRow["type"],
    brand: r.brand ? String(r.brand) : null,
    last4: r.last4 ? String(r.last4) : null,
    email: r.email ? String(r.email) : null,
    isDefault: Number(r.is_default) === 1,
  };
}

export function paymentLabel(m: PaymentMethodRow): string {
  switch (m.type) {
    case "card": return `${m.brand ?? "Karte"} •••• ${m.last4 ?? "????"}`;
    case "paypal": return `PayPal${m.email ? ` (${m.email})` : ""}`;
    case "googlepay": return "Google Pay";
    case "applepay": return "Apple Pay";
  }
}

export function luhnValid(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): string {
  if (/^4/.test(num)) return "Visa";
  if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  return "Karte";
}

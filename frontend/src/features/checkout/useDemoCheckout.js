import { useState } from 'react';

const RECEIPT_KEY = 'dev-burguer-demo-concluida';
export const DELIVERY_FEE_CENTS = 500;
export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Dinheiro' },
  { id: 'card', label: 'Cartão Crédito/Débito' },
  { id: 'pix', label: 'PIX' },
];

function readReceipt() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECEIPT_KEY) || 'null');
    return value?.demo === true &&
      Number.isSafeInteger(value.totalCents) && value.totalCents > 0 &&
      Number.isSafeInteger(value.count) && value.count > 0 &&
      PAYMENT_METHODS.some((method) => method.id === value.paymentMethod)
      ? value : null;
  } catch {
    return null;
  }
}

/** Demonstration state only: never calls the orders API or a payment provider. */
export function useDemoCheckout() {
  const [address, setAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [receipt, setReceipt] = useState(readReceipt);

  function complete({ totalCents, count }) {
    const result = { demo: true, totalCents, count, paymentMethod };
    setReceipt(result);
    try {
      // No address or card data is persisted. The demo result survives a tab reload.
      sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(result));
    } catch {
      // The flow continues in memory if browser storage is unavailable.
    }
  }

  return { address, setAddress, paymentMethod, setPaymentMethod, receipt, complete };
}

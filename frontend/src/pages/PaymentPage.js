import React, { useState } from 'react';

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert('Failed to load Razorpay SDK');
      setLoading(false);
      return;
    }

    const orderRes = await fetch('/api/payment/order', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 199 }),
    });
    const orderData = await orderRes.json();
    if (!orderData.order) {
      alert(orderData.error || 'Order creation failed');
      setLoading(false);
      return;
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: orderData.order.amount,
      currency: orderData.order.currency,
      order_id: orderData.order.id,
      name: 'MockTest Arena',
      description: 'Test payment',
      handler: async function (response) {
        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          alert('Payment successful');
        } else {
          alert('Payment verification failed');
        }
      },
      prefill: {
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
    setLoading(false);
  };

  return (
    <div className="payment-page">
      <h1>Payment Test Page</h1>
      <p>Use this page to test Razorpay checkout flow.</p>
      <button onClick={handlePayment} className="btn btn-primary" disabled={loading}>
        {loading ? 'Loading…' : 'Pay ₹199'}
      </button>
    </div>
  );
}
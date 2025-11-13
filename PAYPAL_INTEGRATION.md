# PayPal Integration Guide

This document describes the PayPal payment integration implemented in this project using PayPal Checkout.

## Overview

The PayPal integration follows PayPal's recommended checkout flow with both client-side and server-side components:

1. **Client-side**: PayPal JavaScript SDK renders checkout buttons
2. **Server-side**: Backend APIs create and capture orders using PayPal REST APIs
3. **Database**: Order is created and stored after successful payment capture

## Prerequisites

You need a PayPal business account to get your credentials. If you don't have one:

1. Go to [PayPal Business Signup](https://www.paypal.com/bizsignup/)
2. Create your business account
3. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
4. Log in with your business account credentials
5. Navigate to **Apps & Credentials**
6. Make sure you're in the **Sandbox** tab for testing
7. Copy your **Client ID** and **Client Secret**

## Setup Instructions

### 1. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# PayPal Configuration
# Get your Client ID and Secret from https://developer.paypal.com/dashboard/
# 1. Log in to your PayPal business account
# 2. Go to Apps & Credentials in the Developer Dashboard
# 3. Make sure you're in the Sandbox tab for testing
# 4. Copy your Client ID (for frontend)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID_HERE
# 5. Copy your Client Secret (for backend - NEVER expose to frontend)
PAYPAL_CLIENT_SECRET=YOUR_PAYPAL_CLIENT_SECRET_HERE
# Use sandbox for testing (true) or production (false)
NEXT_PUBLIC_PAYPAL_SANDBOX=true
```

### 2. Install Dependencies

The required dependency is already added to `package.json`:

```bash
npm install
```

## How It Works

### Integration Flow

```
┌──────────┐         ┌─────────┐         ┌─────────┐         ┌────────┐
│  Client  │         │Frontend │         │ Backend │         │ PayPal │
└────┬─────┘         └────┬────┘         └────┬────┘         └───┬────┘
     │                    │                    │                   │
     │  Select PayPal     │                    │                   │
     ├───────────────────>│                    │                   │
     │                    │                    │                   │
     │  Click Pay Button  │                    │                   │
     ├───────────────────>│                    │                   │
     │                    │  Create Order      │                   │
     │                    ├───────────────────>│                   │
     │                    │                    │  POST /orders     │
     │                    │                    ├──────────────────>│
     │                    │                    │                   │
     │                    │                    │  Order Created    │
     │                    │<───────────────────┤<──────────────────┤
     │                    │  Return Order ID   │                   │
     │  Approve Order     │<───────────────────┤                   │
     ├───────────────────>│                    │                   │
     │  (PayPal Popup)    │                    │                   │
     │                    │  Capture Payment   │                   │
     │                    ├───────────────────>│                   │
     │                    │                    │ POST /capture     │
     │                    │                    ├──────────────────>│
     │                    │                    │                   │
     │                    │                    │ Payment Captured  │
     │                    │<───────────────────┤<──────────────────┤
     │                    │  Capture Success   │                   │
     │                    │                    │                   │
     │                    │  Create DB Order   │                   │
     │                    ├───────────────────>│                   │
     │                    │                    │                   │
     │  Redirect Complete │<───────────────────┤                   │
     ├───────────────────>│                    │                   │
```

### Key Components

#### 1. Payment Page (`app/payment/page.tsx`)

The payment page renders:
- **Card Payment Option**: Traditional form submission to EasyPay
- **PayPal Option**: PayPal SDK buttons that handle the payment flow

When PayPal is selected:
1. The PayPal JavaScript SDK is loaded from `https://www.paypal.com/sdk/js`
2. PayPal buttons are rendered in the `#paypal-button-container` div
3. User clicks the PayPal button to approve the payment
4. The flow is handled entirely by PayPal's SDK

#### 2. Create Order API (`app/api/payment/paypal/create-order/route.ts`)

**Endpoint**: `POST /api/payment/paypal/create-order`

**Request Body**:
```json
{
  "amount": 50000,
  "currency": "KRW",
  "orderId": "ord-1234567890-abc123",
  "items": [
    {
      "name": "Product Name",
      "sku": "product-id",
      "quantity": "1",
      "unit_amount": {
        "currency_code": "KRW",
        "value": "50000"
      }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "orderId": "PAYPAL_ORDER_ID",
  "message": "Order created successfully"
}
```

**What it does**:
1. Authenticates with PayPal API using OAuth 2.0 (Client Credentials flow)
2. Creates an order with the provided amount and items
3. Returns the PayPal order ID for the client to use in the approval flow

#### 3. Capture Order API (`app/api/payment/paypal/capture-order/route.ts`)

**Endpoint**: `POST /api/payment/paypal/capture-order`

**Request Body**:
```json
{
  "orderId": "PAYPAL_ORDER_ID"
}
```

**Response**:
```json
{
  "success": true,
  "orderId": "PAYPAL_ORDER_ID",
  "status": "COMPLETED",
  "captureId": "CAPTURE_ID",
  "paymentId": "CAPTURE_ID",
  "amount": "50000",
  "currency": "KRW",
  "message": "Payment captured successfully"
}
```

**What it does**:
1. Authenticates with PayPal API
2. Captures the payment for the given order ID
3. Returns transaction details
4. After this, the order is created in the database and email is sent

## PayPal Button Configuration

The PayPal buttons are configured with the following options in `payment/page.tsx`:

```typescript
paypal.Buttons({
  createOrder: async () => {
    // Create order on backend
    // Return PayPal Order ID
  },
  
  onApprove: async (data) => {
    // Capture payment
    // Create order in database
    // Send confirmation email
    // Redirect to complete page
  },
  
  onError: (error) => {
    // Handle errors
  },
  
  onCancel: () => {
    // Handle cancellation
  }
})
```

## Testing

### In Sandbox Mode

1. Open the payment page and select **PayPal** as payment method
2. Click the PayPal button
3. Log in with a sandbox personal account (buyer):
   - Email: sb-xxxxx@personal.example.com
   - Password: Check your PayPal Developer account's sandbox section
4. Review the order and click "Pay Now"
5. You should be redirected to the order complete page
6. The order should be created in your database

### Sandbox Credentials

You can view and manage sandbox accounts in your PayPal Developer Dashboard:
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Click **Apps & Credentials** → **Sandbox**
3. You'll see your sandbox business and personal accounts

### Test Cards

You can also test with credit cards in sandbox mode. Generate test cards using the [Card Generator](https://developer.paypal.com/tools/sandbox/card-testing/).

## Going to Production

To use PayPal in production:

1. **Get Live Credentials**:
   - Log in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
   - Click **Apps & Credentials** → **Live** tab
   - Copy your live **Client ID** and **Client Secret**

2. **Update Environment Variables**:
   ```bash
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_client_secret
   NEXT_PUBLIC_PAYPAL_SANDBOX=false
   ```

3. **Review Security**:
   - ✅ Client Secret is NOT exposed to frontend (only used on backend)
   - ✅ Orders are created and captured server-side
   - ✅ Order verification includes amount validation
   - ✅ All sensitive data is stored securely

4. **Test in Production Sandbox** (recommended first):
   - Keep `NEXT_PUBLIC_PAYPAL_SANDBOX=true`
   - Use live credentials with PayPal's sandbox API
   - This allows real testing without processing actual payments

## Currency Support

The integration is currently configured for **KRW (Korean Won)**. To support other currencies:

1. Update the currency in `app/payment/page.tsx`:
   ```typescript
   src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`}
   ```

2. Update the API endpoints to accept the currency parameter

3. Ensure all amounts are properly formatted for the currency's decimal places

## Error Handling

The integration includes error handling for:

- **Missing credentials**: Shows error message if Client ID not configured
- **Network errors**: Displays user-friendly error messages
- **PayPal API errors**: Logs detailed error information and shows to user
- **Payment capture failures**: Allows user to retry or cancel

Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "PayPal 로딩 실패" | SDK failed to load | Check Client ID and internet connection |
| "Order creation failed" | Invalid request data | Check amount and item data |
| "Payment capture failed" | Order expired or already captured | User should start new payment |
| "주문 생성 중 오류" | Database error | Check logs and database connection |

## Security Considerations

✅ **What we do right**:
- Client Secret is NOT exposed to the frontend
- All API calls use HTTPS
- Orders are verified server-side before capture
- Amount is validated before creating database order
- User authentication happens on PayPal's secure servers

⚠️ **What you should monitor**:
- Keep Client Secret secure (use environment variables)
- Don't commit `.env.local` to version control
- Rotate credentials periodically
- Monitor PayPal webhook events for disputes
- Log all payment transactions
- Implement rate limiting on payment endpoints

## Webhooks (Optional)

PayPal can send webhook events for payment notifications. To implement:

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Create an app
3. Subscribe to webhook events:
   - `CHECKOUT.ORDER.COMPLETED`
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
4. Create an endpoint to handle webhooks:
   ```typescript
   POST /api/payment/paypal/webhook
   ```
5. Verify webhook signatures for security

See [PayPal Webhook Documentation](https://developer.paypal.com/docs/api/webhooks/) for details.

## Troubleshooting

### PayPal Button Not Showing

1. Check that `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set
2. Open browser console (F12) for JavaScript errors
3. Verify PayPal SDK is loaded: look for `window.paypal` in console
4. Check that `#paypal-button-container` div exists in DOM

### Payment Not Capturing

1. Check backend logs for API errors
2. Verify Client Secret is correct
3. Ensure order ID matches between create and capture calls
4. Check that amount is in correct format (2 decimal places)

### Order Not Creating in Database

1. Check database connection
2. Verify order data matches schema
3. Check for unique constraint violations
4. Review email service logs

## Resources

- [PayPal Developer Docs](https://developer.paypal.com/docs/)
- [PayPal JavaScript SDK Reference](https://developer.paypal.com/sdk/js/reference/)
- [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)
- [PayPal Sandbox Testing](https://developer.paypal.com/tools/sandbox/)
- [PayPal Support](https://developer.paypal.com/support/)

## Related Files

- `app/payment/page.tsx` - Payment page with PayPal button UI
- `app/api/payment/paypal/create-order/route.ts` - Create order API
- `app/api/payment/paypal/capture-order/route.ts` - Capture payment API
- `.env.local` - Environment variables (PayPal credentials)
- `lib/orders.ts` - Database order creation
- `lib/email.ts` - Email service for confirmations

## Support

For issues or questions:
1. Check this documentation first
2. Review [PayPal Developer Docs](https://developer.paypal.com/docs/)
3. Check browser console for JavaScript errors
4. Check server logs for API errors
5. Contact PayPal support if issue is with their API

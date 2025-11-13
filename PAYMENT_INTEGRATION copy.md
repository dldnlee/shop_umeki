# EasyPay Payment Integration Guide

This document describes the secure EasyPay payment integration implemented in this project.

## Overview

The payment system follows EasyPay's recommended three-step integration flow with server-side verification to ensure security and prevent payment fraud.

## Integration Flow

```
┌─────────┐      ┌──────────────┐      ┌──────────┐      ┌─────────────┐
│  User   │      │   Frontend   │      │ Backend  │      │  EasyPay    │
└────┬────┘      └──────┬───────┘      └────┬─────┘      └──────┬──────┘
     │                  │                   │                    │
     │  Submit Order    │                   │                    │
     ├─────────────────>│                   │                    │
     │                  │                   │                    │
     │                  │ 1. Register Payment                    │
     │                  ├──────────────────>│                    │
     │                  │                   │                    │
     │                  │                   │  2. Create Transaction
     │                  │                   ├───────────────────>│
     │                  │                   │                    │
     │                  │                   │  3. Return authPageUrl
     │                  │                   │<───────────────────┤
     │                  │                   │                    │
     │                  │  Return URL       │                    │
     │                  │<──────────────────┤                    │
     │                  │                   │                    │
     │  Open Payment Window                 │                    │
     │<─────────────────┤                   │                    │
     │                  │                   │                    │
     │  4. Complete Payment                                      │
     ├──────────────────────────────────────────────────────────>│
     │                  │                   │                    │
     │  5. Payment Result                                        │
     │<──────────────────────────────────────────────────────────┤
     │                  │                   │                    │
     │  Redirect to returnUrl               │                    │
     ├─────────────────>│                   │                    │
     │                  │                   │                    │
     │                  │ 6. Verify Payment │                    │
     │                  ├──────────────────>│                    │
     │                  │                   │                    │
     │                  │                   │ 7. Approval Request
     │                  │                   ├───────────────────>│
     │                  │                   │                    │
     │                  │                   │ 8. Approval Response
     │                  │                   │<───────────────────┤
     │                  │                   │                    │
     │                  │ Verification OK   │                    │
     │                  │<──────────────────┤                    │
     │                  │                   │                    │
     │                  │ 9. Create Order in DB                  │
     │                  ├──────────────────>│                    │
     │                  │                   │                    │
     │  Order Complete  │                   │                    │
     │<─────────────────┤                   │                    │
```

## Three-Step Process

### Step 1: Payment Registration

**Endpoint:** `POST /api/payment/register`

**Purpose:** Register a payment transaction with EasyPay and obtain a payment page URL.

**Request:**
```json
{
  "amount": 10000,
  "orderInfo": {
    "goodsName": "Product Name"
  }
}
```

**Response:**
```json
{
  "success": true,
  "authPageUrl": "https://pgapi.easypay.co.kr/...",
  "shopOrderNo": "20250102123456789",
  "message": "Payment registration successful"
}
```

**Implementation:** [app/api/payment/register/route.ts](app/api/payment/register/route.ts)

### Step 2: Payment Window Call

**Purpose:** Open the EasyPay payment interface where the user completes the payment.

**Method:**
- Opens in popup window (preferred)
- Falls back to redirect if popup is blocked

**Implementation:** [app/payment/page.tsx:128-156](app/payment/page.tsx#L128-L156) in `requestPayment()` function

### Step 3: Payment Approval & Verification

**Endpoint:** `POST /api/payment/approve`

**Purpose:** Verify the payment with EasyPay's server to ensure legitimacy before creating the order.

**Why this is critical:**
- URL parameters can be manipulated by users
- Server-side verification ensures the payment actually succeeded
- Prevents fraudulent orders from being created

**Request:**
```json
{
  "shopOrderNo": "20250102123456789",
  "amount": 10000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shopOrderNo": "20250102123456789",
    "paymentId": "EP12345678",
    "amount": 10000,
    "authDate": "20250102",
    "authTime": "143055",
    "payMethodType": "11",
    "payMethodTypeName": "신용카드"
  },
  "message": "Payment approved successfully"
}
```

**Implementation:** [app/api/payment/approve/route.ts](app/api/payment/approve/route.ts)

## Security Features

1. **Server-side payment registration**: Sensitive credentials stay on the server
2. **Order number matching**: Verifies the returned order number matches the stored one
3. **Server-side approval verification**: Confirms payment with EasyPay before creating order
4. **Amount verification**: Ensures the paid amount matches the expected amount

## API Routes

### Payment Registration
- **File:** `app/api/payment/register/route.ts`
- **Method:** POST
- **Purpose:** Register payment with EasyPay

### Payment Approval
- **File:** `app/api/payment/approve/route.ts`
- **Methods:** POST (approve), GET (query status)
- **Purpose:** Verify payment completion

### Payment Callback
- **File:** `app/api/payment/callback/route.ts`
- **Methods:** POST (server callback), GET (user redirect)
- **Purpose:** Handle payment completion callbacks

## Environment Variables

Required variables in `.env.local`:

```bash
# EasyPay Configuration
EASYPAY_MERCHANT_ID=GD003712                    # Your merchant ID
EASYPAY_API_KEY=easypay!KICCTEST               # API key (test mode)
EASYPAY_TEST_MODE=true                         # Set false for production

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000     # Your app URL
```

See [.env.local.example](.env.local.example) for more details.

## Frontend Implementation

### Payment Flow in page.tsx

1. **User submits order** → Stores order data in sessionStorage
2. **Calls `/api/payment/register`** → Gets payment URL
3. **Opens payment window** → User completes payment
4. **EasyPay redirects back** → URL contains payment result
5. **Verifies with `/api/payment/approve`** → Server confirms payment
6. **Creates order** → Only after successful verification

**Key file:** [app/payment/page.tsx](app/payment/page.tsx)

### Important Code Sections

- **Payment callback handler:** [app/payment/page.tsx:44-126](app/payment/page.tsx#L44-L126)
- **Payment request function:** [app/payment/page.tsx:128-156](app/payment/page.tsx#L128-L156)

## Testing

### Test Mode
The integration is currently configured for EasyPay's test environment:
- Test API endpoint: `https://pgapi.easypay.co.kr/api/ep9/trades/webpay`
- Test merchant ID: `GD003712`
- Test API key: `easypay!KICCTEST`

### Test Cards
Refer to EasyPay documentation for test card numbers and scenarios.

## Production Deployment

Before going to production:

1. **Update environment variables:**
   ```bash
   EASYPAY_MERCHANT_ID=<your_production_merchant_id>
   EASYPAY_API_KEY=<your_production_api_key>
   EASYPAY_TEST_MODE=false
   NEXT_PUBLIC_BASE_URL=https://your-domain.com
   ```

2. **Verify API endpoints:**
   - Production API may use different endpoints
   - Confirm with EasyPay documentation

3. **Configure SSL certificates** (if required):
   - Some payment gateways require SSL certificates
   - Store certificate paths in environment variables

4. **Set up proper error handling:**
   - Log payment failures
   - Set up monitoring and alerts

5. **Test thoroughly:**
   - Test all payment scenarios
   - Verify callback handling
   - Check order creation flow

## Important Notes

⚠️ **Never expose sensitive credentials in client-side code**
- All API keys and merchant secrets must stay server-side
- Use environment variables for configuration

⚠️ **Always verify payments server-side**
- Never trust client-side payment confirmations alone
- Always call the approval API before creating orders

⚠️ **Handle edge cases:**
- Popup blockers
- Network failures during callback
- Duplicate payment attempts
- User closing payment window

## Additional Resources

- [EasyPay Developer Documentation](https://developer.easypay.co.kr/)
- [EasyPay Test Environment Guide](https://developer.easypay.co.kr/test)
- [EasyPay API Reference](https://developer.easypay.co.kr/integrated-api)

## Support

For issues related to:
- **EasyPay integration:** Contact KICC support
- **Application code:** Check this repository's issues

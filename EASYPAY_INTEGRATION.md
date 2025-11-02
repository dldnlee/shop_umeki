# EasyPay Integration Guide

This document explains how the EasyPay payment system is integrated into the shop_umeki application.

## Overview

The integration uses EasyPay's WebPay API for payment processing. The flow supports both popup and redirect payment methods.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# EasyPay Configuration
EASYPAY_MALL_ID=your_mall_id_here
EASYPAY_API_KEY=your_api_key_here
EASYPAY_API_URL=https://testpgapi.easypay.co.kr
EASYPAY_TEST_MODE=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Environment Variables Explained

- `EASYPAY_MALL_ID`: Your merchant/mall ID from EasyPay
- `EASYPAY_API_KEY`: API key for authentication (test: usually provided by KICC)
- `EASYPAY_API_URL`:
  - Test: `https://testpgapi.easypay.co.kr`
  - Production: `https://pgapi.easypay.co.kr`
- `EASYPAY_TEST_MODE`: Set to `false` for production
- `NEXT_PUBLIC_BASE_URL`: Your application's base URL (used for payment callbacks)

## Payment Flow

### 1. Payment Registration
**File:** [app/api/payment/register/route.ts](app/api/payment/register/route.ts)

When user clicks "Complete Payment":
- Client sends payment info to `/api/payment/register`
- Server calls EasyPay WebPay API (`/api/ep9/trades/webpay`)
- Server returns `authPageUrl` and `shopOrderNo`
- Order data is stored in both sessionStorage and localStorage
- Payment window opens (popup or redirect)

### 2. Payment Processing
User completes payment on EasyPay's page. EasyPay processes the payment.

### 3. Payment Callback
**File:** [app/api/payment/callback/route.ts](app/api/payment/callback/route.ts)

EasyPay sends POST request to `/api/payment/callback` with payment results:
- `resCd`: Response code ('0000' = success)
- `resMsg`: Response message
- `shopOrderNo`: Order number
- `authorizationId`: Authorization ID for approval
- Other payment details

The callback endpoint returns HTML that:
- Sends payment data to parent window via `postMessage` (if popup)
- Redirects to `/payment/callback` page (if not popup)

### 4. Payment Verification & Order Creation
**Files:**
- [app/payment/page.tsx](app/payment/page.tsx) (for popup flow)
- [app/payment/callback/page.tsx](app/payment/callback/page.tsx) (for redirect flow)

The client:
1. Receives payment callback data
2. Retrieves pending order from storage (sessionStorage or localStorage)
3. Calls `/api/payment/approve` to verify payment
4. Creates order in database
5. Clears cart and storage
6. Redirects to completion page

### 5. Payment Approval API
**File:** [app/api/payment/approve/route.ts](app/api/payment/approve/route.ts)

Server-side verification:
- Calls EasyPay Approval API (`/api/trades/approval`)
- Verifies the payment with `authorizationId`
- Returns approval confirmation
- Validates amount matches expected amount

## API Endpoints

### POST /api/payment/register
Registers payment with EasyPay and returns payment page URL.

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
  "authPageUrl": "https://...",
  "shopOrderNo": "20250103123456789",
  "message": "Payment registration successful"
}
```

### POST /api/payment/callback
Receives payment callback from EasyPay. Returns HTML page that communicates with parent window.

### POST /api/payment/approve
Verifies payment with EasyPay server.

**Request:**
```json
{
  "shopOrderNo": "20250103123456789",
  "amount": 10000,
  "authorizationId": "ABC123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shopOrderNo": "20250103123456789",
    "paymentId": "...",
    "amount": 10000,
    "authDate": "20250103",
    "authTime": "120000",
    "payMethodType": "11",
    "payMethodTypeName": "신용카드"
  },
  "message": "Payment approved successfully"
}
```

### GET /api/payment/approve?shopOrderNo=xxx
Queries payment status from EasyPay.

## Storage Strategy

The integration uses **dual storage** to handle both popup and redirect flows:

- **sessionStorage**: Primary storage for popup flow (same window context)
- **localStorage**: Fallback for redirect flow (works across tabs/windows)

Stored data:
- `pendingOrder`: Order data and cart items (JSON string)
- `currentShopOrderNo`: Current order number for verification

This ensures the payment flow works regardless of whether:
- Browser blocks popups
- User has strict privacy settings
- Payment page redirects instead of using popup

## Error Handling

### Common Error Codes

- `R102`: Invalid authorization or missing parameters
  - **Common Cause**: WebPay payments are auto-approved and don't need the approval API
  - **Solution**: The system automatically falls back to query API when this occurs
  - Check `EASYPAY_API_KEY` is correctly set
  - Verify `authorizationId` is being passed correctly
  - Confirm `EASYPAY_MALL_ID` matches your account
  - **Note**: For WebPay, the payment is already approved when callback occurs, so we just need to query status

### Troubleshooting

1. **Payment registration fails:**
   - Check `EASYPAY_MALL_ID` and `EASYPAY_API_URL`
   - Verify network connectivity to EasyPay API
   - Check server logs for detailed error messages

2. **Payment approval fails (R102):**
   - **This is normal for WebPay!** The system automatically tries query API as fallback
   - WebPay payments are auto-approved, so approval API may not be needed
   - System will fallback to query API to verify payment status
   - If both fail:
     - Ensure `EASYPAY_API_KEY` is correct
     - Verify `EASYPAY_MALL_ID` matches your account
     - Check that `authorizationId` from callback is valid
     - Confirm you're using the correct API URL for your environment

3. **Order data not found:**
   - Check browser allows localStorage and sessionStorage
   - Verify `shopOrderNo` matches between registration and callback
   - Check console for storage errors

4. **Popup blocked:**
   - Flow automatically falls back to redirect
   - Ensure `NEXT_PUBLIC_BASE_URL` is correct

## Testing

### Test Mode Setup
1. Set `EASYPAY_TEST_MODE=true`
2. Use test API URL: `https://testpgapi.easypay.co.kr`
3. Use test credentials provided by KICC

### Test Card Numbers
Use test card numbers provided by EasyPay/KICC for testing payments.

## Security Considerations

1. **API Key Protection:**
   - Never expose `EASYPAY_API_KEY` to client
   - Always validate on server-side

2. **Amount Verification:**
   - Server verifies amount matches expected value
   - Prevents tampering with payment amount

3. **Order Verification:**
   - `shopOrderNo` is verified on callback
   - Prevents processing duplicate or fake payments

4. **HTTPS Required:**
   - Production must use HTTPS
   - EasyPay requires secure connections

## Production Deployment

1. Update environment variables:
   ```env
   EASYPAY_API_URL=https://pgapi.easypay.co.kr
   EASYPAY_TEST_MODE=false
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   ```

2. Obtain production credentials from KICC/EasyPay

3. Test thoroughly in staging environment

4. Monitor logs for any payment errors

## Additional Resources

- EasyPay Documentation: Contact KICC for official documentation
- Support: Contact EasyPay/KICC support for integration assistance

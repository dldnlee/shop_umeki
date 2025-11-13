# Payment Callback Flow with Popup Window

## Overview

This document describes the improved payment flow that uses a dedicated callback page to handle payment completion, close popup windows, and redirect to the purchase complete page.

## Flow Diagram

```
┌──────────────┐
│ Payment Page │
│  /payment    │
└──────┬───────┘
       │
       │ 1. User fills form & clicks "Complete Payment"
       │
       ├─► Store order data in sessionStorage
       │   - pendingOrder: { orderData, cartItems }
       │   - currentShopOrderNo: "20250102123456789"
       │
       │ 2. Call /api/payment/register
       ├────────────────────────────────┐
       │                                │
       │ 3. Get authPageUrl             │
       │◄───────────────────────────────┤
       │                                │
       │ 4. Open popup window           │
       │    with authPageUrl            │
       ├─────────────────┐              │
       │                 │              │
       │          ┌──────▼──────────┐   │
       │          │  EasyPay Window │   │
       │          │  (External PG)  │   │
       │          └──────┬──────────┘   │
       │                 │              │
       │          5. User completes     │
       │             payment            │
       │                 │              │
       │          ┌──────▼───────────┐  │
       │          │ Callback Page    │  │
       │          │ /payment/callback│  │
       │          └──────┬───────────┘  │
       │                 │              │
       │          6. Verify payment     │
       │             - Call /api/payment/approve
       │             - Create order in DB
       │             - Clear cart       │
       │                 │              │
       │          7. Send postMessage   │
       │             to parent window   │
       │◄────────────────┤              │
       │                 │              │
       │          8. Close popup        │
       │                 X              │
       │                                │
       │ 9. Redirect parent to          │
       │    /payment/complete           │
       │                                │
       ▼                                │
┌─────────────────┐                    │
│ Complete Page   │                    │
│ /payment/complete                    │
└─────────────────┘                    │
```

## Implementation Details

### 1. Payment Page ([/payment](app/payment/page.tsx))

**Responsibilities:**
- Display order form
- Store order data in sessionStorage
- Request payment registration from server
- Open payment popup window
- Listen for postMessage from callback page
- Redirect to complete page on success

**Key Code:**
```typescript
// Listen for messages from payment popup
const handleMessage = (event: MessageEvent) => {
  if (event.origin !== window.location.origin) return;

  const { type, orderId, message } = event.data;

  if (type === 'PAYMENT_SUCCESS') {
    window.location.href = `/payment/complete?orderId=${orderId}`;
  } else if (type === 'PAYMENT_FAILED' || type === 'PAYMENT_ERROR') {
    alert(`결제 실패: ${message}`);
  }
};
```

### 2. Callback Page ([/payment/callback](app/payment/callback/page.tsx))

**Responsibilities:**
- Receive payment result from EasyPay (via URL parameters)
- Verify payment with server `/api/payment/approve`
- Create order in database
- Clear cart
- Send postMessage to parent window
- Close popup window
- Fallback: redirect directly if not in popup

**Key Features:**
- Validates order data consistency
- Server-side payment verification before order creation
- Handles both popup and redirect scenarios
- User-friendly loading/success/error states

**URL Parameters from EasyPay:**
- `resCd`: Result code (0000 = success)
- `resMsg`: Result message
- `shopOrderNo`: Order number

### 3. Complete Page ([/payment/complete](app/payment/complete/page.tsx))

**Responsibilities:**
- Display order confirmation
- Show order ID
- Provide navigation options (view order, continue shopping)
- Display next steps information

**Features:**
- Beautiful success UI with icon
- Order tracking information
- Links to order details and homepage

### 4. API Routes

#### Payment Registration ([/api/payment/register](app/api/payment/register/route.ts))
- Registers payment with EasyPay
- Returns: `authPageUrl` and `shopOrderNo`
- **returnUrl**: `${baseUrl}/payment/callback`

#### Payment Approval ([/api/payment/approve](app/api/payment/approve/route.ts))
- Verifies payment with EasyPay server
- Critical security step
- Returns: payment details including `paymentId`

## Security Features

1. **Origin Verification**: postMessage listener checks message origin
2. **Order Number Matching**: Validates `shopOrderNo` matches stored value
3. **Server-side Verification**: Always verifies payment with EasyPay before creating order
4. **Amount Validation**: Ensures paid amount matches expected amount

## User Experience

### Success Flow:
1. User completes payment in popup
2. Sees "결제 처리 중..." message in callback page
3. Sees "결제 완료!" success message
4. Popup closes automatically (1 second delay)
5. Parent window redirects to complete page
6. User sees beautiful confirmation page

### Error Flow:
1. Payment fails in EasyPay window
2. Callback page shows error message
3. Popup closes after 2 seconds
4. Parent window shows alert with error
5. User remains on payment page to retry

### Popup Blocked Scenario:
1. If popup is blocked, falls back to redirect
2. User is redirected directly to EasyPay
3. After payment, redirected to callback page
4. Since `window.opener` is null, redirects directly to complete page

## Testing

### Test Success Flow:
1. Navigate to `/payment`
2. Fill out form and submit
3. Complete payment in popup
4. Verify popup closes and redirects to complete page

### Test Failure Flow:
1. Navigate to `/payment`
2. Fill out form and submit
3. Cancel or fail payment in popup
4. Verify error message appears and popup closes

### Test Popup Blocker:
1. Manually disable popups in browser
2. Navigate to `/payment`
3. Fill out form and submit
4. Verify fallback redirect works

## Configuration

Update `.env.local`:
```bash
# EasyPay Configuration
EASYPAY_MERCHANT_ID=GD003712
EASYPAY_API_KEY=easypay!KICCTEST
EASYPAY_TEST_MODE=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Files Modified/Created

### Created:
- `app/payment/callback/page.tsx` - Callback page that handles popup closing
- `app/payment/complete/page.tsx` - Purchase complete confirmation page
- `PAYMENT_CALLBACK_FLOW.md` - This documentation

### Modified:
- `app/payment/page.tsx` - Added postMessage listener, removed old callback handler
- `app/api/payment/register/route.ts` - Changed returnUrl to `/payment/callback`

## Advantages of This Approach

1. **Better UX**: Dedicated success page with clear next steps
2. **Cleaner Code**: Separation of concerns (form, callback, completion)
3. **Popup Support**: Properly handles popup window communication
4. **Fallback Ready**: Works even if popups are blocked
5. **Reusable**: Callback page can be reused for different payment methods
6. **Secure**: All verification happens server-side before order creation

## Next Steps

1. Test the payment flow thoroughly
2. Customize the complete page design
3. Add email confirmation sending
4. Implement order tracking page
5. Add analytics tracking for conversion

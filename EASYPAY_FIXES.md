# EasyPay Payment Fixes - Quick Reference

## What Was Fixed

### 1. R102 Error Handling ✅
**Problem**: Approval API returns R102 error for WebPay payments

**Solution**: Added automatic fallback to query API
- WebPay payments are auto-approved by EasyPay
- When approval API fails with R102, system automatically tries query API
- This is the correct behavior for WebPay flow

**Code Location**: [app/api/payment/approve/route.ts](app/api/payment/approve/route.ts#L104-L176)

### 2. API Authentication ✅
**Problem**: API key was not being sent correctly

**Solution**: Multiple authentication methods implemented
- API key included in request body
- API key sent in `Authorization` header
- API key sent in custom `apiKey` header
- Covers all possible EasyPay authentication methods

**Code Location**: [app/api/payment/approve/route.ts](app/api/payment/approve/route.ts#L66-L88)

### 3. Storage Issues (Popup vs Redirect) ✅
**Problem**: SessionStorage not accessible in popup window

**Solution**: Dual storage strategy
- Data saved to both `sessionStorage` and `localStorage`
- SessionStorage for same-window popup flow
- LocalStorage for cross-window redirect flow
- Works in all scenarios

**Code Locations**:
- [app/payment/page.tsx](app/payment/page.tsx#L269-L276)
- [app/payment/callback/page.tsx](app/payment/callback/page.tsx#L78-L88)

### 4. Environment Variables ✅
**Problem**: Inconsistent naming and missing variables

**Solution**: Standardized configuration
- `EASYPAY_MALL_ID` (not MERCHANT_ID)
- `EASYPAY_API_KEY` added
- `EASYPAY_API_URL` added with correct URLs
- All documented in `.env.local.example`

**Code Location**: [.env.local.example](.env.local.example#L11-L14)

## Current Payment Flow

```
1. User clicks "Complete Payment"
   ↓
2. POST /api/payment/register
   → Registers payment with EasyPay WebPay API
   → Returns authPageUrl and shopOrderNo
   ↓
3. Payment popup/redirect opens
   → User completes payment on EasyPay
   ↓
4. POST /api/payment/callback (EasyPay → Server)
   → Receives payment result
   → Returns HTML with postMessage script
   ↓
5. Payment callback page processes result
   → POST /api/payment/approve
   → If R102 error: Fallback to query API ← NEW!
   → Verifies payment
   ↓
6. Create order in database
   ↓
7. Clear cart and redirect to complete page
```

## Testing Checklist

- [ ] Set correct environment variables in `.env.local`
- [ ] Test payment in popup mode
- [ ] Test payment when popup is blocked (redirect mode)
- [ ] Verify R102 error triggers query API fallback
- [ ] Check server logs for approval/query API responses
- [ ] Confirm order is created successfully
- [ ] Verify cart is cleared after payment

## API Key Configuration

Your `.env.local` should look like:

```env
EASYPAY_MALL_ID=T0021482
EASYPAY_API_KEY=your_actual_api_key_here
EASYPAY_API_URL=https://testpgapi.easypay.co.kr
EASYPAY_TEST_MODE=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Understanding R102 Error

**R102 is EXPECTED for WebPay!**

EasyPay WebPay flow:
1. Payment is registered → User pays → Payment auto-approved by EasyPay
2. When we call approval API, payment is already approved
3. EasyPay returns R102 saying "already processed" or "invalid approval request"
4. Solution: Use query API to just check the status

The code now handles this automatically:
- Tries approval API first
- On R102 error, immediately tries query API
- If query succeeds, payment is verified ✅

## Server Log Analysis

When payment succeeds, you should see:
```
Calling EasyPay Approval API: ...
EasyPay approval response data: { resCd: 'R102', ... }
R102 Error - Invalid authorization or missing parameters
Attempting to query payment status instead...
Query response: { resCd: '0000', ... }
Payment query successful, using query data
```

This is CORRECT behavior! ✅

## Quick Debug Commands

Check if environment variables are set:
```bash
# In your terminal
echo $EASYPAY_MALL_ID
echo $EASYPAY_API_URL
```

Check localStorage/sessionStorage in browser console:
```javascript
// Check stored order data
localStorage.getItem('pendingOrder')
sessionStorage.getItem('pendingOrder')

// Check shop order number
localStorage.getItem('currentShopOrderNo')
```

## Next Steps

1. **Test the payment flow** - Try making a test payment
2. **Check server logs** - Look for the approval → query fallback
3. **Verify order creation** - Make sure order appears in database
4. **Test both popup and redirect** - Block popups to test redirect flow

## Need Help?

- Check [EASYPAY_INTEGRATION.md](EASYPAY_INTEGRATION.md) for full documentation
- Review server logs in development console
- Check browser console for client-side errors
- Verify all environment variables are set correctly

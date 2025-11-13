# PayPal Integration - Complete Setup Guide

## Overview

You now have a fully integrated PayPal payment system in your application! This guide walks you through the final steps to get it working.

## What Was Done

### ✅ Code Integration
- Added PayPal payment option to the payment page
- Created two backend API endpoints for PayPal integration
- Implemented secure OAuth authentication with PayPal
- Added order creation and payment capture functionality
- Integrated with your existing order and email systems

### ✅ Documentation Created
- `PAYPAL_INTEGRATION.md` - Complete technical documentation
- `PAYPAL_SETUP_QUICKSTART.md` - Quick start guide
- `PAYPAL_IMPLEMENTATION_SUMMARY.md` - What was added
- `PAYPAL_ARCHITECTURE.md` - System architecture and diagrams

### ✅ Files Modified/Created
```
New Files:
  - app/api/payment/paypal/create-order/route.ts
  - app/api/payment/paypal/capture-order/route.ts
  - PAYPAL_INTEGRATION.md
  - PAYPAL_SETUP_QUICKSTART.md
  - PAYPAL_IMPLEMENTATION_SUMMARY.md
  - PAYPAL_ARCHITECTURE.md

Modified Files:
  - app/payment/page.tsx (Added PayPal button UI & logic)
  - package.json (Added dependency)
  - .env.local (Added PayPal credentials)
```

## Required Setup Steps

### Step 1: Get PayPal Credentials (5 minutes)

1. Go to: https://developer.paypal.com/dashboard/
2. Log in with your PayPal business account (or create one)
3. Click **Apps & Credentials**
4. Make sure you're on the **Sandbox** tab
5. Under "REST API apps", you should see an app listed
6. Click on it to view details
7. Copy:
   - **Client ID** (starts with `sb_`)
   - **Client Secret** (long string)

### Step 2: Update Environment Variables (2 minutes)

Edit your `.env.local` file and add:

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=sb_YOUR_CLIENT_ID_HERE
PAYPAL_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
NEXT_PUBLIC_PAYPAL_SANDBOX=true
```

⚠️ **IMPORTANT**: Replace with your actual credentials from Step 1

### Step 3: Install Dependencies (1 minute)

```bash
npm install
```

### Step 4: Restart Dev Server (1 minute)

If your dev server is running, stop it and restart:

```bash
npm run dev
```

### Step 5: Test the Integration (5-10 minutes)

1. Open: http://localhost:3001/payment
2. Add items to cart first (if cart is empty)
3. Select **PayPal** as payment method
4. Fill in your information:
   - Name: Test Name
   - Email: test@example.com
   - Phone: 010-1234-5678
   - Delivery: Select any option
   - Check the agreement box
5. Click **"Pay with PayPal"** button
6. In the PayPal popup:
   - Use a sandbox account (check your PayPal dashboard for credentials)
   - Click **Pay Now**
7. You should be redirected to the order complete page ✅

### Step 6: Verify in Database

1. Open your Supabase dashboard
2. Go to the `orders` table
3. You should see your test order with:
   - `payment_method: 'paypal'`
   - Your customer information
   - Correct total amount

## How It Works

### Simple Flow

```
User fills form → Clicks PayPal button → 
PayPal popup opens → User approves → 
Order created in database → Email sent → 
Redirect to success page
```

### Technical Flow

1. **User selects PayPal** → Frontend shows PayPal buttons
2. **User clicks button** → Calls `POST /api/payment/paypal/create-order`
3. **Backend creates PayPal order** → Gets Order ID from PayPal
4. **PayPal popup opens** → User logs in and approves
5. **Backend captures payment** → Calls `POST /api/payment/paypal/capture-order`
6. **Order stored in database** → With PayPal transaction ID
7. **Confirmation email sent** → To customer
8. **Success page shown** → User sees order complete

## Payment Method Options

Users can now choose:
- **신용카드 (Card)** → Uses EasyPay (your existing system)
- **PayPal** → Uses PayPal Checkout (new system)

Both methods create orders the same way and send confirmation emails.

## Troubleshooting

### Issue: "PayPal button not showing"
**Solution**:
1. Check `.env.local` has correct `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
2. Restart dev server after editing `.env.local`
3. Open browser console (F12) - look for errors
4. Type `window.paypal` in console - should show PayPal SDK

### Issue: "Error creating order"
**Solution**:
1. Verify Client Secret in `.env.local` is correct
2. Check server logs for detailed error
3. Make sure all form fields are filled
4. Try in an incognito/private browser window

### Issue: "Order not created in database"
**Solution**:
1. Check Supabase connection
2. Verify order data is valid (no special characters)
3. Check server logs for database errors
4. Check that order doesn't already exist

### Issue: "Email not sent"
**Solution**:
1. Check email service configuration (Mailjet)
2. Verify customer email address is valid
3. Check spam folder
4. Order was created successfully even if email fails

See `PAYPAL_INTEGRATION.md` for more troubleshooting.

## Testing Tips

### Use Sandbox Accounts

Get test account credentials from PayPal Dashboard:
1. Go to PayPal Developer Dashboard
2. Click **Accounts** on the left sidebar
3. You'll see sandbox personal and business accounts
4. Click the personal account to see its test email and password

### Use Test Cards (Optional)

For testing card payments in PayPal:
1. Generate test cards: https://developer.paypal.com/tools/sandbox/card-testing/
2. Use any amount in your tests
3. Testing doesn't actually charge anything

### Different Test Scenarios

- **Successful payment**: Use test account, click Pay Now
- **Declined card**: Use decline test card from generator
- **Cancelled payment**: Close PayPal popup (or click cancel)
- **Invalid amount**: Try negative or zero amount (should fail)

## Going Live

When you're ready for production:

### 1. Get Live Credentials
- Go to PayPal Developer Dashboard
- Click **Apps & Credentials** → **Live** tab
- Copy live Client ID and Secret

### 2. Update Environment
```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_client_secret
NEXT_PUBLIC_PAYPAL_SANDBOX=false
```

### 3. Deploy
- Push changes to your production branch
- Deploy to production

### 4. Monitor
- Watch for payment errors in logs
- Monitor PayPal Dashboard for transactions
- Test with small transaction amount first

## Security Notes

✅ **We did right**:
- Client Secret is NEVER in frontend code
- All API calls are server-side
- Orders are verified before creation
- HTTPS encrypts all data
- OAuth 2.0 authentication is secure

⚠️ **Keep secure**:
- Never commit `.env.local` with real credentials
- Keep Client Secret secret (not in GitHub)
- Rotate credentials periodically
- Monitor logs for unauthorized access
- Use HTTPS in production (required by PayPal)

## Next Steps

1. ✅ Complete the setup steps above
2. ✅ Test with sandbox account
3. ✅ Verify order in database
4. ✅ Check confirmation email
5. ⭕ Create PayPal business account (if not done)
6. ⭕ Test in production sandbox (optional)
7. ⭕ Go live with production credentials

## Support Resources

- **PayPal Docs**: https://developer.paypal.com/docs/
- **PayPal Support**: https://developer.paypal.com/support/
- **JavaScript SDK Docs**: https://developer.paypal.com/sdk/js/reference/
- **Orders API Docs**: https://developer.paypal.com/docs/api/orders/v2/
- **Sandbox Testing**: https://developer.paypal.com/tools/sandbox/

## Files Reference

### Documentation
- `PAYPAL_INTEGRATION.md` - Complete guide (detailed)
- `PAYPAL_SETUP_QUICKSTART.md` - Quick start (fast setup)
- `PAYPAL_IMPLEMENTATION_SUMMARY.md` - What was added
- `PAYPAL_ARCHITECTURE.md` - System diagrams

### Code Files
- `app/payment/page.tsx` - Payment page with PayPal button
- `app/api/payment/paypal/create-order/route.ts` - Create order API
- `app/api/payment/paypal/capture-order/route.ts` - Capture payment API
- `.env.local` - Environment variables
- `package.json` - Dependencies

## Summary

You now have:

✅ Full PayPal Checkout integration
✅ Secure OAuth authentication
✅ Server-side order creation and payment capture
✅ Database order storage
✅ Automatic confirmation emails
✅ Complete documentation
✅ Testing and production guides

**Next action**: Follow the setup steps above to get your PayPal credentials and test the integration!

Questions? Check the documentation files or PayPal's official docs.

Good luck! 🚀

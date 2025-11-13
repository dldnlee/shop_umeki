# PayPal Integration Checklist

## Pre-Setup (Do this first)

- [ ] You have a PayPal business account
- [ ] You have access to PayPal Developer Dashboard
- [ ] You have Node.js and npm installed
- [ ] Your project is running on localhost:3001

## Setup Phase 1: Get Credentials (5 minutes)

- [ ] Go to https://developer.paypal.com/dashboard/
- [ ] Log in with PayPal business account
- [ ] Navigate to **Apps & Credentials**
- [ ] Confirm you're on **Sandbox** tab
- [ ] Find or create a REST API app
- [ ] Copy the **Client ID** (sb_xxxxxxx)
- [ ] Copy the **Client Secret** (long string)
- [ ] Save these somewhere safe (not in GitHub!)

## Setup Phase 2: Configure Environment (2 minutes)

- [ ] Open `.env.local` file
- [ ] Add or update these lines:
  ```bash
  NEXT_PUBLIC_PAYPAL_CLIENT_ID=sb_your_client_id
  PAYPAL_CLIENT_SECRET=your_client_secret
  NEXT_PUBLIC_PAYPAL_SANDBOX=true
  ```
- [ ] Replace with YOUR actual credentials
- [ ] ⚠️ Do NOT commit this file to GitHub
- [ ] Save the file

## Setup Phase 3: Install & Restart (1 minute)

- [ ] Run `npm install` in terminal
- [ ] Stop your dev server (Ctrl+C)
- [ ] Start it again: `npm run dev`
- [ ] Confirm it's running on http://localhost:3001

## Testing Phase 1: Basic Test (5 minutes)

- [ ] Open http://localhost:3001/payment
- [ ] Check if page loads without errors
- [ ] Open browser console (F12)
- [ ] Type `window.paypal` - should show PayPal SDK object
- [ ] No errors in console? ✅ Continue

## Testing Phase 2: Add to Cart (2 minutes)

- [ ] Go to http://localhost:3001 (home page)
- [ ] Add at least one item to cart
- [ ] Confirm item is in cart (check cart badge)
- [ ] Go back to http://localhost:3001/payment

## Testing Phase 3: Fill Form (2 minutes)

- [ ] Name: Enter your test name
- [ ] Email: test@example.com
- [ ] Phone: 010-1234-5678
- [ ] Delivery Method: Select any option (팬미팅현장수령, 국내배송, or 해외배송)
- [ ] Address: If you selected delivery, enter test address
- [ ] Check the agreement checkbox
- [ ] All required fields are filled? ✅ Continue

## Testing Phase 4: Select PayPal (1 minute)

- [ ] Under "Payment Method", select **PayPal**
- [ ] Check that "Pay with PayPal" buttons appear
- [ ] No errors in console? ✅ Continue

## Testing Phase 5: Make Test Payment (5 minutes)

- [ ] Click the **PayPal Button**
- [ ] A PayPal popup should open
- [ ] If popup doesn't open:
  - [ ] Check browser console for errors
  - [ ] Verify Client ID in .env.local
  - [ ] Restart dev server
  - [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Log in to PayPal popup:
  - [ ] Use sandbox personal account from PayPal Dashboard
  - [ ] Email: sb_xxxxx@personal.example.com
  - [ ] Password: (from PayPal Dashboard)
- [ ] Review order in PayPal popup
- [ ] Click **"Pay Now"** button
- [ ] Wait for redirect...

## Testing Phase 6: Verify Success (2 minutes)

- [ ] You should be redirected to order complete page
- [ ] URL shows `/payment/complete?orderId=...`
- [ ] Order confirmation shows your information
- [ ] No error messages shown? ✅ Continue

## Testing Phase 7: Check Database (2 minutes)

- [ ] Go to Supabase Dashboard
- [ ] Open **orders** table
- [ ] Find the newest order
- [ ] Verify:
  - [ ] `payment_method` = "paypal"
  - [ ] `name` = your test name
  - [ ] `email` = test@example.com
  - [ ] `total_amount` = correct amount
  - [ ] `easy_pay_id` = PayPal Order ID (looks like 7WH93094HL156411M)

## Testing Phase 8: Check Email (2 minutes)

- [ ] Check test@example.com inbox
- [ ] Look for order confirmation email from YumekiFanMeeting
- [ ] Email contains:
  - [ ] Order ID
  - [ ] Order date
  - [ ] Product details
  - [ ] Total amount
  - [ ] Delivery information

## Production Setup (When ready)

- [ ] Get live PayPal credentials:
  - [ ] Go to PayPal Developer Dashboard
  - [ ] Switch to **Live** tab
  - [ ] Copy live Client ID
  - [ ] Copy live Client Secret
- [ ] Update `.env.local` for production:
  ```bash
  NEXT_PUBLIC_PAYPAL_CLIENT_ID=live_your_client_id
  PAYPAL_CLIENT_SECRET=live_your_client_secret
  NEXT_PUBLIC_PAYPAL_SANDBOX=false
  ```
- [ ] Test one more time in sandbox mode (optional but recommended)
- [ ] Deploy to production
- [ ] Update production environment variables
- [ ] Test one small transaction in production
- [ ] Monitor logs for errors

## Quick Troubleshooting

### PayPal button not showing?
- [ ] Check NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.local
- [ ] Restart dev server
- [ ] Clear browser cache
- [ ] Check console (F12) for errors

### Payment creation fails?
- [ ] Check Client Secret is correct
- [ ] Verify form is completely filled
- [ ] Check server logs for error details
- [ ] Try in incognito window

### Order not in database?
- [ ] Verify Supabase connection
- [ ] Check server logs for database errors
- [ ] Verify order data is valid
- [ ] Check if order already exists

### Email not received?
- [ ] Check spam folder
- [ ] Verify email address is correct
- [ ] Check Mailjet configuration
- [ ] Order was created successfully (main thing!)

## Testing Complete!

When all items above are checked:

✅ Your PayPal integration is working!
✅ Users can make payments with PayPal
✅ Orders are created in the database
✅ Confirmation emails are sent
✅ Everything is ready for production

## Next Steps

1. Test with real PayPal account (if desired)
2. Get production credentials
3. Update environment variables
4. Deploy to production
5. Monitor first few transactions
6. Go live!

## Important Notes

- ⚠️ Never commit `.env.local` with real credentials to GitHub
- ⚠️ Keep Client Secret secure - it's sensitive!
- ⚠️ Use HTTPS in production (required by PayPal)
- ⚠️ Test in sandbox first, then production
- ⚠️ Monitor logs for payment errors
- ✅ Both payment methods (Card & PayPal) work the same way
- ✅ All orders go to the same database table
- ✅ Confirmation emails are sent automatically

## Files to Review

If something isn't working:

1. **Check API Code**:
   - `app/api/payment/paypal/create-order/route.ts`
   - `app/api/payment/paypal/capture-order/route.ts`

2. **Check Frontend Code**:
   - `app/payment/page.tsx`

3. **Check Configuration**:
   - `.env.local` (credentials)
   - `package.json` (dependencies)

4. **Check Logs**:
   - Browser console (F12)
   - Server terminal
   - PayPal Dashboard activity

## Support

- **Documentation**: Read `PAYPAL_INTEGRATION.md`
- **Quick Start**: Read `PAYPAL_SETUP_QUICKSTART.md`
- **Architecture**: Read `PAYPAL_ARCHITECTURE.md`
- **PayPal Support**: https://developer.paypal.com/support/

Good luck! 🚀 You've got this!

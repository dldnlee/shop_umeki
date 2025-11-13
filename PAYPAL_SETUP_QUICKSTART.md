# PayPal Setup Quick Start

Follow these steps to get PayPal payments working in your application.

## Step 1: Get PayPal Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Log in or sign up with your PayPal business account
3. Click **Apps & Credentials**
4. Make sure you're on the **Sandbox** tab (for testing)
5. Under "REST API apps", click **Create App** or use an existing one
6. Copy the **Client ID** and **Client Secret**

## Step 2: Update Environment Variables

Edit your `.env.local` file and add:

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=YOUR_CLIENT_ID_HERE
PAYPAL_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
NEXT_PUBLIC_PAYPAL_SANDBOX=true
```

Replace `YOUR_CLIENT_ID_HERE` and `YOUR_CLIENT_SECRET_HERE` with your actual credentials.

⚠️ **Important**: Never commit your Client Secret to version control!

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the payment page: `http://localhost:3001/payment`

3. Add items to your cart first (from the home page)

4. On the payment page, select **PayPal** as the payment method

5. Fill in your information:
   - Name
   - Email
   - Phone
   - Delivery method
   - Check the agreement checkbox

6. Click the **Pay with PayPal** button

7. You'll see a PayPal popup - log in with your sandbox account:
   - Email: `sb-xxxxx@personal.example.com` (check your dashboard)
   - Password: Your sandbox password

8. Review the order and click **Pay Now**

9. You should be redirected to the order complete page ✅

## Step 5: Verify Order in Database

Check your Supabase dashboard to confirm the order was created with:
- `payment_method: 'paypal'`
- All customer information saved
- Correct order total

## Step 6: Check Email

Verify that the order confirmation email was sent to the customer's email address.

## Going Live

When you're ready for production:

1. Get your **Live** credentials:
   - Go to PayPal Developer Dashboard
   - Click **Apps & Credentials** → **Live** tab
   - Copy your live Client ID and Client Secret

2. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=YOUR_LIVE_CLIENT_ID
   PAYPAL_CLIENT_SECRET=YOUR_LIVE_CLIENT_SECRET
   NEXT_PUBLIC_PAYPAL_SANDBOX=false
   ```

3. Deploy your changes

4. Test with real PayPal account (optional but recommended)

## Troubleshooting

### PayPal button not showing?
- Check `.env.local` has `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- Restart your dev server after changing `.env.local`
- Open browser console (F12) - look for errors
- Type `window.paypal` in console - should show PayPal SDK

### Payment not working?
- Check browser console for JavaScript errors
- Check server console for API errors
- Verify Client Secret is correct
- Make sure you're in Sandbox mode for testing

### Order not created?
- Check Supabase connection
- Look at server logs for database errors
- Verify form is filled out completely
- Check email service configuration

## Support

See `PAYPAL_INTEGRATION.md` for detailed documentation.

For PayPal API issues: https://developer.paypal.com/support/

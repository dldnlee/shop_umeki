# International Delivery Payment

This page allows customers with international orders (from `umeki_orders_hypetown`) to pay for delivery fees using PayPal.

## Features

- Displays order details including items and total amount
- Shows delivery fee payment status
- Integrates PayPal payment button for delivery fee payment
- Currency selection (USD or JPY)
- Automatic currency conversion display (KRW, USD, JPY)
- Success modal after payment completion
- Updates `delivery_fee_payment` status in database
- Clean and robust error handling

## Setup

### 1. Environment Variables

Add your PayPal credentials to `.env.local`:

```env
# PayPal Client ID (public, exposed to client)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here

# PayPal Secret Key (private, server-side only)
PAYPAL_CLIENT_SECRET=your_paypal_secret_key_here

# PayPal Environment (true for sandbox, false for production)
NEXT_PUBLIC_PAYPAL_SANDBOX=true
```

### 2. Get PayPal Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications)
2. Create a new app or use an existing one
3. Copy the credentials:
   - **Sandbox** credentials for testing
   - **Live** credentials for production

### 3. Delivery Fee Settings

The delivery fee is set to 15,000 KRW with fixed conversions:
- **USD**: $10.20
- **JPY**: ¥1,650

To update these values, edit the constants in [`[id]/page.tsx`](./[id]/page.tsx:61-63):

```typescript
const DELIVERY_FEE_KRW = 15000;
const DELIVERY_FEE_USD = "10.20";
const DELIVERY_FEE_JPY = "1650";
```

## Usage

### Access the Payment Page

Navigate to: `/international-delivery-payment/[orderId]`

Example: `/international-delivery-payment/123e4567-e89b-12d3-a456-426614174000`

### Payment Flow

1. Customer receives order ID via email or link
2. Customer navigates to the payment page
3. Page displays:
   - Order information
   - Order items
   - Delivery fee in multiple currencies (KRW, USD, JPY)
   - Currency selection buttons (USD or JPY)
   - PayPal payment button (if not already paid)
4. Customer selects preferred currency (USD or JPY)
5. Customer clicks PayPal button and completes payment
6. System:
   - Creates PayPal order via API
   - Captures payment via API
   - Updates `delivery_fee_payment` to `TRUE` in database
7. Success modal is displayed

## Architecture

### Frontend Flow
```
Page Load → Fetch Order → Load PayPal SDK →
Render Button → User Pays → Capture Payment →
Update Database → Show Success
```

### API Integration
```
createOrder → /api/payment/paypal/create-order
captureOrder → /api/payment/paypal/capture-order
updateDatabase → /api/payment/delivery-fee/[id]
```

### Key Improvements

1. **Next.js Script Component**: Uses Next.js `<Script>` component for optimal SDK loading
2. **Currency Switching**: Properly handles SDK reload when currency changes
3. **Simpler State Management**: Uses minimal state with clear flow
4. **Better Error Handling**: Clear error messages and recovery paths
5. **Type Safety**: Proper TypeScript types for PayPal SDK
6. **Loading States**: Clear feedback during all async operations

## Database Schema

The page interacts with these tables:

### umeki_orders_hypetown
- `id` (uuid): Order ID
- `name` (text): Customer name
- `email` (text): Customer email
- `phone_num` (text): Phone number
- `address` (text): Delivery address
- `delivery_method` (text): Delivery method
- `order_status` (text): Order status
- `created_at` (timestamp): Order creation date
- `total_amount` (integer): Order total amount
- `delivery_fee_payment` (boolean): Delivery fee payment status ← Updated by this page

### umeki_order_items_hypetown
- `id` (uuid): Item ID
- `order_id` (uuid): Reference to order
- `product_id` (uuid): Reference to product
- `option` (text): Product option
- `quantity` (integer): Item quantity
- `total_price` (integer): Item total price

## API Routes

### POST /api/payment/paypal/create-order

Creates a PayPal order for delivery fee payment.

**Request Body:**
```json
{
  "amount": "10.20",
  "currency": "USD",
  "orderId": "DELIVERY_abc-123",
  "items": [
    {
      "name": "International Delivery Fee",
      "description": "Shipping fee for order abc-123",
      "quantity": "1",
      "unit_amount": {
        "currency_code": "USD",
        "value": "10.20"
      },
      "category": "PHYSICAL_GOODS"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "PAYPAL_ORDER_ID",
  "message": "Order created successfully"
}
```

### POST /api/payment/paypal/capture-order

Captures payment for an approved PayPal order.

**Request Body:**
```json
{
  "orderId": "PAYPAL_ORDER_ID"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "PAYPAL_ORDER_ID",
  "status": "COMPLETED",
  "captureId": "CAPTURE_ID",
  "paymentId": "CAPTURE_ID",
  "amount": "10.20",
  "currency": "USD",
  "message": "Payment captured successfully"
}
```

### PATCH /api/payment/delivery-fee/[id]

Updates the delivery fee payment status.

**Request Body:**
```json
{
  "paymentId": "PAYPAL_TRANSACTION_ID",
  "status": "COMPLETED"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delivery fee payment updated successfully",
  "data": { ... }
}
```

## Testing

### Sandbox Mode

1. Use PayPal Sandbox Client ID and Secret
2. Create test accounts at [PayPal Sandbox](https://developer.paypal.com/dashboard/accounts)
3. Use test account credentials to complete payments
4. No real money is charged

### Test Scenarios

- ✅ Order with items loads correctly
- ✅ Delivery fee is displayed in multiple currencies
- ✅ Currency selection works (USD/JPY)
- ✅ PayPal SDK loads properly with selected currency
- ✅ PayPal button appears for unpaid orders
- ✅ Payment creates order successfully
- ✅ Payment captures successfully
- ✅ Database updates correctly
- ✅ Success modal displays
- ✅ Already-paid orders show completion status
- ✅ Error handling works for failed payments

## Troubleshooting

### PayPal SDK Not Loading

**Symptoms**: Button doesn't appear, or spinner shows indefinitely

**Solutions**:
1. Check that `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set in `.env.local`
2. Restart the dev server after changing environment variables
3. Check browser console for script loading errors
4. Verify internet connection

### Payment Not Processing

**Symptoms**: Payment fails or gets stuck

**Solutions**:
1. Check browser console for errors
2. Verify PayPal Client ID and Secret are valid
3. Check that you're using sandbox credentials in development
4. Try in an incognito/private browser window
5. Check server logs for API errors

### Database Not Updating

**Symptoms**: Payment succeeds but order status doesn't change

**Solutions**:
1. Check API route logs at `/api/payment/delivery-fee/[id]`
2. Verify Supabase connection and credentials
3. Check database permissions
4. Ensure `delivery_fee_payment` column exists

### Currency Switch Not Working

**Symptoms**: Changing currency doesn't update button

**Solutions**:
1. This is expected - changing currency reloads the SDK
2. Wait for the SDK to reload (2-3 seconds)
3. Check browser console for reload progress
4. Disable button during SDK reload

## Production Deployment

### Before Going Live

1. **Get Live Credentials**:
   - Go to PayPal Developer Dashboard
   - Switch to **Live** tab
   - Copy live Client ID and Secret

2. **Update Environment Variables**:
   ```env
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_client_secret
   NEXT_PUBLIC_PAYPAL_SANDBOX=false
   ```

3. **Test in Production**:
   - Use small test transaction first
   - Verify payment captures correctly
   - Check database updates
   - Confirm emails are sent

4. **Monitor**:
   - Watch for payment errors in logs
   - Monitor PayPal Dashboard for transactions
   - Check for failed updates in database
   - Review customer feedback

## Security

✅ **Secure by design**:
- Client Secret never exposed to frontend
- All API calls made from secure backend
- HTTPS encryption for all connections
- Amount verified before order creation
- Order ID validated in all requests
- Error messages don't reveal sensitive data

⚠️ **Keep secure**:
- Never commit `.env.local` with real credentials
- Use `.gitignore` to exclude environment files
- Rotate credentials periodically
- Monitor logs for unauthorized access
- Use HTTPS in production (required by PayPal)

## Support

For issues or questions:
1. Check this documentation first
2. Review browser console for errors
3. Check server logs for API errors
4. Refer to [PayPal Developer Docs](https://developer.paypal.com/docs/)
5. Contact PayPal support if issue is with their API

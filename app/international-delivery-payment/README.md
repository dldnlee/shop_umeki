# International Delivery Payment

This page allows customers with international orders (from `umeki_orders_hypetown`) to pay for delivery fees using PayPal.

## Features

- Displays order details including items and total amount
- Shows delivery fee payment status
- Integrates PayPal payment button for delivery fee payment
- Currency conversion display (KRW, USD, JPY)
- Success modal after payment completion
- Updates `delivery_fee_payment` status in database

## Setup

### 1. Install Dependencies

The page uses `@paypal/react-paypal-js` for PayPal integration:

```bash
npm install @paypal/react-paypal-js
```

### 2. Get PayPal Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications)
2. Create a new app or use an existing one
3. Copy the credentials:
   - **Sandbox** credentials for testing
   - **Live** credentials for production

### 3. Configure Environment Variables

Add your PayPal credentials to `.env.local`:

```env
# PayPal Client ID (public, exposed to client)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here

# PayPal Secret Key (private, server-side only - optional for this implementation)
PAYPAL_SECRET_KEY=your_paypal_secret_key_here
```

**Note:** The current implementation only requires the Client ID. The Secret Key can be used for server-side verification if needed.

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
5. Customer clicks PayPal button and completes payment in selected currency
6. System updates `delivery_fee_payment` to `TRUE` in database
7. Success modal is displayed

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
- `delivery_fee_payment` (boolean): Delivery fee payment status

### umeki_order_items_hypetown
- `id` (uuid): Item ID
- `order_id` (uuid): Reference to order
- `product_id` (uuid): Reference to product
- `option` (text): Product option
- `quantity` (integer): Item quantity
- `total_price` (integer): Item total price

## API Routes

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

### GET /api/payment/delivery-fee/[id]

Retrieves the delivery fee payment status.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "delivery_fee_payment": false,
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

## Currency Conversion

The delivery fee is set to 15,000 KRW and converted using real exchange rates:
- **USD**: $10.20 (1 KRW = 0.00068 USD)
- **JPY**: ¥1,650 (1 KRW = 0.11 JPY)

Users can choose between USD or JPY for payment. The conversion rates are defined in the page component and can be updated as needed.

## Customization

### Change Delivery Fee Amount

Edit the constants in [page.tsx](./[id]/page.tsx):

```typescript
const DELIVERY_FEE_KRW = 15000; // Change this value
const DELIVERY_FEE_USD = (DELIVERY_FEE_KRW * 0.00068).toFixed(2); // 1 KRW = 0.00068 USD
const DELIVERY_FEE_JPY = Math.round(DELIVERY_FEE_KRW * 0.11); // 1 KRW = 0.11 JPY
```

### Update Exchange Rates

To update the exchange rates, modify the conversion factors:

```typescript
// Update these based on current exchange rates
const DELIVERY_FEE_USD = (DELIVERY_FEE_KRW * 0.00068).toFixed(2); // Update 0.00068
const DELIVERY_FEE_JPY = Math.round(DELIVERY_FEE_KRW * 0.11); // Update 0.11
```

### Add More Currencies

To support additional currencies:

1. Update the PayPalScriptProvider options:
```typescript
<PayPalScriptProvider
  options={{
    clientId: clientId,
    currency: "USD,JPY,EUR", // Add more currencies
    intent: "capture",
  }}
>
```

2. Add the currency to the state and UI:
```typescript
const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "JPY" | "EUR">("USD");
```

Supported currencies: USD, EUR, GBP, JPY, CAD, AUD, etc.

## Testing

### Sandbox Mode

1. Use PayPal Sandbox Client ID
2. Create test accounts at [PayPal Sandbox](https://developer.paypal.com/dashboard/accounts)
3. Use test account credentials to complete payments

### Test Scenarios

- ✅ Order with items loads correctly
- ✅ Delivery fee is displayed in multiple currencies
- ✅ PayPal button appears for unpaid orders
- ✅ Payment completes successfully
- ✅ Database updates correctly
- ✅ Success modal displays
- ✅ Already-paid orders show completion status

## Troubleshooting

### PayPal SDK Not Loading

Check that `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set in `.env.local` and restart the dev server.

### Payment Not Processing

Check browser console and server logs for errors. Verify PayPal Client ID is valid.

### Database Not Updating

Check API route logs at `/api/payment/delivery-fee/[id]` and verify Supabase connection.

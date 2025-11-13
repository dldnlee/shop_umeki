# PayPal Integration Architecture

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          Payment Page (app/payment/page.tsx)              │ │
│  │                                                            │ │
│  │  1. Select PayPal as payment method                       │ │
│  │  2. Fill in customer information                          │ │
│  │  3. Click "Pay with PayPal" button                        │ │
│  │  4. PayPal SDK renders buttons                            │ │
│  │  5. PayPal popup opens for approval                       │ │
│  │  6. Callback functions handle success/error              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              │ HTTP Requests                      │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
    ┌───────────▼────────────┐    ┌──────────▼──────────────┐
    │   API Server           │    │    PayPal API Server    │
    │  (Next.js Backend)     │    │  (PayPal Servers)       │
    │                        │    │                        │
    │  ┌────────────────┐   │    │  ┌─────────────────┐   │
    │  │ Create Order   │◄──┼────┼──┤ Orders API v2   │   │
    │  │ Endpoint       │   │    │  │ /v2/orders      │   │
    │  │ /api/payment/  │   │    │  └─────────────────┘   │
    │  │ paypal/create- │   │    │                        │
    │  │ order          │   │    │  ┌─────────────────┐   │
    │  │                │   │    │  │ Capture Payment │   │
    │  │ Returns: Order │   │    │  │ Endpoint        │   │
    │  │ ID             │   │    │  │ /v2/orders/     │   │
    │  └────────────────┘   │    │  │ {id}/capture    │   │
    │                        │    │  └─────────────────┘   │
    │  ┌────────────────┐   │    │                        │
    │  │ Capture Order  │◄──┼────┤                        │
    │  │ Endpoint       │   │    │                        │
    │  │ /api/payment/  │   │    └────────────────────────┘
    │  │ paypal/capture-│   │
    │  │ order          │   │
    │  │                │   │
    │  │ Returns:       │   │
    │  │ Success/Error  │   │
    │  └────────────────┘   │
    │                        │
    │  ┌────────────────┐   │
    │  │ Database       │   │
    │  │ (Supabase)     │   │
    │  │                │   │
    │  │ Create Order   │   │
    │  │ Store Payment  │   │
    │  │ Confirmation   │   │
    │  └────────────────┘   │
    │                        │
    │  ┌────────────────┐   │
    │  │ Email Service  │   │
    │  │ (Mailjet)      │   │
    │  │                │   │
    │  │ Send Order     │   │
    │  │ Confirmation   │   │
    │  └────────────────┘   │
    │                        │
    └────────────────────────┘
```

## Data Flow Sequence

### 1. Payment Initiation
```
User Action                  Component              API Endpoint
     │                           │                      │
     ├─ Select PayPal ──────────>│                      │
     │                           │                      │
     ├─ Fill Form ──────────────>│                      │
     │                           │                      │
     └─ Click PayPal Button ────>│                      │
                                 │                      │
                                 ├─ Create Order ─────>│
                                 │  (with cart items)   │
                                 │                      │
                                 │ Generate OAuth Token │
                                 │ Create PayPal Order  │
                                 │                      │
                                 │ Return Order ID ────<│
                                 │                      │
```

### 2. Payment Approval
```
PayPal Popup               Client SDK                API Endpoint
     │                         │                           │
     ├─ Show Login ───────────>│                           │
     │                         │                           │
     ├─ Show Order Review ────>│                           │
     │                         │                           │
     ├─ Request Approval ─────>│                           │
     │                         │                           │
     │ User Approves           │                           │
     │                         ├─ Capture Order ────────>│
     │                         │  (with Order ID)        │
     │                         │                           │
     │                         │ Generate OAuth Token    │
     │                         │ Capture Payment         │
     │                         │                           │
     │                         │ Return Capture ID <────│
     │                         │                           │
```

### 3. Order Completion
```
Client                    Backend API              Database
     │                         │                      │
     ├─ Validation ───────────>│                      │
     │                         │                      │
     │                         ├─ Create Order ─────>│
     │                         │  (with PayPal ID)    │
     │                         │                      │
     │                         │ Insert Order ──────>│
     │                         │                      │
     │                         │ Store Items ───────>│
     │                         │                      │
     │                         │ Return Order ID <──│
     │                         │                      │
     │<───── Order ID ─────────┤                      │
     │                         │                      │
     └─ Redirect Success Page  │                      │
        & Send Email           │                      │
```

## API Call Examples

### Create Order API

```bash
POST /api/payment/paypal/create-order
Content-Type: application/json

{
  "amount": 50000,
  "currency": "KRW",
  "orderId": "ord-1234567890-abc123",
  "items": [
    {
      "name": "상품 A",
      "sku": "product-123",
      "quantity": "1",
      "unit_amount": {
        "currency_code": "KRW",
        "value": "50000"
      }
    }
  ]
}

Response:
{
  "success": true,
  "orderId": "7WH93094HL156411M",
  "message": "Order created successfully"
}
```

### Capture Order API

```bash
POST /api/payment/paypal/capture-order
Content-Type: application/json

{
  "orderId": "7WH93094HL156411M"
}

Response:
{
  "success": true,
  "orderId": "7WH93094HL156411M",
  "status": "COMPLETED",
  "captureId": "3C679366802822630",
  "paymentId": "3C679366802822630",
  "amount": "50000",
  "currency": "KRW",
  "message": "Payment captured successfully"
}
```

## Payment Method Comparison

### Card Payment (EasyPay)
```
Form Submission
      │
      ├─ /api/payment/register
      │  └─ Get payment page URL
      │
      ├─ Open EasyPay popup
      │
      ├─ EasyPay processes payment
      │
      ├─ EasyPay redirects to /api/payment/callback
      │
      ├─ /api/payment/approve
      │  └─ Verify with EasyPay
      │
      ├─ Create order if approved
      │
      └─ Redirect to complete page
```

### PayPal Payment
```
Form Submission
      │
      ├─ /api/payment/paypal/create-order
      │  └─ Create order with PayPal
      │
      ├─ PayPal popup shows
      │
      ├─ User approves payment
      │
      ├─ /api/payment/paypal/capture-order
      │  └─ Capture payment from PayPal
      │
      ├─ Create order if captured
      │
      └─ Redirect to complete page
```

## Authentication Flow

### OAuth 2.0 Client Credentials (Backend)

```
Backend Server           PayPal OAuth Server
      │                         │
      ├─ POST /v1/oauth2/token─>│
      │  - Client ID            │
      │  - Client Secret        │
      │  - Grant Type           │
      │                         │
      │<─ Access Token ─────────┤
      │  - Token Value          │
      │  - Token Type: Bearer   │
      │  - Expires In           │
      │                         │
      ├─ Call API with Token ──>│
      │  Authorization: Bearer  │
      │  {access_token}         │
      │                         │
      │<─ API Response ─────────┤
```

## Environment Configuration

```
┌──────────────────────────────────────────────┐
│           .env.local (Local Dev)             │
├──────────────────────────────────────────────┤
│ NEXT_PUBLIC_PAYPAL_CLIENT_ID=sb_xxxxx       │
│ PAYPAL_CLIENT_SECRET=xxxxx                  │
│ NEXT_PUBLIC_PAYPAL_SANDBOX=true             │
└──────────────────────────────────────────────┘
                    │
                    │ (CI/CD or Manual Deploy)
                    ▼
┌──────────────────────────────────────────────┐
│       Environment Variables (Production)     │
├──────────────────────────────────────────────┤
│ NEXT_PUBLIC_PAYPAL_CLIENT_ID=live_xxxxx    │
│ PAYPAL_CLIENT_SECRET=live_xxxxx            │
│ NEXT_PUBLIC_PAYPAL_SANDBOX=false           │
└──────────────────────────────────────────────┘
```

## Error Handling Flow

```
Payment Process
      │
      ├─ Validation Error
      │  └─ Show form error
      │
      ├─ Create Order Error
      │  ├─ PayPal API error
      │  ├─ Network error
      │  └─ Invalid request
      │     └─ Show error message
      │        └─ Allow retry
      │
      ├─ PayPal Popup Error
      │  └─ User cancels
      │     └─ Allow retry
      │
      ├─ Capture Order Error
      │  ├─ Payment already captured
      │  ├─ Order expired
      │  └─ PayPal API error
      │     └─ Show error message
      │        └─ Allow retry
      │
      ├─ Database Error
      │  └─ Order creation fails
      │     ├─ Log error
      │     ├─ Notify admin
      │     └─ Suggest contacting support
      │
      └─ Success
         └─ Create order
            └─ Send email
               └─ Redirect
```

## Security Architecture

```
┌────────────────────────────────────────────────┐
│             Client Browser                     │
│  ┌──────────────────────────────────────────┐ │
│  │ PUBLIC: PayPal Client ID                 │ │
│  │ VISIBLE: Form Data, Order Details        │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
                        │ HTTPS
                        │ (Encrypted)
┌────────────────────────────────────────────────┐
│          Backend API Server                    │
│  ┌──────────────────────────────────────────┐ │
│  │ SECRET: PayPal Client Secret             │ │
│  │ SECURED: OAuth Tokens, API Keys          │ │
│  │ VERIFIED: Payment Amounts, Order Data    │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
                        │ HTTPS
                        │ (Encrypted)
┌────────────────────────────────────────────────┐
│          PayPal Secure Servers                 │
│  ┌──────────────────────────────────────────┐ │
│  │ Handles Payment Processing                │ │
│  │ Returns Transaction IDs                   │ │
│  │ PCI DSS Compliant                        │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘

✅ Security Practices:
  - Client Secret never sent to browser
  - All API calls made from secure backend
  - HTTPS encryption for all connections
  - Amount verified before order creation
  - Order ID validated in capture request
  - Error messages don't reveal sensitive data
```

## Database Schema (Relevant Fields)

```sql
orders
├── id (Primary Key)
├── name (Customer Name)
├── email (Customer Email)
├── phone_num (Customer Phone)
├── address (Delivery Address)
├── delivery_method (팬미팅현장수령 | 국내배송 | 해외배송)
├── payment_method (card | paypal) ◄── NEW
├── easy_pay_id (Card Payment ID or PayPal Order ID) ◄── REPURPOSED
├── total_amount (Order Total)
├── created_at (Order Timestamp)
└── status (pending | completed | cancelled)

order_items
├── id (Primary Key)
├── order_id (Foreign Key)
├── product_id
├── quantity
├── option
├── unit_price
└── total_price
```

## File Structure

```
the_union_shop/
├── app/
│   ├── payment/
│   │   └── page.tsx ◄── MODIFIED (Added PayPal button UI)
│   └── api/
│       └── payment/
│           ├── register/ (EasyPay - existing)
│           ├── callback/ (EasyPay - existing)
│           ├── approve/ (EasyPay - existing)
│           └── paypal/ ◄── NEW
│               ├── create-order/
│               │   └── route.ts ◄── NEW
│               └── capture-order/
│                   └── route.ts ◄── NEW
├── lib/
│   ├── cart.ts (existing)
│   ├── email.ts (existing)
│   ├── orders.ts (existing)
│   └── utils.ts (existing)
├── PAYPAL_INTEGRATION.md ◄── NEW (Complete guide)
├── PAYPAL_SETUP_QUICKSTART.md ◄── NEW (Quick start)
├── PAYPAL_IMPLEMENTATION_SUMMARY.md ◄── NEW (This file)
├── .env.local ◄── MODIFIED (Added PayPal env vars)
└── package.json ◄── MODIFIED (Added PayPal dependency)
```

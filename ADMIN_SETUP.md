# Admin Dashboard Setup Guide

## Overview

The admin dashboard allows authorized administrators to manage orders across three status categories: waiting, paid, and complete.

## Features

- Secure login authentication with session management
- Three-tab interface for order management:
  - **Waiting**: Orders pending payment (PayPal/bank transfer orders)
  - **Paid**: Orders with confirmed payment
  - **Complete**: Fulfilled orders
- Order status updates with one-click actions
- Detailed order information including:
  - Customer details (name, email, phone)
  - Delivery method and address
  - Order items with quantities and prices
  - Total amount and payment method
  - Order timestamps

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
```

**Important**: Change these default credentials to secure values before deploying to production!

### 2. Access the Admin Dashboard

1. Navigate to [http://localhost:3000/admin](http://localhost:3000/admin)
2. You'll be redirected to the login page
3. Enter your admin credentials
4. Upon successful login, you'll be redirected to the dashboard

## Usage

### Managing Orders

#### Waiting Tab
- View all orders awaiting payment confirmation
- Action: **Mark as Paid** - Move order to the Paid tab

#### Paid Tab
- View all orders with confirmed payment
- Actions:
  - **Mark as Complete** - Move order to Complete tab after fulfillment
  - **Back to Waiting** - Revert to Waiting status if needed

#### Complete Tab
- View all fulfilled orders
- Action: **Back to Paid** - Revert to Paid status if needed

### Order Information Displayed

Each order card shows:
- Order ID (first 8 characters)
- Creation timestamp
- Status badge
- Customer information (name, email, phone)
- Delivery method and address
- Itemized list of products with quantities
- Total amount
- Payment method

### Logging Out

Click the **Logout** button in the top-right corner of the admin dashboard.

## Security Considerations

### Current Implementation

The current implementation uses a simple cookie-based session system suitable for internal use and development. Key features:

- Protected routes via middleware
- HTTP-only cookies
- Session expiration (24 hours)

### Production Recommendations

Before deploying to production, consider these security enhancements:

1. **Use Environment Variables**: Store admin credentials in secure environment variables, never in code
2. **Strong Passwords**: Use strong, unique passwords with at least 12 characters
3. **Password Hashing**: Implement bcrypt or argon2 for password hashing
4. **JWT Tokens**: Replace simple cookies with JWT tokens for better security
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **HTTPS Only**: Ensure the site runs on HTTPS in production
7. **Multiple Admins**: Implement a proper user system if multiple admins need access
8. **Audit Logs**: Track admin actions for accountability
9. **Two-Factor Authentication**: Add 2FA for additional security
10. **IP Whitelisting**: Restrict admin access to specific IP addresses if possible

## File Structure

```
app/
├── admin/
│   ├── layout.tsx          # Admin layout with header and logout
│   ├── page.tsx            # Main dashboard with tabs
│   └── login/
│       └── page.tsx        # Login page
├── api/
│   └── admin/
│       ├── login/
│       │   └── route.ts    # Login endpoint
│       ├── logout/
│       │   └── route.ts    # Logout endpoint
│       └── orders/
│           ├── route.ts     # Get orders endpoint
│           └── [id]/
│               └── route.ts # Update order status endpoint
lib/
└── orders.ts               # Order management functions (extended)
middleware.ts               # Route protection
```

## API Endpoints

### POST /api/admin/login
Authenticate admin user
- Body: `{ username: string, password: string }`
- Response: `{ success: boolean }` or `{ error: string }`

### POST /api/admin/logout
End admin session
- Response: `{ success: boolean }`

### GET /api/admin/orders?status={status}
Get orders filtered by status
- Query param: `status` (optional) - "waiting", "paid", or "complete"
- Response: Array of orders with items
- Requires authentication

### PATCH /api/admin/orders/{id}
Update order status
- Body: `{ status: string }`
- Response: Updated order object
- Requires authentication

## Troubleshooting

### Cannot access admin dashboard
- Ensure you're logged in with correct credentials
- Check that cookies are enabled in your browser
- Verify environment variables are set correctly

### Orders not loading
- Check browser console for errors
- Verify Supabase connection is working
- Ensure the database tables exist and have correct permissions

### Status update fails
- Verify you're authenticated
- Check that the order ID is valid
- Review server logs for specific errors

## Future Enhancements

Potential improvements for the admin system:

- Search and filter orders by customer name, email, or order ID
- Date range filtering
- Export orders to CSV/Excel
- Email notifications to customers on status changes
- Order analytics and statistics dashboard
- Bulk status updates
- Order notes and internal comments
- Customer management section
- Product inventory management
- Integration with shipping providers

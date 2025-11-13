# PayPal Integration Logging Guide

This document describes the comprehensive logging added to the international delivery payment page to help debug PayPal functionality issues.

## Log Categories

All logs are prefixed with a category tag in brackets for easy filtering. You can filter logs in the browser console using:

```javascript
// Filter by category
console.filter = (category) => {
  const original = console.log;
  console.log = (...args) => {
    if (args[0]?.includes(`[${category}]`)) {
      original.apply(console, args);
    }
  };
};
```

## Log Categories and What They Track

### 1. `[Page Init]` - Page Initialization
- **When**: Component first loads
- **What**: Initial setup information
- **Key Data**:
  - `orderId`: The order ID from URL params
  - `clientIdPresent`: Whether PayPal Client ID is configured

**Example:**
```
[Page Init] Component initialized { orderId: "abc-123", clientIdPresent: true }
```

---

### 2. `[Order Fetch]` - Order Data Loading
- **When**: Fetching order details from database
- **What**: Order and order items retrieval process
- **Key Steps**:
  1. Starting order fetch
  2. Fetching order from database
  3. Order fetched successfully (includes delivery fee payment status)
  4. Fetching order items
  5. Items fetched successfully (includes item count)
  6. Setting order state
  7. Fetch completed

**Example Success Flow:**
```
[Order Fetch] Starting order fetch { orderId: "abc-123" }
[Order Fetch] Fetching order from database
[Order Fetch] Order fetched successfully { orderId: "abc-123", deliveryFeePaid: false }
[Order Fetch] Fetching order items
[Order Fetch] Items fetched successfully { itemCount: 3 }
[Order Fetch] Setting order state { ...orderData }
[Order Fetch] Fetch completed
```

**Example Error:**
```
[Order Fetch] Order not found { error: ... }
```

---

### 3. `[PayPal SDK]` - SDK Loading
- **When**: Loading PayPal JavaScript SDK from CDN
- **What**: SDK script injection and initialization
- **Key Steps**:
  1. Load effect triggered
  2. Skipping load (if already loaded or missing client ID)
  3. Creating script element
  4. Script appended to body
  5. Script loaded successfully
  6. Cleanup: removing script (when currency changes)

**Example Success Flow:**
```
[PayPal SDK] Load effect triggered { clientId: "present", sdkLoadedRef: false, selectedCurrency: "USD" }
[PayPal SDK] Creating script element { scriptUrl: "https://www.paypal.com/sdk/js?..." }
[PayPal SDK] Script appended to body
[PayPal SDK] Script loaded successfully { paypalAvailable: true }
```

**Example Currency Change:**
```
[PayPal SDK] Cleanup: removing script
[PayPal SDK] Found 1 PayPal scripts to remove
[PayPal SDK] Load effect triggered { clientId: "present", sdkLoadedRef: false, selectedCurrency: "JPY" }
...
```

---

### 4. `[PayPal Button]` - Button Rendering
- **When**: Rendering PayPal payment button
- **What**: Button setup and rendering process
- **Key Steps**:
  1. Render effect triggered
  2. Skipping render (with reason if not ready)
  3. Clearing container
  4. Preparing to render button
  5. Button rendered successfully

**Example Success Flow:**
```
[PayPal Button] Render effect triggered {
  sdkLoaded: true,
  paypalAvailable: true,
  orderLoaded: true,
  deliveryFeePaid: false,
  containerReady: true,
  selectedCurrency: "USD"
}
[PayPal Button] Clearing container
[PayPal Button] Preparing to render button { amount: "10.20", currency: "USD", orderId: "abc-123" }
[PayPal Button] Button rendered successfully
```

**Example Not Ready:**
```
[PayPal Button] Render effect triggered { ... }
[PayPal Button] Skipping render { reason: "SDK not loaded" }
```

---

### 5. `[PayPal Button]` - Payment Flow
These logs track the actual payment process:

#### a. Creating Order
- **When**: User clicks PayPal button
- **What**: Creating PayPal order

```
[PayPal Button] createOrder called
[PayPal Button] Creating order with data: { intent: "CAPTURE", purchase_units: [...] }
[PayPal Button] Order created successfully: "PAYPAL_ORDER_ID"
```

#### b. Payment Approval
- **When**: User completes payment in PayPal popup
- **What**: Capturing payment and updating database

```
[PayPal Button] onApprove called { ... }
[PayPal Button] Capturing payment...
[PayPal Button] Payment captured successfully: { id: "...", status: "COMPLETED" }
[PayPal Button] Updating database...
[PayPal Button] Database update response: { ok: true, status: 200 }
[PayPal Button] Payment completed successfully
[PayPal Button] Processing completed
```

#### c. Payment Cancellation
- **When**: User cancels payment

```
[PayPal Button] Payment cancelled by user
```

#### d. Payment Error
- **When**: Error occurs during payment

```
[PayPal Button] PayPal error: { ... }
[PayPal Button] Error message: "..."
```

---

### 6. `[Currency]` - Currency Selection
- **When**: User changes payment currency
- **What**: Currency selection changes

**Example:**
```
[Currency] Changing currency to JPY
```

This triggers PayPal SDK reload and button re-render.

---

## Common Debugging Scenarios

### Scenario 1: PayPal Button Not Appearing

Check these logs in order:
1. **`[Page Init]`** - Is clientId present?
2. **`[PayPal SDK]`** - Did SDK load successfully?
3. **`[Order Fetch]`** - Did order load successfully?
4. **`[PayPal Button] Render effect triggered`** - What's the reason for skipping?

### Scenario 2: Payment Not Processing

Check these logs:
1. **`[PayPal Button] createOrder called`** - Did order creation start?
2. **`[PayPal Button] Order created successfully`** - Was PayPal order created?
3. **`[PayPal Button] onApprove called`** - Did approval callback fire?
4. **`[PayPal Button] Payment captured successfully`** - Was payment captured?
5. **`[PayPal Button] Database update response`** - Did database update succeed?

### Scenario 3: Currency Change Not Working

Check these logs:
1. **`[Currency] Changing currency to ...`** - Did currency change trigger?
2. **`[PayPal SDK] Cleanup: removing script`** - Did cleanup happen?
3. **`[PayPal SDK] Load effect triggered`** - Did SDK reload with new currency?
4. **`[PayPal Button] Render effect triggered`** - Did button re-render?

### Scenario 4: Database Not Updating After Payment

Check these logs:
1. **`[PayPal Button] Payment captured successfully`** - Verify payment ID and status
2. **`[PayPal Button] Database update response`** - Check response status
3. If response is not ok, check server logs at `/api/payment/delivery-fee/[id]`

---

## Filtering Logs in Browser Console

### View all PayPal-related logs:
```javascript
// Filter for all PayPal logs
localStorage.setItem('debug', '*PayPal*');
```

### View specific category:
```javascript
// In console, filter for specific category
// Chrome/Edge: Use the filter box and type "[PayPal SDK]"
// Firefox: Use the filter box and type "[PayPal SDK]"
```

### Export logs for support:
```javascript
// In console, right-click and "Save as..." to export console logs
```

---

## Integration with Browser DevTools

### Network Tab
Cross-reference with Network tab to see:
- PayPal SDK script loading (`paypal.com/sdk/js`)
- API calls to `/api/payment/delivery-fee/[id]`
- PayPal API calls during payment

### Performance Tab
Use Performance recording to see timing of:
- SDK loading
- Button rendering
- Payment processing

---

## Next Steps

If issues persist after checking logs:
1. Copy all console logs with the failing scenario
2. Check Network tab for failed requests
3. Verify environment variables (NEXT_PUBLIC_PAYPAL_CLIENT_ID)
4. Check PayPal Developer Dashboard for API issues
5. Review server logs for API route errors

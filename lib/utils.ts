/**
 * Format a number as Korean Won currency
 * @param amount - The amount to format
 * @returns Formatted string in Korean Won (e.g., "₩1,000")
 */
export function formatKRW(amount: number): string {
  return amount.toLocaleString("ko-KR", {
    style: "currency",
    currency: "KRW",
  });
}

/**
 * Format a number as US Dollar currency
 * @param amount - The amount to format
 * @returns Formatted string in USD (e.g., "$1,000.00")
 */
export function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * Format a number as Japanese Yen currency
 * @param amount - The amount to format
 * @returns Formatted string in JPY (e.g., "¥1,000")
 */
export function formatJPY(amount: number): string {
  return amount.toLocaleString("ja-JP", {
    style: "currency",
    currency: "JPY",
  });
}

/**
 * Format a number with Korean number grouping (no currency symbol)
 * @param amount - The amount to format
 * @returns Formatted string with commas (e.g., "1,000")
 */
export function formatNumber(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

/**
 * Email Service
 *
 * Handles sending emails via Google Apps Script Web App
 */

const EMAIL_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQZDZ36S9t3qH2CnNotnOzFLa5VJUYcZzxUBVBk_GJ3k8yWBJoksprA42Luuq6ZqJ4/exec";

export type OrderEmailData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  items: Array<{
    productName: string;
    productOption?: string;
    quantity: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  deliveryMethod: string;
  address?: string | null;
  phoneNum?: string | null;
};

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Sending order confirmation email to:', data.customerEmail);

    const formData = new FormData();
    formData.append("type", "order_confirmation");
    formData.append("order_id", data.orderId);
    if (data.customerName) formData.append("customer_name", data.customerName);
    if (data.customerEmail) formData.append("customer_email", data.customerEmail);
    if (data.orderDate) formData.append("order_date", data.orderDate);
    if (data.phoneNum) formData.append("phone_num", data.phoneNum);
    if (typeof data.totalAmount !== "undefined") formData.append("total_amount", String(data.totalAmount));
    if (data.deliveryMethod) formData.append("delivery_method", data.deliveryMethod);
    if (data.address) formData.append("address", data.address);

    // Add items as JSON string
    if (data.items && data.items.length > 0) {
      formData.append("items", JSON.stringify(data.items));
    }

    // Create a formatted list of items for the email body
    const itemsList = data.items
      .map((item) => {
        const option = item.productOption ? ` (${item.productOption})` : '';
        return `- ${item.productName}${option} x ${item.quantity}개 - ${item.totalPrice.toLocaleString('ko-KR')}원`;
      })
      .join('\n');

    // Create summary text (similar to sendOrderToGoogleAppsScript)
    const summary = [
      `주문번호: ${data.orderId}`,
      `주문자: ${data.customerName || "-"} (${data.phoneNum || "-"}) / ${data.customerEmail || "-"}`,
      `주문일시: ${data.orderDate || "-"}`,
      `배송방법: ${data.deliveryMethod || "-"}`,
      `배송주소: ${data.address || "-"}`,
      `총 결제금액: ${(data.totalAmount ?? 0).toLocaleString("ko-KR")}원`,
    ].join(" | ");
    formData.append("summary", summary);

    // Format the email subject
    const emailSubject = `[유메키 팬미팅] 주문이 완료되었습니다 (주문번호: ${data.orderId})`;
    formData.append("subject", emailSubject);

    // Format the email body
    const emailBody = `
안녕하세요, ${data.customerName}님!

유메키 팬미팅 <YOU MAKE IT> 주문이 성공적으로 완료되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주문 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

주문번호: ${data.orderId}
주문일시: ${data.orderDate}
주문자명: ${data.customerName}
연락처: ${data.phoneNum || '-'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ 주문 상품
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 결제 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

총 결제금액: ${data.totalAmount.toLocaleString('ko-KR')}원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 배송 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

배송 방법: ${data.deliveryMethod}
${data.address ? `배송 주소: ${data.address}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

주문하신 상품은 배송 방법에 따라 발송됩니다.
배송 추적은 주문 상세 페이지에서 확인 가능합니다.

주문 상세 보기: ${typeof window !== 'undefined' ? `${window.location.origin}/order/${data.orderId}` : `https://yourdomain.com/order/${data.orderId}`}

문의사항이 있으시면 언제든지 연락해주세요.

감사합니다.
유메키 팬미팅 <YOU MAKE IT>
    `.trim();
    formData.append("body", emailBody);

    const res = await fetch(EMAIL_SCRIPT_URL, { method: "POST", body: formData });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Email sending failed: ${res.status} ${text}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

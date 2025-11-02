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

    // Format the email content
    const emailSubject = `[유메키 팬미팅] 주문이 완료되었습니다 (주문번호: ${data.orderId})`;

    // Create a formatted list of items
    const itemsList = data.items
      .map((item) => {
        const option = item.productOption ? ` (${item.productOption})` : '';
        return `- ${item.productName}${option} x ${item.quantity}개 - ${item.totalPrice.toLocaleString('ko-KR')}원`;
      })
      .join('\n');

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

    // Call the Google Apps Script endpoint
    const response = await fetch(EMAIL_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.customerEmail,
        subject: emailSubject,
        body: emailBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Email sending failed:', errorText);
      return {
        success: false,
        error: `Failed to send email: ${response.status} ${response.statusText}`,
      };
    }

    const result = await response.json();

    if (result.success) {
      console.log('Order confirmation email sent successfully to:', data.customerEmail);
      return { success: true };
    } else {
      console.error('Email sending failed:', result.error);
      return {
        success: false,
        error: result.error || 'Unknown error',
      };
    }

  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Email Service
 *
 * Handles sending emails via Mailjet API
 */

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
 * Generate HTML email template
 */
function generateHtmlEmail(data: OrderEmailData, itemsList: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #4CAF50;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 24px;
    }
    .content {
      font-size: 14px;
      color: #555;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
    }
    .section-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-row {
      margin: 8px 0;
      color: #555;
    }
    .info-label {
      font-weight: 500;
      color: #666;
    }
    .items-list {
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    .items-list li {
      padding: 10px;
      margin: 5px 0;
      background-color: #fff;
      border-left: 3px solid #4CAF50;
      border-radius: 3px;
    }
    .total-amount {
      font-size: 18px;
      font-weight: bold;
      color: #4CAF50;
      text-align: right;
      margin-top: 15px;
      padding: 15px;
      background-color: #f0f8f0;
      border-radius: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🎉 주문 완료</h1>
      <p style="margin: 10px 0 0 0; color: #666;">유메키 팬미팅 &lt;YOU MAKE IT&gt;</p>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.customerName}</strong>님!</p>
      <p>유메키 팬미팅 &lt;YOU MAKE IT&gt; 주문이 성공적으로 완료되었습니다.</p>

      <div class="section">
        <div class="section-title">📋 주문 정보</div>
        <div class="info-row"><span class="info-label">주문번호:</span> ${data.orderId}</div>
        <div class="info-row"><span class="info-label">주문일시:</span> ${data.orderDate}</div>
        <div class="info-row"><span class="info-label">주문자명:</span> ${data.customerName}</div>
        <div class="info-row"><span class="info-label">연락처:</span> ${data.phoneNum || '-'}</div>
      </div>

      <div class="section">
        <div class="section-title">🛍️ 주문 상품</div>
        <ul class="items-list">
          ${data.items.map(item => {
            const option = item.productOption ? ` (${item.productOption})` : '';
            return `<li>${item.productName}${option} x ${item.quantity}개 - ${item.totalPrice.toLocaleString('ko-KR')}원</li>`;
          }).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">💰 결제 정보</div>
        <div class="total-amount">총 결제금액: ${data.totalAmount.toLocaleString('ko-KR')}원</div>
      </div>

      <div class="section">
        <div class="section-title">📦 배송 정보</div>
        <div class="info-row"><span class="info-label">배송 방법:</span> ${data.deliveryMethod}</div>
        ${data.address ? `<div class="info-row"><span class="info-label">배송 주소:</span> ${data.address}</div>` : ''}
      </div>

      <hr>

      <p style="color: #666; font-size: 13px;">
        주문하신 상품은 배송 방법에 따라 발송됩니다.<br>
        배송 추적은 주문 상세 페이지에서 확인 가능합니다.
      </p>

      <p style="color: #666; font-size: 13px;">
        문의사항이 있으시면 언제든지 연락해주세요.
      </p>

      <p style="margin-top: 30px; color: #888;">
        감사합니다.<br>
        <strong>유메키 팬미팅 &lt;YOU MAKE IT&gt;</strong>
      </p>
    </div>
    <div class="footer">
      <p>본 메일은 발신전용 메일입니다.</p>
      <p>문의사항이 있으시면 고객센터로 연락해주세요.</p>
      <p style="margin-top: 20px; color: #aaa;">© 2025 유메키 팬미팅. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email template for PayPal pending payment
 */
function generatePayPalPendingEmail(data: OrderEmailData, paypalEmail: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #0070BA;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0070BA;
      margin: 0;
      font-size: 24px;
    }
    .content {
      font-size: 14px;
      color: #555;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
    }
    .section-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-row {
      margin: 8px 0;
      color: #555;
    }
    .info-label {
      font-weight: 500;
      color: #666;
    }
    .items-list {
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    .items-list li {
      padding: 10px;
      margin: 5px 0;
      background-color: #fff;
      border-left: 3px solid #0070BA;
      border-radius: 3px;
    }
    .payment-info {
      font-size: 16px;
      font-weight: bold;
      color: #0070BA;
      text-align: center;
      margin-top: 20px;
      padding: 20px;
      background-color: #E8F4FF;
      border-radius: 5px;
      border: 2px solid #0070BA;
    }
    .total-amount {
      font-size: 18px;
      font-weight: bold;
      color: #0070BA;
      text-align: right;
      margin-top: 15px;
      padding: 15px;
      background-color: #E8F4FF;
      border-radius: 5px;
    }
    .next-steps {
      background-color: #FFF9E6;
      border-left: 4px solid #FFA500;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .next-steps ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .next-steps li {
      margin: 8px 0;
      color: #555;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>📋 주문 접수 완료</h1>
      <p style="margin: 10px 0 0 0; color: #666;">유메키 팬미팅 &lt;YOU MAKE IT&gt;</p>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.customerName}</strong>님!</p>
      <p>유메키 팬미팅 &lt;YOU MAKE IT&gt; 주문이 접수되었습니다.</p>

      <div class="next-steps">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">💡 다음 단계</div>
        <ol>
          <li>아래 PayPal 계정으로 <strong>${data.totalAmount.toLocaleString('ko-KR')}원</strong>을 송금해주세요</li>
          <li>입금 확인 후 <strong>주문 확인 메일</strong>을 보내드립니다</li>
          <li>배송 방법에 따라 상품이 발송됩니다</li>
        </ol>
      </div>

      <div class="payment-info">
        💳 PayPal 송금 계정<br>
        <div style="font-size: 20px; margin-top: 10px;">${paypalEmail}</div>
      </div>

      <div class="section">
        <div class="section-title">📋 주문 정보</div>
        <div class="info-row"><span class="info-label">주문번호:</span> ${data.orderId}</div>
        <div class="info-row"><span class="info-label">주문일시:</span> ${data.orderDate}</div>
        <div class="info-row"><span class="info-label">주문자명:</span> ${data.customerName}</div>
        <div class="info-row"><span class="info-label">연락처:</span> ${data.phoneNum || '-'}</div>
      </div>

      <div class="section">
        <div class="section-title">🛍️ 주문 상품</div>
        <ul class="items-list">
          ${data.items.map(item => {
            const option = item.productOption ? ` (${item.productOption})` : '';
            return `<li>${item.productName}${option} x ${item.quantity}개 - ${item.totalPrice.toLocaleString('ko-KR')}원</li>`;
          }).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">💰 결제 정보</div>
        <div class="total-amount">총 결제금액: ${data.totalAmount.toLocaleString('ko-KR')}원</div>
      </div>

      <div class="section">
        <div class="section-title">📦 배송 정보</div>
        <div class="info-row"><span class="info-label">배송 방법:</span> ${data.deliveryMethod}</div>
        ${data.address ? `<div class="info-row"><span class="info-label">배송 주소:</span> ${data.address}</div>` : ''}
      </div>

      <hr>

      <p style="color: #666; font-size: 13px;">
        입금이 확인되면 이메일로 알려드립니다.<br>
        입금 확인 후 배송 방법에 따라 발송됩니다.
      </p>

      <p style="color: #666; font-size: 13px;">
        문의사항이 있으시면 언제든지 연락해주세요.
      </p>

      <p style="margin-top: 30px; color: #888;">
        감사합니다.<br>
        <strong>유메키 팬미팅 &lt;YOU MAKE IT&gt;</strong>
      </p>
    </div>
    <div class="footer">
      <p>본 메일은 발신전용 메일입니다.</p>
      <p>문의사항이 있으시면 고객센터로 연락해주세요.</p>
      <p style="margin-top: 20px; color: #aaa;">© 2025 유메키 팬미팅. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send PayPal pending payment email via Mailjet API
 */
export async function sendPayPalPendingEmail(data: OrderEmailData, paypalEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Sending PayPal pending payment email to:', data.customerEmail);

    // Validate that customer email exists
    if (!data.customerEmail) {
      throw new Error('Customer email is required');
    }

    // Validate Mailjet credentials
    const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
    const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY;
    const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'ew@astcompany.co.kr';
    const FROM_NAME = process.env.MAILJET_FROM_NAME || 'Daniel Lee';

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      throw new Error('Mailjet API credentials are not configured');
    }

    // Create a formatted list of items for the plain text version
    const itemsList = data.items
      .map((item) => {
        const option = item.productOption ? ` (${item.productOption})` : '';
        return `- ${item.productName}${option} x ${item.quantity}개 - ${item.totalPrice.toLocaleString('ko-KR')}원`;
      })
      .join('\n');

    // Format the email subject
    const emailSubject = `[유메키 팬미팅] 주문이 접수되었습니다 - 입금 안내 (주문번호: ${data.orderId.substring(0, 8)})`;

    // Format the plain text email body
    const textBody = `
안녕하세요, ${data.customerName}님!

유메키 팬미팅 <YOU MAKE IT> 주문이 접수되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 다음 단계
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 아래 PayPal 계정으로 ${data.totalAmount.toLocaleString('ko-KR')}원을 송금해주세요
2. 입금 확인 후 주문 확인 메일을 보내드립니다
3. 배송 방법에 따라 상품이 발송됩니다

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 PayPal 송금 계정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${paypalEmail}

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

입금이 확인되면 이메일로 알려드립니다.
입금 확인 후 배송 방법에 따라 발송됩니다.

문의사항이 있으시면 언제든지 연락해주세요.

감사합니다.
유메키 팬미팅 <YOU MAKE IT>
    `.trim();

    // Generate HTML version
    const htmlBody = generatePayPalPendingEmail(data, paypalEmail);

    // Prepare Mailjet API request
    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME,
          },
          To: [
            {
              Email: data.customerEmail,
              Name: data.customerName,
            },
          ],
          Subject: emailSubject,
          TextPart: textBody,
          HTMLPart: htmlBody,
          CustomID: data.orderId,
        },
      ],
    };

    console.log('Sending request to Mailjet API:', {
      to: data.customerEmail,
      subject: emailSubject,
      orderId: data.orderId,
    });

    // Create Basic Auth header
    const authString = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(mailjetPayload),
    });

    console.log('Response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Mailjet API failed: ${res.status} ${text}`);
    }

    // Parse the response
    const responseData = await res.json().catch(() => ({}));
    console.log('Response data:', responseData);

    // Check if the request was successful
    if (responseData.Messages && responseData.Messages[0]?.Status === 'success') {
      console.log('PayPal pending email sent successfully:', responseData);
      return { success: true };
    } else {
      const errorMsg = responseData.Messages?.[0]?.Errors?.[0]?.ErrorMessage || 'Email sending failed';
      throw new Error(errorMsg);
    }

  } catch (error) {
    console.error('Error sending PayPal pending payment email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send order confirmation email via Mailjet API
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Sending order confirmation email to:', data.customerEmail);

    // Validate that customer email exists
    if (!data.customerEmail) {
      throw new Error('Customer email is required');
    }

    // Validate Mailjet credentials
    const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
    const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY;
    const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'ew@astcompany.co.kr';
    const FROM_NAME = process.env.MAILJET_FROM_NAME || 'Daniel Lee';

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      throw new Error('Mailjet API credentials are not configured');
    }

    // Create a formatted list of items for the plain text version
    const itemsList = data.items
      .map((item) => {
        const option = item.productOption ? ` (${item.productOption})` : '';
        return `- ${item.productName}${option} x ${item.quantity}개 - ${item.totalPrice.toLocaleString('ko-KR')}원`;
      })
      .join('\n');

    // Format the email subject
    const emailSubject = `[유메키 팬미팅] 주문이 완료되었습니다 (주문번호: ${data.orderId.substring(0, 8)})`;

    // Format the plain text email body
    const textBody = `
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

문의사항이 있으시면 언제든지 연락해주세요.

감사합니다.
유메키 팬미팅 <YOU MAKE IT>
    `.trim();

    // Generate HTML version
    const htmlBody = generateHtmlEmail(data, itemsList);

    // Prepare Mailjet API request
    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME,
          },
          To: [
            {
              Email: data.customerEmail,
              Name: data.customerName,
            },
          ],
          Subject: emailSubject,
          TextPart: textBody,
          HTMLPart: htmlBody,
          CustomID: data.orderId,
        },
      ],
    };

    console.log('Sending request to Mailjet API:', {
      to: data.customerEmail,
      subject: emailSubject,
      orderId: data.orderId,
    });

    // Create Basic Auth header
    const authString = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(mailjetPayload),
    });

    console.log('Response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Mailjet API failed: ${res.status} ${text}`);
    }

    // Parse the response
    const responseData = await res.json().catch(() => ({}));
    console.log('Response data:', responseData);

    // Check if the request was successful
    if (responseData.Messages && responseData.Messages[0]?.Status === 'success') {
      console.log('Email sent successfully:', responseData);
      return { success: true };
    } else {
      const errorMsg = responseData.Messages?.[0]?.Errors?.[0]?.ErrorMessage || 'Email sending failed';
      throw new Error(errorMsg);
    }

  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

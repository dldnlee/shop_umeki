import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type Recipient = {
  email: string;
  name: string;
  id?: string;
  orderId?: string;
};

type SendCustomEmailRequest = {
  recipients: Recipient[];
  subject: string;
  htmlContent: string;
  textContent: string;
};

/**
 * Replace variables in content with customer data
 */
function replaceVariables(content: string, customerName: string, customerEmail: string, orderId?: string): string {
  return content
    .replace(/\{\{name\}\}/g, customerName)
    .replace(/\{\{email\}\}/g, customerEmail)
    .replace(/\{\{orderId\}\}/g, orderId || '');
}

/**
 * Generate HTML email from content
 */
function generateHtmlEmail(subject: string, content: string): string {
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
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${subject || '제목 없음'}</h1>
      <p style="margin: 10px 0 0 0; color: #666;">유메키 팬미팅 &lt;YOU MAKE IT&gt;</p>
    </div>
    <div class="content">
      ${content || '내용 없음'}
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
 * Send custom email to multiple recipients via Mailjet API
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    // const cookieStore = await cookies();
    // const authCookie = cookieStore.get('admin_authenticated');

    // if (!authCookie || authCookie.value !== 'true') {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Parse request body
    const body: SendCustomEmailRequest = await request.json();
    const { recipients, subject, htmlContent, textContent } = body;

    // Validate inputs
    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients provided' },
        { status: 400 }
      );
    }

    if (!subject || !htmlContent || !textContent) {
      return NextResponse.json(
        { error: 'Subject, HTML content, and text content are required' },
        { status: 400 }
      );
    }

    // Validate Mailjet credentials
    const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
    const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY;
    const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'ew@astcompany.co.kr';
    const FROM_NAME = process.env.MAILJET_FROM_NAME || 'Daniel Lee';

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Mailjet API credentials are not configured' },
        { status: 500 }
      );
    }

    // Prepare messages for each recipient with personalization
    const messages = recipients.map((recipient) => {
      const orderId = recipient.orderId || recipient.id;
      const personalizedSubject = replaceVariables(subject, recipient.name, recipient.email, orderId);
      const personalizedTextContent = replaceVariables(textContent, recipient.name, recipient.email, orderId);
      const personalizedHtmlContent = generateHtmlEmail(
        personalizedSubject,
        replaceVariables(htmlContent, recipient.name, recipient.email, orderId)
      );

      return {
        From: {
          Email: FROM_EMAIL,
          Name: FROM_NAME,
        },
        To: [
          {
            Email: recipient.email,
            Name: recipient.name,
          },
        ],
        Subject: personalizedSubject,
        TextPart: personalizedTextContent,
        HTMLPart: personalizedHtmlContent,
        CustomID: `custom-email-${Date.now()}-${recipient.email}`,
      };
    });

    // Create Basic Auth header
    const authString = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

    // Send emails via Mailjet API
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({ Messages: messages }),
    });

    console.log('Mailjet response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Mailjet API error:', errorText);
      return NextResponse.json(
        { error: `Mailjet API failed: ${response.status}` },
        { status: response.status }
      );
    }

    // Parse the response
    const responseData = await response.json().catch(() => ({}));
    console.log('Mailjet response data:', responseData);

    // Count successful sends
    const successCount = responseData.Messages?.filter(
      (msg: any) => msg.Status === 'success'
    ).length || 0;

    const failureCount = recipients.length - successCount;

    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      totalRecipients: recipients.length,
    });

  } catch (error) {
    console.error('Error sending custom emails:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

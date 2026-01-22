import { NextRequest, NextResponse } from 'next/server';

type Recipient = {
  email: string;
  name: string;
  id?: string;
  orderId?: string;
};

type Attachment = {
  filename: string;
  contentType: string;
  base64Content: string;
};

type SendCustomEmailRequest = {
  recipients: Recipient[];
  subject: string;
  htmlContent: string;
  textContent: string;
  attachments?: Attachment[];
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
 * Process content to make images email-compatible
 * - Adds inline styles for maximum compatibility
 * - Ensures alt text is present
 * - Wraps images in table cells for Outlook compatibility
 */
function processImagesForEmail(content: string): string {
  // Match img tags and enhance them for email compatibility
  return content.replace(
    /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, src, after) => {
      // Extract existing alt text or use default
      const altMatch = match.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1] : '이미지';

      // Remove existing style and alt to rebuild them
      const cleanBefore = before.replace(/style=["'][^"']*["']/gi, '').replace(/alt=["'][^"']*["']/gi, '');
      const cleanAfter = after.replace(/style=["'][^"']*["']/gi, '').replace(/alt=["'][^"']*["']/gi, '');

      // Build email-compatible image with inline styles
      // Using table wrapper for Outlook compatibility
      return `
<!--[if mso]>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<![endif]-->
<img ${cleanBefore}src="${src}" alt="${alt}" ${cleanAfter}style="display: block; max-width: 100%; width: 100%; height: auto; margin: 10px auto; border: 0; outline: none; text-decoration: none;" />
<!--[if mso]>
</td></tr></table>
<![endif]-->`;
    }
  );
}

/**
 * Generate plain text version from HTML content
 * Strips HTML tags and converts to readable plain text
 */
function generatePlainTextFromHtml(htmlContent: string): string {
  return htmlContent
    // Replace <br> and </p> with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    // Replace images with alt text placeholder
    .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, '[이미지: $1]')
    .replace(/<img[^>]*>/gi, '[이미지]')
    // Remove Outlook conditional comments
    .replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up extra whitespace but preserve intentional line breaks
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '') // Remove trailing spaces on each line
    .trim();
}

/**
 * Convert plain text line breaks and whitespace to HTML
 * Preserves existing HTML tags while converting text formatting
 */
function convertTextToHtml(text: string): string {
  // Split content by HTML tags to process text portions separately
  const htmlTagRegex = /(<[^>]+>)/g;
  const parts = text.split(htmlTagRegex);

  return parts.map(part => {
    // If it's an HTML tag, leave it as-is
    if (part.startsWith('<') && part.endsWith('>')) {
      return part;
    }
    // For text content, convert whitespace
    return part
      // Convert multiple spaces to non-breaking spaces (preserve indentation)
      .replace(/  /g, '&nbsp;&nbsp;')
      // Convert newlines to <br> tags
      .replace(/\n/g, '<br>\n');
  }).join('');
}

/**
 * Generate HTML email from content
 * Uses table-based layout and inline CSS for maximum email client compatibility
 */
function generateHtmlEmail(subject: string, content: string): string {
  // Process images for email compatibility
  const processedContent = processImagesForEmail(content);

  // Convert line breaks and whitespace to HTML
  const formattedContent = convertTextToHtml(processedContent);

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="ko">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${subject || '유메키 팬미팅'}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', Arial, sans-serif; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <!-- Wrapper table for background -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!-- Main content table -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 30px 20px 30px; border-bottom: 3px solid #4CAF50;">
              <h1 style="margin: 0; font-size: 24px; color: #4CAF50; font-weight: bold; line-height: 1.3;">${subject || '제목 없음'}</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666;">유메키 팬미팅 &lt;YOU MAKE IT&gt;</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px; font-size: 14px; line-height: 1.6; color: #555555;">
              ${formattedContent || '내용 없음'}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 30px 30px 30px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #888888;">본 메일은 발신전용 메일입니다.</p>
              <p style="margin: 0 0 15px 0; font-size: 12px; color: #888888;">문의사항이 있으시면 고객센터로 연락해주세요.</p>
              <p style="margin: 0; font-size: 11px; color: #aaaaaa;">&copy; 2025 유메키 팬미팅. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
    const { recipients, subject, htmlContent, textContent, attachments } = body;

    console.log('Received request body:', {
      recipientCount: recipients?.length,
      hasSubject: !!subject,
      hasHtmlContent: !!htmlContent,
      hasTextContent: !!textContent,
      sampleRecipient: recipients?.[0],
      attachmentCount: attachments?.length || 0,
    });

    // Validate inputs
    if (!recipients || recipients.length === 0) {
      console.error('Validation failed: No recipients provided');
      return NextResponse.json(
        { error: 'No recipients provided' },
        { status: 400 }
      );
    }

    // Validate each recipient has required fields
    const invalidRecipients = recipients.filter(r => !r.email || !r.name);
    if (invalidRecipients.length > 0) {
      console.error('Validation failed: Invalid recipients', invalidRecipients);
      return NextResponse.json(
        {
          error: 'All recipients must have email and name fields',
          invalidCount: invalidRecipients.length,
        },
        { status: 400 }
      );
    }

    if (!subject || !htmlContent || !textContent) {
      console.error('Validation failed:', {
        hasSubject: !!subject,
        hasHtmlContent: !!htmlContent,
        hasTextContent: !!textContent,
      });
      return NextResponse.json(
        {
          error: 'Subject, HTML content, and text content are required',
          details: {
            hasSubject: !!subject,
            hasHtmlContent: !!htmlContent,
            hasTextContent: !!textContent,
          }
        },
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

    // Create Basic Auth header
    const authString = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

    // Send emails one by one using a for loop
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const orderId = recipient.orderId || recipient.id;

      console.log(`Sending email ${i + 1}/${recipients.length} to ${recipient.email}`);

      try {
        const personalizedSubject = replaceVariables(subject, recipient.name, recipient.email, orderId);
        const personalizedRawContent = replaceVariables(htmlContent, recipient.name, recipient.email, orderId);
        const personalizedHtmlContent = generateHtmlEmail(personalizedSubject, personalizedRawContent);
        // Generate plain text fallback from HTML content for clients that don't support HTML
        const personalizedTextContent = generatePlainTextFromHtml(personalizedRawContent);

        // Build Mailjet message object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message: Record<string, any> = {
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
          CustomID: `custom-email-${Date.now()}-${i}-${recipient.email}`,
        };

        // Add attachments if present
        if (attachments && attachments.length > 0) {
          message.Attachments = attachments.map(att => ({
            ContentType: att.contentType,
            Filename: att.filename,
            Base64Content: att.base64Content,
          }));
        }

        // Send individual email via Mailjet API
        const response = await fetch('https://api.mailjet.com/v3.1/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`,
          },
          body: JSON.stringify({ Messages: [message] }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error(`Failed to send email to ${recipient.email}:`, errorText);
          errors.push({ email: recipient.email, error: `API error: ${response.status}` });
          failureCount++;
        } else {
          const responseData = await response.json().catch(() => ({}));
          console.log(`Email sent successfully to ${recipient.email}:`, responseData);

          // Check if Mailjet marked it as success
          const mailjetSuccess = responseData.Messages?.[0]?.Status === 'success';
          if (mailjetSuccess) {
            successCount++;
          } else {
            failureCount++;
            errors.push({
              email: recipient.email,
              error: responseData.Messages?.[0]?.Errors?.[0]?.ErrorMessage || 'Unknown error'
            });
          }
        }
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }

      // Small delay to avoid rate limiting (50ms between emails)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      successCount,
      failureCount,
      totalRecipients: recipients.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Error sending custom emails:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

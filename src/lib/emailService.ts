// src/utils/emailService.ts
import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import sesClient from "../aws/sesClient";

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
}

export const sendEmail = async ({
  to,
  subject,
  htmlBody,
  textBody,
  from = "noreply@ubcma.ca",
}: EmailParams): Promise<void> => {
  const command = new SendEmailCommand({
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: htmlBody },
          ...(textBody ? { Text: { Data: textBody } } : {}),
        },
      },
    },
    FromEmailAddress: from,
  });

  try {
    await sesClient.send(command);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};


export interface EmailAttachment {
  filename: string;
  contentType: string; // e.g. "image/png", "application/pdf"
  content: Buffer;
  disposition?: "inline" | "attachment"; // default: attachment
  cid?: string; // optional Content-ID (for inline)
}

interface SendEmailWithAttachmentsParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  from?: string;
}

/**
 * Sends an email via AWS SESv2 with multiple attachments (inline or file)
 */
export const sendEmailWithAttachments = async ({
  to,
  subject,
  htmlBody,
  textBody,
  attachments = [],
  from = "noreply@ubcma.ca",
}: SendEmailWithAttachmentsParams): Promise<void> => {
  // Create a unique MIME boundary
  const boundary = "----=_Boundary_" + Math.random().toString(36).substring(2);

  // Build MIME header + HTML section
  let mime = `
From: ${from}
To: ${to}
Subject: ${subject}
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Type: multipart/mixed; boundary="${boundary}"

--${boundary}
Content-Type: multipart/alternative; boundary="alt-${boundary}"

--alt-${boundary}
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${textBody || "View this email in HTML format for best experience."}

--alt-${boundary}
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${htmlBody}

--alt-${boundary}--
`;

  // Add each attachment
  for (const att of attachments) {
    mime += `
--${boundary}
Content-Type: ${att.contentType}; name="${att.filename}"
Content-Disposition: ${att.disposition || "attachment"}; filename="${att.filename}"
${att.cid ? `Content-ID: <${att.cid}>` : ""}
Content-Transfer-Encoding: base64

${att.content.toString("base64")}
`;
  }

  mime += `\n--${boundary}--`;

  // Build SESv2 SendEmailCommand
  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: {
      Raw: {
        Data: Buffer.from(mime),
      },
    },
  });

  try {
    await sesClient.send(command);
    console.log(
      `✅ Sent email to ${to} with ${attachments.length} attachment(s)`
    );
  } catch (err) {
    console.error("❌ Error sending SESv2 raw email:", err);
    throw err;
  }
};
export const sendEmailWithQR = async ({
  to,
  subject,
  htmlBody,
  qrBuffer,
  from = "noreply@ubcma.ca",
}: {
  to: string;
  subject: string;
  htmlBody: string;
  qrBuffer: Buffer;
  from?: string;
}): Promise<void> => {
  const outerBoundary = "outer_" + Math.random().toString(36).substring(2);
  const innerBoundary = "inner_" + Math.random().toString(36).substring(2);

  const mimeMessage = `
From: ${from}
To: ${to}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/related; boundary="${outerBoundary}"

--${outerBoundary}
Content-Type: multipart/alternative; boundary="${innerBoundary}"

--${innerBoundary}
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

Your UBCMA event ticket is attached. View the HTML version to see your QR code.

--${innerBoundary}
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${htmlBody}

--${innerBoundary}--
--${outerBoundary}
Content-Type: image/png; name="ticket.png"
Content-ID: <qr_ticket@ubcma>
Content-Disposition: inline; filename="ticket.png"
Content-Transfer-Encoding: base64

${qrBuffer.toString("base64")}
--${outerBoundary}--
`;

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: { Raw: { Data: Buffer.from(mimeMessage.replace(/\n/g, "\r\n")), } },
  });

  await sesClient.send(command);
  console.log(`✅ Email with inline QR sent to ${to}`);
};

/*

export const sendEmailWithAttachment = async ({
  to,
  from = "noreply@ubcma.ca",
  subject,
  htmlBody,
  qrBuffer,
}: {
  to: string;
  from?: string;
  subject: string;
  htmlBody: string;
  qrBuffer: Buffer; 
}) => {
  const boundary = "----=_Boundary_" + Math.random().toString(36).substring(2);

  // build manual mime 
  const mimeMessage = `
From: ${from}
To: ${to}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/related; boundary="${boundary}"

--${boundary}
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${htmlBody}

--${boundary}
Content-Type: image/png; name="ticket.png"
Content-ID: <qr_ticket@ubcma>
Content-Disposition: inline; filename="ticket.png"
Content-Transfer-Encoding: base64

${qrBuffer.toString("base64")}
--${boundary}--
`;

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: {
      Raw: { Data: Buffer.from(mimeMessage) },
    },
  });

  await sesClient.send(command);
  console.log(`Sent email with QR attachment to ${to}`);
};

*/
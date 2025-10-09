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
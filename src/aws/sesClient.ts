import { SESv2Client } from "@aws-sdk/client-sesv2";

const accessKeyId= process.env.AWS_ACCESS_KEY_ID || ""
const secretAccessKey= process.env.AWS_SECRET_ACCESS_KEY || ""

const sesClient = new SESv2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

export default sesClient;


import fs from "fs";
import path from "path";


//* Temporary route for qr code generationtemporary solution for local storage 
 
export async function generateTicketQR(ticketCode: string): Promise<{ filePath: string; urlPath: string }> {
var QRCode = require('qrcode')
  const qrDir = path.join(process.cwd(), "public", "qr");
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const filePath = path.join(qrDir, `${ticketCode}.png`);
  await QRCode.toFile(filePath, ticketCode, {
    color: { dark: "#000000", light: "#FFFFFF" },
    width: 256,
  });

  const urlPath = `${process.env.BACKEND_URL}/qr/${ticketCode}.png`;
  return { filePath, urlPath };
}

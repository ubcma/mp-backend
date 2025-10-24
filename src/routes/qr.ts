// src/routes/qr.ts
import { Router } from "express";
import QRCode from 'qrcode'
import { PassThrough } from "stream";

export const qrRouter = Router();


//* Temporary route for qr code generation

qrRouter.get("/:content", async (req, res) => {
  try {
    const content = req.params.content;

    // Set response headers
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000"); // optional

    const qrStream = new PassThrough();

    // Generate and stream QR PNG
    await QRCode.toFileStream(qrStream, content, {
      type: "png",
      width: 256,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    qrStream.pipe(res);
  } catch (err) {
    console.error("Failed to generate QR:", err);
    res.status(500).send("Failed to generate QR code");
  }
});

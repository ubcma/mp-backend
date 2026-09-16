import { Router } from "express";
import { s3 } from "../aws/s3Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream"

const qrRouter = Router();

// Stream QR from S3 to browser/email clients
qrRouter.get("/:ticketCode", async (req, res) => {
  try {
    const { ticketCode } = req.params;
    const key = `tickets/${ticketCode}.png`;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
    });

    const response = await s3.send(command);
    const body = response.Body;
    const contentType = response.ContentType || "image/png";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    // Handle different Body types of object safelyy from S3
    if (body instanceof Readable) {
      body.pipe(res);
    } else if (body instanceof Uint8Array || Buffer.isBuffer(body)) {
  
      res.end(body);
    } else if (typeof body?.transformToByteArray === "function") {
      const arr = await body.transformToByteArray();
      res.end(Buffer.from(arr));
    } else {
      throw new Error("Unexpected Body type from S3 GetObjectCommand");
    }
  } catch (err) {
    console.error("[QR Proxy] Error fetching QR:", err);
    res.status(404).send("QR not found");
  }
});

export default qrRouter;


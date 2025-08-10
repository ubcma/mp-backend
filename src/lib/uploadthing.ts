// Extract the UploadThing file key from its URL
export function getFileKeyFromUrl(url: string) {
  try {
    return url.split("/f/")[1] || null;
  } catch {
    return null;
  }
}

// Dynamically import UTApi and delete the old file
export async function deleteOldFile(oldFileUrl: string) {
  const fileKey = getFileKeyFromUrl(oldFileUrl);
  if (!fileKey) return;

  try {
    const { UTApi } = await import("uploadthing/server");
    // Pass your token from env
    const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN! });
    await utapi.deleteFiles([fileKey]);

  } catch (err) {
    console.error("Error deleting old avatar:", err);
    // We swallow errors so user update still succeeds
  }
}
"use server";

import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import sharp from "sharp";

interface UploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
  error?: string;
}

export async function uploadBufferedMedia(
  mediaUrls: string[],
  uploadType: "listings" | "profiles",
): Promise<UploadResult[]> {
  const supabase = await getSupabaseRouteHandler(cookies);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Authentication error:", authError);
    throw new Error("Unauthorized");
  }

  const uploadPromises = mediaUrls.map(async (url) => {
    try {
      let file: File;
      let processedBuffer: Buffer;
      let processedExtension: string;
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

      if (url.startsWith("blob:")) {
        // Handle Blob URLs (for videos or processed images)
        const response = await fetch(url);
        const blob = await response.blob();
        if (blob.size > MAX_FILE_SIZE) {
          throw new Error(
            `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          );
        }
        file = new File(
          [blob],
          `upload-${Date.now()}.${blob.type.split("/").pop()}`,
          { type: blob.type },
        );
      } else if (url.startsWith("data:")) {
        // Handle Data URLs (for processed images)
        const parts = url.split(";base64,");
        const contentType = parts[0].split(":")[1];
        const base64 = parts[1];
        const buffer = Buffer.from(base64, "base64");
        file = new File(
          [buffer],
          `upload-${Date.now()}.${contentType.split("/").pop()}`,
          { type: contentType },
        );
      } else {
        // Skip already uploaded URLs or invalid ones
        return {
          url: url,
          filename: "",
          size: 0,
          type: "",
          error: "Invalid URL",
        };
      }
      const ALLOWED_IMAGE_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

      // Re-process images to ensure consistent WebP and compression
      if (file.type.startsWith("image/")) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          throw new Error(`Invalid image type: ${file.type}`);
        }
        const imageBuffer = Buffer.from(await file.arrayBuffer());
        processedBuffer = await sharp(imageBuffer)
          .webp({ quality: 80 })
          .toBuffer();
        processedExtension = "webp";
      } else {
        if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.type}`);
        }
        processedBuffer = Buffer.from(await file.arrayBuffer());
        processedExtension = file.name.split(".").pop() || "";
      }

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${uploadType}/${user.id}/${timestamp}-${randomString}.${processedExtension}`;

      const bucket = uploadType;
      const filePath = filename;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, processedBuffer, {
          contentType: file.type.startsWith("image/")
            ? `image/${processedExtension}`
            : file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase upload error for file", file.name, uploadError);
        throw new Error(
          `Failed to upload ${file.name}: ${uploadError.message}`,
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return {
        url: publicUrl,
        filename: filePath,
        size: processedBuffer.length,
        type: file.type.startsWith("image/")
          ? `image/${processedExtension}`
          : file.type,
      };
    } catch (error) {
      console.error("Error processing/uploading media URL:", url, error);
      return {
        url: url,
        filename: "",
        size: 0,
        type: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const results = await Promise.allSettled(uploadPromises);
  return results.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : {
          url: "",
          filename: "",
          size: 0,
          type: "",
          error: "Processing failed",
        },
  );
}
// In app/post-ad/actions/upload-buffered-media.ts around lines 34 to 39, the code
// attempts to fetch a Blob URL on the server side, which is invalid because Blob
// URLs only exist in the browser context. To fix this, modify the client to send
// the actual file data (e.g., as base64 or FormData) instead of Blob URLs, and
// update the server-side code to handle the received file data directly rather
// than trying to fetch from a Blob URL.

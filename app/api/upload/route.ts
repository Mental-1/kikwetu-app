import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import sharp from "sharp";
import { cookies } from "next/headers";

/**
 * Handles authenticated file uploads via POST, storing files in Supabase Storage and returning their public URLs.
 *
 * Validates user authentication, file presence, size, and MIME type based on the provided `type` ("profile" or other). Processes image files to WebP format, generates a unique filename, and stores the file in the appropriate Supabase Storage bucket. Returns a JSON response with the public URL, file metadata, and user ID, or an error message with the relevant HTTP status code if validation or upload fails.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = type === "profile" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    const allowedTypes =
      type === "profile"
        ? ["image/jpeg", "image/png", "image/webp"]
        : [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "video/webm",
            "video/quicktime",
          ];

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
        },
        { status: 400 },
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types are: ${allowedTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Image processing
    let processedBuffer: Buffer;
    let processedExtension = "webp";

    try {
      if (file.type.startsWith("image/")) {
        const imageBuffer = Buffer.from(await file.arrayBuffer());
        processedBuffer = await sharp(imageBuffer)
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        processedBuffer = Buffer.from(await file.arrayBuffer());
        processedExtension = file.name.split(".").pop() || "";
      }
    } catch (processingError) {
      console.error("File processing error:", processingError);
      return NextResponse.json(
        { error: "Failed to process file." },
        { status: 500 },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${type}/${user.id}/${timestamp}-${randomString}.${processedExtension}`;

    const bucket = type === "profile" ? "profiles" : "listings";
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
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage. Please try again later." },
        { status: 500 },
      );
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      message: "File uploaded successfully",
      url: publicUrl,
      filename: filePath,
      size: processedBuffer.length,
      type: file.type.startsWith("image/")
        ? `image/${processedExtension}`
        : file.type,
      bucket: bucket,
      user: user.id,
    });
  } catch (error) {
    console.error("Unhandled upload error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during upload." },
      { status: 500 },
    );
  }
}

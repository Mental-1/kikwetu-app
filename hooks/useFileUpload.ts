"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
}

interface UseFileUploadOptions {
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  uploadType: "listings" | "profiles";
}

/**
 * React hook for uploading and deleting files with progress tracking and user notifications.
 *
 * Exposes functions to upload a single file, upload multiple files in parallel batches, and delete a file by URL. Tracks upload progress and uploading state, and displays toast notifications for success or failure.
 *
 * @param options - Configuration for file upload, including upload type, maximum files, maximum size, and allowed MIME types.
 * @returns An object containing `uploadFile`, `uploadFiles`, and `deleteFile` functions, along with `uploading` and `uploadProgress` state values.
 */
export function useFileUpload(options: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup effect for the timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", options.uploadType);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      setUploadProgress(100);

      toast({
        title: "Upload successful",
        description: "File uploaded successfully",
      });

      return result;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const uploadFiles = async (files: File[]): Promise<UploadResult[]> => {
    const MAX_CONCURRENT_UPLOADS = 3;
    const results: (UploadResult | null)[] = [];
    const chunks: File[][] = [];

    for (let i = 0; i < files.length; i += MAX_CONCURRENT_UPLOADS) {
      chunks.push(files.slice(i, i + MAX_CONCURRENT_UPLOADS));
    }

    for (const chunk of chunks) {
      // Upload each chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map((file) => uploadFile(file)),
      );
      results.push(...chunkResults);
      const completedFiles = results.length;
      setUploadProgress((completedFiles / files.length) * 100);
    }

    // Filter out null results from failed uploads and return successful ones
    return results.filter((result): result is UploadResult => result !== null);
  };

  const deleteFile = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/upload/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      toast({
        title: "File deleted",
        description: "File deleted successfully",
      });

      return true;
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    uploading,
    uploadProgress,
  };
}

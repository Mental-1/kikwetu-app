"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import Image from "next/image";

interface ImageUploadProps {
  maxImages?: number;
  maxVideos?: number;
  onChangeAction: (urls: string[]) => void;
  value?: string[];
  className?: string;
  uploadType?: "listings" | "profiles";
}

/**
 * React component for uploading, previewing, and managing images and videos with drag-and-drop and file input support.
 *
 * Allows users to upload multiple images and videos up to configurable limits, displays upload progress, and provides previews with individual and bulk deletion options. Invokes a callback with the updated list of file URLs after uploads or deletions.
 *
 * @param onChangeAction - Callback invoked with the updated array of uploaded file URLs after any change.
 */
export function ImageUpload({
  maxImages = 10,
  maxVideos = 2,
  onChangeAction,
  value = [],
  className,
  uploadType = "listings",
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { uploadFiles, deleteFile, uploading, uploadProgress } = useFileUpload({
    uploadType,
    maxFiles: maxImages + maxVideos,
  });

  const imageUrls = value.filter((url) => {
    const extension = url.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp"].includes(extension || "");
  });

  const videoUrls = value.filter((url) => {
    const extension = url.split(".").pop()?.toLowerCase();
    return ["mp4", "webm", "mov"].includes(extension || "");
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    const newImages: File[] = [];
    const newVideos: File[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        if (imageUrls.length + newImages.length < maxImages) {
          newImages.push(file);
          validFiles.push(file);
        }
      } else if (file.type.startsWith("video/")) {
        if (videoUrls.length + newVideos.length < maxVideos) {
          newVideos.push(file);
          validFiles.push(file);
        }
      }
    });

    if (validFiles.length === 0) {
      return;
    }

    const uploadResults = await uploadFiles(validFiles);
    const newUrls = uploadResults.map((result) => result.url);
    onChangeAction([...value, ...newUrls]);
  };

  const removeFile = async (url: string) => {
    const success = await deleteFile(url);
    if (success) {
      onChangeAction([...value.filter((u) => u !== url)]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          uploading && "pointer-events-none opacity-50",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <>
            <div className="h-10 w-10 mb-2 flex items-center justify-center">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"
                aria-label="Uploading files"
              />
            </div>
            <p className="text-sm font-medium mb-1">Uploading files...</p>
            <Progress value={uploadProgress} className="w-full max-w-xs" />
          </>
        ) : (
          <>
            <div className="h-10 w-10 text-muted-foreground mb-2 flex items-center justify-center">
              <span className="text-4xl" aria-label="Upload files">
                ⬆️
              </span>
            </div>
            <p className="text-sm font-medium mb-1">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Upload up to {maxImages} images and {maxVideos} videos
            </p>
          </>
        )}

        <div className="flex items-center gap-2 mt-4">
          <div className="text-xs bg-muted px-2 py-1 rounded">
            <span className="font-medium">{imageUrls.length}</span>/{maxImages}{" "}
            images
          </div>
          <div className="text-xs bg-muted px-2 py-1 rounded">
            <span className="font-medium">{videoUrls.length}</span>/{maxVideos}{" "}
            videos
          </div>
        </div>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((url, index) => {
            const isVideo =
              url.split(".").pop()?.toLowerCase() &&
              ["mp4", "webm", "mov"].includes(
                url.split(".").pop()!.toLowerCase(),
              );

            return (
              <div key={index} className="image-preview group relative">
                {isVideo ? (
                  <video
                    src={url}
                    className="w-full h-32 object-cover rounded-lg"
                    controls
                  />
                ) : (
                  <Image
                    src={url || "/placeholder.svg"}
                    alt={`Preview ${index}`}
                    width={128}
                    height={128}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(url);
                    }}
                    className="h-8 w-8 p-0 flex items-center justify-center rounded-full"
                  >
                    <span className="text-xl">🗑️</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              for (const url of value) {
                await deleteFile(url);
              }
              onChangeAction([]);
            }}
            disabled={uploading}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import NextImage from "next/image";

interface MediaBufferInputProps {
  maxImages?: number;
  maxVideos?: number;
  onChangeAction: (urls: string[]) => void;
  value?: string[];
  className?: string;
}

export function MediaBufferInput({
  maxImages = 15,
  maxVideos = 2,
  onChangeAction,
  value = [],
  className,
}: MediaBufferInputProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [mediaTypes, setMediaTypes] = useState<Map<string, "image" | "video">>(
    new Map(),
  );

  const imageUrls = value.filter((url) => mediaTypes.get(url) === "image");
  const videoUrls = value.filter((url) => mediaTypes.get(url) === "video");

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    setMediaTypes((prev) =>
                      new Map(prev).set(dataUrl, "image"),
                    );
                    resolve(dataUrl);
                  };
                } else {
                  reject(new Error("Canvas to Blob failed"));
                }
              },
              "image/webp",
              0.8,
            ); // Convert to WebP with 80% quality
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        const blobUrl = URL.createObjectURL(file);
        setMediaTypes((prev) => new Map(prev).set(blobUrl, "video"));
        resolve(blobUrl);
      } else {
        reject(new Error("Unsupported file type"));
      }
    });
  };

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
    setProcessing(true);
    setProcessingProgress(0);
    const processedUrls: string[] = [];
    const fileArray = Array.from(files);

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      // Check file type and limits
      if (file.type.startsWith("image/")) {
        if (!allowedImageTypes.includes(file.type)) {
          toast({
            title: "Invalid Image Type",
            description: `File ${file.name} is not a supported image type.`,
            variant: "destructive",
          });
          continue;
        }
        if (
          imageUrls.length +
            processedUrls.filter((url) => url.startsWith("data:image/"))
              .length >=
          maxImages
        ) {
          toast({
            title: "Image Limit Reached",
            description: `Cannot upload more than ${maxImages} images.`,
            variant: "destructive",
          });
          continue;
        }
      } else if (file.type.startsWith("video/")) {
        if (!allowedVideoTypes.includes(file.type)) {
          toast({
            title: "Invalid Video Type",
            description: `File ${file.name} is not a supported video type.`,
            variant: "destructive",
          });
          continue;
        }
        if (
          videoUrls.length +
            processedUrls.filter((url) => url.startsWith("blob:")).length >=
          maxVideos
        ) {
          toast({
            title: "Video Limit Reached",
            description: `Cannot upload more than ${maxVideos} videos.`,
            variant: "destructive",
          });
          continue;
        }
      } else {
        toast({
          title: "Unsupported File Type",
          description: `File ${file.name} is not a supported image or video.`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const url = await processFile(file);
        processedUrls.push(url);
        setProcessingProgress(Math.round(((i + 1) / fileArray.length) * 100));
      } catch (error) {
        console.error("File processing failed:", error);
        toast({
          title: "Processing failed",
          description: `Failed to process file: ${file.name}`,
          variant: "destructive",
        });
      }
    }
    onChangeAction([...value, ...processedUrls]);
    setProcessing(false);
    setProcessingProgress(0);
  };

  const removeFile = (urlToRemove: string) => {
    if (urlToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(urlToRemove);
    }
    onChangeAction(value.filter((url) => url !== urlToRemove));
  };

  useEffect(() => {
    return () => {
      value.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [value]);

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          processing && "pointer-events-none opacity-50",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onButtonClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Click or drag files to upload"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleChange}
          className="hidden"
          disabled={processing}
        />

        {processing ? (
          <>
            <div className="h-10 w-10 mb-2 flex items-center justify-center">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"
                aria-label="Processing files"
              />
            </div>
            <p className="text-sm font-medium mb-1">Processing files...</p>
            <Progress value={processingProgress} className="w-full max-w-xs" />
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
            const isVideo = mediaTypes.get(url) === "video";
            return (
              <div key={index} className="image-preview group relative">
                {isVideo ? (
                  <video
                    src={url}
                    className="w-full h-32 object-cover rounded-lg"
                    controls
                  >
                    <track kind="captions" />
                  </video>
                ) : (
                  <NextImage
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
            onClick={() => onChangeAction([])}
            disabled={processing}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

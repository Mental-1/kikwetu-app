"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Expand, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MediaGalleryProps {
  images: string[]
  videos?: string[]
  className?: string
}

export function ListingMediaGallery({ images, videos = [], className }: MediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const allMedia = [...images.map((src) => ({ type: "image", src })), ...videos.map((src) => ({ type: "video", src }))]

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1))
  }

  const currentMedia = allMedia[activeIndex]

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted max-w-full mx-auto max-h-[70vh]">
        {currentMedia.type === "image" ? (
          <Image src={currentMedia.src || "/placeholder.svg"} alt="Listing image" fill className="object-contain" />
        ) : (
          <video src={currentMedia.src} controls className="w-full h-full object-cover" />
        )}

        {allMedia.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 bg-background/80 hover:bg-background/90"
          onClick={() => setShowFullscreen(true)}
        >
          <Expand className="h-4 w-4" />
        </Button>
      </div>

      {allMedia.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {allMedia.slice(0, 5).map((media, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "image-preview group cursor-pointer", // Added group class here directly
                "aspect-square rounded-md overflow-hidden",
                activeIndex === index && "ring-2 ring-primary",
              )}
            >
              {media.type === "image" ? (
                <Image
                  src={media.src || "/placeholder.svg"}
                  alt={`Thumbnail ${index}`}
                  width={100}
                  height={100}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="relative w-full h-full bg-muted">
                  <video src={media.src} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {allMedia.length > 5 && (
            <div
              className="image-preview group cursor-pointer aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center" // Added group class here directly
              onClick={() => setActiveIndex(5)}
            >
              <span className="text-sm font-medium">+{allMedia.length - 5}</span>
            </div>
          )}
        </div>
      )}

      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={() => setShowFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="relative max-w-4xl w-full h-full max-h-[80vh]">
            {currentMedia.type === "image" ? (
              <Image
                src={currentMedia.src || "/placeholder.svg"}
                alt="Listing image"
                fill
                className="object-contain"
              />
            ) : (
              <video src={currentMedia.src} controls className="w-full h-full object-contain" />
            )}

            {allMedia.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

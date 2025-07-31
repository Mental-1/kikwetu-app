"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";

interface ImageCarouselProps {
  images: string[];
  video?: string;
  title: string;
}

/**
 * Displays a carousel of images with optional video playback and navigation controls.
 *
 * Renders a main display area showing either an image or a video, with navigation arrows for cycling through slides and a thumbnail strip for direct selection. If a video is provided, it appears as the last slide and includes play/pause and mute/unmute controls. The component manages playback state, mute state, and slide navigation internally.
 *
 * @param images - Array of image URLs to display in the carousel
 * @param video - Optional video URL to include as the last slide
 * @param title - Title used for image alt text
 * @returns The rendered image and video carousel component
 */
export function ImageCarousel({ images, video, title }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const totalItems = video ? images.length + 1 : images.length;
  const showVideo = video && activeIndex === images.length;

  useEffect(() => {
    if (videoRef.current) {
      if (showVideo) {
        if (isPlaying) {
          videoRef.current
            .play()
            .catch((err) => console.error("Error playing video:", err));
        } else {
          videoRef.current.pause();
        }
      } else {
        setIsPlaying(false);
      }
    }
  }, [showVideo, isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % totalItems);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="relative rounded-lg overflow-hidden">
      <div className="aspect-[4/3] relative bg-muted/20">
        {showVideo ? (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              src={video}
              className="w-full h-full object-contain"
              loop
              playsInline
              muted={isMuted}
              onClick={togglePlayPause}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePlayPause();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80"
                onClick={togglePlayPause}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePlayPause();
                  }
                }}
                tabIndex={0}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Image
            src={images[activeIndex] || "/placeholder.svg?height=400&width=600"}
            alt={`${title} - ${activeIndex + 1} of ${images.length}`}
            width={600}
            height={400}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg?height=400&width=600";
            }}
          />
        )}

        {totalItems > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {totalItems > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={index}
              className={`rounded-md overflow-hidden border-2 ${
                activeIndex === index ? "border-primary" : "border-transparent"
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to image ${index + 1}`}
              type="button"
            >
              <Image
                src={img || "/placeholder.svg"}
                alt={`Thumbnail ${index + 1}`}
                width={64}
                height={64}
                className="h-16 w-16 object-cover"
              />
            </button>
          ))}
          {video && (
            <div
              className={`cursor-pointer rounded-md overflow-hidden border-2 relative ${
                activeIndex === images.length
                  ? "border-primary"
                  : "border-transparent"
              }`}
              onClick={() => goToSlide(images.length)}
            >
              <div className="h-16 w-16 bg-muted flex items-center justify-center">
                <Play className="h-6 w-6 text-primary" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ImageCarouselProps {
  images: string[];
}

const ImageCarousel = ({ images }: ImageCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (images.length <= 1) return;
      if (event.key === 'ArrowLeft') {
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        scrollNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext, images.length]);

  if (images.length === 0) {
    return (
        <div className="relative w-full h-full bg-gray-200">
            <Image src="/placeholder.jpg" alt="Placeholder" fill style={{objectFit: "cover"}} />
        </div>
    )
  }

  if (images.length === 1) {
    const isVideo = (url: string) => {
      const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg'];
      return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
    };

    return (
      <div className="relative w-full h-full">
        {isVideo(images[0]) ? (
          <video
            src={images[0]}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <Image
            src={images[0]}
            alt="Listing image"
            fill
            style={{objectFit: "cover"}}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((src, index) => {
            const isVideo = (url: string) => {
              const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg'];
              return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
            };

            return (
              <div className="relative flex-[0_0_100%] h-full" key={index}>
                {isVideo(src) ? (
                  <video
                    src={src}
                    controls
                    className="w-full h-full object-cover"
                    preload="metadata" // Load metadata to show first frame
                  />
                ) : (
                  <Image
                    src={src}
                    alt={`Listing image ${index + 1}`}
                    fill
                    style={{objectFit: "cover"}}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full z-10"
        onClick={scrollPrev}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full z-10"
        onClick={scrollNext}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            className={cn(
              'w-2 h-2 rounded-full',
              index === selectedIndex ? 'bg-white' : 'bg-gray-500'
            )}
            onClick={() => emblaApi && emblaApi.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
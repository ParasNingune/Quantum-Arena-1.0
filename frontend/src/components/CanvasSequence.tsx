"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

interface CanvasSequenceProps {
  frameCount?: number;
  framePath?: string;
  className?: string;
}

export default function CanvasSequence({
  frameCount = 240,
  framePath = "/sequence/ezgif-frame-",
  className = "",
}: CanvasSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll();
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Preload images
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      // zeropad to 3 digits
      const paddedIndex = i.toString().padStart(3, "0");
      img.src = `${framePath}${paddedIndex}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
          setImages(loadedImages);
          setIsLoaded(true);
        }
      };
      loadedImages.push(img);
    }
  }, [frameCount, framePath]);

  const drawImage = (index: number) => {
    if (!canvasRef.current || images.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = images[index];
    if (!img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  };

  // Initial draw once loaded
  useEffect(() => {
    if (isLoaded) {
      requestAnimationFrame(() => drawImage(0));
    }
  }, [isLoaded, images]);

  // Handle scroll update
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!isLoaded || images.length === 0) return;
    const frameIndex = Math.min(frameCount - 1, Math.max(0, Math.floor(latest * frameCount)));
    requestAnimationFrame(() => drawImage(frameIndex));
  });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }

        // Redraw current frame on resize
        if (isLoaded && images.length > 0) {
          const latest = scrollYProgress.get();
          const frameIndex = Math.min(frameCount - 1, Math.max(0, Math.floor(latest * frameCount)));
          requestAnimationFrame(() => drawImage(frameIndex));
        }
      }
    };

    handleResize(); // Set initial size
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isLoaded, images, scrollYProgress, frameCount]);

  return (
    <div className={`fixed inset-0 w-full h-full -z-10 ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100vw", height: "100vh", imageRendering: "high-quality" as any }}
        className="block"
      />
    </div>
  );
}

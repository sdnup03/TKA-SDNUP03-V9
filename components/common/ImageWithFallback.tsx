import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  showRetry?: boolean;
  lazy?: boolean;
}

// Simple in-memory cache for image URLs
const imageCache = new Map<string, { url: string; timestamp: number; blob?: string }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5)
const MAX_RETRIES = 1; // Simplified - just 1 retry
const RETRY_DELAY = 1000; // 1 second base delay

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  onClick,
  onLoad,
  onError,
  showRetry = true,
  lazy = true,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadAttemptRef = useRef<number>(0);

  // Check cache and prepare URL
  useEffect(() => {
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }

    const cached = imageCache.get(src);
    const now = Date.now();

    // Use cached URL if available and not expired
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      setImageUrl(cached.url);
      // Don't set loading to false here - let onLoad handle it
      return;
    }

    // For Google Drive URLs - keep it simple like before
    let finalUrl = src;
    
    // If it's already googleusercontent.com, use as is (the working format)
    if (src.includes('googleusercontent.com')) {
      finalUrl = src;
    } 
    // If it's drive.google.com, convert to googleusercontent.com
    else if (src.includes('drive.google.com')) {
      let fileId = null;
      
      // Extract file ID from various formats
      const match1 = src.match(/\/d\/([^/]+)/);
      const match2 = src.match(/[?&]id=([^&]+)/);
      
      if (match1) fileId = match1[1];
      else if (match2) fileId = match2[1];
      
      // Convert to googleusercontent format (proven to work)
      if (fileId) {
        finalUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    setImageUrl(finalUrl);
    imageCache.set(src, { url: finalUrl, timestamp: now });
  }, [src]);

  // Note: Removed custom lazy loading logic - use native browser lazy loading instead

  // Handle image load
  const handleLoad = () => {
    setLoading(false);
    setError(false);
    setRetryCount(0);
    loadAttemptRef.current = 0;
    if (onLoad) onLoad();
  };

  // Handle image error with retry
  const handleError = () => {
    loadAttemptRef.current += 1;
    
    // Simple retry logic - just like before
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(1.5, retryCount);
      
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setLoading(true);
        setError(false);
        
        // Force reload with cache buster
        const cacheBuster = `?t=${Date.now()}`;
        const newUrl = src.includes('?') 
          ? `${src}&t=${Date.now()}` 
          : src + cacheBuster;
        
        setImageUrl(newUrl);
      }, delay);
    } else {
      setLoading(false);
      setError(true);
      if (onError) onError();
    }
  };

  // Manual retry function
  const handleManualRetry = () => {
    setRetryCount(0);
    loadAttemptRef.current = 0;
    setLoading(true);
    setError(false);
    const newUrl = src.includes('?') 
      ? `${src}&t=${Date.now()}` 
      : `${src}?t=${Date.now()}`;
    setImageUrl(newUrl);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 p-4 ${className}`}
        style={{ minHeight: '120px' }}
      >
        <AlertTriangle className="w-8 h-8 text-yellow-600 mb-2" />
        <p className="text-xs text-gray-600 mb-2 text-center">
          Gagal memuat gambar
        </p>
        {showRetry && (
          <button
            onClick={handleManualRetry}
            className="text-xs px-3 py-1 bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
          >
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${loading ? 'min-h-[120px]' : ''}`}>
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 border-2 border-gray-300"
          style={{ minHeight: '120px' }}
        >
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Memuat gambar...</p>
          </div>
        </div>
      )}
      {imageUrl && !error && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          onClick={onClick}
          loading={lazy ? 'lazy' : 'eager'}
          style={{
            display: loading ? 'none' : 'block',
          }}
        />
      )}
    </div>
  );
};

// Clear image cache
export const clearImageCache = () => {
  imageCache.clear();
};

// Get cache stats
export const getImageCacheStats = () => {
  return {
    size: imageCache.size,
    urls: Array.from(imageCache.keys()),
  };
};

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({ className = '', alt = 'Dairy Walla logo' }: BrandLogoProps) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src="/dairy-walla-logo.webp"
        alt={alt}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

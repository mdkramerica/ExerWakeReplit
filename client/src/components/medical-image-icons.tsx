import { useState, useEffect } from "react";

interface MedicalImageIconProps {
  injuryName: string;
  className?: string;
}

// Using Unsplash API for medical/anatomy images
const getMedicalImageUrl = (injuryName: string): string => {
  const searchTerms: Record<string, string> = {
    "Trigger Finger": "hand finger anatomy medical",
    "Carpal Tunnel": "wrist carpal tunnel anatomy",
    "Distal Radius Fracture": "wrist bone fracture xray",
    "CMC Arthroplasty": "thumb joint anatomy",
    "Metacarpal ORIF": "hand bone anatomy metacarpal",
    "Phalanx Fracture": "finger bone anatomy phalanx",
    "Radial Head Replacement": "elbow joint anatomy",
    "Terrible Triad Injury": "elbow anatomy injury",
    "Dupuytren's Contracture": "hand palm anatomy contracture",
    "Flexor Tendon Injury": "hand tendon anatomy flexor",
    "Extensor Tendon Injury": "hand tendon anatomy extensor"
  };
  
  const searchTerm = searchTerms[injuryName] || "hand anatomy";
  return `https://source.unsplash.com/400x300/?${encodeURIComponent(searchTerm)}`;
};

export const MedicalImageIcon = ({ injuryName, className = "w-16 h-16" }: MedicalImageIconProps) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const url = getMedicalImageUrl(injuryName);
    setImageUrl(url);
    setImageLoaded(false);
    setImageError(false);
  }, [injuryName]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Fallback to anatomy diagram icons if image fails
  const getFallbackIcon = () => {
    const icons: Record<string, string> = {
      "Trigger Finger": "🫲",
      "Carpal Tunnel": "🤲", 
      "Distal Radius Fracture": "🦴",
      "CMC Arthroplasty": "👍",
      "Metacarpal ORIF": "✋",
      "Phalanx Fracture": "☝️",
      "Radial Head Replacement": "💪",
      "Terrible Triad Injury": "🦾",
      "Dupuytren's Contracture": "🤏",
      "Flexor Tendon Injury": "👌",
      "Extensor Tendon Injury": "🖐️"
    };
    return icons[injuryName] || "✋";
  };

  if (imageError || !imageUrl) {
    return (
      <div className={`${className} rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-3xl`}>
        {getFallbackIcon()}
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg overflow-hidden relative bg-gray-100`}>
      <img
        src={imageUrl}
        alt={`${injuryName} medical illustration`}
        className="w-full h-full object-cover"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ display: imageLoaded ? 'block' : 'none' }}
      />
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};
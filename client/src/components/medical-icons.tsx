interface MedicalIconProps {
  className?: string;
}

export const TriggerFingerIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M30 20 L30 80 L35 80 L35 25 L40 25 L40 80 L45 80 L45 30 L50 30 L50 80 L55 80 L55 35 L60 35 L60 80 L70 80 L70 20 Z" />
    <circle cx="45" cy="52" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" />
    <text x="75" y="55" fontSize="8" fill="currentColor">!</text>
  </svg>
);

export const CarpalTunnelIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M20 40 Q20 35 25 35 L75 35 Q80 35 80 40 L80 70 Q80 75 75 75 L25 75 Q20 75 20 70 Z" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M30 45 L30 65 M40 45 L40 65 M50 45 L50 65 M60 45 L60 65 M70 45 L70 65" stroke="currentColor" strokeWidth="2" />
    <path d="M35 55 L65 55" stroke="red" strokeWidth="3" strokeDasharray="3,2" />
    <text x="50" y="30" fontSize="8" textAnchor="middle" fill="currentColor">Median Nerve</text>
  </svg>
);

export const DistalRadiusFractureIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M35 20 L65 20 L65 80 L35 80 Z" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M30 60 L70 60" stroke="currentColor" strokeWidth="2" />
    <path d="M30 65 L70 65" stroke="currentColor" strokeWidth="2" />
    <path d="M40 55 L60 65 M45 50 L65 60" stroke="red" strokeWidth="2" />
    <text x="50" y="15" fontSize="8" textAnchor="middle" fill="currentColor">Radius</text>
  </svg>
);

export const CMCArthroplastyIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M40 80 L40 50 Q40 45 45 45 L55 45 Q60 45 60 50 L60 80" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M60 50 L75 35 Q80 30 85 35 L90 40" fill="none" stroke="currentColor" strokeWidth="3" />
    <circle cx="65" cy="42" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="65" cy="42" r="4" fill="currentColor" />
    <text x="50" y="25" fontSize="8" textAnchor="middle" fill="currentColor">CMC Joint</text>
  </svg>
);

export const MetacarpalORIFIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M35 30 L35 70 M45 30 L45 70 M55 30 L55 70 M65 30 L65 70" stroke="currentColor" strokeWidth="3" />
    <path d="M30 50 L70 50" stroke="currentColor" strokeWidth="2" />
    <path d="M40 45 L50 55 M50 45 L60 55" stroke="red" strokeWidth="2" />
    <rect x="32" y="48" width="6" height="4" fill="currentColor" />
    <rect x="47" y="48" width="6" height="4" fill="currentColor" />
    <text x="50" y="25" fontSize="8" textAnchor="middle" fill="currentColor">Metacarpal</text>
  </svg>
);

export const PhalanxFractureIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M45 20 L45 80" stroke="currentColor" strokeWidth="4" />
    <path d="M40 50 L50 50" stroke="currentColor" strokeWidth="2" />
    <path d="M42 45 L48 55 M42 55 L48 45" stroke="red" strokeWidth="2" />
    <text x="50" y="15" fontSize="8" textAnchor="middle" fill="currentColor">Phalanx</text>
  </svg>
);

export const RadialHeadReplacementIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M30 30 L30 70 L70 70 L70 30" fill="none" stroke="currentColor" strokeWidth="3" />
    <circle cx="50" cy="35" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="50" cy="35" r="8" fill="currentColor" />
    <path d="M38 35 L62 35" stroke="white" strokeWidth="2" />
    <text x="50" y="25" fontSize="8" textAnchor="middle" fill="currentColor">Radial Head</text>
  </svg>
);

export const TerribleTriadIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M25 30 L25 70 L75 70 L75 30" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M40 40 L60 40" stroke="red" strokeWidth="3" />
    <path d="M40 50 L60 50" stroke="red" strokeWidth="3" />
    <path d="M40 60 L60 60" stroke="red" strokeWidth="3" />
    <text x="50" y="25" fontSize="6" textAnchor="middle" fill="currentColor">Complex Elbow</text>
  </svg>
);

export const DupuytrensIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M30 20 L30 80 L35 80 L35 25 L40 25 L40 80 L45 80 L45 30 L50 30 L50 70 L55 70 L55 40 L60 45 L60 75 L70 75 L70 20 Z" />
    <path d="M50 65 Q55 70 60 65" fill="none" stroke="red" strokeWidth="2" />
    <path d="M45 60 Q50 65 55 60" fill="none" stroke="red" strokeWidth="2" />
    <text x="50" y="15" fontSize="8" textAnchor="middle" fill="currentColor">Contracture</text>
  </svg>
);

export const FlexorTendonIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M45 20 L45 80" stroke="currentColor" strokeWidth="4" />
    <path d="M40 30 Q45 35 50 30" fill="none" stroke="red" strokeWidth="3" />
    <path d="M40 50 Q45 55 50 50" fill="none" stroke="red" strokeWidth="3" />
    <path d="M40 70 Q45 75 50 70" fill="none" stroke="red" strokeWidth="3" />
    <text x="50" y="15" fontSize="8" textAnchor="middle" fill="currentColor">Flexor</text>
  </svg>
);

export const ExtensorTendonIcon = ({ className = "w-12 h-12" }: MedicalIconProps) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M45 20 L45 80" stroke="currentColor" strokeWidth="4" />
    <path d="M50 30 Q45 35 40 30" fill="none" stroke="red" strokeWidth="3" />
    <path d="M50 50 Q45 55 40 50" fill="none" stroke="red" strokeWidth="3" />
    <path d="M50 70 Q45 75 40 70" fill="none" stroke="red" strokeWidth="3" />
    <text x="50" y="15" fontSize="8" textAnchor="middle" fill="currentColor">Extensor</text>
  </svg>
);

export const getInjuryIcon = (injuryName: string) => {
  const iconMap: Record<string, React.ComponentType<MedicalIconProps>> = {
    "Trigger Finger": TriggerFingerIcon,
    "Carpal Tunnel": CarpalTunnelIcon,
    "Distal Radius Fracture": DistalRadiusFractureIcon,
    "CMC Arthroplasty": CMCArthroplastyIcon,
    "Metacarpal ORIF": MetacarpalORIFIcon,
    "Phalanx Fracture": PhalanxFractureIcon,
    "Radial Head Replacement": RadialHeadReplacementIcon,
    "Terrible Triad Injury": TerribleTriadIcon,
    "Dupuytren's Contracture": DupuytrensIcon,
    "Flexor Tendon Injury": FlexorTendonIcon,
    "Extensor Tendon Injury": ExtensorTendonIcon,
  };
  
  return iconMap[injuryName] || TriggerFingerIcon;
};
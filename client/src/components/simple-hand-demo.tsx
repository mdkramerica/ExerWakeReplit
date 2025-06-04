import { useEffect, useRef } from 'react';

interface SimpleHandDemoProps {
  className?: string;
}

export default function SimpleHandDemo({ className = "w-full h-48" }: SimpleHandDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 640;
    canvas.height = 480;

    let frame = 0;

    const animate = () => {
      // Clear with dark background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generate animated hand landmarks
      const centerX = 320 + Math.sin(frame * 0.02) * 60;
      const centerY = 240 + Math.cos(frame * 0.03) * 40;
      
      // Draw 21 hand landmarks with animation
      for (let i = 0; i < 21; i++) {
        const angle = (i / 21) * Math.PI * 2 + frame * 0.01;
        const radius = 80 + Math.sin(frame * 0.05 + i) * 20;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        ctx.fillStyle = `hsl(${(i * 17 + frame) % 360}, 70%, 60%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Add connections between landmarks
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 21; i++) {
        const angle1 = (i / 21) * Math.PI * 2 + frame * 0.01;
        const angle2 = ((i + 1) / 21) * Math.PI * 2 + frame * 0.01;
        const radius1 = 80 + Math.sin(frame * 0.05 + i) * 20;
        const radius2 = 80 + Math.sin(frame * 0.05 + i + 1) * 20;
        
        const x1 = centerX + Math.cos(angle1) * radius1;
        const y1 = centerY + Math.sin(angle1) * radius1;
        const x2 = centerX + Math.cos(angle2) * radius2;
        const y2 = centerY + Math.sin(angle2) * radius2;
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      // Add overlay information
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, 80);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Exer AI Hand Tracking', 10, 25);
      
      ctx.font = '14px Arial';
      ctx.fillText('21-Point Biomechanical Analysis', 10, 45);
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#00ff88';
      ctx.fillText('Live Motion Detection Ready', 10, 65);

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation immediately
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className={className}>
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-gray-700">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
        
        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
          LIVE DEMO
        </div>
        
        <div className="absolute top-2 right-2 bg-green-500/80 px-2 py-1 rounded text-xs text-white">
          21 Joints Active
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';

export const GlowClock: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hoursRaw = time.getHours();
  const ampm = hoursRaw >= 12 ? 'PM' : 'AM';
  const hours = String(hoursRaw % 12 || 12).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = time.getSeconds();

  const weekday = time.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = time.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // Circular math for SVG
  // Radius = 24 (ViewBox 64x64)
  // Circumference = 2 * Math.PI * 24 = 150.796
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = ((60 - seconds) / 60) * circumference;

  // Exact coordinates for the glowing tip dot
  const angle = (seconds / 60) * 360 - 90; // Start at 12 o'clock
  const rad = (angle * Math.PI) / 180;
  const dotX = 32 + radius * Math.cos(rad);
  const dotY = 32 + radius * Math.sin(rad);

  return (
    <div className="flex items-center gap-4 select-none mr-2">
      {/* Date Section to the Left */}
      <div className="text-right flex flex-col justify-center select-none">
        <span className="text-[9px] font-bold text-[#8EB69B] uppercase tracking-widest leading-none">
          {weekday}
        </span>
        <span className="text-sm font-black text-white uppercase tracking-normal leading-tight mt-1">
          {monthDay}
        </span>
      </div>

      {/* Cyber Circular Clock Visualizer on the Right */}
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
          {/* Subtle Background Track arc */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="transparent"
            stroke="rgba(142, 182, 155, 0.12)"
            strokeWidth="2"
          />
          {/* Glowing Animated Seconds Arc */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="transparent"
            stroke="#2dd4bf"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Tiny Glowing Dot at the tip of the second arc */}
        <div
          className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#2dd4bf] transition-all duration-1000 ease-linear pointer-events-none"
          style={{
            left: `${dotX - 4}px`,
            top: `${dotY - 4}px`,
          }}
        />

        {/* Center Text Block */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[8px] font-extrabold tracking-widest text-[#2dd4bf] uppercase leading-none mb-0.5 select-none">
            {ampm}
          </span>
          <span className="text-sm font-black text-white leading-none font-mono tracking-tighter">
            {hours}:{minutes}
          </span>
        </div>
      </div>
    </div>
  );
};

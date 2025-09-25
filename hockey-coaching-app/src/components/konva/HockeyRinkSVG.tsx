import React from 'react';

interface HockeyRinkSVGProps {
  width?: number;
  height?: number;
  className?: string;
}

const HockeyRinkSVG: React.FC<HockeyRinkSVGProps> = ({
  width = 800,
  height = 400,
  className = ""
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 800 400"
      className={className}
      style={{ background: '#f8fafc' }}
    >
      {/* Rink outline */}
      <rect
        x="20"
        y="50"
        width="760"
        height="300"
        rx="150"
        ry="150"
        fill="#ffffff"
        stroke="#1e40af"
        strokeWidth="3"
      />

      {/* Center line */}
      <line
        x1="400"
        y1="50"
        x2="400"
        y2="350"
        stroke="#dc2626"
        strokeWidth="2"
      />

      {/* Center circle */}
      <circle
        cx="400"
        cy="200"
        r="50"
        fill="none"
        stroke="#1e40af"
        strokeWidth="2"
      />

      {/* Center dot */}
      <circle
        cx="400"
        cy="200"
        r="3"
        fill="#1e40af"
      />

      {/* Left face-off circle */}
      <circle
        cx="150"
        cy="200"
        r="50"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2"
      />

      {/* Left face-off dot */}
      <circle
        cx="150"
        cy="200"
        r="3"
        fill="#dc2626"
      />

      {/* Right face-off circle */}
      <circle
        cx="650"
        cy="200"
        r="50"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2"
      />

      {/* Right face-off dot */}
      <circle
        cx="650"
        cy="200"
        r="3"
        fill="#dc2626"
      />

      {/* Left goal area */}
      <rect
        x="20"
        y="170"
        width="40"
        height="60"
        fill="none"
        stroke="#1e40af"
        strokeWidth="2"
      />

      {/* Right goal area */}
      <rect
        x="740"
        y="170"
        width="40"
        height="60"
        fill="none"
        stroke="#1e40af"
        strokeWidth="2"
      />

      {/* Left goal crease (partial circle) */}
      <path
        d="M 60 170 A 30 30 0 0 1 60 230"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2"
      />

      {/* Right goal crease (partial circle) */}
      <path
        d="M 740 170 A 30 30 0 0 0 740 230"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2"
      />

      {/* Top left face-off dot */}
      <circle
        cx="150"
        cy="120"
        r="3"
        fill="#dc2626"
      />

      {/* Bottom left face-off dot */}
      <circle
        cx="150"
        cy="280"
        r="3"
        fill="#dc2626"
      />

      {/* Top right face-off dot */}
      <circle
        cx="650"
        cy="120"
        r="3"
        fill="#dc2626"
      />

      {/* Bottom right face-off dot */}
      <circle
        cx="650"
        cy="280"
        r="3"
        fill="#dc2626"
      />

      {/* IHS logo in center circle */}
      <text
        x="400"
        y="205"
        textAnchor="middle"
        fill="#9ca3af"
        fontSize="24"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
      >
        HCA
      </text>
    </svg>
  );
};

export default HockeyRinkSVG;
/* eslint-disable no-unused-vars */
import React from 'react';

interface ColorPaletteProps {
  onColorSelect: (color: string) => void;
  palette: string[];
  theme: string;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ onColorSelect, palette, theme }) => {
  return (
    <div className="w-full max-w-md mb-4">
      <div className="flex flex-wrap justify-center gap-2">
        {palette.map((color, index) => (
          <button
            key={index}
            onClick={() => onColorSelect(color)}
            className="w-8 h-8 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
            title={color}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;
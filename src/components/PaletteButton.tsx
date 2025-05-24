import React from 'react';

interface PaletteButtonProps {
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

const PaletteButton: React.FC<PaletteButtonProps> = ({ color, isSelected, onClick }) => {
  return (
    <button
      className={`palette-button ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={color}
      data-color={color}
    />
  );
};

export default PaletteButton;
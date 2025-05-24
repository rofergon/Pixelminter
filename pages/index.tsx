import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';

const PixelArt = dynamic(() => import('../src/components/PixelArt'), {
  ssr: false,
  loading: () => <div>Loading PixelArt...</div>
});

const IndexPage: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Asignar Buffer al objeto window
      window.Buffer = Buffer;

      // Sobrescribe localStorage.setItem para registrar los valores
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        try {
          originalSetItem.apply(this, [key, value]);
        } catch (e) {
          console.error("Error al almacenar en localStorage:", e);
        }
      };
    }
  }, []);

  return (
    <div>
      <PixelArt />
    </div>
  );
};

export default IndexPage;
import React, { useState } from 'react';
import ConnectWalletButton from './ConnectWalletButton';
import EnhancedWallet from './EnhancedWallet';
import { BrushData } from '@/types/types';
import { Button } from '@/components/ui/button';

interface WalletDemoProps {
  updateBrushData: (data: BrushData | null) => void;
}

const WalletDemo: React.FC<WalletDemoProps> = ({ updateBrushData }) => {
  const [currentVariant, setCurrentVariant] = useState<'original' | 'enhanced' | 'modal' | 'island' | 'advanced'>('enhanced');

  const variants = [
    {
      key: 'original' as const,
      title: 'Original Wallet',
      description: 'Tu implementación actual mejorada',
      badge: 'Actual',
    },
    {
      key: 'enhanced' as const,
      title: 'Enhanced Wallet',
      description: 'Versión mejorada con mejor diseño y animaciones',
      badge: 'Recomendado',
    },
    {
      key: 'modal' as const,
      title: 'Wallet Modal',
      description: 'Modal avanzado con múltiples opciones de wallets',
      badge: 'Nuevo',
    },
    {
      key: 'island' as const,
      title: 'Wallet Island',
      description: 'Interfaz flotante arrastrable (desktop)',
      badge: 'Premium',
    },
    {
      key: 'advanced' as const,
      title: 'Advanced Default',
      description: 'Interfaz avanzada con QR, swap y portfolio',
      badge: 'Completo',
    },
  ];

  const renderWallet = () => {
    switch (currentVariant) {
      case 'original':
        return <ConnectWalletButton updateBrushData={updateBrushData} />;
      case 'enhanced':
        return <EnhancedWallet variant="default" />;
      case 'modal':
        return <EnhancedWallet variant="modal" />;
      case 'island':
        return <EnhancedWallet variant="island" />;
      case 'advanced':
        return <EnhancedWallet variant="advanced" />;
      default:
        return <EnhancedWallet variant="default" />;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 text-white rounded-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-6 rounded-lg border border-blue-800">
        <h1 className="text-2xl font-bold text-blue-100 mb-2">
          🚀 Wallet Mejorado - OnchainKit
        </h1>
        <p className="text-blue-300">
          Explora las diferentes variantes del wallet mejorado con OnchainKit. 
          Cada variante ofrece diferentes características y experiencias de usuario.
        </p>
      </div>

      {/* Variant Selector */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Seleccionar Variante</h2>
        <p className="text-gray-400 mb-4">Elige qué versión del wallet quieres probar</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants.map((variant) => (
            <div
              key={variant.key}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentVariant === variant.key
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setCurrentVariant(variant.key)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm text-white">{variant.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  variant.badge === 'Recomendado' ? 'bg-green-600 text-white' :
                  variant.badge === 'Nuevo' ? 'bg-blue-600 text-white' :
                  variant.badge === 'Premium' ? 'bg-purple-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {variant.badge}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {variant.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Current Wallet Display */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-lg font-semibold mb-2">
          Vista Previa: {variants.find(v => v.key === currentVariant)?.title}
        </h2>
        <p className="text-gray-400 mb-4">
          Esta es la implementación de la variante seleccionada
        </p>
        
        <div className="flex justify-center p-8 bg-gray-900 rounded-lg border border-gray-600">
          {renderWallet()}
        </div>
      </div>

      {/* Features */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Características Principales</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-green-400 mb-2">✅ Mejoras Implementadas</h3>
            <ul className="space-y-1 text-gray-300 text-sm">
              <li>• Conexión con múltiples wallets (Coinbase, MetaMask, Phantom, etc.)</li>
              <li>• Animaciones y transiciones suaves</li>
              <li>• Diseño responsive para móvil y desktop</li>
              <li>• Soporte para tema oscuro/claro</li>
              <li>• Estados de carga y error mejorados</li>
              <li>• Efectos visuales modernos (glassmorphism)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-400 mb-2">🔧 Configuración Avanzada</h3>
            <ul className="space-y-1 text-gray-300 text-sm">
              <li>• URLs de términos y privacidad configurables</li>
              <li>• Logo personalizable de la aplicación</li>
              <li>• Soporte para wallets adicionales (Rabby, Trust, Frame)</li>
              <li>• Modal inteligente con creación de smart wallet</li>
              <li>• Información detallada del usuario (Balance, NFTs)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Implementation Notes */}
      <div className="bg-yellow-900/20 p-6 rounded-lg border border-yellow-700">
        <h2 className="text-lg font-semibold text-yellow-200 mb-4">
          📝 Instrucciones de Implementación
        </h2>
        <div className="space-y-3 text-yellow-100 text-sm">
          <p>
            <strong>1. Configuración requerida:</strong> Actualiza las URLs en `OnchainProviders.tsx` con tus enlaces reales de términos y privacidad.
          </p>
          <p>
            <strong>2. Logo personalizado:</strong> Reemplaza la URL del logo en la configuración con la URL de tu logo.
          </p>
          <p>
            <strong>3. Uso recomendado:</strong> Utiliza `EnhancedWallet` con variant="default" para la mayoría de casos, o "island" para experiencias premium.
          </p>
          <p>
            <strong>4. Estilos personalizados:</strong> Los estilos CSS están en `src/styles/wallet.css` y se pueden personalizar según tu brand.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletDemo; 
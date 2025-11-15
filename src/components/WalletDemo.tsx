import React, { useState } from 'react';
import ConnectWalletButton from './ConnectWalletButton';
import EnhancedWallet from './EnhancedWallet';
import { BrushData } from '@/types/types';

interface WalletDemoProps {
  updateBrushData: (_data: BrushData | null) => void;
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
      case 'island':
      case 'advanced':
        return <EnhancedWallet variant={currentVariant} />;
      default:
        return <EnhancedWallet variant="default" />;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 text-white rounded-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-6 rounded-lg border border-blue-800">
        <h1 className="text-2xl font-bold text-blue-100 mb-2">
          🚀 Wallet con Reown AppKit (WalletConnect)
        </h1>
        <p className="text-blue-300">
          Explora la conexión de wallet usando Reown AppKit (anteriormente WalletConnect). 
          Ahora con soporte universal para múltiples wallets y mejor experiencia de usuario.
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
            <h3 className="font-semibold text-green-400 mb-2">✅ Mejoras con Reown AppKit</h3>
            <ul className="space-y-1 text-gray-300 text-sm">
              <li>• Conexión universal con 300+ wallets</li>
              <li>• WalletConnect v2 integrado nativamente</li>
              <li>• Soporte para MetaMask, Coinbase Wallet, Trust, Phantom, etc.</li>
              <li>• Modal intuitivo con mejor UX</li>
              <li>• Diseño responsive optimizado</li>
              <li>• Estados de carga y error mejorados</li>
              <li>• Tema oscuro personalizable</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-400 mb-2">🔧 Configuración Avanzada</h3>
            <ul className="space-y-1 text-gray-300 text-sm">
              <li>• Project ID de Reown Dashboard</li>
              <li>• Metadata personalizable (nombre, logo, descripción)</li>
              <li>• Soporte para múltiples redes</li>
              <li>• Analytics integrado</li>
              <li>• Temas y variables CSS personalizables</li>
              <li>• SSR compatible con Next.js</li>
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
            <strong>1. Project ID:</strong> Obtén tu Project ID desde <a href="https://dashboard.reown.com" target="_blank" rel="noopener noreferrer" className="underline">Reown Dashboard</a> (gratis).
          </p>
          <p>
            <strong>2. Configuración:</strong> El Project ID y metadata están en <code className="bg-yellow-900/40 px-1 rounded">src/wagmi.ts</code>.
          </p>
          <p>
            <strong>3. Uso simple:</strong> Usa el componente <code className="bg-yellow-900/40 px-1 rounded">&lt;appkit-button /&gt;</code> en cualquier parte de tu app.
          </p>
          <p>
            <strong>4. Personalización:</strong> Modifica temas y colores en <code className="bg-yellow-900/40 px-1 rounded">OnchainProviders.tsx</code> con themeVariables.
          </p>
          <p>
            <strong>5. Next.js:</strong> La configuración de webpack en <code className="bg-yellow-900/40 px-1 rounded">next.config.js</code> es necesaria para SSR.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletDemo; 
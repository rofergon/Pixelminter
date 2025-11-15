# Migración a Reown AppKit (WalletConnect)

## 📋 Resumen
Se ha completado exitosamente la migración de OnchainKit a **Reown AppKit** (anteriormente WalletConnect), proporcionando una conexión de wallet universal con soporte para 300+ wallets.

## ✅ Cambios Realizados

### 1. Dependencias Instaladas
```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi --legacy-peer-deps
```

**Paquetes instalados:**
- `@reown/appkit` - Core de Reown AppKit
- `@reown/appkit-adapter-wagmi` - Adaptador para Wagmi v2

### 2. Archivos Modificados

#### `src/wagmi.ts`
- ✅ Migrado de `createConfig` a `WagmiAdapter`
- ✅ Agregada configuración de metadata (nombre, descripción, logo)
- ✅ Implementado cookieStorage para SSR
- ✅ Mantenidos los fallback transports de Base

#### `src/components/OnchainProviders.tsx`
- ✅ Reemplazado `OnchainKitProvider` con `createAppKit`
- ✅ Configurado modal de Reown con tema oscuro
- ✅ Agregadas variables de tema personalizadas
- ✅ Habilitado analytics

#### `src/components/ConnectWalletButton.tsx`
- ✅ Reemplazado el componente OnchainKit con `<appkit-button />`
- ✅ Mantenida la funcionalidad de Brush Data
- ✅ Simplificado el código usando componentes web de Reown

#### `src/components/EnhancedWallet.tsx`
- ✅ Actualizado para usar `<appkit-button />` de Reown
- ✅ Simplificados todos los variants (ahora usan el mismo componente)

#### `src/components/WalletDemo.tsx`
- ✅ Actualizado el título y descripciones
- ✅ Modificadas las instrucciones de implementación
- ✅ Actualizadas las características listadas

#### `next.config.js`
- ✅ Agregado webpack config con externals requeridos
- ✅ Agregado fallback para módulos de React Native
- ✅ Configuración necesaria para SSR con Reown

## 🎯 Características Nuevas

### Soporte Universal de Wallets
- **300+ wallets** soportadas automáticamente
- MetaMask, Coinbase Wallet, Trust Wallet, Phantom, Rainbow, etc.
- WalletConnect v2 integrado nativamente
- Mejor UX con modal intuitivo

### Configuración Mejorada
- **Project ID**: Configurado desde Reown Dashboard
- **Metadata**: Nombre, descripción, logo personalizables
- **Tema**: Variables CSS personalizables
- **Analytics**: Habilitado para tracking de uso

### Componentes Web
- `<appkit-button />` - Botón de conexión universal
- `<appkit-network-button />` - Selector de red
- Componentes globales sin necesidad de importar

## 🔧 Configuración Actual

### Variables de Entorno
El Project ID ahora está configurado en variables de entorno para mayor seguridad y flexibilidad.

**Archivo `.env`:**
```env
NEXT_PUBLIC_REOWN_PROJECT_ID=5e5860a7d1e851164f12d83211023640
```

### Project ID
El Project ID de Reown se obtiene desde la variable de entorno en `src/wagmi.ts`:
```typescript
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
```

**⚠️ Importante:** 
- Copia `.env.example` a `.env` si no existe
- Nunca subas tu `.env` al repositorio (ya está en `.gitignore`)
- Obtén tu propio Project ID gratis en [Reown Dashboard](https://dashboard.reown.com)

### Metadata
```typescript
export const metadata = {
  name: 'PixelMinter',
  description: 'Create and mint pixel art on Base',
  url: 'https://pixelminter.xyz',
  icons: ['/logo192.png']
}
```

### Tema
Configurado en `OnchainProviders.tsx`:
- Modo: Oscuro
- Color principal: `#0052ff` (azul Base)
- Border radius: `2px` (estilo pixel art)

## 📝 Uso

### Conexión Básica
```tsx
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'

function MyComponent() {
  const { isConnected, address } = useAccount()
  const { open } = useAppKit()
  
  return <appkit-button />
}
```

### Abrir Modal Programáticamente
```tsx
const { open } = useAppKit()

// Abrir modal
open()

// Abrir en vista específica
open({ view: 'Networks' })
```

## ⚠️ Notas Importantes

### Warnings de Compilación
Los siguientes warnings son esperados y **no afectan la funcionalidad**:
- `@react-native-async-storage/async-storage` - Módulo de React Native ignorado en webpack
- `caniuse-lite is outdated` - Actualizable con `npx update-browserslist-db@latest`

### SSR (Server-Side Rendering)
La configuración actual soporta SSR con:
- cookieStorage para persistencia
- ssr: true en WagmiAdapter
- webpack externals en next.config.js

### Compatibilidad
- ✅ Next.js 15.x
- ✅ Wagmi 2.x
- ✅ Base mainnet
- ✅ Todos los navegadores modernos

## 🚀 Próximos Pasos

### Opcional: Personalización Adicional
1. **Más networks**: Agregar otras cadenas en `networks` array
2. **Tema personalizado**: Modificar `themeVariables` en OnchainProviders
3. **Features adicionales**: Habilitar email, socials en features config
4. **Custom connectors**: Agregar wallets específicas si es necesario

### Recomendado: Obtener tu propio Project ID
Visita [Reown Dashboard](https://dashboard.reown.com) para:
1. Crear una cuenta gratis
2. Crear un nuevo proyecto
3. Obtener tu Project ID único
4. Actualizar el valor en `src/wagmi.ts`

## 📚 Referencias

- [Reown AppKit Docs](https://docs.reown.com/appkit/next/core/installation)
- [Wagmi Documentation](https://wagmi.sh/)
- [Base Network](https://base.org/)

## ✨ Resultado Final

La migración está **completa y funcional**:
- ✅ Servidor de desarrollo corriendo en http://localhost:3000
- ✅ Sin errores de compilación
- ✅ Componentes de wallet funcionando correctamente
- ✅ Brush Data integrado y funcional
- ✅ Listo para producción

---

**Migración completada el:** 15 de Noviembre de 2024
**Versión de Reown AppKit:** 1.8.x
**Estado:** ✅ Exitoso

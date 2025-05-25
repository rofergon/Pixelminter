# 🎨 Pixelminter

**A powerful, decentralized pixel art creator and animator with blockchain integration on Base chain**

![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)
![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.0.2-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-blue.svg)
![Base](https://img.shields.io/badge/Chain-Base-0052FF.svg)

## 🌟 Overview

Pixelminter is a sophisticated pixel art creation platform that combines traditional digital art tools with modern blockchain technology. Built on Base chain, it allows artists to create, animate, and mint their pixel art as NFTs while participating in collaborative daily painting sessions through BasePaint integration.

**🎨 BasePaint Integration**: If you own a BasePaint brush from [basepaint.xyz](https://basepaint.xyz), Pixelminter enables you to interact directly with the daily collaborative canvas. You can create animations within the BasePaint ecosystem, bringing your pixel art to life on the shared daily canvas that the entire community contributes to.

## ✨ Features

### 🎭 **Core Art Tools**
- **Multi-Tool Support**: Brush, eraser, bucket fill, line tool, and move tool
- **Layer System**: Unlimited layers with opacity, visibility, and drag-and-drop reordering
- **Advanced Brush**: Customizable sizes (1-10px) with color picker and custom palettes
- **Grid System**: Toggleable pixel grid for precision drawing

### 🎬 **Animation Suite**
- **Multi-Frame Animation**: Unlimited frames with onion skinning and adjustable opacity
- **Playback Controls**: Play, pause, skip with adjustable FPS (1-30)
- **Export Options**: High-quality GIF generation and download

### 🔗 **Blockchain Integration**
- **Base Chain Native**: Built specifically for Base ecosystem
- **BasePaint Brush Compatibility**: Use your BasePaint.xyz brushes to paint on daily collaborative canvases
- **Animated BasePaint Contributions**: Create animated sequences directly on the daily BasePaint canvas
- **Daily Canvas Interaction**: Participate in the community-driven daily painting sessions
- **NFT Minting**: Mint individual pixel art pieces as NFTs
- **Advanced Wallet Integration**: OnchainKit-powered wallet with identity management and multi-wallet support

### 🛠 **Advanced Features**
- **Undo/Redo System**: Complete history management with keyboard shortcuts
- **Canvas Controls**: Smooth zoom and image upload for reference work
- **Cross-Platform**: Responsive design with touch support for mobile creation
- **State Persistence**: Automatic saving and cache management

## 🏗 Technical Architecture

### **Frontend Stack**
- **React 18.3.1** with TypeScript for type-safe development
- **Next.js 15.0.2** for server-side rendering and optimization
- **Tailwind CSS** for responsive, utility-first styling
- **Radix UI** components for accessible user interface
- **Lucide React** for consistent iconography

### **Blockchain Technologies**
- **Wagmi 2.12.11** for Ethereum interactions and wallet management
- **Coinbase OnchainKit 0.38.13** for comprehensive wallet UI, transactions, identity, and Base chain integration
- **Viem 2.21.1** for low-level Ethereum interactions and contract calls
- **Base Chain** as the primary blockchain network

### **Animation & Graphics**
- **GIF.js** for client-side GIF generation
- **Canvas API** for high-performance pixel rendering
- **Custom rendering engine** optimized for pixel art



## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager
- Web3 wallet (Coinbase Wallet recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/Pixelminter.git
cd Pixelminter
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Configure your environment variables
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:3000`

### Build for Production
```bash
npm run build
npm start
```

## 📱 Usage Guide

### **Creating Your First Pixel Art**

1. **Select a Tool**: Choose from brush, eraser, bucket fill, line, or move tool
2. **Pick Colors**: Use the color picker or select from predefined palettes
3. **Start Drawing**: Click and drag on the canvas to create your masterpiece
4. **Use Layers**: Add multiple layers for complex compositions
5. **Animate**: Add frames to create animated sequences

### **Working with Animations**

1. **Add Frames**: Click the "+" button to add new animation frames
2. **Set FPS**: Adjust the frames per second for your animation speed
3. **Use Onion Skinning**: Enable to see previous frames while drawing
4. **Preview**: Use play controls to preview your animation
5. **Export**: Download your animation as a GIF file

### **Blockchain Features**

1. **Connect Wallet**: Use the wallet connection button in the top right
2. **BasePaint Integration**: Encode your art and paint on daily canvases
3. **Mint NFTs**: Convert your pixel art into tradeable NFTs
4. **View on Base**: Check your creations on Base block explorer

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + F` | Flip canvas horizontally |
| `Arrow Keys` | Shift frame content in direction |
| `Spacebar` | Play/pause animation |

## 🔧 Configuration

### Canvas Settings
- **Grid Size**: 16x16 to 128x128 pixels
- **Canvas Size**: 256x256 pixel resolution
- **Zoom Levels**: 0.3x to 3x magnification
- **Background**: Toggle daily reference images

### Animation Settings
- **Frame Rate**: 1-30 FPS
- **Onion Skin Opacity**: 0-100%
- **Auto-save**: Enabled by default



## 🌐 Blockchain Integration

### BasePaint Protocol
Pixelminter integrates with BasePaint, a collaborative art protocol where:
- Artists contribute pixels to daily canvases using their BasePaint brushes
- **Animation Support**: Create animated pixel art directly on the daily BasePaint canvas
- **Brush Requirements**: Own a BasePaint brush from basepaint.xyz to participate
- Contributions are tracked on-chain with pixel-by-pixel precision
- Revenue is shared among contributors based on their participation
- Each day features a new collaborative canvas for the community

### Smart Contract Addresses (Base Mainnet)
```
BasePaint Contract: 0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83
BasePaint Brush: [Contract Address]
Pixelminter NFT: [Contract Address]
```

### Minting Process
1. Create your pixel art in Pixelminter
2. Encode the artwork data
3. Connect your wallet
4. Execute the minting transaction
5. Receive your NFT in your wallet

## 🛠 Development

### Project Structure
```
Pixelminter/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── PixelArt.tsx    # Main canvas component
│   │   ├── ToolPanel.tsx   # Drawing tools
│   │   └── SidePanel.tsx   # Settings and layers
│   ├── hooks/              # Custom React hooks
│   │   ├── canvas/         # Canvas-related hooks
│   │   ├── animation/      # Animation utilities
│   │   └── tools/          # Tool-specific logic
│   ├── types/              # TypeScript definitions
│   ├── abi/                # Smart contract ABIs
│   └── styles/             # Global styles
├── pages/                  # Next.js pages
└── public/                 # Static assets
```

### Key Components

- **`PixelArt.tsx`**: Main application component managing state and canvas
- **`PixelArtUI.tsx`**: UI layout and component composition
- **`CanvasComponent.tsx`**: High-performance canvas rendering
- **`AnimationControls.tsx`**: Animation playback and export
- **`LayerPanel.tsx`**: Layer management interface
- **`ConnectWalletButton.tsx`**: OnchainKit wallet integration with BasePaint brush detection
- **`EnhancedWallet.tsx`**: Multiple wallet UI variants (modal, island, advanced)
- **`OnchainProviders.tsx`**: Wagmi and OnchainKit provider configuration
- **`MintBPButton.tsx`**: BasePaint integration with OnchainKit transactions
- **`MintPixelminterButton.tsx`**: NFT minting with OnchainKit transaction components

### State Management
The application uses a custom state manager (`usePixelArtStateManager`) that handles:
- Canvas state and pixel data
- Layer management
- Animation frames
- History for undo/redo
- Blockchain integration data

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 🚢 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### Manual Deployment
```bash
npm run build
npm run export
# Deploy the `out` directory to your hosting provider
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use conventional commit messages
- Update documentation for new features

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

**Key points about GPL v3:**
- ✅ **Freedom to use**: Run the program for any purpose
- ✅ **Freedom to study**: Access and modify the source code  
- ✅ **Freedom to share**: Distribute copies to help others
- ✅ **Freedom to improve**: Distribute modified versions
- ⚠️ **Copyleft**: Any distributed modifications must also be GPL v3
- ⚠️ **Source requirement**: Must provide source code with distributions

## 🔗 Links

- **Website**: [pixelminter.com](https://pixelminter.com)
- **Base Explorer**: [basescan.org](https://basescan.org)
- **BasePaint**: [basepaint.xyz](https://basepaint.xyz)
- **Documentation**: [docs.pixelminter.com](https://docs.pixelminter.com) 

## 🙏 Acknowledgments

- **Base Team** for the amazing L2 infrastructure
- **BasePaint ** for collaborative art inspiration
- **Coinbase** for OnchainKit and wallet tools
- **Open Source Community** for the incredible tools and libraries

## 📞 Support

- **Twitter**: [@pixelminter](https://twitter.com/pixelminter)
- **Email**: sebas.2023@gmail.com
- **GitHub Issues**: [Report bugs or request features](https://github.com/rofergon/Pixelminter/issues)

---

**Built with ❤️ for the BasePaint digital art community**

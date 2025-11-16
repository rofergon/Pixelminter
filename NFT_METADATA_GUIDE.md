# Pixelminter NFT Metadata Guide

## Overview
This document describes the metadata structure for Pixelminter NFTs, following the ERC-721 metadata standard.

## Metadata Structure

Each Pixelminter NFT should have a JSON metadata file hosted on IPFS (or similar decentralized storage) with the following structure:

```json
{
  "name": "Pixelminter #1",
  "description": "Pixel art created with Pixelminter on [Date]",
  "image": "ipfs://QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "animation_url": "ipfs://QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
  "attributes": [
    {
      "trait_type": "FPS",
      "value": 30,
      "display_type": "number"
    },
    {
      "trait_type": "Total Pixels",
      "value": 256,
      "display_type": "number"
    },
    {
      "trait_type": "Theme",
      "value": "Daily Theme Name"
    },
    {
      "trait_type": "Author",
      "value": "author.eth"
    },
    {
      "trait_type": "Palette",
      "value": "#FF0000,#00FF00,#0000FF,#FFFF00,#FF00FF"
    },
    {
      "trait_type": "Grid Size",
      "value": 16,
      "display_type": "number"
    },
    {
      "trait_type": "Frame Count",
      "value": 1,
      "display_type": "number"
    },
    {
      "trait_type": "Day",
      "value": 1,
      "display_type": "number"
    }
  ]
}
```

## Field Descriptions

### Required Fields

#### `name` (string)
The name of the NFT. Format: `"Pixelminter #[tokenId]"`

#### `description` (string)
A description of the pixel art. Should include:
- Creation date
- Brief description of the artwork
- Reference to the daily theme

Example: `"Pixel art created with Pixelminter on November 15, 2025. Based on the daily theme: [Theme Name]"`

#### `image` (string)
URI pointing to the image resource. Supported formats:
- **IPFS**: `ipfs://[CID]` (recommended for decentralization)
- **HTTPS**: `https://[domain]/[path]` (for centralized hosting)

**File formats**: PNG (recommended), JPG, WebP
**Recommended size**: 320x320 to 1080x1080 pixels

#### `attributes` (array)
Array of trait objects describing the NFT's properties.

### Required Attributes

#### FPS (Frames Per Second)
```json
{
  "trait_type": "FPS",
  "value": 30,
  "display_type": "number"
}
```
- **Type**: Number
- **Description**: Animation frame rate
- **Source**: `state.fps` from the application state
- **Range**: Typically 1-60

#### Total Pixels
```json
{
  "trait_type": "Total Pixels",
  "value": 256,
  "display_type": "number"
}
```
- **Type**: Number
- **Description**: Total number of colored pixels in the artwork
- **Calculation**: Count all non-empty pixels across all frames and layers

#### Theme
```json
{
  "trait_type": "Theme",
  "value": "Abstract Geometry"
}
```
- **Type**: String
- **Description**: The daily theme name
- **Source**: `state.theme` from the application state

#### Author
```json
{
  "trait_type": "Author",
  "value": "author.eth"
}
```
- **Type**: String
- **Description**: ENS name or wallet address of the creator
- **Priority**: 
  1. ENS name (e.g., "vitalik.eth")
  2. Short wallet address if no ENS (e.g., "0x1234...5678")

#### Palette
```json
{
  "trait_type": "Palette",
  "value": "#FF0000,#00FF00,#0000FF,#FFFF00,#FF00FF"
}
```
- **Type**: String (comma-separated hex colors)
- **Description**: The color palette used for the daily theme
- **Source**: `state.palette` from the application state
- **Format**: Hex colors separated by commas, no spaces

### Optional Fields

#### `animation_url` (string)
URI pointing to an animated version (GIF). Use when the artwork has multiple frames.
```json
"animation_url": "ipfs://QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"
```

#### Additional Attributes

**Grid Size**
```json
{
  "trait_type": "Grid Size",
  "value": 16,
  "display_type": "number"
}
```

**Frame Count**
```json
{
  "trait_type": "Frame Count",
  "value": 4,
  "display_type": "number"
}
```

**Day**
```json
{
  "trait_type": "Day",
  "value": 1,
  "display_type": "number"
}
```
- The day number for the artwork
- Source: `state.day` from the application state

## Implementation Flow

### 1. User Creates Artwork
User creates pixel art in the Pixelminter application using:
- Daily theme palette (`state.palette`)
- Daily theme name (`state.theme`)
- Canvas settings (`state.gridSize`, `state.fps`)

### 2. Prepare Media Files

#### Static Image (PNG)
- Export canvas as PNG
- Recommended size: Match canvas size or scale to 1080x1080
- Upload to IPFS using Lighthouse API
- Get IPFS CID

#### Animated GIF (if multiple frames)
- Export animation as GIF using `fps` setting
- Upload to IPFS using Lighthouse API
- Get IPFS CID

### 3. Build Metadata JSON

```typescript
// Example TypeScript implementation
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
}

function buildMetadata(state: State, tokenId: number, imageCID: string, animationCID?: string, ensName?: string): NFTMetadata {
  // Count total pixels
  const totalPixels = countNonEmptyPixels(state.frames);
  
  const metadata: NFTMetadata = {
    name: `Pixelminter #${tokenId}`,
    description: `Pixel art created with Pixelminter on ${new Date().toLocaleDateString()}. Theme: ${state.theme}`,
    image: `ipfs://${imageCID}`,
    attributes: [
      {
        trait_type: "FPS",
        value: state.fps,
        display_type: "number"
      },
      {
        trait_type: "Total Pixels",
        value: totalPixels,
        display_type: "number"
      },
      {
        trait_type: "Theme",
        value: state.theme
      },
      {
        trait_type: "Author",
        value: ensName || shortenAddress(state.walletAddress)
      },
      {
        trait_type: "Palette",
        value: state.palette.join(',')
      },
      {
        trait_type: "Grid Size",
        value: state.gridSize,
        display_type: "number"
      },
      {
        trait_type: "Frame Count",
        value: state.frames.length,
        display_type: "number"
      }
    ]
  };
  
  // Add animation_url if GIF exists
  if (animationCID) {
    metadata.animation_url = `ipfs://${animationCID}`;
  }
  
  // Add day if available
  if (state.day !== null) {
    metadata.attributes.push({
      trait_type: "Day",
      value: state.day,
      display_type: "number"
    });
  }
  
  return metadata;
}
```

### 4. Upload Metadata to IPFS
- Convert metadata object to JSON string
- Upload JSON to IPFS using Lighthouse API
- Get metadata CID

### 5. Mint NFT
- Call `mintNFT(recipient, tokenURI)` on the contract
- Use `ipfs://[metadataCID]` as the tokenURI
- Send required mint fee

## IPFS Gateway URLs

When displaying NFTs, IPFS URIs can be resolved through public gateways:

```
ipfs://QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Can be accessed via:
```
https://ipfs.io/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
https://gateway.pinata.cloud/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
https://cloudflare-ipfs.com/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## References

- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)
- [IPFS](https://ipfs.io/)
- [Lighthouse Storage](https://lighthouse.storage/)

## Example Complete Metadata

```json
{
  "name": "Pixelminter #42",
  "description": "Pixel art created with Pixelminter on November 15, 2025. Theme: Cyberpunk Dreams",
  "image": "ipfs://QmXoXEhWPYL8VxRYRQhiJvMLpvtvfEPxrg3vfMCFYiXxWz",
  "animation_url": "ipfs://QmYsKPgKZVN5aCqRLxRLKjq7xKLNy9Qw8wN9vXjRPZvW3a",
  "attributes": [
    {
      "trait_type": "FPS",
      "value": 24,
      "display_type": "number"
    },
    {
      "trait_type": "Total Pixels",
      "value": 189,
      "display_type": "number"
    },
    {
      "trait_type": "Theme",
      "value": "Cyberpunk Dreams"
    },
    {
      "trait_type": "Author",
      "value": "pixelartist.eth"
    },
    {
      "trait_type": "Palette",
      "value": "#FF006E,#8338EC,#3A86FF,#06FFA5,#FFBE0B"
    },
    {
      "trait_type": "Grid Size",
      "value": 16,
      "display_type": "number"
    },
    {
      "trait_type": "Frame Count",
      "value": 8,
      "display_type": "number"
    },
    {
      "trait_type": "Day",
      "value": 42,
      "display_type": "number"
    }
  ]
}
```

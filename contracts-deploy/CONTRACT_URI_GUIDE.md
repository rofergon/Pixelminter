# Guía de Actualización: Contract URI y Compatibilidad con Marketplaces

## Cambios Implementados

### 1. Nuevo Constructor
El contrato ahora requiere un parámetro adicional: `contractURI`

**Antes:**
```solidity
constructor(uint256 initialFee)
```

**Después:**
```solidity
constructor(uint256 initialFee, string memory contractURI_)
```

### 2. Nuevas Funciones

#### `contractURI()`
Retorna la URI de metadata de la colección.

```solidity
function contractURI() public view returns (string memory)
```

#### `setContractURI(string memory newContractURI)`
Permite al owner actualizar la URI de metadata de la colección.

```solidity
function setContractURI(string memory newContractURI) public onlyOwner
```

## Pasos para Deployment

### 1. Preparar Metadata de la Colección

Crea un archivo JSON con la siguiente estructura:

```json
{
  "name": "Pixelminter",
  "description": "A pixel art creation platform on Base",
  "image": "ipfs://QmYourCollectionImage...",
  "external_link": "https://pixelminter.xyz",
  "seller_fee_basis_points": 250,
  "fee_recipient": "0xYourAddress..."
}
```

**Campos:**
- `name`: Nombre de la colección
- `description`: Descripción de la colección
- `image`: Imagen de banner de la colección (1400x400px recomendado)
- `external_link`: URL de tu website
- `seller_fee_basis_points`: Royalties (250 = 2.5%)
- `fee_recipient`: Dirección que recibe los royalties

### 2. Subir Metadata a IPFS

```bash
# Usando Lighthouse
lighthouse-web3 upload collection-metadata.json

# O usando tu implementación actual
# Obtendrás un CID como: QmXXXXXXXXXXXXXXXXXXX
```

### 3. Configurar Variables de Entorno

Actualiza tu archivo `.env`:

```bash
# Mint fee en ETH
INITIAL_MINT_FEE=0.001

# Contract URI con el CID obtenido
CONTRACT_URI=ipfs://QmXXXXXXXXXXXXXXXXXXX

# Otras variables existentes
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key
```

### 4. Desplegar el Contrato

```bash
cd contracts-deploy
npm install
npx hardhat run scripts/deploy.js --network base-sepolia
```

El script mostrará:
```
📄 Contract URI: ipfs://QmXXXXXXXXXXXXXXXXXXX
📊 Contract Information:
   Name: Pixelminter
   Symbol: PXMT
   Contract URI: ipfs://QmXXXXXXXXXXXXXXXXXXX
```

### 5. Verificar el Contrato

El script intentará verificar automáticamente. Si falla, verifica manualmente:

```bash
npx hardhat verify --network base-sepolia CONTRACT_ADDRESS "1000000000000000" "ipfs://QmYourCID"
```

**Nota:** El mint fee debe estar en wei (0.001 ETH = 1000000000000000 wei)

## Actualizar Metadata de Colección (Post-Deployment)

Si necesitas actualizar la metadata de la colección después del deployment:

### 1. Subir Nueva Metadata

```bash
lighthouse-web3 upload new-collection-metadata.json
# Obtén nuevo CID: QmNewCID...
```

### 2. Actualizar en el Contrato

```javascript
// Usando ethers.js
const contract = new ethers.Contract(
  contractAddress,
  abi,
  signer
);

const tx = await contract.setContractURI("ipfs://QmNewCID...");
await tx.wait();

console.log("Contract URI updated!");
```

O usando Hardhat:

```bash
npx hardhat console --network base-sepolia

> const contract = await ethers.getContractAt("PixelminterNFT", "CONTRACT_ADDRESS")
> await contract.setContractURI("ipfs://QmNewCID...")
```

## Testing

### Ejecutar Tests

```bash
cd contracts-deploy
npx hardhat test
```

Los tests ahora incluyen:
- ✅ Verificación de contractURI inicial
- ✅ Actualización de contractURI por owner
- ✅ Restricción de actualización solo para owner
- ✅ Todas las funcionalidades anteriores

### Verificar en OpenSea

1. Despliega en testnet (Base Sepolia)
2. Mintea un NFT de prueba
3. Visita OpenSea Testnet:
   ```
   https://testnets.opensea.io/assets/base-sepolia/CONTRACT_ADDRESS/TOKEN_ID
   ```
4. Verifica que:
   - La metadata del token se muestre correctamente
   - La colección tenga imagen de banner
   - Los traits/attributes se muestren
   - El link externo funcione

## Ejemplo Completo de Deployment

```bash
# 1. Preparar metadata
cat > collection-metadata.json << EOF
{
  "name": "Pixelminter",
  "description": "Pixel art NFTs on Base",
  "image": "ipfs://QmCollectionImage...",
  "external_link": "https://pixelminter.xyz",
  "seller_fee_basis_points": 250,
  "fee_recipient": "0xYourAddress"
}
EOF

# 2. Subir a IPFS
# Obtener CID: QmMetadataCID...

# 3. Configurar .env
echo "CONTRACT_URI=ipfs://QmMetadataCID..." >> .env

# 4. Desplegar
npx hardhat run scripts/deploy.js --network base-sepolia

# 5. Verificar deployment
npx hardhat console --network base-sepolia
> const contract = await ethers.getContractAt("PixelminterNFT", "DEPLOYED_ADDRESS")
> await contract.contractURI()
'ipfs://QmMetadataCID...'
```

## Troubleshooting

### Error: "wrong argument count"
- Verifica que estás pasando ambos parámetros al constructor
- Formato correcto: `deploy(mintFee, contractURI)`

### Error: "Invalid string"
- Asegúrate de que el contractURI esté entre comillas
- Usa formato: `"ipfs://QmXXX..."`

### OpenSea no muestra metadata
- Verifica que el JSON sea válido
- Usa IPFS gateway para verificar: `https://ipfs.io/ipfs/QmYourCID`
- Espera unos minutos para que OpenSea indexe
- Fuerza refresh en OpenSea: botón "Refresh metadata"

### Royalties no funcionan
- EIP-2981 no está implementado aún (opcional)
- Los marketplaces respetarán el `seller_fee_basis_points` en `contractURI()`
- Para royalties on-chain automáticos, implementa EIP-2981 (ver MARKETPLACE_COMPATIBILITY_AUDIT.md)

## Referencias

- [Contrato actualizado](./contracts/PixelminterNFT.sol)
- [Script de deployment](./scripts/deploy.js)
- [Tests actualizados](./test/PixelminterNFT.test.js)
- [Auditoría completa](./MARKETPLACE_COMPATIBILITY_AUDIT.md)
- [Ejemplo de metadata](./collection-metadata.example.json)

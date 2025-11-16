/**
 * Script para verificar los parámetros del contrato Pixelminter NFT
 * Esto ayuda a diagnosticar problemas con el minteo
 */

const contractAddress = '0x162ee7D340439C181394E1A7B4fdD922B20115D5';
const chainId = 84532; // Base Sepolia

console.log('=== Verificación de Parámetros del Contrato ===\n');

console.log('Dirección del contrato:', contractAddress);
console.log('Chain ID:', chainId, '(Base Sepolia)');
console.log('Explorer:', `https://sepolia.basescan.org/address/${contractAddress}`);

console.log('\n=== Estructura esperada de mintNFT ===');
console.log('function mintNFT(address recipient, string memory tokenURI) public payable returns (uint256)');

console.log('\n=== Ejemplo de parámetros correctos ===');
const exampleRecipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const exampleTokenURI = 'ipfs://QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const exampleMintFee = '0'; // en wei

console.log('recipient:', exampleRecipient);
console.log('tokenURI:', exampleTokenURI);
console.log('value (mintFee):', exampleMintFee, 'wei');

console.log('\n=== Formato IPFS ===');
console.log('✓ Correcto: ipfs://QmHash...');
console.log('✗ Incorrecto: QmHash...');
console.log('✗ Incorrecto: https://ipfs.io/ipfs/QmHash...');

console.log('\n=== Checklist antes de mintear ===');
console.log('[ ] ¿La wallet está conectada a Base Sepolia?');
console.log('[ ] ¿El mintFee se leyó correctamente del contrato?');
console.log('[ ] ¿El tokenURI está en formato ipfs://[CID]?');
console.log('[ ] ¿La dirección del recipient es válida?');
console.log('[ ] ¿Hay suficiente balance para pagar el gas + mintFee?');

console.log('\n=== Posibles errores comunes ===');
console.log('1. "Insufficient payment" - El value enviado es menor que mintFee');
console.log('2. "Invalid recipient address" - recipient es address(0)');
console.log('3. "Token URI cannot be empty" - tokenURI es string vacío');
console.log('4. Revert sin mensaje - Problema con el gas o permisos');

console.log('\n=== Para verificar el mintFee actual ===');
console.log('Usa la función getMintFee() del contrato');
console.log('O verifica en el explorer:', `https://sepolia.basescan.org/address/${contractAddress}#readContract`);

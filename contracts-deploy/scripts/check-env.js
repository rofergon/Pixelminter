require("dotenv").config();

console.log("🔍 Verificando configuración del entorno\n");

// Check Private Key
const privateKey = process.env.PRIVATE_KEY;
if (privateKey) {
  console.log("✅ PRIVATE_KEY encontrada");
  console.log("   Primeros 10 caracteres:", privateKey.substring(0, 10) + "...");
} else {
  console.log("❌ PRIVATE_KEY no encontrada");
}

// Check Basescan API Key
const basescanKey = process.env.BASESCAN_API_KEY;
if (basescanKey) {
  console.log("\n✅ BASESCAN_API_KEY encontrada");
  console.log("   Valor completo:", basescanKey);
  console.log("   Longitud:", basescanKey.length, "caracteres");
} else {
  console.log("\n❌ BASESCAN_API_KEY no encontrada");
}

// Check RPC URLs
const sepoliaRpc = process.env.BASE_SEPOLIA_RPC_URL;
if (sepoliaRpc) {
  console.log("\n✅ BASE_SEPOLIA_RPC_URL:", sepoliaRpc);
} else {
  console.log("\n❌ BASE_SEPOLIA_RPC_URL no encontrada");
}

// Check Mint Fee
const mintFee = process.env.INITIAL_MINT_FEE;
if (mintFee) {
  console.log("\n✅ INITIAL_MINT_FEE:", mintFee, "wei");
} else {
  console.log("\n❌ INITIAL_MINT_FEE no encontrada");
}

console.log("\n" + "=".repeat(50));
console.log("\n📝 Información importante:");
console.log("   - Tu contrato desplegado: 0x31ed68dDE32B534579CAb2895079E2602D88c635");
console.log("   - Network: Base Sepolia Testnet");
console.log("   - Chain ID: 84532");
console.log("\n🔗 IMPORTANTE - API V2 de Etherscan:");
console.log("   ⚠️  Ya NO uses basescan.org para obtener el API key");
console.log("   ✅ Usa ETHERSCAN.IO (funciona para todas las cadenas)");
console.log("\n   Pasos para obtener tu API key:");
console.log("   1. Regístrate en: https://etherscan.io/register");
console.log("   2. Ve a tu dashboard: https://etherscan.io/apidashboard");
console.log("   3. Haz clic en 'Create API Key'");
console.log("   4. Actualiza tu archivo .env con el nuevo key");
console.log("\n📌 Nota: Un solo API key de Etherscan.io funciona para:");
console.log("   - Ethereum Mainnet y Sepolia");
console.log("   - Base Mainnet y Base Sepolia");
console.log("   - Polygon, Arbitrum, Optimism, y 60+ cadenas más");
console.log("\n🔧 Después de obtener el API key:");
console.log("   npx hardhat verify --network baseSepolia 0x31ed68dDE32B534579CAb2895079E2602D88c635 \"1000000000000000\"");

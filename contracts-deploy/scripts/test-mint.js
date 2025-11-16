const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Script de prueba para mintear NFTs en el contrato PixelminterNFT
 * Este script te ayudará a determinar la configuración correcta de parámetros
 * 
 * Uso:
 * npx hardhat run scripts/test-mint.js --network baseSepolia
 */

// ============================================
// CONFIGURACIÓN - EDITA ESTOS VALORES
// ============================================

// Dirección del contrato desplegado en Base Sepolia
const CONTRACT_ADDRESS = "0x162ee7D340439C181394E1A7B4fdD922B20115D5";

// Dirección que recibirá el NFT (puede ser la misma que la que ejecuta el script)
const RECIPIENT_ADDRESS = ""; // Dejar vacío para usar la wallet del script

// Token URI - Cambia esto por tu CID de IPFS
const TOKEN_URI = "ipfs://QmTest123"; // Ejemplo: "ipfs://QmYourMetadataCID"

// ============================================

async function main() {
  console.log("🎨 Pixelminter NFT - Script de Prueba de Minteo");
  console.log("=" .repeat(60));
  
  // Obtener el signer (cuenta que ejecuta la transacción)
  const [signer] = await ethers.getSigners();
  console.log("\n📝 Información del Signer:");
  console.log("  Dirección:", signer.address);
  
  // Obtener balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("  Balance:", ethers.formatEther(balance), "ETH");
  
  // Verificar network
  const network = await ethers.provider.getNetwork();
  console.log("  Network:", network.name);
  console.log("  Chain ID:", network.chainId.toString());
  
  if (network.chainId !== 84532n) {
    console.error("\n❌ ERROR: No estás conectado a Base Sepolia (chainId: 84532)");
    console.error("   Asegúrate de usar --network baseSepolia");
    process.exit(1);
  }
  
  // Determinar recipient
  const recipient = RECIPIENT_ADDRESS || signer.address;
  console.log("\n📬 Recipient:", recipient);
  
  // Validar que el recipient sea una dirección válida
  if (!ethers.isAddress(recipient)) {
    console.error("\n❌ ERROR: Dirección de recipient inválida");
    process.exit(1);
  }
  
  // Conectar al contrato
  console.log("\n🔗 Conectando al contrato...");
  console.log("  Dirección:", CONTRACT_ADDRESS);
  
  const PixelminterNFT = await ethers.getContractAt(
    "PixelminterNFT",
    CONTRACT_ADDRESS
  );
  
  // Obtener información del contrato
  console.log("\n📊 Información del Contrato:");
  
  try {
    const name = await PixelminterNFT.name();
    const symbol = await PixelminterNFT.symbol();
    const totalSupply = await PixelminterNFT.totalSupply();
    const mintFee = await PixelminterNFT.getMintFee();
    const owner = await PixelminterNFT.owner();
    
    console.log("  Nombre:", name);
    console.log("  Símbolo:", symbol);
    console.log("  Total Supply:", totalSupply.toString());
    console.log("  Mint Fee:", ethers.formatEther(mintFee), "ETH");
    console.log("  Owner:", owner);
    
    // Verificar si tenemos suficiente balance
    if (balance < mintFee) {
      console.error("\n❌ ERROR: Balance insuficiente para pagar el mint fee");
      console.error(`   Necesitas al menos ${ethers.formatEther(mintFee)} ETH`);
      process.exit(1);
    }
    
    // Validar Token URI
    console.log("\n🔍 Validando Token URI...");
    console.log("  Token URI:", TOKEN_URI);
    
    if (!TOKEN_URI || TOKEN_URI === "ipfs://QmTest123") {
      console.warn("\n⚠️  ADVERTENCIA: Estás usando un Token URI de ejemplo");
      console.warn("   Para un minteo real, actualiza TOKEN_URI con tu CID de IPFS");
    }
    
    if (TOKEN_URI.length === 0) {
      console.error("\n❌ ERROR: Token URI no puede estar vacío");
      process.exit(1);
    }
    
    if (!TOKEN_URI.startsWith("ipfs://")) {
      console.warn("\n⚠️  ADVERTENCIA: Token URI no usa formato ipfs://");
      console.warn("   Se recomienda usar: ipfs://YourCID");
    }
    
    // Resumen antes de mintear
    console.log("\n" + "=".repeat(60));
    console.log("🎯 RESUMEN DEL MINTEO");
    console.log("=".repeat(60));
    console.log("Función a llamar:     mintNFT(address, string)");
    console.log("Parámetro 1 (address):", recipient);
    console.log("Parámetro 2 (string): ", TOKEN_URI);
    console.log("Valor a enviar:       ", ethers.formatEther(mintFee), "ETH");
    console.log("Gas estimado:         ", "~300,000 gas");
    console.log("=".repeat(60));
    
    // Esperar confirmación (opcional - comentar para auto-ejecutar)
    console.log("\n⏳ Preparando transacción...");
    
    // Estimar gas antes de enviar
    console.log("\n⛽ Estimando gas...");
    try {
      const gasEstimate = await PixelminterNFT.mintNFT.estimateGas(
        recipient,
        TOKEN_URI,
        { value: mintFee }
      );
      console.log("  Gas estimado:", gasEstimate.toString());
    } catch (error) {
      console.error("\n❌ ERROR al estimar gas:");
      console.error("  ", error.message);
      
      // Intentar determinar la causa del error
      if (error.message.includes("Insufficient payment")) {
        console.error("\n💡 Causa probable: El value enviado es menor que mintFee");
      } else if (error.message.includes("Invalid recipient")) {
        console.error("\n💡 Causa probable: La dirección del recipient no es válida");
      } else if (error.message.includes("Token URI cannot be empty")) {
        console.error("\n💡 Causa probable: El Token URI está vacío");
      }
      
      process.exit(1);
    }
    
    // Ejecutar el minteo
    console.log("\n🚀 Enviando transacción de minteo...");
    const tx = await PixelminterNFT.mintNFT(recipient, TOKEN_URI, {
      value: mintFee,
    });
    
    console.log("  ✅ Transacción enviada!");
    console.log("  Hash:", tx.hash);
    console.log("  Explorer:", `https://sepolia.basescan.org/tx/${tx.hash}`);
    
    // Esperar confirmación
    console.log("\n⏳ Esperando confirmación...");
    const receipt = await tx.wait();
    
    console.log("  ✅ Transacción confirmada!");
    console.log("  Block:", receipt.blockNumber);
    console.log("  Gas usado:", receipt.gasUsed.toString());
    
    // Buscar el evento NFTMinted para obtener el tokenId
    const mintedEvent = receipt.logs
      .map(log => {
        try {
          return PixelminterNFT.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event && event.name === "NFTMinted");
    
    if (mintedEvent) {
      const tokenId = mintedEvent.args.tokenId;
      const totalMinted = mintedEvent.args.totalMinted;
      
      console.log("\n🎉 ¡NFT MINTEADO EXITOSAMENTE!");
      console.log("  Token ID:", tokenId.toString());
      console.log("  Total Minteados:", totalMinted.toString());
      console.log("  Owner:", recipient);
      console.log("  Token URI:", TOKEN_URI);
      
      // Verificar el tokenURI en el contrato
      const storedTokenURI = await PixelminterNFT.tokenURI(tokenId);
      console.log("\n🔍 Verificación:");
      console.log("  Token URI guardado:", storedTokenURI);
      console.log("  ✅ Match:", storedTokenURI === TOKEN_URI);
      
      console.log("\n📱 Ver en OpenSea Testnet:");
      console.log(`  https://testnets.opensea.io/assets/base-sepolia/${CONTRACT_ADDRESS}/${tokenId}`);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✨ MINTEO COMPLETADO CON ÉXITO");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ ERROR:");
    console.error(error);
    
    // Mensajes de ayuda según el error
    if (error.message) {
      console.log("\n💡 Posibles soluciones:");
      
      if (error.message.includes("insufficient funds")) {
        console.log("  - Asegúrate de tener suficiente ETH para gas + mintFee");
      } else if (error.message.includes("nonce")) {
        console.log("  - Intenta reiniciar tu wallet o espera unos segundos");
      } else if (error.message.includes("gas")) {
        console.log("  - Intenta aumentar el límite de gas");
      }
    }
    
    process.exit(1);
  }
}

// Ejecutar el script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

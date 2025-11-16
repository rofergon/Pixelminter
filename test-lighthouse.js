// Script de prueba para verificar la configuración de Lighthouse
// Ejecutar con: node test-lighthouse.js

require('dotenv').config();
const lighthouse = require('@lighthouse-web3/sdk').default;

async function testLighthouseUpload() {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  
  console.log('🔍 Verificando configuración de Lighthouse...\n');
  console.log('API Key presente:', !!apiKey);
  console.log('API Key (primeros 10 caracteres):', apiKey ? apiKey.substring(0, 10) + '...' : 'NO ENCONTRADA');
  
  if (!apiKey) {
    console.error('❌ ERROR: No se encontró LIGHTHOUSE_API_KEY en el archivo .env');
    process.exit(1);
  }
  
  try {
    console.log('\n📤 Probando subida de texto a Lighthouse...');
    
    // Probar con texto simple
    const testText = 'Pixelminter test upload - ' + new Date().toISOString();
    const response = await lighthouse.uploadText(testText, apiKey, 'test-pixelminter.txt');
    
    console.log('\n✅ Upload exitoso!');
    console.log('Hash IPFS:', response.data.Hash);
    console.log('Nombre:', response.data.Name);
    console.log('Tamaño:', response.data.Size);
    console.log('\n🌐 Ver archivo en:');
    console.log(`https://gateway.lighthouse.storage/ipfs/${response.data.Hash}`);
    
  } catch (error) {
    console.error('\n❌ Error al subir a Lighthouse:');
    console.error('Mensaje:', error.message);
    console.error('Detalles completos:', error);
    process.exit(1);
  }
}

testLighthouseUpload();

// Script de prueba para verificar uploadBuffer de Lighthouse
// Ejecutar con: node test-lighthouse-buffer.js

require('dotenv').config();
const lighthouse = require('@lighthouse-web3/sdk').default;

async function testBufferUpload() {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  
  console.log('🔍 Probando uploadBuffer de Lighthouse...\n');
  
  if (!apiKey) {
    console.error('❌ ERROR: No se encontró LIGHTHOUSE_API_KEY');
    process.exit(1);
  }
  
  try {
    // Crear un buffer de prueba con datos de una imagen simple (1x1 pixel rojo PNG)
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64'
    );
    
    console.log('📤 Subiendo buffer de prueba (', pngData.length, 'bytes)...');
    
    const response = await lighthouse.uploadBuffer(pngData, apiKey);
    
    console.log('\n✅ Upload exitoso!');
    console.log('Hash IPFS:', response.data.Hash);
    console.log('Nombre:', response.data.Name);
    console.log('Tamaño:', response.data.Size);
    console.log('\n🌐 Ver archivo en:');
    console.log(`https://gateway.lighthouse.storage/ipfs/${response.data.Hash}`);
    
  } catch (error) {
    console.error('\n❌ Error al subir buffer:');
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
}

testBufferUpload();

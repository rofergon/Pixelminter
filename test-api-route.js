// Script para probar la API route de Lighthouse
// Asegúrate de que el servidor dev esté corriendo (npm run dev)
// Ejecutar con: node test-api-route.js

const fetch = require('node:fetch');

async function testAPIRoute() {
  console.log('🧪 Probando API route /api/lighthouse-upload...\n');
  
  try {
    // Crear datos de prueba (imagen PNG 1x1 roja)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    console.log('📤 Enviando solicitud a http://localhost:3000/api/lighthouse-upload');
    
    const response = await fetch('http://localhost:3000/api/lighthouse-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: pngBase64,
        fileName: 'test-api-pixelminter.png',
        mimeType: 'image/png'
      })
    });
    
    console.log('Status:', response.status, response.statusText);
    
    const json = await response.json();
    
    if (!response.ok) {
      console.error('\n❌ Error en la respuesta:');
      console.error(JSON.stringify(json, null, 2));
      process.exit(1);
    }
    
    console.log('\n✅ API route funcionando correctamente!');
    console.log('Hash IPFS:', json.data.Hash);
    console.log('Nombre:', json.data.Name);
    console.log('Tamaño:', json.data.Size);
    console.log('\n🌐 Ver archivo en:');
    console.log(`https://gateway.lighthouse.storage/ipfs/${json.data.Hash}`);
    
  } catch (error) {
    console.error('\n❌ Error al probar API route:');
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
}

testAPIRoute();

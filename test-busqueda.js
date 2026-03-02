// Script de prueba para la búsqueda de productos
const http = require('http');

const API_URL = 'http://localhost:3001';

function hacerPeticion(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_URL);
    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function probarBusquedas() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS DE BÚSQUEDA DE PRODUCTOS');
  console.log('═══════════════════════════════════════════════════\n');

  // Test 1: Listar productos
  console.log('📋 Test 1: Listar productos');
  try {
    const response = await hacerPeticion('/api/productos');
    console.log(`   Status: ${response.status}`);
    if (response.data.length > 0) {
      console.log(`   ✅ Encontrados ${response.data.length} productos`);
      console.log(`   Primeros 3 productos:`);
      response.data.slice(0, 3).forEach(p => {
        console.log(`      - ${p.codigo}: ${p.nombre}`);
      });
    } else {
      console.log('   ⚠️  No hay productos en la base de datos');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');

  // Test 2: Búsqueda por código
  console.log('🔍 Test 2: Búsqueda por código "PROD001"');
  try {
    const response = await hacerPeticion('/api/productos/buscar/PROD001');
    console.log(`   Status: ${response.status}`);
    if (response.status === 200) {
      if (response.data.idProducto) {
        console.log(`   ✅ Producto encontrado:`);
        console.log(`      ID: ${response.data.idProducto}`);
        console.log(`      Código: ${response.data.codigo}`);
        console.log(`      Nombre: ${response.data.nombre}`);
        if (response.data.codigoBarras) {
          console.log(`      Código de Barras: ${response.data.codigoBarras}`);
        }
      } else if (response.data.productos) {
        console.log(`   ✅ Múltiples productos encontrados: ${response.data.cantidad}`);
      }
    } else {
      console.log(`   ⚠️  ${response.data.mensaje || 'No encontrado'}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');

  // Test 3: Búsqueda por nombre
  console.log('🔍 Test 3: Búsqueda por nombre "Laptop"');
  try {
    const nombreEncoded = encodeURIComponent('Laptop');
    const response = await hacerPeticion(`/api/productos/buscar/${nombreEncoded}`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 200) {
      if (response.data.productos && Array.isArray(response.data.productos)) {
        console.log(`   ✅ Múltiples productos encontrados: ${response.data.cantidad}`);
        response.data.productos.slice(0, 3).forEach(p => {
          console.log(`      - ${p.codigo}: ${p.nombre}`);
        });
      } else if (response.data.idProducto) {
        console.log(`   ✅ Un producto encontrado:`);
        console.log(`      ${response.data.codigo}: ${response.data.nombre}`);
      }
    } else {
      console.log(`   ⚠️  ${response.data.mensaje || 'No encontrado'}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');

  // Test 4: Búsqueda general por nombre
  console.log('🔍 Test 4: Búsqueda general por nombre "Laptop"');
  try {
    const nombreEncoded = encodeURIComponent('Laptop');
    const response = await hacerPeticion(`/api/productos?buscar=${nombreEncoded}`);
    console.log(`   Status: ${response.status}`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log(`   ✅ Encontrados ${response.data.length} productos`);
      response.data.slice(0, 3).forEach(p => {
        console.log(`      - ${p.codigo}: ${p.nombre}`);
      });
    } else {
      console.log('   ⚠️  No se encontraron productos');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');

  // Test 5: Producto no encontrado
  console.log('🔍 Test 5: Búsqueda de producto inexistente');
  try {
    const response = await hacerPeticion('/api/productos/buscar/NOEXISTE123');
    console.log(`   Status: ${response.status}`);
    if (response.status === 404) {
      console.log(`   ✅ Error 404 manejado correctamente`);
      console.log(`      Mensaje: ${response.data.mensaje}`);
    } else {
      console.log(`   ⚠️  Status inesperado: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Pruebas completadas');
  console.log('═══════════════════════════════════════════════════');
}

// Ejecutar pruebas
probarBusquedas().catch(console.error);


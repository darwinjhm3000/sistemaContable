// Script simple para probar si el servidor puede iniciar
const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Servidor HTTP básico funcionando',
    port: PORT
  }));
});

server.listen(PORT, (err) => {
  if (err) {
    console.error('❌ ERROR al iniciar servidor:', err.message);
    console.error('');
    console.error('Posibles causas:');
    console.error('1. El puerto', PORT, 'ya está en uso');
    console.error('2. No tienes permisos para usar el puerto');
    console.error('');
    process.exit(1);
  } else {
    console.log('✅ Servidor HTTP básico iniciado correctamente');
    console.log('📍 Escuchando en http://localhost:' + PORT);
    console.log('');
    console.log('Prueba abrir en el navegador: http://localhost:' + PORT);
    console.log('');
    console.log('Presiona Ctrl+C para detener el servidor');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('❌ ERROR: El puerto', PORT, 'ya está en uso');
    console.error('');
    console.error('Solución:');
    console.error('1. Cierra otros programas que usen el puerto', PORT);
    console.error('2. O cambia el puerto en server.ts (línea 7)');
  } else {
    console.error('❌ ERROR:', err.message);
  }
  process.exit(1);
});


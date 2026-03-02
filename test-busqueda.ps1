# Script de prueba para búsqueda de productos
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Prueba de Búsqueda de Productos" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"

# Test 1: Health Check
Write-Host "[Test 1] Verificando salud del servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing
    Write-Host "✅ Servidor funcionando correctamente" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error al conectar con el servidor" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Listar productos (para ver qué hay disponible)
Write-Host "[Test 2] Listando productos disponibles..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/productos" -UseBasicParsing
    $productos = $response.Content | ConvertFrom-Json
    Write-Host "✅ Se encontraron $($productos.Count) producto(s)" -ForegroundColor Green
    if ($productos.Count -gt 0) {
        Write-Host "   Primeros productos:" -ForegroundColor Gray
        $productos | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.codigo): $($_.nombre)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "⚠️  No se pudieron listar productos (puede ser normal si no hay datos)" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# Test 3: Búsqueda por código (si hay productos)
Write-Host "[Test 3] Búsqueda por código 'PROD001'..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/productos/buscar/PROD001" -UseBasicParsing
    $producto = $response.Content | ConvertFrom-Json
    Write-Host "✅ Producto encontrado:" -ForegroundColor Green
    Write-Host "   ID: $($producto.idProducto)" -ForegroundColor Gray
    Write-Host "   Código: $($producto.codigo)" -ForegroundColor Gray
    Write-Host "   Nombre: $($producto.nombre)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "ℹ️  Producto no encontrado (esperado si no existe PROD001)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error en la búsqueda" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Búsqueda por nombre
Write-Host "[Test 4] Búsqueda por nombre 'Laptop'..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/productos/buscar/Laptop" -UseBasicParsing
    $resultado = $response.Content | ConvertFrom-Json

    if ($resultado.productos) {
        # Múltiples resultados
        Write-Host "✅ Se encontraron $($resultado.cantidad) producto(s):" -ForegroundColor Green
        $resultado.productos | ForEach-Object {
            Write-Host "   - $($_.codigo): $($_.nombre)" -ForegroundColor Gray
        }
    } else {
        # Un solo resultado
        Write-Host "✅ Producto encontrado:" -ForegroundColor Green
        Write-Host "   Código: $($resultado.codigo)" -ForegroundColor Gray
        Write-Host "   Nombre: $($resultado.nombre)" -ForegroundColor Gray
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "ℹ️  No se encontraron productos con ese nombre" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error en la búsqueda" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: Búsqueda que no existe
Write-Host "[Test 5] Búsqueda de producto inexistente..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/productos/buscar/NOEXISTE123456" -UseBasicParsing
    Write-Host "⚠️  Se encontró un producto (no esperado)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Correcto: Producto no encontrado (404)" -ForegroundColor Green
        $errorResponse = $_.Exception.Response
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Mensaje: $($responseBody | ConvertFrom-Json | Select-Object -ExpandProperty mensaje)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error inesperado" -ForegroundColor Red
        Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 6: Búsqueda con parámetro buscar en listado
Write-Host "[Test 6] Búsqueda con parámetro 'buscar' en listado..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/productos?buscar=Laptop" -UseBasicParsing
    $productos = $response.Content | ConvertFrom-Json
    Write-Host "✅ Se encontraron $($productos.Count) producto(s) con 'Laptop' en el nombre" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error en búsqueda de listado" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Pruebas completadas" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan


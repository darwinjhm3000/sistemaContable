# 🚀 Guía para Iniciar el Servidor

## ✅ Solución Aplicada

Se ha configurado CRACO para resolver el problema de `postcss-normalize`. El servidor ahora debería iniciar correctamente.

## 📋 Pasos para Iniciar el Servidor

### Opción 1: Desde la Terminal (Recomendado)

```powershell
cd frontend
npm start
```

### Opción 2: Usando el Script Batch

```powershell
cd frontend
.\start.bat
```

## 🔍 Verificar que el Servidor Está Corriendo

1. **Verificar procesos de Node.js**:
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -like "*node*"}
   ```

2. **Verificar puerto 3000**:
   ```powershell
   netstat -ano | Select-String ":3000"
   ```

3. **Abrir en el navegador**:
   - http://localhost:3000

## ⚠️ Si el Servidor No Inicia

### 1. Detener todos los procesos de Node.js
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

### 2. Limpiar caché
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

### 3. Reinstalar dependencias (si es necesario)
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

### 4. Iniciar el servidor
```powershell
npm start
```

## 🐛 Errores Comunes

### Error: "Cannot find module '@csstools/normalize.css'"
**Solución**: El script postinstall debería copiar automáticamente el paquete. Si persiste:
```powershell
cd frontend
node scripts/postinstall.js
```

### Error: "Port 3000 is already in use"
**Solución**: Cambiar el puerto o detener el proceso que usa el puerto:
```powershell
# Detener proceso en puerto 3000
netstat -ano | Select-String ":3000"
# Usar el PID para detenerlo
Stop-Process -Id <PID> -Force

# O usar otro puerto
$env:PORT=3001
npm start
```

### Error: "Cannot find module 'craco'"
**Solución**: Reinstalar CRACO:
```powershell
cd frontend
npm install --save-dev @craco/craco
```

## ✅ Estado Actual

- ✅ CRACO configurado
- ✅ Scripts actualizados
- ✅ Postinstall configurado
- ✅ Servidor iniciando...

## 📝 Notas

- El servidor puede tardar 30-60 segundos en compilar la primera vez
- Si ves errores de compilación, revisa la terminal para ver los detalles
- El navegador se abrirá automáticamente cuando el servidor esté listo


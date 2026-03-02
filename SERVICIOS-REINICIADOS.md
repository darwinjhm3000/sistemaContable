# ✅ Servicios Reiniciados

## 🚀 Estado de los Servicios

### Backend (API)
- **Puerto**: 5000
- **URL**: http://localhost:5000
- **Estado**: Iniciando...

### Frontend (React)
- **Puerto**: 3000
- **URL**: http://localhost:3000
- **Estado**: Iniciando...

## ⏳ Tiempo de Inicio

Los servicios pueden tardar:
- **Backend**: 5-10 segundos
- **Frontend**: 30-60 segundos (primera vez)

## 🔍 Verificar Estado

### Ver procesos corriendo:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

### Ver puertos en uso:
```powershell
netstat -ano | Select-String ":3000|:5000"
```

### Verificar backend:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing
```

### Verificar frontend:
Abre en el navegador: http://localhost:3000

## 🛑 Detener Servicios

```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

## 📝 Notas

- Los servicios se abrieron en ventanas minimizadas de PowerShell
- No cierres esas ventanas o los servicios se detendrán
- El frontend se abrirá automáticamente en el navegador cuando esté listo

## 🔄 Reiniciar Manualmente

### Backend:
```powershell
cd backend
npm start
```

### Frontend:
```powershell
cd frontend
npm start
```


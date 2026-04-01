# Guía de Despliegue en Producción - Tiempos RPS Next

## 1. Requisitos Previos

- **Node.js**: Versión 18 o superior instalada (incluye `npm`).
- **Git**: Para descarga del código y control de versiones.
- **Acceso a Red**: El servidor debe tener visibilidad con la IP de la base de datos SQL Server y la carpeta de red de fotos (`\\\\192.168.0.128\\Sisgeko`).

## 2. Preparación del Entorno

1. **Clonar o descargar el código**.
2. **Configurar Variables de Entorno**:
   - Crear un archivo `.env` en la raíz (basado en `.env.example`).
   - Asegurar que las credenciales de SQL Server son las de producción.
3. **Instalar Dependencias**:
   ```powershell
   npm install
   ```

## 3. Compilación de Producción (Optimización)



```powershell
npm run build
```
Esto generará la carpeta oculta `.next` con la versión optimizada de la plataforma.

## 4. Ejecución en Segundo Plano (PM2)

Para que la aplicación funcione como un servicio sin necesidad de tener una consola abierta, recomendamos usar **PM2**.

1. **Instalar PM2 globalmente**:
   ```powershell
   npm install -g pm2
   ```

2. **Lanzar la Aplicación**:
   ```powershell
   # Lanzamos la app apuntando al script de arranque de Next y forzando el puerto 4000
   pm2 start npm --name "tiempos-rps-next" -- start -- -p 4000
   ```

3. **Verificar Estado**:
   ```powershell
   pm2 list
   pm2 logs "tiempos-rps-next"
   ```

## 5. Persistencia tras Reinicios del Servidor

Para que la aplicación se inicie automáticamente tras un reinicio de Windows:

1. Instalar el gestor de arranque en frío:
   ```powershell
   npm install -g pm2-windows-startup
   pm2-startup install
   ```
2. Guardar la configuración actual de procesos:
   ```powershell
   pm2 save
   ```

## 6. Configuración de Red e IIS (Opcional)

- **Puerto**: La aplicación está configurada internamente para el puerto **4000**. IT debe abrir este puerto en el Firewall de Windows para entrada local.
- **URL**: Se puede acceder mediante `http://<IP_SERVIDOR>:4000`.
- **Proxy Inverso (Opcional)**: Si se desea una URL más amigable (ej: `http://tiempos.tg.local`), IT puede configurar esto en IIS usando el módulo "Application Request Routing" (ARR) y "URL Rewrite", redirigiendo el puerto 80 al 4000.

---


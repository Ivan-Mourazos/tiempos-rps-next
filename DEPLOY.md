# Guía de Despliegue en Producción - Tiempos RPS Next

Esta guía detalla los pasos para compilar, probar manualmente y dejar en ejecución la aplicación de manera robusta en un servidor Windows.

---

## 1. Requisitos Previos

- **Node.js**: Versión 18 o superior instalada (verificar en consola con `node -v` y `npm -v`).
- **Variables de Entorno**: Asegurar que existe el archivo `.env` en la raíz con los datos reales de producción:
  ```env
  DB_SERVER=192.168.X.X (IP del SQL Server)
  DB_USER=usuario_sql
  DB_PASSWORD=contraseña_sql
  DB_NAME=nombre_bd
  ```
- **Acceso a Red**: El servidor debe llegar a la base de datos SQL Server y a la ruta de red de fotos (`\\192.168.0.128\Sisgeko`).

---

## 2. Preparación y Compilación (Solo si hay cambios de código)

Si se han descargado cambios o se reinstala desde cero, ejecutar en PowerShell/CMD dentro de la carpeta del proyecto:

1. **Instalar Dependencias**:
   ```powershell
   npm install
   ```
2. **Compilar la Aplicación**:
   ```powershell
   npm run build
   ```
   *Nota: Esto genera la carpeta oculta `.next`. Si falla aquí, revise que no haya errores de TypeScript/Linter en la consola.*

---

## 3. Diagnóstico y Arranque Manual Inmediato

Antes de configurar PM2, **arranque la aplicación manualmente** para confirmar que conecta a la base de datos y no da fallos:

### En Windows/Linux:
```bash
# Forzar el puerto 4000 directamente por consola
npx next start -p 4000
```
O bien:
```bash
# Usando la variable de entorno PORT (muy recomendado en Linux)
PORT=4000 npx next start
```
- Abra un navegador y entre en `http://localhost:4000` (o `http://<IP_SERVIDOR>:4000`).
- Si carga correctamente, cierre esta consola (`Ctrl + C`) para liberar el puerto antes de proceder con PM2.

---

## 4. Ejecución en Segundo Plano con PM2 (Windows y Linux)

Si intenta ejecutar `pm2 start npm ...` pasando el puerto al final, la consola de NPM suele interpretar mal los argumentos (buscando un directorio inexistente como `/webs/tiempos-rps-next/` y **cayendo al puerto 3000 por defecto**). 

Para evitar esto y asegurar el **puerto 4000**, usamos el archivo de configuración [ecosystem.config.js](file:///c:/Users/ivan.sanchez/Documents/Proyectos%20DEV/Tiempos%20RPS%20Next/ecosystem.config.js), el cual inyecta la variable `PORT: 4000` directamente y ejecuta la app con Node de manera nativa.

1. **Eliminar cualquier proceso huérfano/antiguo**:
   ```bash
   pm2 delete "tiempos-rps-next"
   ```
2. **Lanzar la Aplicación con el archivo de configuración**:
   ```bash
   pm2 start ecosystem.config.js
   ```
3. **Verificar el Estado del Proceso**:
   ```bash
   pm2 list
   pm2 logs "tiempos-rps-next"
   ```
   *(Verifique en los logs que Next.js indica estar escuchando en el puerto 4000).*

4. **Comandos Útiles de Control**:
   - **Parar app**: `pm2 stop tiempos-rps-next`
   - **Reiniciar app**: `pm2 restart tiempos-rps-next`
   - **Eliminar de PM2**: `pm2 delete tiempos-rps-next`

---

## 5. Persistencia tras Reinicios del Servidor

### A) Si el Servidor es Linux (Ubuntu/Debian/CentOS)
Ejecute los siguientes comandos con privilegios (`sudo`):
1. **Generar script de inicio del sistema**:
   ```bash
   pm2 startup
   ```
   *Esto le devolverá una línea de comando que empieza con `sudo env PATH=...`. Debe **copiar y pegar** esa línea entera en la consola y darle a Enter.*
2. **Guardar el estado actual**:
   ```bash
   pm2 save
   ```

### B) Si el Servidor es Windows Server
El método **100% fiable y nativo** es crear una tarea programada:
1. El script por lotes `arranque.bat` ya está creado en la raíz del proyecto. Este archivo contiene la instrucción dinámica para posicionarse en su propio directorio y arrancar PM2:
   ```cmd
   @echo off
   cd /d "%~dp0"
   pm2 start ecosystem.config.js
   ```
2. Abrir el **Programador de Tareas** de Windows (`taskschd.msc`).
3. Crear una **Tarea Básica**:
   - **Nombre**: `Arranque Tiempos RPS Next`
   - **Desencadenador**: *Al iniciar el equipo* (When the computer starts).
   - **Acción**: *Iniciar un programa*. Seleccionar el archivo `arranque.bat` de la raíz del proyecto.
4. En las **Propiedades de la Tarea**:
   - Marcar: **Ejecutar tanto si el usuario inició sesión como si no** (Run whether user is logged on or not).
   - Marcar: **Ejecutar con los privilegios más altos** (Run with highest privileges).
   - En la pestaña *Condiciones*, desmarcar "Iniciar la tarea solo si el equipo está conectado a la corriente alterna" (para evitar que falle en portátiles/servidores UPS).

---

## 6. Configuración de Red

- **Puerto**: La aplicación corre en el puerto **4000**. IT debe asegurarse de abrir este puerto en el Firewall del sistema (iptables/ufw en Linux, o Firewall de Windows para entrada local).
- **Acceso**: Se accede mediante `http://<IP_DEL_SERVIDOR>:4000`.




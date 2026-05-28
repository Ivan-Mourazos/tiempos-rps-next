@echo off
:: Cambiar al directorio donde se encuentra este script .bat
cd /d "%~dp0"
:: Iniciar la aplicación con PM2
pm2 start ecosystem.config.js

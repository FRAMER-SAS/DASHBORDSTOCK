# Stock Dashboard — Vercel

Dashboard de stock con actualización diaria vía carga de Excel.

## Estructura del proyecto

```
stock-dashboard/
├── api/
│   └── upload.js        ← Función serverless: procesa el Excel
├── public/
│   └── index.html       ← Dashboard frontend completo
├── data/
│   ├── lookup.json      ← Lookup de rubros y proveedores (1457 artículos)
│   └── initial_stock.json
├── package.json
└── vercel.json
```

## Deploy en Vercel (5 minutos)

### Opción A — Desde GitHub (recomendada)

1. Creá un repo en github.com y subí todos estos archivos
2. Entrá a vercel.com → "Add New Project"
3. Importá el repo de GitHub
4. Clic en "Deploy" → listo

Cada vez que hagas push al repo, Vercel redespliega automáticamente.

### Opción B — Vercel CLI

```bash
npm install -g vercel
cd stock-dashboard
vercel
```

Seguí las instrucciones en consola. Te genera una URL pública en ~30 segundos.

## Cómo actualizar el stock diariamente

1. Abrí la URL de tu dashboard
2. Clic en **"Subir nuevo stock"** (botón azul arriba a la derecha)
3. Arrastrá o seleccioná el archivo `.xls` / `.xlsx` exportado del sistema
4. El servidor procesa el archivo, cruza con rubros y proveedores, y actualiza el dashboard

## Dependencias

- `xlsx` — lectura de archivos Excel
- `formidable` — manejo de uploads en Node.js

## Variables de entorno

No se requieren variables de entorno.

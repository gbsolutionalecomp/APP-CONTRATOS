# APP-CONTRATOS (Sistema de Gestión de Contratos)

Sistema Backend robusto en Node.js, Express y TypeScript para la gestión de contratos con arquitectura híbrida y conmutación por error automática (**Supabase Cloud DB ↔ SQLite Local DB**).

[![Deploy Status](https://img.shields.io/badge/Deploy-Vercel-success?style=flat-square)](https://app-contratos-zeta.vercel.app)
[![Node Version](https://img.shields.io/badge/Node.js-v20%2B-blue?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?style=flat-square)](https://www.typescriptlang.org/)

---

## 🚀 Características Principales

- 🛡️ **TypeScript 100% Tipado**: DTOs, interfaces de contratos, respuestas API estructuradas.
- ⚡ **Base de Datos Híbrida & Auto-Fallback**: Intenta la persistencia en **Supabase** cloud; ante caídas de red o fallos de credenciales, conmuta a la base **SQLite3** local.
- 🔍 **Validación Estricta con Zod**: Validación de payload para creación y edición de contratos.
- 🔒 **Seguridad Avanzada**: Security headers mediante **Helmet**, rate limiting adaptativo por IP, prevención de SQL Injection mediante `parametrized queries`.
- 📊 **Documentación Interactiva (Swagger/OpenAPI)**: Disponible en `/api/docs`.
- 🩺 **Health Check Diagnóstico**: Endpoint `/api/health` para monitorear el estado de Supabase y SQLite.
- 📝 **Logs Estructurados**: Registrar eventos y trazabilidad en consola y archivos de log (`logs/app.log`) mediante **Winston**.
- 🧪 **Suite de Tests (Jest & Supertest)**: Tests unitarios e integración con cobertura > 70%.
- 🤖 **CI/CD con GitHub Actions**: Validación de linter, compilación TypeScript y ejecuciones de test antes de despliegue a Vercel.

---

## 🛠️ Stack Tecnológico

- **Lenguaje**: TypeScript / Node.js
- **Framework Web**: Express.js
- **Bases de Datos**: Supabase (PostgreSQL Cloud) + SQLite3 (Local fallback)
- **Validación**: Zod
- **Documentación API**: Swagger UI (`swagger-ui-express`, `swagger-jsdoc`)
- **Seguridad**: Helmet, express-rate-limit, CORS
- **Logging**: Winston
- **Testing**: Jest, ts-jest, Supertest
- **Calidad de Código**: ESLint, Prettier

---

## 📁 Estructura del Proyecto

```
.
├── .github/workflows/          # GitHub Actions (test.yml, deploy.yml)
├── dist/                       # Código JavaScript compilado
├── logs/                       # Logs de la aplicación
├── src/
│   ├── config/                 # Variables de entorno y configuración general
│   ├── controllers/            # Controladores de endpoints (Contratos, Health)
│   ├── database/               # Conexiones singleton (SQLite, Supabase)
│   ├── docs/                   # Especificación Swagger / OpenAPI
│   ├── middleware/             # Validation, rate limiting y error handling
│   ├── routes/                 # Rutas Express (/api/contratos, /api/health)
│   ├── schemas/                # Schemas Zod para contratos y query params
│   ├── services/               # Lógica de negocio y fallback Supabase ↔ SQLite
│   ├── types/                  # Interfaces y tipos TypeScript
│   ├── utils/                  # Excepciones custom y Logger Winston
│   ├── app.ts                  # Configuración de Express (middlewares y rutas)
│   └── server.ts               # Punto de entrada HTTP
├── tests/                      # Suite de pruebas automatizadas
├── .env.example                # Plantilla de variables de entorno
├── jest.config.js              # Configuración de Jest
├── package.json                # Dependencias y scripts del proyecto
├── tsconfig.json               # Configuración de TypeScript
└── vercel.json                 # Configuración de deployment Vercel
```

---

## 📋 Requisitos Previos

- **Node.js**: v18.0.0 o superior (Recomendado v20.x)
- **npm**: v9.0.0 o superior

---

## ⚙️ Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/gbsolutionalecomp/APP-CONTRATOS.git
   cd APP-CONTRATOS
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia `.env.example` a `.env` o `.env.local`:
   ```bash
   cp .env.example .env
   ```

   Variables clave:
   ```env
   PORT=3005
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   DATABASE_PATH=./contratos.db
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_KEY=eyJhbG...
   ```

---

## 🏃 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo con `ts-node` |
| `npm run build` | Compila TypeScript a JavaScript en la carpeta `dist/` |
| `npm start` | Ejecuta el servidor compilado desde `dist/server.js` |
| `npm run lint` | Ejecuta ESLint para validar el estilo de código |
| `npm run lint:fix` | Corrige automáticamente errores de ESLint |
| `npm run format` | Aplica formato de código con Prettier |
| `npm test` | Ejecuta la suite de pruebas unitarias e integración |
| `npm run test:coverage` | Genera el reporte de cobertura de pruebas |

---

## 📡 Endpoints de la API REST

### Base URL: `/api`

| Método | Endpoint | Descripción | Query Params |
|---|---|---|---|
| `GET` | `/api/health` | Estado del servidor y bases de datos | - |
| `GET` | `/api/docs` | Documentación Swagger UI | - |
| `GET` | `/api/contratos` | Listar contratos con paginación y filtros | `page`, `limit`, `search`, `estado`, `tipo_contrato` |
| `GET` | `/api/contratos/:codigo` | Obtener contrato por nomenclatura PK | - |
| `POST` | `/api/contratos` | Crear un nuevo contrato (Zod Validated) | - |
| `PUT` | `/api/contratos/:codigo` | Actualizar contrato existente (Zod Validated) | - |
| `DELETE` | `/api/contratos/:codigo` | Eliminar contrato por nomenclatura | - |
| `POST` | `/api/extraer-oc` | Extraer datos preliminares de Orden de Compra | - |
| `POST` | `/api/abrir-ubicacion` | Abrir ruta de archivo/carpeta en Windows Explorer | - |

---

## 💡 Ejemplos de Uso (cURL)

### 1. Consultar estado del servicio (Health Check)
```bash
curl -X GET http://localhost:3005/api/health
```

### 2. Crear un contrato nuevo (POST)
```bash
curl -X POST http://localhost:3005/api/contratos \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_nomenclatura": "CON-2026-SERV-001",
    "nombre_contrato": "Contrato Mantenimiento Servidores Cloud",
    "contraparte": "Tech Cloud Solutions S.A.",
    "tipo_contrato": "Proveedor / Insumos",
    "fecha_inicio": "2026-01-01",
    "fecha_fin": "2026-12-31",
    "monto": 15000.50,
    "moneda": "USD",
    "estado": "ACTIVO",
    "ubicacion_pc": "C:\\Contratos\\2026\\CON-001.pdf",
    "observaciones": "Contrato anual renovación automática"
  }'
```

### 3. Listar contratos con paginación y búsqueda
```bash
curl -X GET "http://localhost:3005/api/contratos?page=1&limit=10&search=Tech&estado=ACTIVO"
```

---

## 🧪 Verificación de Calidad

Para ejecutar la verificación completa de linter, compilación y coverage antes de realizar commit o push:

```bash
npm run lint && npm run build && npm run test:coverage
```

# ETHAN BUSINESS

**Manage. Grow. Succeed.**

ETHAN BUSINESS is a Vite-based, installable web application for managing day-to-day business operations. The frontend uses Appwrite for authentication and calls the existing ETHAN BUSINESS Appwrite Functions for onboarding and business operations.

## Requirements

- Node.js 20 or newer (Node.js 22 is used by the hosted Appwrite Site)
- npm

## Run locally

1. Extract this project ZIP.
2. Open a terminal in the extracted project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## Appwrite connection

The current frontend is configured for the existing Appwrite project:

- Endpoint: `https://fra.cloud.appwrite.io/v1`
- Project ID: `ethan-business`
- Onboarding Function: `ethan-business-onboarding`
- Business API Function: `ethan-business-api`

These values are configured in `src/main.js`. They are project identifiers, not API secrets. **Do not put Appwrite API keys or server secrets in frontend code.** Keep privileged operations inside Appwrite Functions.

The Appwrite project already contains the 17 core TablesDB tables. This frontend package does not recreate or modify the database schema.

## PWA

The project includes a web app manifest, SVG app icon, and service worker. It can be installed from a supported browser after it is served over HTTPS (or localhost).

## GitHub

Create a repository named `ethan-business`, then upload the extracted project contents so that `package.json`, `index.html`, `src/`, and `public/` are in the repository root. Do not upload `node_modules/` or the generated `dist/` folder.

## Deployment

The frontend has been built successfully as an Appwrite Site deployment. The production hostname `business.ethandigitalacademy.org` is registered as an Appwrite web platform; its custom-domain routing still needs to be connected and verified in Appwrite before that hostname can be considered live.

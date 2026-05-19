# ConfiguratoreTirocinio

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

To start a server whit https after initial container
```bash
docker start configuratore_tirocinio_https_dev
```



Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Backend rapido per upload GLB/JSON

Avvio backend:

```bash
npm run backend
```

Server di default: `http://localhost:3001`.

### Backend HTTPS diretto (opzione B)

`backend/server.js` puo avviarsi in HTTPS se imposti:

- `HTTPS_KEY_PATH` (chiave privata PEM)
- `HTTPS_CERT_PATH` (certificato PEM)
- opzionali: `HTTPS_CA_PATH`, `HTTPS_PASSPHRASE`
- `HTTPS_ONLY=true` per fallire lo startup se mancano key/cert

Esempio PowerShell (dalla root del progetto):

```powershell
$env:HTTPS_KEY_PATH="ssl\10.46.123.138-key.pem"
$env:HTTPS_CERT_PATH="ssl\10.46.123.138.pem"
$env:HTTPS_ONLY="true"
npm run backend
```


```powershell
test:
$env:HTTPS_KEY_PATH="ssl\localhost+2-key.pem"
$env:HTTPS_CERT_PATH="ssl\localhost+2.pem"
$env:HTTPS_ONLY="true"
npm run backend
```

I path relativi sono risolti rispetto alla cartella corrente da cui lanci `npm run backend`.

### API

- `POST /api/uploads`
  - body JSON:
    - `glbBase64` (richiesto)
    - `jsonBase64` (richiesto)
    - `glbName`, `jsonName` (opzionali)
  - response:
    - `id`
    - `glbUrl`
    - `jsonUrl`
    - `expiresAt`
- `GET /api/uploads/:id`
- `GET /api/uploads/:id/glb`
- `GET /api/uploads/:id/json`
- `DELETE /api/uploads/:id`

Gli upload sono temporanei (TTL default: 30 minuti, variabile `UPLOAD_TTL_MS`).

### Snippet Angular (upload)

```ts
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const payload = {
  glbBase64: await fileToBase64(glbFile),
  jsonBase64: await fileToBase64(jsonFile),
  glbName: glbFile.name,
  jsonName: jsonFile.name
};

const res = await fetch('http://localhost:3001/api/uploads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then((r) => r.json());

// Passa res.id a tecla come query param, poi scarica da /api/uploads/:id/glb e /json
```

## Docker

To build and run the production image (Nginx, HTTP) with Docker Compose:

```bash
docker compose up --build -d
```

If your setup uses the legacy binary instead of the plugin:

```bash
docker-compose up --build -d
```

Then open `http://localhost:8080/`.

To run the Angular dev server in HTTPS (same behavior as your `ng serve --ssl ...` command):
npm start -- --host 0.0.0.0 --port 4200 --ssl --ssl-cert ssl\10.46.123.138.pem --ssl-key ssl\10.46.123.138-key.pem


test:
npm start -- --host 0.0.0.0 --port 4200 --ssl --ssl-cert ssl\localhost+2.pem --ssl-key ssl\localhost+2-key.pem


```bash
docker compose up configuratore_https_dev
```

Legacy equivalent:

```bash
docker-compose up configuratore_https_dev
```

Then open `https://localhost:4200/` (or `https://<your-lan-ip>:4200/` from another device).

To stop and remove the container:

```bash
docker compose down
```

Legacy equivalent:

```bash
docker-compose down
```

You can also run it without Compose:

```bash
docker build -t configuratore-tirocinio .
docker run --rm -p 8080:80 configuratore-tirocinio
```

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

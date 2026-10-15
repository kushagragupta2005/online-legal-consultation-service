# Northstar Legal

### Online legal consultation portal

A polished full-stack demo for discovering legal professionals, requesting consultations, managing case files, and organizing case documents. Built with React, Vite, Node.js, and Express.

> **Demo status:** The local application and sample workflows are implemented. Records and uploads are stored locally with fictional demo data. Azure services and public application hosting have not been configured.

## What’s included

- **Three role-based workspaces:** client, lawyer, and administrator sample sign-in.
- **Lawyer discovery:** browse and filter sample professionals by name and practice area.
- **Consultation requests:** clients can request a time; lawyers can confirm or decline requests.
- **Case tracking:** view matters and create case files from a lawyer or administrator account.
- **Document workflow:** upload PDF, DOCX, PNG, and JPEG files up to 5 MB, organize them by case, and download them through access-controlled API routes.
- **Dashboards:** see role-scoped counts, upcoming consultations, recent cases, and document lists.
- **Responsive interface:** a custom Northstar Legal workspace designed for a clear project demonstration.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express |
| Authentication | Signed demo tokens and role-scoped API routes |
| Demo data | Local JSON file created on first launch |
| Uploaded documents | Local private upload directory |

## Run locally

### Requirements

- Node.js 20 or newer
- npm

### Setup

From the repository root, install the dependencies and start the frontend and API:

```bash
npm install
npm --prefix client install
npm --prefix server install
cp server/.env.example server/.env
```

For local presentation use, the example configuration works as-is. To set a custom signing secret, edit `JWT_SECRET` in `server/.env` before launching. Then run:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API health endpoint is [http://127.0.0.1:5055/api/health](http://127.0.0.1:5055/api/health).

The API creates `server/data/demo-store.json` with sample records on first launch. Uploaded files go to `server/uploads/private/`. These generated folders are excluded from Git.

## Sample accounts

Use the **Presentation Demo** sign-in screen to choose a role. All sample accounts use the password `demo1234`.

| Role | Email |
| --- | --- |
| Client | `maya@example.test` |
| Lawyer | `asha@example.test` |
| Administrator | `admin@example.test` |

All sample names, matters, and appointment details are fictional. Use fictional data only; this demo is not intended to store real client information.

## Suggested demo walkthrough

1. Sign in as the client and browse lawyers by practice area.
2. Submit a consultation request and review it in Consultations.
3. Sign out and sign in as the lawyer to confirm or decline the request.
4. Review the lawyer’s cases and create a sample case file.
5. Open Documents to attach a sample document to a case.
6. Sign in as the administrator to show the platform overview.

## Project layout

```text
client/                 React application and Vite configuration
  src/App.jsx            Application screens and demo interactions
  src/styles.css         Visual styles
server/                 Express API and local demo storage
  server.js              Authentication, role checks, and API routes
  .env.example           Local environment variable template
```

## API routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | API status |
| `POST /api/auth/login` | Sign in with a sample account |
| `GET /api/lawyers` | Browse the sample lawyer directory |
| `GET /api/dashboard` | Role-scoped dashboard counts |
| `GET` / `POST /api/appointments` | View or request consultations |
| `PATCH /api/appointments/:id` | Confirm or decline a request |
| `GET` / `POST /api/cases` | View or create case files |
| `GET` / `POST /api/documents` | List or upload case documents |
| `GET /api/documents/:id/download` | Download an authorized case document |

Protected routes require a bearer token returned by the login route. Client, lawyer, and administrator access is checked by the API.

## Cloud deployment status

The project’s target architecture mentions Azure App Service, Azure SQL Database, Azure Blob Storage, Azure Functions, and Application Insights. Those services are **not connected in this demo**. The current API uses local JSON storage and local file uploads, and the app has no public deployment yet.

To move toward the target architecture:

1. Replace the JSON data store with Azure SQL Database and add schema migrations.
2. Move private document storage to Azure Blob Storage and retain authorization checks for downloads.
3. Deploy the Express API and React frontend through Azure App Service.
4. Add Application Insights instrumentation and verify telemetry in the Azure resource.
5. Define an appointment reminder workflow and implement it with an Azure Function.

Treat each item as complete only after the service is configured and verified in the target Azure environment.

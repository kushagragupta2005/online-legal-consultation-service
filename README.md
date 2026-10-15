# Northstar Legal — Online Consultation Portal

An independently written internship demo for lawyer discovery, consultation requests, role-based workspaces, case tracking, and private case-document uploads.

## Current status

The local demo has a React frontend and an Express API. The API uses a local JSON store for sample records and writes uploaded files to a private local folder. It is intended for demonstration with fictional data only. It is not a production legal service: persistent Azure SQL storage, Azure Blob Storage, Azure Functions, Application Insights, production secrets, and a public deployment are not configured.

## Run locally

Requires Node.js 20 or newer.

1. From this directory, install dependencies with `npm install`, `npm --prefix client install`, and `npm --prefix server install`.
2. Copy `server/.env.example` to `server/.env` and set a long random `JWT_SECRET`.
3. Run `npm run dev`.
4. Open <http://localhost:5173>.

The API is available at <http://127.0.0.1:5055/api/health>. On first launch it creates sample data in `server/data/demo-store.json`; local uploads are written to `server/uploads/private/`. Both locations are ignored by Git.

## Sample sign-in

All sample accounts use `demo1234`:

| Role | Email |
| --- | --- |
| Client | `maya@example.test` |
| Lawyer | `asha@example.test` |
| Administrator | `admin@example.test` |

The sample dataset is fictional and should not be replaced with real client information.

## Included workflows

- Client, lawyer, and administrator sign-in with role-scoped API responses.
- Lawyer search by name and practice area.
- Consultation request creation and lawyer confirmation/decline.
- Case records and client/lawyer assignments.
- PDF, DOCX, PNG, and JPEG upload (5 MB maximum) with access-controlled downloads.
- Dashboard counts, upcoming consultations, recent matters, and document lists.

## Azure work still required

The current demo deliberately uses local JSON storage. To match the report’s target architecture, replace that adapter with Azure SQL Database and migrations; store uploaded files in private Azure Blob Storage; deploy the Express API to Azure App Service; configure Application Insights; and add an Azure Function for a defined appointment reminder workflow. Configure each Azure resource and verify it before describing it as operational.

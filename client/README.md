# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Running the frontend with the backend

The frontend expects an environment variable `VITE_API_BASE_URL` that points to the backend API base URL. By default the client falls back to `http://localhost:5000`.

1. Copy the example env file:

```powershell
cp .env.example .env
```

2. If your backend runs on a different host or port, update `VITE_API_BASE_URL` in `.env`.

3. Start the backend (from the `server/` folder) and then run the frontend dev server:

```powershell
cd client
npm install
npm run dev
```

The app will use `VITE_API_BASE_URL` to call endpoints such as `/api/chat` and `/api/history/{session_id}`.

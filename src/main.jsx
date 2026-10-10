import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LimiteErro, TelaFalha } from "./components/Feedback.jsx";
import App from "./App.jsx";
import "./brand.css";
import "./styles.css";
import "./mobile.css";
import "./template-editor.css";
import "./auth.css";

const router = createBrowserRouter([
  { path: "*", element: <App />, errorElement: <TelaFalha /> },
]);
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LimiteErro>
      <RouterProvider router={router} />
    </LimiteErro>
  </React.StrictMode>,
);

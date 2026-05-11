import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { store } from "./store";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            toastOptions={{
              style: {
                borderRadius: "16px",
                background: "#10272c",
                color: "#ecf4ef",
                border: "1px solid rgba(170, 220, 197, 0.18)",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

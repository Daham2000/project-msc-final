# System Architecture Diagram

This diagram reflects the current implementation in this repository: a React/Vite frontend, a Flask backend, MongoDB persistence, and an in-memory ML pipeline trained from a CSV dataset at application startup.

## High-Level Architecture

```mermaid
flowchart LR
    citizen[Citizen User]
    admin[Admin User]

    subgraph client["Presentation Layer"]
        browser[Web Browser]
        frontend[React + Vite Frontend]
        authctx[AuthContext\nToken + user session]
        dashboard[Dashboard UI\nOverview, guidance, city planning,\nannouncements, users, publish]
        ssehook[Announcement Notification Hook\nEventSource + toast alerts]

        browser --> frontend
        frontend --> authctx
        frontend --> dashboard
        frontend --> ssehook
    end

    subgraph api["Application Layer"]
        flask[Flask App\nrun.py -> create_app()]
        routes[API Routes Blueprint\n/api/v1/*]
        cors[CORS Middleware]
        authsvc[AuthService\nSigned bearer tokens]
        dbsvc[DatabaseService]
        smartsvc[SmartCityService]
        recsvc[Recommendations Module]

        flask --> routes
        flask --> cors
        routes --> authsvc
        routes --> dbsvc
        routes --> smartsvc
        smartsvc --> recsvc
    end

    subgraph ml["Prediction and Analytics Layer"]
        dataset[CSV Dataset\nsmart_city_citizen_activity.csv]
        loader[Data Utils\nCSV parsing + category collection]
        encoder[FeatureEncoder\nNormalization + one-hot encoding]
        ridge[Ridge Regressor]
        knn[Weighted KNN Regressor]
        energy[Energy Model]
        carbon[Carbon Model]
        summary[Dashboard Summary Cache]

        dataset --> loader
        loader --> smartsvc
        smartsvc --> encoder
        encoder --> ridge
        encoder --> knn
        ridge --> energy
        knn --> energy
        ridge --> carbon
        knn --> carbon
        smartsvc --> summary
    end

    subgraph data["Data Layer"]
        mongo[(MongoDB)]
        users[(users collection)]
        announcements[(announcements collection)]
        indexes[Indexes + TTL expiry]
        adminseed[Default admin bootstrap]

        mongo --> users
        mongo --> announcements
        dbsvc --> indexes
        dbsvc --> adminseed
    end

    citizen --> browser
    admin --> browser

    dashboard -->|REST/JSON| routes
    authctx -->|Login, register, /me| routes
    ssehook -->|SSE /announcements/stream| routes

    authsvc -->|Verify token + roles| dbsvc
    dbsvc --> mongo
    dbsvc --> users
    dbsvc --> announcements

    routes -->|Predictions, summary,\nmetadata, recommendations| smartsvc
    routes -->|Users + announcements| dbsvc
```

## Runtime Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant API as Flask API
    participant AUTH as AuthService
    participant DB as DatabaseService
    participant ML as SmartCityService
    participant MDB as MongoDB
    participant CSV as CSV Dataset

    Note over API,CSV: Application startup
    API->>ML: Initialize with dataset path
    ML->>CSV: Load records
    ML->>ML: Train energy + carbon models
    API->>DB: Connect to MongoDB
    DB->>MDB: Ensure indexes + TTL
    DB->>MDB: Ensure default admin

    Note over U,MDB: Authentication flow
    U->>FE: Register or login
    FE->>API: POST /auth/register or /auth/login
    API->>DB: Create/authenticate user
    DB->>MDB: Read/write user
    API->>AUTH: Generate signed token
    API-->>FE: Token + user profile

    Note over U,CSV: Prediction flow
    U->>FE: Submit citizen or city form
    FE->>API: POST /predict/citizen or /predict/city
    API->>AUTH: Verify bearer token
    API->>ML: Sanitize payload + predict
    ML->>ML: Encode features
    ML->>ML: Run trained models
    ML->>ML: Build recommendations
    API-->>FE: Predictions + guidance

    Note over U,MDB: Announcement flow
    U->>FE: Open notices
    FE->>API: GET /announcements
    API->>DB: Query active announcements
    DB->>MDB: Read announcements
    API-->>FE: Notice list

    opt Citizen live notifications
        FE->>API: SSE /announcements/stream?token=...
        loop Every 2 seconds
            API->>DB: Query announcements after last seen id
            DB->>MDB: Read announcements
            API-->>FE: announcement event
        end
    end

    opt Admin publishing
        U->>FE: Create announcement
        FE->>API: POST /admin/announcements
        API->>AUTH: Verify admin role
        API->>DB: Create announcement
        DB->>MDB: Insert announcement with expiry
        API-->>FE: Success response
    end
```

## Component Responsibilities

- `frontend/src/auth/AuthContext.tsx`: manages login state, token persistence, and `/auth/me` bootstrap.
- `frontend/src/features/dashboard/DashboardView.tsx`: main authenticated workspace for citizen and admin flows.
- `frontend/src/hooks/useAnnouncementNotifications.ts`: subscribes citizens to live announcement updates over Server-Sent Events.
- `app/routes.py`: exposes REST endpoints and the SSE announcement stream.
- `app/services/auth_service.py`: signs and verifies bearer tokens and enforces role-based access.
- `app/services/database_service.py`: owns MongoDB access for users and announcements, including TTL cleanup and default admin seeding.
- `app/services/smart_city_service.py`: loads the dataset, trains in-memory models, produces predictions, and aggregates dashboard metrics.
- `app/services/ml.py`: contains feature encoding, ridge regression, weighted KNN, and model selection by RMSE.
- `app/services/recommendations.py`: converts prediction outputs into citizen guidance and city-level actions.

## Architecture Notes

- The backend is a single deployable Flask process that combines API delivery, authentication, ML inference, and SSE streaming.
- ML models are trained in memory during application startup, not served by a separate model service.
- MongoDB is used only for operational data such as users and announcements; the training dataset remains a CSV file outside the database.
- Announcement expiry is handled with MongoDB TTL indexes plus explicit cleanup calls in the service layer.
- The frontend communicates with the backend through JSON over HTTP, with SSE used only for live citizen announcement notifications.

# Smart City Dashboard Flask Backend

This project is a Flask backend for a Smart City Dashboard with:

- machine learning predictions for household energy consumption and carbon footprint
- citizen registration and login
- admin login and user management
- admin announcements for citizens
- dashboard summary and sustainability recommendations

## Core Features

### Machine learning

- Predict `Home_Energy_Consumption_kWh`
- Predict `Carbon_Footprint_kgCO2`
- Suggest eco-friendly, energy-saving, and healthy habits
- Aggregate multiple citizen predictions into citywide energy and carbon forecasts

### Authentication and roles

- `Citizen` users can register and log in
- `Admin` users can log in, view all registered users, and publish announcements
- Authenticated users access dashboard prediction endpoints with bearer tokens

### Announcements

- Admins can create announcements for citizens
- Citizens can view announcements sent by the admin

## Tech Stack

- Flask
- MongoDB with `pymongo`
- Pure-Python ML models
- `itsdangerous` for token signing
- `werkzeug.security` for password hashing

## Dataset

The backend loads this CSV by default:

`C:\Users\Htown\Documents\MSC Programe\Research Project\smart_city_citizen_activity.csv`

If needed, update the dataset path in [app/config.py](</C:/Users/Htown/Documents/MSC Programe/Research Project/project/app/config.py:1>).

## Project Structure

```text
project/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── routes.py
│   └── services/
│       ├── auth_service.py
│       ├── data_utils.py
│       ├── database_service.py
│       ├── ml.py
│       ├── recommendations.py
│       └── smart_city_service.py
├── .env.example
├── requirements.txt
├── run.py
└── README.md
```

## Configuration

Set these environment variables if you want to override the defaults:

```powershell
$env:SECRET_KEY="change-this-secret"
$env:MONGO_URI="mongodb://localhost:27017/"
$env:MONGO_DB_NAME="smart_city_dashboard"
$env:DEFAULT_ADMIN_NAME="Local Government Admin"
$env:DEFAULT_ADMIN_EMAIL="admin@smartcity.local"
$env:DEFAULT_ADMIN_PASSWORD="Admin@123"
```

You can use [.env.example](</C:/Users/Htown/Documents/MSC Programe/Research Project/project/.env.example:1>) as a reference.

## Setup

This project already includes a `.venv` in the workspace. If you want to install dependencies into it:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe run.py
```

The API runs on `http://127.0.0.1:5000`.

## Authentication Flow

### 1. Register a citizen

`POST /api/v1/auth/register`

```json
{
  "full_name": "Nimal Perera",
  "email": "nimal@example.com",
  "password": "Citizen@123",
  "age": 31,
  "gender": "Male",
  "city": "Colombo",
  "phone": "0771234567",
  "address": "No. 10, Main Street"
}
```

### 2. Login

`POST /api/v1/auth/login`

```json
{
  "email": "nimal@example.com",
  "password": "Citizen@123"
}
```

Response includes:

- `access_token`
- `token_type`
- `user`

Use the token in headers:

```text
Authorization: Bearer <access_token>
```

### 3. Get logged-in user

`GET /api/v1/auth/me`

## Role Access

### Citizen

Citizens can access:

- `GET /api/v1/metadata`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/insights/recommendations`
- `POST /api/v1/predict/citizen`
- `POST /api/v1/predict/city`
- `GET /api/v1/announcements`

### Admin

Admins can access everything above, plus:

- `GET /api/v1/admin/users`
- `POST /api/v1/admin/announcements`

The health endpoint remains public:

- `GET /api/v1/health`

## API Endpoints

### Public

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Authenticated

- `GET /api/v1/auth/me`
- `GET /api/v1/metadata`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/insights/recommendations`
- `POST /api/v1/predict/citizen`
- `POST /api/v1/predict/city`
- `GET /api/v1/announcements`

### Admin only

- `GET /api/v1/admin/users`
- `POST /api/v1/admin/announcements`

## Announcement Example

### Create announcement as admin

`POST /api/v1/admin/announcements`

```json
{
  "title": "Energy Saving Week",
  "message": "Please reduce unnecessary electricity usage this week and prefer public transport where possible.",
  "audience_role": "citizen"
}
```

### View announcements

`GET /api/v1/announcements`

## Prediction Example

### `POST /api/v1/predict/citizen`

```json
{
  "Citizen_ID": 2001,
  "Age": 34,
  "Gender": "Female",
  "Mode_of_Transport": "Car",
  "Work_Hours": 8,
  "Shopping_Hours": 1,
  "Entertainment_Hours": 2,
  "Charging_Station_Usage": 0,
  "Steps_Walked": 4200,
  "Calories_Burned": 430,
  "Sleep_Hours": 6.2,
  "Social_Media_Hours": 4.5,
  "Public_Events_Hours": 1.0
}
```

### `POST /api/v1/predict/city`

```json
{
  "citizens": [
    {
      "Citizen_ID": 3001,
      "Age": 28,
      "Gender": "Male",
      "Mode_of_Transport": "Public Transport",
      "Work_Hours": 8,
      "Shopping_Hours": 1,
      "Entertainment_Hours": 1,
      "Charging_Station_Usage": 0,
      "Steps_Walked": 7300,
      "Calories_Burned": 540,
      "Sleep_Hours": 7.4,
      "Social_Media_Hours": 2.5,
      "Public_Events_Hours": 1.2
    }
  ]
}
```

## How Authentication Is Implemented

- Passwords are stored as hashes, not plain text
- Tokens are signed using `itsdangerous`
- Routes use role-based decorators for citizen/admin authorization
- A default admin user is created automatically if it does not already exist

## ML Notes

The backend trains models at app startup:

- energy model for `Home_Energy_Consumption_kWh`
- carbon model for `Carbon_Footprint_kgCO2`

The ML layer automatically keeps the better-performing model for each target from:

- ridge regression
- weighted k-nearest neighbors regression

## Important Note

The included dataset appears somewhat noisy, so the backend is functional but prediction accuracy may still improve if you later train with cleaner or richer real-world data.

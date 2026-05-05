# Smart City Dashboard Flask Backend

This project is a Python Flask backend for a Smart City Dashboard. It trains machine learning models on the provided citizen activity dataset and exposes APIs for:

- Predicting a citizen's household energy consumption
- Predicting a citizen's carbon footprint
- Returning eco-friendly and healthy lifestyle recommendations
- Aggregating multiple citizen predictions into citywide energy and carbon forecasts
- Returning dashboard summary data for a frontend

## Dataset

The backend is configured to load this CSV by default:

`C:\Users\Htown\Documents\MSC Programe\Research Project\smart_city_citizen_activity.csv`

If you move the dataset, update `DATASET_PATH` in [app/config.py](/C:/Users/Htown/Documents/MSC%20Programe/Research%20Project/project/app/config.py:1).

## Project Structure

```text
project/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── routes.py
│   └── services/
│       ├── data_utils.py
│       ├── ml.py
│       ├── recommendations.py
│       └── smart_city_service.py
├── requirements.txt
├── run.py
└── README.md
```

## How It Works

Two regression models are trained when the Flask app starts:

1. `Energy model`
Predicts `Home_Energy_Consumption_kWh` from age, gender, transport mode, work pattern, activity pattern, steps, calories, sleep, and social behavior.

2. `Carbon model`
Predicts `Carbon_Footprint_kgCO2` using the same lifestyle inputs plus home energy consumption.

The machine learning layer uses pure-Python regression components and automatically keeps the best-performing model for each target from:

- ridge regression
- weighted k-nearest neighbors regression

It includes:

- numeric feature standardization
- categorical one-hot encoding
- train/test split evaluation
- model metrics: MAE, RMSE, and R²

## Setup

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py run.py
```

The API will start on `http://127.0.0.1:5000`.

## API Endpoints

### `GET /api/v1/health`

Returns service health, dataset loading status, and training status.

### `GET /api/v1/metadata`

Returns:

- accepted categorical values
- required input fields
- model evaluation metrics

### `GET /api/v1/dashboard/summary`

Returns dataset-level averages and total predicted city carbon and energy values.

### `GET /api/v1/insights/recommendations`

Returns city-level sustainability suggestions based on dashboard summary outputs.

### `POST /api/v1/predict/citizen`

Example request:

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

Example response:

```json
{
  "citizen_id": 2001,
  "inputs": {
    "Age": 34.0,
    "Work_Hours": 8.0,
    "Shopping_Hours": 1.0,
    "Entertainment_Hours": 2.0,
    "Charging_Station_Usage": 0.0,
    "Steps_Walked": 4200.0,
    "Calories_Burned": 430.0,
    "Sleep_Hours": 6.2,
    "Social_Media_Hours": 4.5,
    "Public_Events_Hours": 1.0,
    "Gender": "Female",
    "Mode_of_Transport": "Car",
    "Home_Energy_Consumption_kWh": 5.41
  },
  "predictions": {
    "predicted_energy_consumption_kwh": 5.41,
    "predicted_carbon_footprint_kgco2": 63.78,
    "sustainability_band": "Moderate"
  },
  "recommendations": {
    "eco_friendly_alternatives": [
      "Switch some weekly trips to walking, cycling, or public transport to reduce transport emissions."
    ],
    "energy_saving_tips": [
      "Your predicted energy use is moderate; maintaining efficient lighting and appliance habits can keep it low."
    ],
    "health_suggestions": [
      "Reducing screen time by 30 to 60 minutes a day may improve rest quality and daily movement.",
      "Aim for at least 6,000 to 8,000 steps per day to improve heart health and support a more active routine.",
      "Try targeting 7 to 9 hours of sleep for better recovery, concentration, and energy balance."
    ]
  }
}
```

### `POST /api/v1/predict/city`

Example request:

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
    },
    {
      "Citizen_ID": 3002,
      "Age": 46,
      "Gender": "Female",
      "Mode_of_Transport": "EV",
      "Work_Hours": 7,
      "Shopping_Hours": 2,
      "Entertainment_Hours": 2,
      "Charging_Station_Usage": 1,
      "Steps_Walked": 5100,
      "Calories_Burned": 470,
      "Sleep_Hours": 6.7,
      "Social_Media_Hours": 3.1,
      "Public_Events_Hours": 0.8
    }
  ]
}
```

This endpoint returns:

- per-citizen predictions
- average predicted energy and carbon
- total predicted city energy and carbon

## Notes

- If `Home_Energy_Consumption_kWh` is included in the citizen payload, the backend uses it as a carbon prediction input override.
- If `Home_Energy_Consumption_kWh` is omitted, the backend predicts energy first and feeds that value into the carbon model.
- The recommendation engine mixes model outputs with practical sustainability and health rules to support better citizen guidance.

from typing import Dict, List


LOW_CARBON_TRANSPORT = {"Walking", "Bike", "Bicycle", "Public Transport"}


def citizen_recommendations(payload: Dict[str, object]) -> Dict[str, List[str]]:
    eco_tips: List[str] = []
    energy_tips: List[str] = []
    health_tips: List[str] = []

    transport = str(payload["Mode_of_Transport"])
    steps_walked = float(payload["Steps_Walked"])
    sleep_hours = float(payload["Sleep_Hours"])
    social_media_hours = float(payload["Social_Media_Hours"])
    work_hours = float(payload["Work_Hours"])
    entertainment_hours = float(payload["Entertainment_Hours"])
    shopping_hours = float(payload["Shopping_Hours"])
    energy_use = float(payload["Home_Energy_Consumption_kWh"])
    age = float(payload["Age"])
    gender = str(payload["Gender"])

    if transport not in LOW_CARBON_TRANSPORT:
        eco_tips.append("Switch some weekly trips to walking, cycling, or public transport to reduce transport emissions.")
    else:
        eco_tips.append("Keep using low-emission transport and combine errands into one trip to stay efficient.")

    if energy_use > 6.0:
        energy_tips.append("Your predicted home energy use is relatively high; use LED lighting and switch off standby appliances.")
        energy_tips.append("Consider smart plugs or scheduled appliance use during off-peak periods to reduce wasted electricity.")
    else:
        energy_tips.append("Your predicted energy use is moderate; maintaining efficient lighting and appliance habits can keep it low.")

    if social_media_hours > 4.0:
        health_tips.append("Reducing screen time by 30 to 60 minutes a day may improve rest quality and daily movement.")

    if steps_walked < 6000:
        health_tips.append("Aim for at least 6,000 to 8,000 steps per day to improve heart health and support a more active routine.")
    elif steps_walked >= 10000:
        health_tips.append("Your walking level is strong; continue daily movement and add stretching or light recovery when needed.")

    if sleep_hours < 7.0:
        health_tips.append("Try targeting 7 to 9 hours of sleep for better recovery, concentration, and energy balance.")
    elif sleep_hours > 9.0:
        health_tips.append("Very long sleep can sometimes signal an imbalanced routine; keep a consistent sleep schedule and daytime activity.")

    if work_hours + entertainment_hours + shopping_hours > 12.0:
        health_tips.append("A busy daily schedule can increase fatigue; include short walking or breathing breaks during the day.")

    if age >= 50 and steps_walked < 5000:
        health_tips.append("A steady walking habit and regular sleep can be especially helpful for maintaining long-term mobility and energy.")

    if age >= 40:
        health_tips.append(f"Because you are in a midlife or older age group, keep up with regular preventive health checkups that fit your age and gender profile ({gender}).")

    if not health_tips:
        health_tips.append("Your lifestyle pattern looks balanced overall; keep focusing on sleep, movement, and efficient transport choices.")

    return {
        "eco_friendly_alternatives": eco_tips,
        "energy_saving_tips": energy_tips,
        "health_suggestions": health_tips,
    }


def sustainability_band(carbon_footprint: float) -> str:
    if carbon_footprint < 35:
        return "Low"
    if carbon_footprint < 65:
        return "Moderate"
    return "High"


def city_recommendations(summary: Dict[str, object]) -> List[str]:
    recommendations: List[str] = []
    carbon_average = float(summary["average_predicted_carbon_kgco2"])
    energy_average = float(summary["average_predicted_energy_kwh"])
    top_transport = str(summary["most_common_transport_mode"])

    if carbon_average >= 65:
        recommendations.append("Citywide emissions are high; prioritize public transport campaigns, efficient buildings, and household energy awareness.")
    else:
        recommendations.append("Citywide emissions are manageable; expand the habits that already support lower-carbon living.")

    if energy_average >= 6:
        recommendations.append("Average home energy demand is elevated; smart metering and appliance-efficiency programs could have a strong impact.")

    if top_transport in {"Car", "EV"}:
        recommendations.append("Transport is a major lever here; encourage mixed mobility through bus routes, cycling lanes, and walkable services.")
    else:
        recommendations.append("The transport mix already shows sustainable behavior; maintain safe walking and cycling infrastructure.")

    return recommendations

import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { CitiesResponse } from "../types/api";

// The list is static for the life of the deployment, so fetch it once per page
// load and share the promise between the registration form and the notice form.
let citiesPromise: Promise<CitiesResponse> | null = null;

function loadCities() {
  if (!citiesPromise) {
    citiesPromise = api.getCities().catch((issue) => {
      // Clear the cache so a transient failure can be retried on remount.
      citiesPromise = null;
      throw issue;
    });
  }
  return citiesPromise;
}

export function useCities() {
  const [cities, setCities] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadCities()
      .then((response) => {
        if (active) {
          setCities(response.cities);
          setCountry(response.country);
          setError(null);
        }
      })
      .catch((issue: unknown) => {
        if (active) {
          setError(issue instanceof Error ? issue.message : "Unable to load the city list.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { cities, country, loading, error };
}

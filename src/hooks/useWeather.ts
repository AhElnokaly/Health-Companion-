import { useState, useEffect } from 'react';

const CACHE_KEY = 'lifecompanion_weather_cache';
const CACHE_HOURS = 24;

interface WeatherData {
  temperature: number | null;
  sunrise: string | null;
  sunset: string | null;
  uvIndex: number | null;
  aqi: number | null; // Air Quality Index
}

interface WeatherCache {
  data: WeatherData;
  timestamp: number;
}

export function useWeather() {
  const [weatherData, setWeatherData] = useState<WeatherData>({
    temperature: null,
    sunrise: null,
    sunset: null,
    uvIndex: null,
    aqi: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      // Check cache first
      const cachedData = localStorage.getItem(CACHE_KEY);
      let isCacheValid = false;
      let cachedWeather: WeatherData | null = null;

      if (cachedData) {
        try {
          const parsed: WeatherCache = JSON.parse(cachedData);
          const isExpired = (Date.now() - parsed.timestamp) > CACHE_HOURS * 60 * 60 * 1000;
          cachedWeather = parsed.data;

          if (!isExpired) {
            isCacheValid = true;
            setWeatherData(parsed.data);
            setLoading(false);
          }
        } catch (e) {
          console.error("Failed to parse weather cache", e);
        }
      }

      if (!navigator.onLine) {
        if (!isCacheValid && cachedWeather !== null) {
           setWeatherData(cachedWeather);
        }
        setLoading(false);
        return;
      }

      if (!navigator.geolocation) {
         setLoading(false);
         return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const [weatherRes, aqiRes] = await Promise.all([
               fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,uv_index&daily=sunrise,sunset&timezone=auto`),
               fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi&timezone=auto`)
            ]);
            
            const weatherJson = await weatherRes.json();
            const aqiJson = await aqiRes.json();
            
            const newWeatherData: WeatherData = {
               temperature: weatherJson.current?.temperature_2m ?? null,
               uvIndex: weatherJson.current?.uv_index ?? null,
               sunrise: weatherJson.daily?.sunrise?.[0] ?? null,
               sunset: weatherJson.daily?.sunset?.[0] ?? null,
               aqi: aqiJson.current?.european_aqi ?? null
            };
            
            setWeatherData(newWeatherData);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data: newWeatherData,
              timestamp: Date.now()
            }));
          } catch (err) {
             console.error("Failed to fetch weather from API", err);
             if (cachedWeather !== null && !isCacheValid) {
                 setWeatherData(cachedWeather);
             }
          } finally {
             setLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (cachedWeather !== null && !isCacheValid) {
             setWeatherData(cachedWeather);
          }
          setLoading(false);
        }
      );
    };

    fetchWeather();

    const handleOnline = () => {
      fetchWeather();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);

  }, []);

  return { ...weatherData, loading };
}

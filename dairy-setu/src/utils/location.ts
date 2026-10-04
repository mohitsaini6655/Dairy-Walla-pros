// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Get user's current location
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 0.005) {
    return 'Very close';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)}m away`;
  }
  return `${km.toFixed(1)}km away`;
}

// Mock location data for demo (Indian cities)
export const DEMO_LOCATIONS = {
  'Ajmer': { lat: 26.4499, lon: 74.6399 },
  'Jaipur': { lat: 26.9124, lon: 75.7873 },
  'Delhi': { lat: 28.7041, lon: 77.1025 },
  'Mumbai': { lat: 19.0760, lon: 72.8777 },
  'Bangalore': { lat: 12.9716, lon: 77.5946 },
  'Vaishali Nagar, Ajmer': { lat: 26.4700, lon: 74.6100 },
  'Civil Lines, Ajmer': { lat: 26.4550, lon: 74.6450 },
  'Nasirabad, Ajmer': { lat: 26.3000, lon: 74.7300 },
};

// Get coordinates from location name (simplified for demo)
export function getCoordinatesFromLocation(locationName: string): { lat: number; lon: number } | null {
  const location = DEMO_LOCATIONS[locationName as keyof typeof DEMO_LOCATIONS];
  if (location) {
    return { lat: location.lat, lon: location.lon };
  }
  
  // Default to Ajmer if not found
  return { lat: 26.4499, lon: 74.6399 };
}

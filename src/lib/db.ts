import { openDB, DBSchema } from 'idb';
import type { VehicleProfile, FavoriteTrip } from './types';

const DB_NAME = 'FuelWiseDB';
const DB_VERSION = 3; // Incremented version
const FUEL_PRICES_STORE = 'fuelPrices';
const VEHICLE_PROFILE_STORE = 'vehicleProfile';
const FAVORITE_TRIPS_STORE = 'favoriteTrips';
const VEHICLE_PROFILE_KEY = 'currentUserVehicle';


interface FuelWiseDB extends DBSchema {
  [FUEL_PRICES_STORE]: {
    key: string;
    value: number;
  };
  [VEHICLE_PROFILE_STORE]: {
    key: string;
    value: VehicleProfile;
  };
  [FAVORITE_TRIPS_STORE]: {
      key: string;
      value: FavoriteTrip;
      indexes: { 'by-name': string };
  }
}

const defaultPrices: { [key: string]: number } = {
  "Gasoline 95": 6.94,
  "Gasoline 98": 7.85,
  "Diesel": 6.16,
};

export async function getDB() {
  const db = await openDB<FuelWiseDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains(FUEL_PRICES_STORE)) {
        const fuelStore = db.createObjectStore(FUEL_PRICES_STORE);
        for (const [fuelType, price] of Object.entries(defaultPrices)) {
          fuelStore.put(price, fuelType);
        }
      }
      
      if (!db.objectStoreNames.contains(VEHICLE_PROFILE_STORE)) {
        db.createObjectStore(VEHICLE_PROFILE_STORE);
      }

      if (!db.objectStoreNames.contains(FAVORITE_TRIPS_STORE)) {
        const favoriteStore = db.createObjectStore(FAVORITE_TRIPS_STORE, { keyPath: 'id' });
        favoriteStore.createIndex('by-name', 'name');
      }
    },
  });
  return db;
}


export async function getFuelPrice(fuelType: string): Promise<number | undefined> {
  const db = await getDB();
  return db.get(FUEL_PRICES_STORE, fuelType);
}

export async function getAllFuelPrices(): Promise<{ [key: string]: number }> {
    const db = await getDB();
    try {
        const tx = db.transaction(FUEL_PRICES_STORE, 'readonly');
        const store = tx.objectStore(FUEL_PRICES_STORE);
        const keys = await store.getAllKeys() as string[];
        const values = await store.getAll();
        await tx.done;

        if (keys.length === 0 && values.length === 0) {
            const writeTx = db.transaction(FUEL_PRICES_STORE, 'readwrite');
            const writeStore = writeTx.objectStore(FUEL_PRICES_STORE);
            await Promise.all(Object.entries(defaultPrices).map(([key, value]) => writeStore.put(value, key)));
            await writeTx.done;
            return defaultPrices;
        }

        const prices: { [key: string]: number } = {};
        keys.forEach((key, index) => {
            prices[key] = values[index];
        });
        
        const writeTx = db.transaction(FUEL_PRICES_STORE, 'readwrite');
        const writeStore = writeTx.objectStore(FUEL_PRICES_STORE);
        let updated = false;
        for (const key in defaultPrices) {
            if (!prices.hasOwnProperty(key)) {
                await writeStore.put(defaultPrices[key], key);
                prices[key] = defaultPrices[key];
                updated = true;
            }
        }
        if(updated) await writeTx.done;

        return prices;
    } catch (error) {
        console.warn("Could not get fuel prices, falling back to default.", error);
        return defaultPrices;
    }
}

export async function saveVehicleProfile(profile: VehicleProfile): Promise<void> {
    const db = await getDB();
    await db.put(VEHICLE_PROFILE_STORE, profile, VEHICLE_PROFILE_KEY);
}

export async function getVehicleProfile(): Promise<VehicleProfile | undefined> {
    const db = await getDB();
    try {
        const tx = db.transaction(VEHICLE_PROFILE_STORE, 'readonly');
        const store = tx.objectStore(VEHICLE_PROFILE_STORE);
        const profile = await store.get(VEHICLE_PROFILE_KEY);
        await tx.done;
        return profile;
    } catch (error) {
        console.error("Failed to get vehicle profile, the store might not exist yet.", error);
        return undefined;
    }
}

export async function saveFavoriteTrip(trip: Omit<FavoriteTrip, 'id'>): Promise<string> {
    const db = await getDB();
    const id = `${trip.start}-${trip.end}-${Date.now()}`;
    const newTrip = { ...trip, id };
    await db.put(FAVORITE_TRIPS_STORE, newTrip);
    return id;
}

export async function getFavoriteTrips(): Promise<FavoriteTrip[]> {
    const db = await getDB();
    return db.getAll(FAVORITE_TRIPS_STORE);
}

export async function deleteFavoriteTrip(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(FAVORITE_TRIPS_STORE, id);
}

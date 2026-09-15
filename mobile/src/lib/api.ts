export const BASE_URL = "http://192.0.0.2:8000"; // laptop running uvicorn; Cloud Run URL after deploy

export type Diet = "none" | "vegetarian" | "vegan" | "halal" | "gluten_free";
export type City = { name: string; iata: string; countryCode: string; countryName: string; currency: string };
export type Country = { code: string; name: string; currency: string };
export type Profile = { homeCity: City | null; activities: string[]; activitiesNote: string; diet: Diet };
export type Trip = { budget: number; departDate: string; returnDate: string; travelers: number };
export type Money = { home: number; local: number };

export type Suggestion = {
  countryCode: string; countryName: string; city: string; iata: string;
  localCurrency: string; reason: string; flightPrice: Money;
};
export type Flight = {
  airline: string; departAt: string; returnAt: string; transfers: number;
  price: Money; url: string; seenAt: string; overBudget: boolean;
};
export type Stay = { name: string; stars: number; price: Money; overBudget: boolean };
export type Place = { name: string; description: string };
export type Plan = {
  destination: { city: string; iata: string; countryCode: string; countryName: string; reason: string; photo: string };
  currencies: { home: string; local: string };
  budget: {
    total: Money; flightAndStay: Money; dailySpendPerPerson: Money; days: number;
    dailySpendTotal: Money; remaining: Money; fits: boolean;
  };
  flights: Flight[];
  stays: Stay[];
  activities: Place[];
  food: Place[];
  sources: { title: string; uri: string }[];
  errors: { flights: string | null; stays: string | null; places: string | null };
  sample: ("flights" | "stays" | "places")[]; // categories served from stand-in data (API key not configured)
};
export type Destination = { countryCode: string; city?: { name: string; iata: string; reason: string } };

async function call<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(BASE_URL + path, body === undefined ? undefined : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export const getPlaces = (term: string) => call<City[]>(`/places?term=${encodeURIComponent(term)}`);
export const getCountries = () => call<Country[]>("/countries");
export const postSuggest = (profile: Profile, trip: Trip) =>
  call<{ suggestions: Suggestion[]; sample: string[] }>("/suggest", { profile, trip });
export const postPlan = (profile: Profile, trip: Trip, destination: Destination) =>
  call<Plan>("/plan", { profile, trip, ...destination });

export function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString("en-US")} ${currency}`;
  }
}

// "JP" -> 🇯🇵 via regional indicator symbols
export const flag = (countryCode: string) =>
  countryCode.length === 2 ? String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌍";

export const bothMoney =(m: Money, home: string, local: string) =>
  home === local ? money(m.home, home) : `${money(m.home, home)} ≈ ${money(m.local, local)}`;

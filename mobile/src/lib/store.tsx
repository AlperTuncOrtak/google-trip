import { createContext, ReactNode, useContext, useState } from "react";
import { Destination, Profile, Trip } from "./api";

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

type Store = {
  profile: Profile; setProfile: (p: Profile) => void;
  trip: Trip; setTrip: (t: Trip) => void;
  destination: Destination | null; setDestination: (d: Destination | null) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ homeCity: null, activities: [], activitiesNote: "", diet: "none" });
  const [trip, setTrip] = useState<Trip>({ budget: 0, departDate: iso(inDays(14)), returnDate: iso(inDays(19)), travelers: 1 });
  const [destination, setDestination] = useState<Destination | null>(null);
  return (
    <Ctx.Provider value={{ profile, setProfile, trip, setTrip, destination, setDestination }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

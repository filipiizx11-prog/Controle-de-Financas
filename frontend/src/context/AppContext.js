import { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [person, setPerson] = useState("todos");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <AppContext.Provider
      value={{ month, setMonth, year, setYear, person, setPerson, refreshKey, refresh }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

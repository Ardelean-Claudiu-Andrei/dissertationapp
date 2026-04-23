import React, { createContext, useContext, useState } from 'react';

const FlagsContext = createContext({ flags: [], hasFlag: () => false, updateFlags: () => {} });

export function FlagsProvider({ children }) {
  const [flags, setFlags] = useState([]);

  function hasFlag(name) {
    return flags.some((f) => f.name === name);
  }

  function updateFlags(newFlags) {
    setFlags(newFlags || []);
  }

  return (
    <FlagsContext.Provider value={{ flags, hasFlag, updateFlags }}>
      {children}
    </FlagsContext.Provider>
  );
}

export function useFlags() {
  return useContext(FlagsContext);
}

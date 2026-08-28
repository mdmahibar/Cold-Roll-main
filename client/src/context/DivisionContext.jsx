import React, { createContext, useContext, useState } from 'react';

const DivisionContext = createContext();

export const DivisionProvider = ({ children }) => {
  // Initially null — will be set to the first API division code on login,
  // or can be switched by the user from the Navbar pills.
  const [selectedDivision, setSelectedDivision] = useState(null);

  return (
    <DivisionContext.Provider value={{ selectedDivision, setSelectedDivision }}>
      {children}
    </DivisionContext.Provider>
  );
};

export const useDivision = () => {
  const context = useContext(DivisionContext);
  if (!context) {
    throw new Error('useDivision must be used within a DivisionProvider');
  }
  return context;
};

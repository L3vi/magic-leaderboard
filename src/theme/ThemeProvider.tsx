import React, { ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import * as theme from './theme';

interface Props {
  children: ReactNode;
}

export const ThemeProvider: React.FC<Props> = ({ children }) => (
  <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
);

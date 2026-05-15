// @ts-nocheck — Vitest-only shim.
import React from 'react';

import { View } from './react-native';

export function SafeAreaView({ children, style, edges: _edges }) {
  return React.createElement(View, { style }, children);
}

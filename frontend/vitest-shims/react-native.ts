// @ts-nocheck — Vitest-only shim; not part of the Expo app typecheck surface.
/**
 * Minimal DOM-backed stand-ins so Vitest can import components that depend on
 * `react-native` without parsing Flow in the real `react-native` package entry.
 */
import * as React from 'react';

type StyleInput = unknown;

function flattenStyle(style) {
  if (style == null) {
    return {};
  }
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map((s) => flattenStyle(s)));
  }
  if (typeof style === 'object') {
    return style;
  }
  return {};
}

export const View = ({ children, style, ...rest }) =>
  React.createElement('div', { 'data-testid': 'rn-view', style: flattenStyle(style), ...rest }, children);

export const Text = ({ children, style, selectable: _s, ...rest }) =>
  React.createElement('span', { 'data-testid': 'rn-text', style: flattenStyle(style), ...rest }, children);

export const Image = ({ style, source: _s, resizeMode: _r, ...rest }) =>
  React.createElement('img', {
    'data-testid': 'rn-image',
    alt: '',
    src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    style: flattenStyle(style),
    ...rest,
  });

export const ScrollView = ({ children, contentContainerStyle, style, ...rest }) =>
  React.createElement(
    'div',
    { 'data-testid': 'rn-scroll', style: flattenStyle(style), ...rest },
    React.createElement('div', { style: flattenStyle(contentContainerStyle) }, children),
  );

export const ActivityIndicator = () => React.createElement('span', { 'data-testid': 'rn-spinner' });

export function Pressable({ children, onPress, style, accessibilityRole: _a, hitSlop: _h, ...rest }) {
  const flatStyle = typeof style === 'function' ? flattenStyle(style({ pressed: false })) : flattenStyle(style);
  return React.createElement(
    'button',
    {
      type: 'button',
      'data-testid': 'rn-pressable',
      style: flatStyle,
      onClick: onPress,
      ...rest,
    },
    children,
  );
}

export const StyleSheet = {
  create: (styles) => styles,
  hairlineWidth: 1,
};

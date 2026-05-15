import React from 'react';
import { Pressable } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { PrimaryButton } from './PrimaryButton';

describe('PrimaryButton', () => {
  it('renders label and invokes onPress', () => {
    const onPress = vi.fn();
    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<PrimaryButton label="Tap me" onPress={onPress} />);
    });
    const pressable = root!.root.findByType(Pressable);
    act(() => {
      pressable.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

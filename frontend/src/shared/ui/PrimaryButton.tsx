import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../shell/theme';

type PrimaryButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  variant = 'primary',
  textStyle,
  style,
  ...rest
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'destructive' && styles.destructive,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          variant === 'secondary' && styles.labelSecondary,
          variant === 'destructive' && styles.labelDestructive,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: theme.spacingSm + 2,
    paddingHorizontal: theme.spacingMd,
    borderRadius: theme.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  primary: {
    backgroundColor: theme.primaryAction,
    borderColor: theme.primaryAction,
  },
  secondary: {
    backgroundColor: theme.background,
    borderColor: theme.border,
  },
  destructive: {
    backgroundColor: theme.background,
    borderColor: theme.destructive,
  },
  pressed: {
    opacity: 0.88,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  labelSecondary: {
    color: theme.textSecondary,
  },
  labelDestructive: {
    color: theme.destructive,
    fontWeight: '600',
  },
});

import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps, type TextStyle } from 'react-native';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

type Props = TextInputProps & {
  style?: TextStyle;
};

export const Input = forwardRef<TextInput, Props>(function Input({ style, ...props }, ref) {
  const { t } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={t.textMuted}
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: t.bgElevated,
          borderColor: t.border,
          color: t.text,
        },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
});


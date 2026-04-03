import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps, type TextStyle } from 'react-native';
import { radii } from '../../theme/tokens';
import { FF } from '../../theme/fonts';
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
          backgroundColor: t.inputSurface,
          borderColor: t.border,
          color: t.text,
          fontFamily: FF.regular,
        },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
  },
});

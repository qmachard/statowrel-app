import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * The neobrutalist input: thick border, rounded corners, a small hard shadow,
 * and a focus ring that sits *outside* the border (the `outline-2
 * outline-offset-2` of the web recipe).
 *
 * The ring is a wrapper that always reserves its 2px border and its 2px gap —
 * transparent until focus — so gaining focus never reflows the form.
 *
 * The web input is 32px tall, under the 44pt minimum iOS asks of a touch target:
 * here it's 48px, comfortably above it on both platforms, and React Native
 * centres a single-line input's text in that height by itself — as long as
 * nothing sets a `lineHeight` taller than the font, which would push the text
 * down off the centre line. Hence a bare `fontSize` here.
 */
const styles = StyleSheet.create({
  root: {
    gap: spacing(2),
  },
  label: {
    fontFamily: fonts.head,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  ring: {
    borderRadius: radius.md,
    borderWidth,
    borderColor: 'transparent',
    padding: spacing(0.5),
  },
  ringFocused: {
    borderColor: colors.primary,
  },
  input: {
    height: 48,
    width: '100%',
    borderRadius: radius.DEFAULT,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: spacing(3),
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  inputInvalid: {
    borderColor: colors.destructive,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
});

export const TextField = ({ label, error, editable = true, style, onFocus, onBlur, ...props }: TextFieldProps) => {
  const [ focused, setFocused ] = useState(false);

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>

      <View style={[ styles.ring, focused ? styles.ringFocused : null ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors['muted-foreground']}
          editable={editable}
          style={[
            styles.input,
            shadows.sm,
            error ? styles.inputInvalid : null,
            editable ? null : styles.inputDisabled,
            style,
          ]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

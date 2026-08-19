import { useState } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { shadows } from '@/design/shadows';
import { colors } from '@/design/tokens';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * The neobrutalist input: thick border, rounded corners, a small hard
 * shadow, and a focus ring that sits *outside* the border (the `outline-2
 * outline-offset-2` of the web recipe).
 *
 * The ring is a wrapper that always reserves its 2px border and its 2px gap —
 * transparent until focus — so gaining focus never reflows the form.
 *
 * The web input is `h-8` (32px), which is under the 44pt minimum iOS asks of a
 * touch target: here it's `h-12` (48px), comfortably above it on both platforms,
 * and React Native centres a single-line input's text in that height by itself.
 *
 * Hence `text-[16px]` rather than `text-base`: the token class also ships a
 * `line-height` of 24px, and a `lineHeight` taller than the font on a
 * `TextInput` pushes the text down off the centre line. The size is the same 16px
 * either way — this one just leaves the line box alone.
 */
export const TextField = ({ label, error, editable = true, style, onFocus, onBlur, ...props }: TextFieldProps) => {
  const [ focused, setFocused ] = useState(false);

  return (
    <View className="gap-2">
      <Text className="font-head text-xs uppercase text-foreground">{label}</Text>

      <View
        className={[
          'rounded-md border-2 p-0.5',
          focused ? 'border-primary' : 'border-transparent',
        ].join(' ')}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors['muted-foreground']}
          editable={editable}
          style={[ shadows.sm, style ]}
          className={[
            'h-12 w-full rounded border-2 bg-input px-3 font-sans text-[16px] text-foreground',
            error ? 'border-destructive' : 'border-border',
            editable ? '' : 'opacity-50',
          ].join(' ')}
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

      {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}
    </View>
  );
};

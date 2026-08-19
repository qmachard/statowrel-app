import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { COLORS } from '@/theme/colors';

import { InlineError } from './InlineError';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = ({ label, error, ...props }: TextFieldProps) => (
  <View className="gap-2">
    <Text className="font-head text-xs uppercase text-black">{label}</Text>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={`${COLORS.black}66`}
      className={[
        'rounded-panel border-black bg-cream px-4 py-3 font-sans text-base text-black shadow-sm',
        // An error thickens the frame rather than recolouring it: the outline is
        // always black, and the message carries the alert on its own.
        error ? 'border-4' : 'border-2',
      ].join(' ')}
      {...props}
    />
    {error ? <InlineError message={error} /> : null}
  </View>
);

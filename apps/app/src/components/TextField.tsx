import { Text, TextInput, type TextInputProps, View } from 'react-native';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = ({ label, error, ...props }: TextFieldProps) => (
  <View className="gap-2">
    <Text className="font-head text-xs uppercase text-foreground">{label}</Text>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor="#6b6355"
      className={[
        'border-2 bg-input px-4 py-3 font-sans text-base text-foreground shadow-sm',
        error ? 'border-destructive' : 'border-border',
      ].join(' ')}
      {...props}
    />
    {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}
  </View>
);

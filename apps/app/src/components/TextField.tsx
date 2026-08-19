import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { ErrorNotice } from '@/components/ErrorNotice';
import { ink, withAlpha } from '@/design/tokens';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

// Le placeholder s'estompe en baissant l'opacité du noir, pas en prenant une
// cinquième encre. `placeholderTextColor` n'accepte pas de className.
const PLACEHOLDER = withAlpha(ink.black, 0.45);

export const TextField = ({ label, error, ...props }: TextFieldProps) => (
  <View className="gap-2">
    <Text className="font-head text-xs uppercase text-foreground">{label}</Text>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={PLACEHOLDER}
      className={[
        'rounded-panel border-border bg-input px-4 py-3 font-sans text-base text-foreground',
        // Tous les contours sont noirs : un champ en erreur ne change pas de
        // couleur, il épaissit son trait et perd son ombre.
        error ? 'border-4 shadow-none' : 'border-2 shadow-sm',
      ].join(' ')}
      {...props}
    />
    {error ? <ErrorNotice message={error} /> : null}
  </View>
);

import { Text, View } from 'react-native';

/**
 * Un message d'erreur, en noir plein. Le rose marque ce qui n'est pas un jour
 * comme les autres — un échec n'en fait pas partie, et il n'existe pas de
 * cinquième encre « destructive ».
 */
export const ErrorNotice = ({ message }: { message: string }) => (
  <View className="rounded-panel border-2 border-border bg-secondary px-3 py-2">
    <Text className="font-sans text-sm text-secondary-foreground">{message}</Text>
  </View>
);

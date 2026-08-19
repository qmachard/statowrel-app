import { Text, View } from 'react-native';

/**
 * An error message as a sticker: black text on pink, framed.
 *
 * The palette has no alert ink — pink already carries "this is not an ordinary
 * one" — so an error is signalled by the frame, not by recolouring the text.
 */
export const InlineError = ({ message }: { message: string }) => (
  <View className="self-start rounded-panel border-2 border-black bg-pink px-3 py-1 shadow-xs">
    <Text className="font-sans text-sm text-black">{message}</Text>
  </View>
);

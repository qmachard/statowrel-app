import { Text, View } from 'react-native';

// Placeholder entry screen — this is bootstrap scaffolding only, not a
// designed view. Real screens are added once the product design is ready.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="border-2 border-border bg-primary px-6 py-4 shadow-md">
        <Text className="font-head text-xl text-primary-foreground">StatOwrel</Text>
      </View>
    </View>
  );
}

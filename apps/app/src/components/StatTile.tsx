import { Text, View } from 'react-native';

interface StatTileProps {
  label: string;
  value: string;
  /** Small pictogram shown above the value. */
  icon: string;
}

/** Secondary figure next to the streak card — record, total answered days. */
export function StatTile({ label, value, icon }: StatTileProps) {
  return (
    <View className="flex-1 border-2 border-border bg-card p-4 shadow-sm">
      <Text className="text-2xl">{icon}</Text>
      <Text className="mt-1 font-head text-3xl text-card-foreground">{value}</Text>
      <Text className="font-sans text-xs uppercase text-muted-foreground">{label}</Text>
    </View>
  );
}

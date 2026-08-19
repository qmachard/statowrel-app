import { Pressable, Text, View } from 'react-native';

import { HOME_DATASET_LABELS, type HomeDataset } from './fixtures';

export interface DevDataSwitchProps {
  dataset: HomeDataset;
  onSelect: (dataset: HomeDataset) => void;
  onSignOut: () => void;
}

const DATASETS = Object.keys(HOME_DATASET_LABELS) as HomeDataset[];

/**
 * Development-only controls: swap the fixture the screen reads, and sign out.
 *
 * It renders nothing in a release build. Sign-out lives here rather than in the
 * header because the header's two buttons belong to the Profile screen
 * (docs/prd.md §5.3), which does not exist yet — parking it in the dev panel
 * keeps the session escapable without inventing a product affordance that will
 * have to be removed.
 */
export const DevDataSwitch = ({ dataset, onSelect, onSignOut }: DevDataSwitchProps) => {
  if (!__DEV__) {
    return null;
  }

  return (
    <View className="gap-3 rounded-panel border-2 border-dashed border-black bg-cream p-3">
      <Text className="font-head text-[10px] uppercase text-black/60">Dev · jeu de données</Text>

      <View className="flex-row gap-2">
        {DATASETS.map((candidate) => (
          <Pressable
            key={candidate}
            accessibilityRole="button"
            accessibilityState={{ selected: candidate === dataset }}
            className={[
              'flex-1 rounded-full border-2 border-black px-3 py-2',
              candidate === dataset ? 'bg-black' : 'bg-cream',
            ].join(' ')}
            onPress={() => onSelect(candidate)}
          >
            <Text
              className={`text-center font-sans text-xs uppercase ${candidate === dataset ? 'text-cream' : 'text-black'}`}
            >
              {HOME_DATASET_LABELS[candidate]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={onSignOut}>
        <Text className="font-sans text-xs uppercase text-black/60 underline">Se déconnecter</Text>
      </Pressable>
    </View>
  );
};

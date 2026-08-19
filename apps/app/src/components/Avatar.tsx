import { useState } from 'react';
import { Image, Text, View } from 'react-native';

const SIZES = {
  sm: { container: 'h-12 w-12', text: 'text-base' },
  md: { container: 'h-16 w-16', text: 'text-xl' },
  lg: { container: 'h-28 w-28', text: 'text-4xl' },
} as const;

type AvatarProps = {
  /** Name the initials fall back to when there is no picture (or it fails to load). */
  fallback: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
  /** Hard offset shadow — dropped for avatars sitting inside an already-bordered row. */
  shadow?: boolean;
};

function getInitials(name: string): string {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return initials.toUpperCase() || '?';
}

export function Avatar({ fallback, photoUrl, size = 'md', shadow = true }: AvatarProps) {
  // The URL that failed to load rather than a boolean, so picking a new avatar
  // clears the fallback on its own — no effect to reset it.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { container, text } = SIZES[size];

  return (
    <View
      className={`items-center justify-center overflow-hidden border-2 border-border bg-accent ${container} ${shadow ? 'shadow-sm' : ''}`}
    >
      {photoUrl && failedUrl !== photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          className="h-full w-full"
          accessibilityLabel={`Avatar de ${fallback}`}
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        <Text className={`font-head text-accent-foreground ${text}`}>{getInitials(fallback)}</Text>
      )}
    </View>
  );
}

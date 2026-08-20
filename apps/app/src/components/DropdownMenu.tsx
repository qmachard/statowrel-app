import { EllipsisVertical } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, type ButtonIcon } from '@/components/Button';
import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface DropdownMenuItem {
  label: string;
  icon?: ButtonIcon;
  /** `destructive` paints the item red — for the ones that delete something. */
  variant?: 'default' | 'destructive';
  onPress: () => void;
}

export interface DropdownMenuProps {
  /** What the trigger is for, since it renders an icon and no text. */
  label: string;
  items: DropdownMenuItem[];
  /** The trigger's icon — the vertical ellipsis unless something better says what the menu holds. */
  icon?: ButtonIcon;
  disabled?: boolean;
}

/** The gap between the trigger and the panel, and the margin it keeps off the screen edges. */
const OFFSET = spacing(2);
const MENU_WIDTH = spacing(56);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    overflow: 'hidden',
    borderRadius: radius.DEFAULT,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2.5),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  // The separator is the same border as everything else, so the panel reads as
  // one surface cut into rows rather than as stacked cards.
  separated: {
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.muted,
  },
  label: {
    flexShrink: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['card-foreground'],
  },
  destructive: {
    color: colors.destructive,
  },
});

interface Anchor {
  /** Where the panel's right edge sits, measured from the left of the window. */
  right: number;
  top: number;
  /** True when there was no room under the trigger and the panel opens upwards. */
  above: boolean;
}

/**
 * A menu hanging off its own trigger — the React Native stand-in for
 * neobrutalism's `dropdown-menu`, whose Radix original needs a DOM.
 *
 * React Native has no popover layer, so the panel is a transparent `Modal`
 * positioned against the trigger measured in window coordinates: that is what
 * lets it escape the row's `overflow: hidden` and sit above everything else.
 * Anything outside it closes it, Android's back button included.
 *
 * The panel flips above the trigger when the bottom of the screen is too close
 * — the last row of a list is exactly where a menu like this gets used.
 */
export const DropdownMenu = ({ label, items, icon = EllipsisVertical, disabled }: DropdownMenuProps) => {
  const trigger = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [ anchor, setAnchor ] = useState<Anchor | null>(null);
  // Measured on the panel itself: its height follows the number of items, and
  // whether it fits under the trigger cannot be known before it is laid out.
  const [ menuHeight, setMenuHeight ] = useState(0);

  const fits = (top: number, height: number) => top + height + OFFSET <= windowHeight;

  const open = () => {
    trigger.current?.measureInWindow((x, y, width, height) => {
      const below = y + height + OFFSET;

      setAnchor({
        right: x + width,
        top: below,
        // Known from a previous open; the very first one settles it on layout.
        above: menuHeight > 0 && !fits(below, menuHeight),
      });
    });
  };

  /**
   * The panel's own height, which also settles the first open: until it has
   * been laid out once there is nothing to compare against the bottom of the
   * screen, so a panel that turns out not to fit flips there and then.
   */
  const measure = (height: number) => {
    setMenuHeight(height);
    setAnchor((current) => (
      current === null || current.above || fits(current.top, height) ? current : { ...current, above: true }
    ));
  };

  const close = () => setAnchor(null);

  return (
    <View ref={trigger} collapsable={false}>
      <Button label={label} icon={icon} variant="outline" size="icon-sm" disabled={disabled} onPress={open} />

      <Modal visible={anchor !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <Pressable style={styles.backdrop} accessibilityLabel="Fermer le menu" onPress={close}>
          {anchor === null ? null : (
            <View
              accessibilityViewIsModal
              accessibilityLabel={label}
              onLayout={(event) => measure(event.nativeEvent.layout.height)}
              style={[
                styles.menu,
                shadows.md,
                { left: Math.max(OFFSET, anchor.right - MENU_WIDTH) },
                anchor.above
                  ? { top: Math.max(OFFSET, anchor.top - menuHeight - OFFSET * 2) }
                  : { top: anchor.top },
              ]}
            >
              {items.map((item, index) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="menuitem"
                  style={({ pressed }) => [
                    styles.item,
                    index === 0 ? null : styles.separated,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={() => {
                    close();
                    item.onPress();
                  }}
                >
                  {item.icon === undefined ? null : (
                    <item.icon
                      size={fontSize.base}
                      color={item.variant === 'destructive' ? colors.destructive : colors['card-foreground']}
                    />
                  )}
                  <Text
                    style={[ styles.label, item.variant === 'destructive' ? styles.destructive : null ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
};

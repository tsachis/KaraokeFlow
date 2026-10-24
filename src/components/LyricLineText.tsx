import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { isRtl, withDirectionMark } from '../lib/textDirection';

interface LyricLineTextProps {
  text: string;
  style: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function LyricLineText({ text, style, numberOfLines = 2 }: LyricLineTextProps) {
  return (
    <Text
      style={[styles.base, isRtl(text) ? styles.rtl : styles.ltr, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
    >
      {withDirectionMark(text)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { textAlign: 'center', alignSelf: 'stretch' },
  // writingDirection is iOS-only; on Android the direction mark does the work.
  rtl: { writingDirection: 'rtl' },
  ltr: { writingDirection: 'ltr' },
});

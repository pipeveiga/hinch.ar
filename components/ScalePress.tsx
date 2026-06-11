import { useRef } from 'react'
import type { ReactNode } from 'react'
import { Animated, Pressable } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

interface ScalePressProps {
  children:  ReactNode
  onPress?:  () => void
  disabled?: boolean
  style?:    StyleProp<ViewStyle>
}

// Press con física de resorte estilo iOS: el contenido se hunde apenas
// al tocarlo y vuelve con rebote. Reemplaza a TouchableOpacity en cards.
export function ScalePress({ children, onPress, disabled, style }: ScalePressProps) {
  const scale = useRef(new Animated.Value(1)).current

  const springTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start()

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => springTo(0.97)}
      onPressOut={() => springTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  )
}

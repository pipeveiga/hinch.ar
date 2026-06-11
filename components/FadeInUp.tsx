import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Animated } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

interface FadeInUpProps {
  children:  ReactNode
  delay?:    number   // ms antes de arrancar (para escalonar listas)
  distance?: number   // px que sube al aparecer
  style?:    StyleProp<ViewStyle>
}

// Entrada con resorte: el contenido aparece subiendo y con fade, como
// las listas de iOS. Usar delay para el efecto cascada en listas.
export function FadeInUp({ children, delay = 0, distance = 18, style }: FadeInUpProps) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      speed: 14,
      bounciness: 7,
    }).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{
            translateY: progress.interpolate({
              inputRange:  [0, 1],
              outputRange: [distance, 0],
            }),
          }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

import { Platform, View, StyleSheet } from 'react-native'
import Constants from 'expo-constants'
import { ADS, COLORS, SPACING } from '@/lib/constants'

// react-native-google-mobile-ads no funciona en web ni en Expo Go (SDK 54 sin
// módulo nativo). Cargamos el módulo de forma perezosa para no romper esos
// entornos al importar este componente.
const isExpoGo = Constants.appOwnership === 'expo'
const adsEnabled = Platform.OS !== 'web' && !isExpoGo

type BannerAdComponent = React.ComponentType<{
  unitId: string
  size: string
  requestOptions?: { requestNonPersonalizedAdsOnly?: boolean }
  onAdFailedToLoad?: (err: unknown) => void
}>

let BannerAd: BannerAdComponent | null = null
let bannerSize: string | null = null
let bannerUnitId: string | null = null

if (adsEnabled) {
  try {
    const ads = require('react-native-google-mobile-ads') as {
      BannerAd: BannerAdComponent
      BannerAdSize: Record<string, string>
      TestIds: Record<string, string>
    }
    BannerAd = ads.BannerAd
    bannerSize = ads.BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER
    bannerUnitId = __DEV__
      ? ads.TestIds.ADAPTIVE_BANNER
      : ADS.BANNER_UNIT_ID
  } catch {
    BannerAd = null
  }
}

export function AdBanner() {
  if (!BannerAd || !bannerSize || !bannerUnitId) return null

  const Banner = BannerAd
  return (
    <View style={styles.container}>
      <Banner
        unitId={bannerUnitId}
        size={bannerSize}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(err) => {
          if (__DEV__) console.warn('AdBanner failed to load', err)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },
})

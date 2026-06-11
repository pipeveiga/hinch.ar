import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { COLORS, SPACING, CONTACT } from '@/lib/constants'

const ULTIMA_ACTUALIZACION = '11 de junio de 2026'

export default function PrivacidadScreen() {
  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        headerTitle: 'Política de Privacidad',
        headerBackTitle: '',
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.textPrimary,
      }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Última actualización: {ULTIMA_ACTUALIZACION}</Text>

        <Section title="1. Responsable del tratamiento">
          hinch.ar es responsable del tratamiento de tus datos personales, en cumplimiento de la Ley 25.326 de Protección de Datos Personales de la República Argentina.
        </Section>

        <Section title="2. Datos que recopilamos">
          Recopilamos los siguientes datos:{'\n\n'}
          • <Text style={{ fontWeight: '600' }}>Datos de registro:</Text> nombre completo, email, teléfono (opcional){'\n'}
          • <Text style={{ fontWeight: '600' }}>Datos de verificación:</Text> fotos del DNI y selfie (solo para el proceso de verificación){'\n'}
          • <Text style={{ fontWeight: '600' }}>Datos de uso:</Text> viajes publicados, reservas realizadas, calificaciones{'\n'}
          • <Text style={{ fontWeight: '600' }}>Datos de ubicación:</Text> ciudad detectada por GPS para filtrar eventos cercanos (no almacenamos tu ubicación exacta){'\n'}
          • <Text style={{ fontWeight: '600' }}>Datos del vehículo:</Text> marca, modelo, año, color y patente (solo para conductores)
        </Section>

        <Section title="3. Finalidad del tratamiento">
          Usamos tus datos para:{'\n\n'}
          • Crear y gestionar tu cuenta{'\n'}
          • Conectarte con otros usuarios para compartir viajes{'\n'}
          • Verificar tu identidad (proceso voluntario){'\n'}
          • Mostrarte eventos y viajes relevantes según tu ubicación{'\n'}
          • Enviarte notificaciones relacionadas con tus viajes y reservas{'\n'}
          • Mejorar la seguridad de la plataforma
        </Section>

        <Section title="4. Fotos del DNI y verificación">
          Las fotos del DNI y la selfie se almacenan de forma encriptada en servidores seguros (Supabase). Se usan exclusivamente para verificar tu identidad y solo son accesibles por el equipo de hinch.ar. Una vez verificado, podés solicitar la eliminación de las fotos enviando un email a {CONTACT.EMAIL}.
        </Section>

        <Section title="5. Ubicación">
          Solicitamos acceso a tu ubicación únicamente para detectar tu ciudad y mostrarte eventos cercanos. Esta información no se almacena en nuestros servidores ni se comparte con terceros. Podés negar el permiso de ubicación y la app seguirá funcionando.
        </Section>

        <Section title="6. Compartir datos con terceros">
          No vendemos ni compartimos tus datos personales con terceros, excepto:{'\n\n'}
          • Otros usuarios de la plataforma (solo datos públicos: nombre, foto, calificación){'\n'}
          • Proveedores de servicios técnicos (Supabase para base de datos, Expo para la app) bajo acuerdos de confidencialidad{'\n'}
          • Autoridades competentes cuando sea legalmente requerido
        </Section>

        <Section title="7. Datos públicos vs privados">
          <Text style={{ fontWeight: '600' }}>Público (visible para otros usuarios):</Text> nombre, foto de perfil, calificación promedio, cantidad de viajes, si estás verificado.{'\n\n'}
          <Text style={{ fontWeight: '600' }}>Privado (solo vos):</Text> email, teléfono, DNI, patente del auto, estado de verificación.
        </Section>

        <Section title="8. Seguridad">
          Implementamos medidas técnicas para proteger tus datos, incluyendo cifrado en tránsito (HTTPS), autenticación segura y control de acceso a nivel de base de datos (Row Level Security). Sin embargo, ningún sistema es 100% seguro.
        </Section>

        <Section title="9. Retención de datos">
          Conservamos tus datos mientras tengas una cuenta activa. Si eliminás tu cuenta, tus datos personales se eliminan en un plazo de 30 días, excepto los datos necesarios por obligaciones legales o para resolver disputas pendientes.
        </Section>

        <Section title="10. Tus derechos">
          Tenés derecho a:{'\n\n'}
          • Acceder a tus datos personales{'\n'}
          • Rectificar datos incorrectos{'\n'}
          • Solicitar la eliminación de tu cuenta y datos{'\n'}
          • Oponerte al tratamiento de tus datos{'\n\n'}
          Para ejercer estos derechos escribí a {CONTACT.EMAIL} con el asunto "Datos personales".
        </Section>

        <Section title="11. Cookies y tracking">
          La app no usa cookies. No realizamos seguimiento publicitario ni compartimos datos con redes publicitarias.
        </Section>

        <Section title="12. Contacto">
          Para consultas sobre privacidad: {CONTACT.EMAIL}{'\n'}
          Podés también escribirnos por cualquier medio de contacto disponible en la app.
        </Section>
      </ScrollView>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  updated: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.sm },
  section: { gap: SPACING.xs },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sectionText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
})

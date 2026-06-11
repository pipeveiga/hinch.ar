import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { COLORS, SPACING, CONTACT } from '@/lib/constants'

const ULTIMA_ACTUALIZACION = '11 de junio de 2026'

export default function TerminosScreen() {
  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        headerTitle: 'Términos y Condiciones',
        headerBackTitle: '',
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.textPrimary,
      }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Última actualización: {ULTIMA_ACTUALIZACION}</Text>

        <Section title="1. Aceptación de los términos">
          Al registrarte y usar hinch.ar aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar la plataforma.
        </Section>

        <Section title="2. Descripción del servicio">
          hinch.ar es una plataforma de intermediación que conecta personas que desean compartir viajes hacia eventos deportivos y culturales en Argentina. hinch.ar NO es una empresa de transporte, NO contrata conductores y NO tiene control sobre los viajes publicados.
        </Section>

        <Section title="3. Responsabilidad de los usuarios">
          Cada usuario es responsable de la información que publica. Los conductores garantizan que:{'\n\n'}
          • Poseen licencia de conducir vigente{'\n'}
          • El vehículo tiene seguro al día{'\n'}
          • La información del viaje (precio, asientos, ruta) es veraz{'\n\n'}
          Los pasajeros se comprometen a respetar las condiciones acordadas y a pagar el precio pactado.
        </Section>

        <Section title="4. Limitación de responsabilidad">
          hinch.ar no se responsabiliza por:{'\n\n'}
          • Accidentes, demoras o inconvenientes durante el viaje{'\n'}
          • Cancelaciones unilaterales de conductores o pasajeros{'\n'}
          • Pérdida o daño de pertenencias{'\n'}
          • Disputas entre usuarios{'\n\n'}
          El viaje es un acuerdo entre privados. hinch.ar actúa únicamente como plataforma de conexión.
        </Section>

        <Section title="5. Pagos y precios">
          Los pagos se acuerdan directamente entre conductor y pasajero fuera de la plataforma. hinch.ar no procesa pagos ni cobra comisiones en esta etapa del servicio. Los precios publicados son una referencia y pueden ser acordados entre las partes.
        </Section>

        <Section title="6. Verificación de identidad">
          La verificación de identidad es voluntaria pero recomendada. Las fotos del DNI se usan exclusivamente para verificar la identidad del usuario y se eliminan una vez completado el proceso. hinch.ar no comparte esta información con terceros.
        </Section>

        <Section title="7. Cancelaciones">
          No existe política de reembolso automático ya que los pagos son entre privados. En caso de cancelación, conductor y pasajero deben acordar la devolución directamente. Se recomienda cancelar con al menos 24 horas de anticipación.
        </Section>

        <Section title="8. Conducta prohibida">
          Está prohibido:{'\n\n'}
          • Publicar información falsa{'\n'}
          • Usar la plataforma para actividades ilegales{'\n'}
          • Acosar o discriminar a otros usuarios{'\n'}
          • Crear múltiples cuentas{'\n'}
          • Realizar transacciones fuera de la plataforma que violen estos términos{'\n\n'}
          El incumplimiento puede resultar en la suspensión permanente de la cuenta.
        </Section>

        <Section title="9. Menores de edad">
          hinch.ar está destinado a mayores de 18 años. Al registrarte confirmás que sos mayor de edad.
        </Section>

        <Section title="10. Modificaciones">
          hinch.ar puede modificar estos términos en cualquier momento. Los cambios se comunicarán con al menos 7 días de anticipación. El uso continuado de la plataforma implica aceptación de los nuevos términos.
        </Section>

        <Section title="11. Ley aplicable">
          Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa se someterá a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.
        </Section>

        <Section title="12. Contacto">
          Para consultas sobre estos términos: {CONTACT.EMAIL}
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

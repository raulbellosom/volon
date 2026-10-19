import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { stageIndex, WORKFLOW_STAGES, type WorkflowStage } from '../../domain/workflow.ts';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';

/** Vertical list of the simulated steps; each one says in words whether it is done, current or next. */
export function StageProgress({ stage }: { stage: WorkflowStage }) {
  const { theme } = useTheme();
  const current = stageIndex(stage);
  return (
    <View accessibilityRole="list" accessibilityLabel="Etapas de la entrega" style={{ gap: theme.spacing[1] }}>
      {WORKFLOW_STAGES.map((item, index) => {
        const done = index < current || stage === 'delivered';
        const now = index === current && stage !== 'delivered';
        const state = done ? 'completada' : now ? 'actual' : 'pendiente';
        return (
          <View
            key={item.id}
            accessible
            accessibilityLabel={`${item.label}, ${state}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], minHeight: 40 }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: theme.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? theme.colors['selection-fill'] : now ? theme.colors['action-primary'] : theme.colors['surface-sunken'],
              }}
            >
              {done
                ? <Ionicons name="checkmark" size={16} color={theme.colors['selection-mark']} />
                : <AppText variant="label" color={now ? 'text-on-action' : 'text-secondary'}>{index + 1}</AppText>}
            </View>
            <AppText variant={now ? 'bodyStrong' : 'body'} color={done || now ? 'text-primary' : 'text-secondary'}>{item.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { THEME } from '../../constants/theme';

export interface PestanaItem {
  id: string;
  titulo: string;
  badge?: number | string;
}

export interface PestanasProps {
  pestanas: PestanaItem[];
  activaId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const Pestanas: React.FC<PestanasProps> = ({
  pestanas,
  activaId,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pestanas.map((p) => {
          const isActiva = p.id === activaId;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.tab,
                isActiva && styles.tabActiva,
              ]}
              onPress={() => onSelect(p.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabTexto,
                  isActiva ? styles.tabTextoActivo : styles.tabTextoInactivo,
                ]}
              >
                {p.titulo}
              </Text>
              {p.badge !== undefined && (
                <View style={[styles.badge, isActiva && styles.badgeActivo]}>
                  <Text style={styles.badgeTexto}>{p.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    backgroundColor: THEME.colors.casillaFondo,
  },
  scrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.shapes.radioEsquina,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  tabActiva: {
    backgroundColor: 'rgba(181, 143, 60, 0.25)',
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1,
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  tabTexto: {
    fontSize: 13,
    fontWeight: THEME.typography.weightSemiBold,
  },
  tabTextoActivo: {
    color: THEME.colors.oroClaro,
  },
  tabTextoInactivo: {
    color: THEME.colors.textoSecundario,
  },
  badge: {
    marginLeft: 6,
    backgroundColor: THEME.colors.superficie,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  badgeActivo: {
    borderColor: THEME.colors.oroClaro,
  },
  badgeTexto: {
    color: THEME.colors.texto,
    fontSize: 10,
    fontWeight: '700',
  },
});

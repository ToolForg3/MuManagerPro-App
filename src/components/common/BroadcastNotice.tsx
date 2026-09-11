import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BroadcastNoticeInfo } from '../../services/database/sqlClient';
import { RemoteConfigService } from '../../services/security/remoteConfigService';

interface BroadcastNoticeProps {
  visible: boolean;
  broadcast: BroadcastNoticeInfo | null;
}

export const BroadcastNotice: React.FC<BroadcastNoticeProps> = ({ visible, broadcast }) => {
  if (!visible || !broadcast || !broadcast.active) return null;

  const handleDismiss = () => {
    RemoteConfigService.dismissBroadcast();
  };

  const getTypeTheme = () => {
    switch (broadcast.type) {
      case 'URGENT':
        return {
          color: '#E2703A',
          bg: 'rgba(226, 112, 58, 0.15)',
          border: '#E2703A',
          iconName: 'alert-decagram' as const,
          label: 'Aviso Urgente',
        };
      case 'WARNING':
        return {
          color: '#E8C86A',
          bg: 'rgba(232, 200, 106, 0.15)',
          border: '#B58F3C',
          iconName: 'alert-circle-outline' as const,
          label: 'Advertencia',
        };
      case 'PROMO':
        return {
          color: '#3FCF8E',
          bg: 'rgba(63, 207, 142, 0.15)',
          border: '#3FCF8E',
          iconName: 'star-four-points' as const,
          label: 'Novedades',
        };
      case 'INFO':
      default:
        return {
          color: '#5B8DEF',
          bg: 'rgba(91, 141, 239, 0.15)',
          border: '#5B8DEF',
          iconName: 'information-outline' as const,
          label: 'Información',
        };
    }
  };

  const theme = getTypeTheme();

  // Si el formato es MODAL
  if (broadcast.displayMode === 'MODAL') {
    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <MaterialCommunityIcons name={theme.iconName} size={30} color={theme.color} />
            </View>

            <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Text style={[styles.badgeText, { color: theme.color }]}>{theme.label}</Text>
            </View>

            {!!broadcast.title && <Text style={styles.modalTitle}>{broadcast.title}</Text>}

            <ScrollView style={styles.modalScroll} nestedScrollEnabled>
              <Text style={styles.modalMessage}>{broadcast.message}</Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.dismissButton, { backgroundColor: theme.color }]}
              activeOpacity={0.8}
              onPress={handleDismiss}
            >
              <Text style={styles.dismissButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Si el formato es BANNER (se muestra como un banner flotante superior)
  return (
    <View style={styles.bannerContainer}>
      <View style={[styles.bannerCard, { backgroundColor: '#2B2521', borderColor: theme.border }]}>
        <View style={styles.bannerIconWrap}>
          <MaterialCommunityIcons name={theme.iconName} size={20} color={theme.color} />
        </View>
        <View style={styles.bannerContent}>
          {!!broadcast.title && (
            <Text style={[styles.bannerTitle, { color: theme.color }]}>{broadcast.title}</Text>
          )}
          <Text style={styles.bannerMessage} numberOfLines={3}>
            {broadcast.message}
          </Text>
        </View>
        <TouchableOpacity style={styles.bannerCloseBtn} onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.bannerCloseText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1.5,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E8C86A',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  modalScroll: {
    maxHeight: 180,
    width: '100%',
    marginBottom: 18,
  },
  modalMessage: {
    fontSize: 13,
    color: '#EDE4D3',
    textAlign: 'center',
    lineHeight: 20,
  },
  dismissButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#100D0B',
  },
  bannerContainer: {
    position: 'absolute',
    top: 50,
    left: 14,
    right: 14,
    zIndex: 9999,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  bannerIconWrap: {
    marginRight: 10,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 12,
    color: '#EDE4D3',
    lineHeight: 16,
  },
  bannerCloseBtn: {
    padding: 6,
    marginLeft: 8,
  },
  bannerCloseText: {
    color: '#9C9182',
    fontSize: 16,
    fontWeight: '700',
  },
});

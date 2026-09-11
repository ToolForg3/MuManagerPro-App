import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { getMuClassInfo } from '../../constants/muConstants';

export const CLASS_PORTRAITS: Record<string, any> = {
  'Dark Knight': require('../../../assets/classes/dk.jpg'),
  'Dark Wizard': require('../../../assets/classes/dw.jpg'),
  'Fairy Elf': require('../../../assets/classes/fe.jpg'),
  'Magic Gladiator': require('../../../assets/classes/mg.jpg'),
  'Dark Lord': require('../../../assets/classes/dl.jpg'),
  'Summoner': require('../../../assets/classes/su.jpg'),
  'Rage Fighter': require('../../../assets/classes/rf.jpg'),
};

interface ClassAvatarProps {
  classId: number;
  size?: number;
  showBadge?: boolean;
}

export const ClassAvatar: React.FC<ClassAvatarProps> = ({
  classId,
  size = 48,
  showBadge = true,
}) => {
  const classInfo = getMuClassInfo(classId);
  const portrait = CLASS_PORTRAITS[classInfo.baseClass];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.avatarCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `${classInfo.accentColor}25`,
            borderColor: classInfo.accentColor,
            overflow: 'hidden',
          },
        ]}
      >
        {portrait ? (
          <Image
            source={portrait}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <MaterialCommunityIcons
            name={classInfo.avatarIcon as any}
            size={size * 0.55}
            color={classInfo.accentColor}
          />
        )}
      </View>

      {showBadge && (
        <View
          style={[
            styles.tierBadge,
            {
              backgroundColor: classInfo.tier === 3 ? THEME.colors.primaryOrange : THEME.colors.accentBlue,
            },
          ]}
        >
          <Text style={styles.tierText}>{classInfo.code}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tierBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: THEME.borderRadius.round,
    borderWidth: 1,
    borderColor: '#0D0D0D',
  },
  tierText: {
    fontSize: 9,
    fontWeight: THEME.typography.weightBold,
    color: '#FFFFFF',
  },
});

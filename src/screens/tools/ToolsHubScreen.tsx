import React from 'react';
import { ToolsScreen } from './ToolsScreen';

export const ToolsHubScreen = ({ route, navigation }: any) => {
  return (
    <ToolsScreen
      mode="tools"
      initialTab={route?.params?.initialTab || 'antidupe'}
      route={route}
      navigation={navigation}
    />
  );
};

import React from 'react';
import { ToolsScreen } from '../tools/ToolsScreen';

export const ObjectsHubScreen = ({ route, navigation }: any) => {
  return (
    <ToolsScreen
      mode="objects"
      initialTab={route?.params?.initialTab || 'maker'}
      route={route}
      navigation={navigation}
    />
  );
};

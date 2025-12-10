import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MiniProductionBarProps {
  current: number;
  goal: number;
}

export const MiniProductionBar: React.FC<MiniProductionBarProps> = ({ current, goal }) => {
  // Only show bar if we have production data
  if (current === 0 && goal === 0) return null;

  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isOnTrack = percentage >= 75;
  const isBehind = percentage < 50;

  const barColor = isOnTrack ? '#16a34a' : isBehind ? '#ef4444' : '#f59e0b';

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    width: '100%',
  },
  track: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

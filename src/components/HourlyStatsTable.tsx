import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export interface HourlyStatRow {
  dateHour: string;
  status: string;
  machineStatus: string;
  manualDowntime: string;
  co: number;
  scrap: number;
}

interface HourlyStatsTableProps {
  rows: HourlyStatRow[];
}

export const HourlyStatsTable: React.FC<HourlyStatsTableProps> = ({ rows }) => {
  const theme = useAppTheme();
  return (
    <View style={[styles.table, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }] }>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, { flex: 1.5 }]}></Text>
        <Text style={[styles.cell, styles.headerCell]}>Status</Text>
        <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>Machine Status DwnTm</Text>
        <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>Manual DwnTm</Text>
        <Text style={[styles.cell, styles.headerCell]}>CO</Text>
        <Text style={[styles.cell, styles.headerCell]}>Scrap</Text>
      </View>
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(item) => item.dateHour}
        renderItem={({ item, index }) => (
          <View style={[
            styles.row,
            { borderBottomColor: theme.colors.backgroundNeutral },
            index % 2 === 0 && { backgroundColor: theme.colors.backgroundNeutral }
          ]}>
            <Text style={[styles.cell, { flex: 1.5, color: theme.colors.text }]}>{item.dateHour}</Text>
            <Text style={[styles.cell, { color: theme.colors.text }]}>{item.status}</Text>
            <Text style={[styles.cell, { flex: 1.2, color: theme.colors.text }]}>{item.machineStatus}</Text>
            <Text style={[styles.cell, { flex: 1.2, color: theme.colors.text }]}>{item.manualDowntime}</Text>
            <Text style={[styles.cell, { color: theme.colors.text }]}>{item.co}</Text>
            <Text style={[styles.cell, { color: theme.colors.text }]}>{item.scrap}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  altRow: {},
  headerRow: {
    borderBottomWidth: 2,
  },
  cell: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: '600',
    fontSize: 11,
  },
});

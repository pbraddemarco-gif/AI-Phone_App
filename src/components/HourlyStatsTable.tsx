import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

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
  return (
    <View style={styles.table}>
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
          <View style={[styles.row, index % 2 === 0 && styles.altRow]}>
            <Text style={[styles.cell, { flex: 1.5 }]}>{item.dateHour}</Text>
            <Text style={styles.cell}>{item.status}</Text>
            <Text style={[styles.cell, { flex: 1.2 }]}>{item.machineStatus}</Text>
            <Text style={[styles.cell, { flex: 1.2 }]}>{item.manualDowntime}</Text>
            <Text style={styles.cell}>{item.co}</Text>
            <Text style={styles.cell}>{item.scrap}</Text>
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
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  altRow: {
    backgroundColor: '#F9FAFB',
  },
  headerRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  cell: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 11,
  },
});

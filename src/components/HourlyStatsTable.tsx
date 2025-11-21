import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

export interface HourlyStatRow {
  dateHour: string; // e.g. '12/16 - 18:00'
  goodparts: number;
  status: string; // e.g. '174'
  manualDowntime: string; // e.g. '56m' or '-'
  co: number; // changeover indicator
  scrap: number;
}

interface HourlyStatsTableProps {
  rows: HourlyStatRow[];
}

export const HourlyStatsTable: React.FC<HourlyStatsTableProps> = ({ rows }) => {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, { flex: 1.4 }]}>Date</Text>
        <Text style={[styles.cell, styles.headerCell]}>Status</Text>
        <Text style={[styles.cell, styles.headerCell]}>Manual DwnTm</Text>
        <Text style={[styles.cell, styles.headerCell]}>CO</Text>
        <Text style={[styles.cell, styles.headerCell]}>Scrap</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.dateHour}
        renderItem={({ item, index }) => (
          <View style={[styles.row, index % 2 === 0 && styles.altRow]}>
            <Text style={[styles.cell, { flex: 1.4 }]}>{item.dateHour}</Text>
            <Text style={styles.cell}>{item.status}</Text>
            <Text style={styles.cell}>{item.manualDowntime}</Text>
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
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  altRow: {
    backgroundColor: '#F9FAFB'
  },
  headerRow: {
    backgroundColor: '#EFF6FF'
  },
  cell: {
    flex: 1,
    fontSize: 12
  },
  headerCell: {
    fontWeight: '600'
  }
});

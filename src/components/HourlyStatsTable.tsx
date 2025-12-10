import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export interface HourlyStatRow {
  hour: string;
  production: number;
  scrap: number;
  downtime: number;
}

interface HourlyStatsTableProps {
  rows: HourlyStatRow[];
  date?: string; // Optional date to display in section header
}

export const HourlyStatsTable: React.FC<HourlyStatsTableProps> = ({ rows, date }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.tableWrapper}>
      {/* Fixed Header */}
      <View
        style={[
          styles.tableHeader,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          },
        ]}
      >
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.headerCell]}>Hour</Text>
          <Text style={[styles.cell, styles.headerCell]}>Production</Text>
          <Text style={[styles.cell, styles.headerCell]}>Scrap</Text>
          <Text style={[styles.cell, styles.headerCell]}>Downtime</Text>
        </View>
      </View>

      {/* Scrollable Body */}
      <View
        style={[
          styles.tableBody,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
          },
        ]}
      >
        <FlatList
          data={rows}
          scrollEnabled={false}
          keyExtractor={(item, index) => `${item.hour}-${index}`}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.row,
                { borderBottomColor: theme.colors.backgroundNeutral },
                index % 2 === 0 && { backgroundColor: theme.colors.backgroundNeutral },
              ]}
            >
              <Text style={[styles.cell, { color: theme.colors.text }]}>{item.hour}</Text>
              <Text style={[styles.cell, { color: theme.colors.text }]}>{item.production}</Text>
              <Text style={[styles.cell, { color: theme.colors.text }]}>{item.scrap}</Text>
              <Text style={[styles.cell, { color: theme.colors.text }]}>
                {item.downtime > 0 ? `${item.downtime}m` : '-'}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tableWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tableHeader: {
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  tableBody: {
    borderWidth: 1,
    borderTopWidth: 0,
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

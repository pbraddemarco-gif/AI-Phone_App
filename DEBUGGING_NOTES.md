# API Debugging Notes

## Current Issue
The chart is not updating with data from the API. We're seeing 500 errors when requesting production history.

## What We Know

### Working API Call (from earlier logs)
- **Modes that worked**: `['OEE', 'goodparts', 'rejectparts']`
- **Endpoint format**: `/machines/775/productionhistory?start=...&end=...&timeBase=hour&intervalBase=hour&dateType=calendar&modes[0]=OEE&modes[1]=goodparts&modes[2]=rejectparts`
- **Response structure**: Array of HistoryDTO objects with nested History arrays

### Failed API Call
- **Modes that failed**: `['OEE', 'goodparts', 'rejectparts', 'downtime']`
- **Error**: 500 - "Object reference not set to an instance of an object"
- **Cause**: The API doesn't recognize 'downtime' as a valid mode

## Possible Downtime Mode Names to Test
Based on common API conventions, downtime might be called:
- `downtime` (already tried - failed)
- `Downtime` (capitalized)
- `DownTime` (camelCase)
- `machinestatus`
- `MachineStatus`
- `machinedowntime`
- `MachineDowntime`
- `unplanneddowntime`
- `UnplannedDowntime`

## Next Steps
1. **Test with working modes only** - Verify data is flowing correctly with just goodparts and rejectparts
2. **Check console logs** - See what data structure we're getting
3. **Try alternate mode names** - Test different variations for downtime
4. **Alternative approach** - Calculate downtime from available data (e.g., total time - production time)

## Temporary Solution
Currently testing with just `['goodparts', 'rejectparts']` to confirm:
- API connection is working
- Data transformation is working  
- Chart rendering is working

Once confirmed, we'll find the correct mode name for downtime or calculate it from other metrics.

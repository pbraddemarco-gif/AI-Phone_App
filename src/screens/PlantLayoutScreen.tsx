import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Animated,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { getMachinePerformance } from '../services/machinePerformanceService';
import { productionService } from '../services/productionService';

export type PlantLayoutProps = NativeStackScreenProps<RootStackParamList, 'PlantLayout'>;

interface HotspotArea {
  id: string;
  title: string;
  machine: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HotspotData {
  general: { width: number; height: number };
  spots: HotspotArea[];
}

type HotspotMapping = 'normal' | 'swap90';

const PlantLayoutScreen: React.FC<PlantLayoutProps> = ({ navigation, route }) => {
  const theme = useAppTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const [shouldRotate, setShouldRotate] = useState(false);
  const [hotspots, setHotspots] = useState<HotspotArea[]>([]);
  const [hotspotMapping, setHotspotMapping] = useState<HotspotMapping>('normal');
  const [hotspotBaseSize, setHotspotBaseSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [hotspotStatuses, setHotspotStatuses] = useState<Record<number, string>>({});

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const machineId = route.params?.machineId ?? 498;
  const machineName = route.params?.machineName ?? 'Plant Layout';

  useEffect(() => {
    fetchPlantLayout();
  }, [machineId]);

  // Decide best hotspot mapping for the current image + hotspot set
  useEffect(() => {
    if (!imageDimensions || hotspots.length === 0) return;

    const w = imageDimensions.width;
    const h = imageDimensions.height;

    const toRect = (hs: HotspotArea, mapping: HotspotMapping) => {
      if (mapping === 'swap90') {
        // Coordinates authored in a 90deg-rotated space: x->y, y->(100 - x - width); swap dimensions
        return {
          left: (hs.y / 100) * w,
          top: ((100 - hs.x - hs.width) / 100) * h,
          width: (hs.height / 100) * w,
          height: (hs.width / 100) * h,
        };
      }
      // normal mapping
      return {
        left: (hs.x / 100) * w,
        top: (hs.y / 100) * h,
        width: (hs.width / 100) * w,
        height: (hs.height / 100) * h,
      };
    };

    const scoreMapping = (mapping: HotspotMapping) => {
      let inBounds = 0;
      let overflow = 0;
      for (const hs of hotspots) {
        const r = toRect(hs, mapping);
        const right = r.left + r.width;
        const bottom = r.top + r.height;
        const lb = r.left >= 0 && r.top >= 0 && right <= w && bottom <= h;
        if (lb) inBounds += 1;
        // simple overflow metric: sum of distances outside
        if (r.left < 0) overflow += -r.left;
        if (r.top < 0) overflow += -r.top;
        if (right > w) overflow += right - w;
        if (bottom > h) overflow += bottom - h;
      }
      return { inBounds, overflow };
    };

    // 1) Aspect ratio hint from HotspotData.general
    const approxEqual = (a: number, b: number, tol = 0.04) => {
      const denom = Math.max(Math.abs(a), Math.abs(b), 1);
      return Math.abs(a - b) / denom <= tol;
    };

    let chosen: HotspotMapping | null = null;
    if (hotspotBaseSize?.width && hotspotBaseSize?.height) {
      const baseAR = hotspotBaseSize.width / hotspotBaseSize.height;
      const imgAR = w / h;
      if (approxEqual(baseAR, imgAR)) {
        chosen = 'normal';
      } else if (approxEqual(baseAR, 1 / imgAR)) {
        chosen = 'swap90';
      }
    }

    // 2) Fall back to bounds-based scoring
    if (!chosen) {
      const sNormal = scoreMapping('normal');
      const sSwap = scoreMapping('swap90');
      if (sSwap.inBounds > sNormal.inBounds) {
        chosen = 'swap90';
      } else if (sSwap.inBounds === sNormal.inBounds && sSwap.overflow < sNormal.overflow) {
        chosen = 'swap90';
      } else {
        chosen = 'normal';
      }
    }

    setHotspotMapping(chosen);
  }, [imageDimensions, hotspots, hotspotBaseSize, shouldRotate]);

  const fetchPlantLayout = async () => {
    setLoading(true);
    setError(null);
    setHotspots([]); // Clear previous hotspots
    setHotspotStatuses({}); // Clear previous statuses

    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (__DEV__) console.debug('🗺️ Fetching plant layout for machine:', machineId);

      const perf = await getMachinePerformance({
        machineId,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        filter: 'PlannedProductionTime:true',
        dims: [], // Don't pass dims for plant layout - we just need the image
      });

      if (__DEV__) console.debug('✅ Plant layout response received');

      if (perf.ImageMap) {
        setImageUrl(perf.ImageMap);

        // Parse hotspot data if available
        let parsedSpots: HotspotArea[] = [];
        if (perf.HotspotData) {
          try {
            const hotspotData: HotspotData = JSON.parse(perf.HotspotData);
            parsedSpots = hotspotData.spots || [];
            setHotspots(parsedSpots);

            if (hotspotData.general?.width && hotspotData.general?.height) {
              setHotspotBaseSize({
                width: hotspotData.general.width,
                height: hotspotData.general.height,
              });
            } else {
              setHotspotBaseSize(null);
            }
          } catch (err) {
            if (__DEV__) console.debug('Failed to parse hotspot data:', err);
            setHotspots([]);
            setHotspotBaseSize(null);
          }
        } else {
          setHotspots([]);
          setHotspotBaseSize(null);
        }

        // Fetch statuses for parsed hotspots
        if (parsedSpots.length > 0) {
          try {
            const ids = parsedSpots
              .map((hs) => parseInt(hs.machine, 10))
              .filter((id) => !!id && !Number.isNaN(id))
              .slice(0, 50)
              .map((id) => id.toString());

            if (ids.length > 0) {
              const statuses = await productionService.getMachineStatus(ids);

              const statusMap: Record<number, string> = {};
              if (statuses && Array.isArray(statuses)) {
                statuses.forEach((s: any) => {
                  const idNum = Number(s.Id);
                  const val = (s.Value || '').toString().toUpperCase();
                  if (!Number.isNaN(idNum) && val) {
                    statusMap[idNum] = val;
                  }
                });
              }

              setHotspotStatuses(statusMap);
            }
          } catch (e) {
            if (__DEV__) console.debug('Failed to fetch hotspot statuses:', e);
          }
        }
        // Get image dimensions to determine rotation and initial scale
        Image.getSize(
          perf.ImageMap,
          (width, height) => {
            setImageDimensions({ width, height });
            // Rotate if image is landscape and screen is portrait
            const isImageLandscape = width > height;
            const isScreenPortrait = windowWidth < windowHeight;
            const shouldRotateImage = isImageLandscape && isScreenPortrait;
            setShouldRotate(shouldRotateImage);

            // Calculate best fit scale
            const availableWidth = windowWidth - 32;
            const availableHeight = windowHeight - 120; // Account for header + margins

            let imageDisplayWidth = width;
            let imageDisplayHeight = height;

            if (shouldRotateImage) {
              // Swap dimensions for rotated image
              imageDisplayWidth = height;
              imageDisplayHeight = width;
            }

            const scaleX = availableWidth / imageDisplayWidth;
            const scaleY = availableHeight / imageDisplayHeight;
            const bestFitScale = Math.min(scaleX, scaleY); // Allow scaling up to fill screen

            // Reset all transform values
            scale.setValue(1);
            translateX.setValue(0);
            translateY.setValue(0);
            scale.setOffset(0);
            translateX.setOffset(0);
            translateY.setOffset(0);

            // Set initial scale
            lastScale.current = bestFitScale;
            lastTranslateX.current = 0;
            lastTranslateY.current = 0;
            scale.setValue(bestFitScale);
          },
          (error) => {
            if (__DEV__) console.debug('Failed to get image size:', error);
          }
        );
      } else {
        setError('No plant layout image available');
      }
    } catch (err: any) {
      if (__DEV__) console.debug('❌ Failed to fetch plant layout:', err);

      // Provide more specific error messages
      if (err?.code === 'ERR_BAD_RESPONSE' && err?.response?.status === 504) {
        setError('Server timeout - plant layout is taking too long to load. Please try again.');
      } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        setError('Request timeout - please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load plant layout');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusToColor = (value?: string) => {
    const v = (value || '').toUpperCase();
    if (v === 'RUNNING') return '#10B981';
    if (v === 'IDLE') return '#F59E0B';
    if (v === 'STOPPED') return '#EF4444';
    return '#6B7280';
  };

  const hexToRgba = (hex: string, alpha = 0.3) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const onPinchEvent = (event: any) => {
    const newScale = lastScale.current * event.nativeEvent.scale;
    scale.setValue(newScale);
  };

  const onPinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current = lastScale.current * event.nativeEvent.scale;
      scale.setValue(lastScale.current);
    }
  };

  const onPanEvent = (event: any) => {
    translateX.setValue(lastTranslateX.current + event.nativeEvent.translationX);
    translateY.setValue(lastTranslateY.current + event.nativeEvent.translationY);
  };

  const onPanStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastTranslateX.current += event.nativeEvent.translationX;
      lastTranslateY.current += event.nativeEvent.translationY;
      translateX.setValue(lastTranslateX.current);
      translateY.setValue(lastTranslateY.current);
    }
  };

  const handleHotspotPress = (hotspot: HotspotArea) => {
    const machineIdNum = parseInt(hotspot.machine, 10);
    if (machineIdNum) {
      navigation.navigate('ProductionDashboard', {
        machineId: machineIdNum,
        machineName: hotspot.title,
      });
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.backButton, { color: theme.colors.text }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{machineName}</Text>
          </View>
          <TouchableOpacity onPress={fetchPlantLayout}>
            <Text style={[styles.refreshButton, { color: theme.colors.accent }]}>⟳</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={[styles.loadingText, { color: theme.colors.neutralText }]}>
                Loading plant layout...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Text style={[styles.errorText, { color: '#991B1B' }]}>⚠️ {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchPlantLayout}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : imageUrl ? (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={fetchPlantLayout}
                  colors={[theme.colors.accent]}
                />
              }
              alwaysBounceVertical={true}
            >
              <PanGestureHandler
                onGestureEvent={onPanEvent}
                onHandlerStateChange={onPanStateChange}
                minPointers={1}
                maxPointers={1}
              >
                <Animated.View style={[styles.imageContainer]}>
                  <PinchGestureHandler
                    onGestureEvent={onPinchEvent}
                    onHandlerStateChange={onPinchStateChange}
                  >
                    <Animated.View style={{ justifyContent: 'center', alignItems: 'center' }}>
                      <Animated.View
                        style={{
                          transform: [
                            { scale: scale },
                            { translateX: translateX },
                            { translateY: translateY },
                            { rotate: shouldRotate ? '90deg' : '0deg' },
                          ],
                        }}
                      >
                        <Animated.Image
                          source={{ uri: imageUrl }}
                          style={{
                            width: imageDimensions?.width || windowWidth,
                            height: imageDimensions?.height || windowHeight,
                          }}
                          resizeMode="contain"
                        />
                        {/* Hotspot overlays */}
                        {(() => {
                          const imgWidth = imageDimensions?.width || 1075;
                          const imgHeight = imageDimensions?.height || 882;
                          const isSwap = hotspotMapping === 'swap90';

                          // Pre-compute hotspot rendering data with colors
                          const hotspotRenderData = hotspots.map((hotspot) => {
                            const left = isSwap
                              ? (hotspot.y / 100) * imgWidth
                              : (hotspot.x / 100) * imgWidth;
                            const top = isSwap
                              ? ((100 - hotspot.x - hotspot.width) / 100) * imgHeight
                              : (hotspot.y / 100) * imgHeight;
                            const width = isSwap
                              ? (hotspot.height / 100) * imgWidth
                              : (hotspot.width / 100) * imgWidth;
                            const height = isSwap
                              ? (hotspot.width / 100) * imgHeight
                              : (hotspot.height / 100) * imgHeight;

                            const machineId = Number(hotspot.machine);
                            const statusValue = hotspotStatuses[machineId];
                            const baseColor = statusToColor(statusValue);
                            const bgColor = hexToRgba(baseColor, 0.3);

                            return {
                              hotspot,
                              left,
                              top,
                              width,
                              height,
                              baseColor,
                              bgColor,
                            };
                          });

                          return hotspotRenderData.map((data) => {
                            const { hotspot, left, top, width, height, baseColor, bgColor } = data;
                            return (
                              <View
                                key={hotspot.id}
                                style={{
                                  position: 'absolute',
                                  left: left,
                                  top: top,
                                  width: width,
                                  height: height,
                                  zIndex: 10,
                                }}
                              >
                                <TouchableOpacity
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: bgColor,
                                    borderWidth: 2,
                                    borderColor: baseColor,
                                    borderRadius: 8,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                  onPress={() => handleHotspotPress(hotspot)}
                                  activeOpacity={0.6}
                                >
                                  <Text
                                    style={{
                                      color: '#FFFFFF',
                                      fontWeight: '700',
                                      fontSize: 14,
                                      textShadowColor: 'rgba(0, 0, 0, 0.9)',
                                      textShadowOffset: { width: 1, height: 1 },
                                      textShadowRadius: 3,
                                    }}
                                  >
                                    {hotspot.title}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          });
                        })()}
                      </Animated.View>
                    </Animated.View>
                  </PinchGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            </ScrollView>
          ) : null}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    fontSize: 24,
    fontWeight: '300',
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PlantLayoutScreen;

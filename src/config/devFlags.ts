// Production-ready flags
export const DEV_FLAGS = {
  USE_MOCK_DATA: false,
  SHOW_TEMP_LOGOUT_BUTTON: false,
  // Force auth flow on every app launch so we always fetch a fresh, user-specific token
  FORCE_LOGIN_ON_START: true,
  // Enable production goal API for accurate shift time calculations
  // Disable if API is timing out or unavailable
  USE_PRODUCTION_GOAL_API: false,
};

export type DevFlags = typeof DEV_FLAGS;

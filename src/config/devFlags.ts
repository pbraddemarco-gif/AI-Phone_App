// Production-ready flags
export const DEV_FLAGS = {
  USE_MOCK_DATA: false,
  SHOW_TEMP_LOGOUT_BUTTON: false,
  // Force auth flow on every app launch so we always fetch a fresh, user-specific token
  FORCE_LOGIN_ON_START: true,
};

export type DevFlags = typeof DEV_FLAGS;

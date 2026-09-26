/** The adapter's name in diagnostics. */
export const FIREBASE_ADAPTER_NAME = "firebase-react-native";

/** The issuer of every Firebase ID token, followed by the project id. */
export const FIREBASE_ISSUER = "https://securetoken.google.com/";

/** Firebase's code for a user whose credential is no longer valid, who must sign in again. */
export const USER_TOKEN_EXPIRED = "auth/user-token-expired";

/** React Native Firebase's code for a native call made while the native SDK holds no user. */
export const NO_CURRENT_USER = "auth/no-current-user";

/** Firebase ID tokens are sent as bearer credentials. */
export const ID_TOKEN_SCHEME = "Bearer";

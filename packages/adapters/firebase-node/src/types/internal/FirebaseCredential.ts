export type FirebaseCredential = {
  kind: "session-cookie" | "id-token";
  value: string;
};

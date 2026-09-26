import type React from "react";
import { StyleSheet, Text } from "react-native";

type NoticeLineProps = { notice: string | null };

export const NoticeLine: React.FunctionComponent<NoticeLineProps> = ({
  notice,
}) => (notice === null ? null : <Text style={styles.notice}>{notice}</Text>);

const styles = StyleSheet.create({
  notice: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff1f2",
    color: "#9f1239",
    fontSize: 13,
  },
});

import type { PropsWithChildren, ReactNode } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography } from "../theme/typography";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  action?: ReactNode;
}>;

export function Screen({ title, subtitle, action, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentOuter}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.kicker}>// MOBILE_CONSOLE</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {action ? <View>{action}</View> : null}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentOuter: {
    alignItems: "center",
    paddingBottom: layout.space.xxxl,
  },
  contentInner: {
    gap: layout.space.lg,
    maxWidth: layout.contentMaxWidth,
    paddingHorizontal: layout.space.xl,
    paddingTop: layout.space.xl,
    width: "100%",
  },
  header: {
    gap: layout.space.md,
  },
  titleBlock: {
    gap: layout.space.xs,
  },
  kicker: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});

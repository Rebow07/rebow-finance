// src/components/CircularProgress.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSize, FontWeight } from '../theme';

interface Props {
  percentual: number;
  tamanho?: number;
  espessura?: number;
}

export default function CircularProgress({ percentual, tamanho = 120, espessura = 10 }: Props) {
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia - (percentual / 100) * circunferencia;

  const cor = percentual >= 90
    ? Colors.despesa
    : percentual >= 70
    ? '#F39C12'
    : Colors.primary;

  return (
    <View style={[styles.container, { width: tamanho, height: tamanho }]}>
      <Svg width={tamanho} height={tamanho}>
        {/* Trilha de fundo */}
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={Colors.border}
          strokeWidth={espessura}
          fill="transparent"
        />
        {/* Progresso */}
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          fill="transparent"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${tamanho / 2}, ${tamanho / 2}`}
        />
      </Svg>
      <View style={styles.centro}>
        <Text style={[styles.percentual, { color: cor }]}>
          {Math.round(percentual)}%
        </Text>
        <Text style={styles.label}>gasto</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    position: 'absolute',
    alignItems: 'center',
  },
  percentual: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
});

import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { parseTextoFormatado } from '../utils/textoFormatado';

/**
 * Substitui <Text> onde aparece enunciado, contexto ou alternativa de questão.
 * Interpreta <u> sublinhado, <b> negrito, <i> itálico, <sup>/<sub>.
 *
 *   <TextoFormatado style={styles.enunciado}>{questao.enunciado}</TextoFormatado>
 *
 * Aceita as mesmas props do <Text> (style, numberOfLines, selectable...).
 * `fontFamilyNegrito` é opcional: informe a família em negrito da fonte do app
 * (ex.: 'Inter_700Bold') se o fontWeight sozinho não engrossar a fonte custom.
 */
export default function TextoFormatado({ children, style, fontFamilyNegrito, ...rest }) {
  const texto = typeof children === 'string' ? children : children == null ? '' : String(children);
  const segmentos = useMemo(() => parseTextoFormatado(texto), [texto]);

  return (
    <Text style={style} {...rest}>
      {segmentos.map((s, idx) => {
        if (!s.u && !s.b && !s.i) return s.texto;
        const estilo = {};
        if (s.u) estilo.textDecorationLine = 'underline';
        if (s.b) {
          estilo.fontWeight = 'bold';
          if (fontFamilyNegrito) estilo.fontFamily = fontFamilyNegrito;
        }
        if (s.i) estilo.fontStyle = 'italic';
        return (
          <Text key={idx} style={estilo}>
            {s.texto}
          </Text>
        );
      })}
    </Text>
  );
}
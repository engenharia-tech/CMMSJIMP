/**
 * Gera o documento de passagem para outra conta a partir de src/dados/projeto.ts.
 *
 *   npx tsx scripts/gerar-passagem.ts
 *
 * O mesmo arquivo de dados desenha a tela "O projeto" dentro do app. Este
 * script existe para que a conta Claude que chega possa LER o documento como
 * arquivo, sem precisar abrir o app nem ter senha — e para que esse arquivo
 * nunca seja escrito à mão, porque texto duplicado envelhece em velocidades
 * diferentes (ver o aviso em src/dados/projeto-tipos.ts).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { META, PROJETO } from '../src/dados/projeto';
import { montarMarkdown } from '../src/dados/projeto-tipos';

const SAIDA = join('docs', 'PASSAGEM PARA OUTRA CONTA - CMMS.md');

const md = montarMarkdown(META, PROJETO);

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, md, 'utf-8');

const blocos = PROJETO.reduce((n, s) => n + s.blocos.length, 0);
const decisoes = PROJETO.reduce((n, s) => n + s.blocos.filter((b) => b.tipo === 'decisao').length, 0);

console.log(`escrito: ${SAIDA}`);
console.log(`  ${PROJETO.length} seções · ${blocos} blocos · ${decisoes} decisões do Edson · ${md.length.toLocaleString('pt-BR')} caracteres`);
console.log(`  retrato medido em ${META.medidoEm}`);

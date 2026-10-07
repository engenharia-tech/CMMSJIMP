/**
 * Copia o CMMS JIMP para a pasta de projetos da TI.
 *
 *   npx tsx scripts/copiar-para-ti.ts --listar     (só mostra o que iria)
 *   npx tsx scripts/copiar-para-ti.ts              (copia de verdade)
 *
 * Ordem do Edson (06/10/2026): "assim que vc terminar crie uma pasta e migre o
 * projeto para V:\TI\PROJETOS TI\engenharia".
 *
 * 🔴 A REGRA DESTE SCRIPT: nenhuma chave viaja. O `.env.local` tem a chave de
 * serviço do Supabase — a que pode tudo e passa por cima de TODAS as regras de
 * proteção do banco. Ela fica aqui. O que vai é `.env.example`, só com os NOMES.
 *
 * E a conferência é feita NO DESTINO, depois de copiar, não na origem: conferir
 * a origem prova o que eu pretendia copiar, não o que chegou lá. É a lição de
 * 20/09 do outro app — ler de volta pelo mesmo caminho não prova entrega.
 */
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync,
  statSync, writeFileSync, rmSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * O script acha o projeto SOZINHO, pela propria localizacao.
 *
 * 🔴 Antes ele dependia da pasta de onde era chamado, e o Edson o rodou a
 * partir de C:\Windows\System32 (a pasta em que um terminal de administrador
 * abre): o node reclamou que nao achava o arquivo e nada aconteceu. Ferramenta
 * que so funciona se a pessoa estiver no lugar certo vai falhar no dia em que
 * importa. Agora `npx tsx "<caminho>/scripts/copiar-para-ti.ts"` funciona de
 * qualquer lugar.
 */
const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(RAIZ);

const DESTINO = 'V:/TI/PROJETOS TI/engenharia/CMMS-JIMP';
const SO_LISTAR = process.argv.includes('--listar');

/** O que vai. Tudo o que não está aqui NÃO vai — lista fechada, não filtro. */
const VAI = [
  'api', 'docs', 'scripts', 'src', 'supabase',
  'index.html', 'package.json', 'package-lock.json', 'server.ts',
  'tsconfig.json', 'vercel.json', 'vite.config.ts',
  'README.md', 'supabase_schema.sql', '.gitignore', '.env.example',
];

/**
 * O que NÃO vai, e por quê — escrito para o LEIA-ME, não só para o código.
 * `.git` fica de fora de propósito: com ele, alguém poderia commitar nesta
 * cópia e ela viraria uma segunda verdade. O histórico mora no GitHub.
 */
const NAO_VAI: Array<[string, string]> = [
  ['.env.local', 'as chaves do banco e da IA — inclusive a de serviço, que pode tudo'],
  ['node_modules', '386 MB de bibliotecas; refazem-se com um comando'],
  ['dist', 'resultado de compilação; refaz-se com um comando'],
  ['.git', 'o histórico mora no GitHub; sem ele ninguém commita nesta cópia por engano'],
  ['.claude', 'configuração da minha ferramenta, não do app'],
];

/** Padrões que NUNCA podem aparecer num arquivo copiado. */
const PROIBIDO: Array<[RegExp, string]> = [
  [/eyJhbGciOi[A-Za-z0-9_\-.]{20,}/, 'token JWT (chave do Supabase)'],
  [/AIzaSy[A-Za-z0-9_\-]{30,}/, 'chave da Google/Gemini'],
  // 🔴 O valor tem de vir COLADO no '=' e ser um bocado longo e opaco.
  // A primeira versao era `NOME\s*=\s*\S+` e deu tres alarmes falsos: o `\s*`
  // atravessa a quebra de linha, entao `SUPABASE_SERVICE_ROLE_KEY=` seguido de
  // nada casava com a PRIMEIRA PALAVRA DA LINHA SEGUINTE; e no documento, a
  // linha de exemplo `grep ^SUPABASE_SERVICE_ROLE_KEY= .env.local` casava com
  // o proprio `.env.local`. Alarme falso ensina todo mundo a ignorar o alarme.
  [/(SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|VITE_SUPABASE_ANON_KEY|CRON_SECRET|EMAIL_PASS)=[A-Za-z0-9_\-.]{20,}/,
   'variavel de chave com valor dentro'],
];

const BINARIO = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip|xlsx)$/i;

/**
 * Copia uma pasta inteira, um arquivo de cada vez.
 *
 * 🔴 NÃO usar `cpSync(..., {recursive:true})` aqui. Num drive de rede (o V: é
 * um compartilhamento) ele **mata o processo do node no meio**, sem lançar
 * exceção e sem imprimir nada: a primeira tentativa criou a pasta `api` vazia e
 * morreu, e a saída simplesmente parou. Cópia que falha calada é a armadilha
 * mais cara deste trabalho — foi assim que um pacote inteiro já se perdeu.
 * Arquivo a arquivo é mais lento e falha dizendo qual arquivo.
 */
function copiarArvore(origem: string, destino: string): number {
  if (statSync(origem).isFile()) {
    mkdirSync(join(destino, '..'), { recursive: true });
    copyFileSync(origem, destino);
    return 1;
  }
  mkdirSync(destino, { recursive: true });
  let n = 0;
  for (const nome of readdirSync(origem)) {
    n += copiarArvore(join(origem, nome), join(destino, nome));
  }
  return n;
}

function cadaArquivo(raiz: string, dentro = raiz): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dentro)) {
    const caminho = join(dentro, nome);
    if (statSync(caminho).isDirectory()) achados.push(...cadaArquivo(raiz, caminho));
    else achados.push(caminho);
  }
  return achados;
}

function tamanho(caminho: string): number {
  if (!existsSync(caminho)) return 0;
  if (!statSync(caminho).isDirectory()) return statSync(caminho).size;
  return cadaArquivo(caminho).reduce((n, f) => n + statSync(f).size, 0);
}

// -------------------------------------------------------------- 1. o que vai
console.log('CMMS JIMP -> pasta de projetos da TI');
console.log(`destino: ${DESTINO}`);
console.log('');

let total = 0, arquivos = 0;
for (const item of VAI) {
  if (!existsSync(item)) {
    console.log(`  ⚠ nao achei: ${item}`);
    continue;
  }
  const n = statSync(item).isDirectory() ? cadaArquivo(item).length : 1;
  const t = tamanho(item);
  total += t; arquivos += n;
  console.log(`  ${item.padEnd(22)} ${String(n).padStart(5)} arquivo(s)  ${(t / 1024).toFixed(0).padStart(7)} KB`);
}
console.log(`  ${''.padEnd(22)} ${String(arquivos).padStart(5)} no total    ${(total / 1024 / 1024).toFixed(1).padStart(7)} MB`);
console.log('');
console.log('  NAO vai:');
for (const [o, porque] of NAO_VAI) console.log(`    ${o.padEnd(16)} ${porque}`);

if (SO_LISTAR) {
  console.log('');
  console.log('(--listar: nada foi copiado)');
  process.exit(0);
}

// -------------------------------------------------------------- 2. copiar
console.log('');
console.log('copiando...');
if (existsSync(DESTINO)) rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });
let copiadosOk = 0;
for (const item of VAI) {
  if (!existsSync(item)) continue;
  try {
    const n = copiarArvore(item, join(DESTINO, item));
    copiadosOk += n;
    process.stdout.write(`  ${item} (${n})
`);
  } catch (e: any) {
    console.log(`  🔴 falhou em ${item}: ${e.code || ''} ${e.message}`);
    process.exit(1);
  }
}

// -------------------------------------------------------------- 3. carimbo
let commit = '(desconhecido)', quando = '(desconhecido)';
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  quando = execSync('git log -1 --date=format:"%d/%m/%Y %H:%M" --format=%ad', { encoding: 'utf-8' }).trim();
} catch { /* sem git, segue sem carimbo */ }

// O LEIA-ME vai para a RAIZ do destino: quem abre a pasta tem de topar com ele
// antes de entrar em qualquer subpasta. No repositório ele mora em docs/, para
// não encher a raiz do projeto.
copyFileSync(join('docs', 'LEIA-ME DA TI.md'), join(DESTINO, 'LEIA-ME DA TI.md'));

writeFileSync(join(DESTINO, 'VERSAO.txt'),
  [
    'CMMS JIMP — cópia para a TI',
    '',
    `commit:      ${commit}`,
    `desse commit: ${quando}`,
    'repositório: https://github.com/engenharia-tech/CMMSJIMP (público)',
    'no ar:       https://cmms.jimpnexus.com',
    '',
    'Esta cópia é um RETRATO. Para saber o que está no ar agora, olhe o GitHub.',
    '',
  ].join('\n'), 'utf-8');

// -------------------------------------------------------------- 4. conferir NO DESTINO
console.log('');
console.log('conferindo o que CHEGOU (não o que eu quis mandar):');
const copiados = cadaArquivo(DESTINO);
let suspeitos = 0;
for (const f of copiados) {
  if (BINARIO.test(f)) continue;
  let texto: string;
  try { texto = readFileSync(f, 'utf-8'); } catch { continue; }
  for (const [padrao, oque] of PROIBIDO) {
    if (padrao.test(texto)) {
      console.log(`  🔴 ${oque} em ${relative(DESTINO, f)}`);
      suspeitos++;
    }
  }
}
for (const [proibido] of NAO_VAI) {
  if (existsSync(join(DESTINO, proibido))) {
    console.log(`  🔴 ${proibido} chegou no destino e nao devia`);
    suspeitos++;
  }
}

console.log(`  arquivos conferidos: ${copiados.length}`);
console.log(`  achados proibidos:   ${suspeitos}`);
if (suspeitos > 0) {
  console.log('');
  // Apaga sozinho. Mandar alguem apagar a mao uma pasta com chave dentro, num
  // drive que a empresa inteira enxerga, e confiar que a pessoa leu o aviso.
  console.log('🔴 A CÓPIA TEM COISA QUE NÃO PODIA IR — APAGANDO O DESTINO.');
  rmSync(DESTINO, { recursive: true, force: true });
  console.log(`   ${existsSync(DESTINO) ? '⚠ NAO CONSEGUI APAGAR: apague a mao ' + DESTINO : 'destino apagado.'}`);
  console.log('   Conserte o script (ou o arquivo) e rode de novo.');
  process.exit(1);
}
console.log('');
console.log(`✅ copiado: ${copiados.length} arquivos, ${(total / 1024 / 1024).toFixed(1)} MB, sem nenhuma chave.`);
console.log(`   ${DESTINO}`);
console.log(`   comece pelo "LEIA-ME DA TI.md" na raiz da pasta.`);

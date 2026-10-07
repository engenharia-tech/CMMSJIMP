@echo off
REM Atualiza a copia do CMMS em V:\TI\PROJETOS TI\engenharia\CMMS-JIMP.
REM Pode ser executado com dois cliques, de qualquer lugar: o %~dp0 aponta
REM para a pasta deste arquivo, e o script acha o projeto pela propria
REM localizacao. Rodar a cada publicacao.
chcp 65001 >nul
echo.
npx tsx "%~dp0scripts\copiar-para-ti.ts" %*
echo.
echo ----------------------------------------------------------
echo Terminou. Leia as linhas acima: se disser "achados proibidos"
echo diferente de zero, a pasta foi apagada de proposito.
echo ----------------------------------------------------------
pause

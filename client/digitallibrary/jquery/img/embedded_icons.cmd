rem @echo off
setlocal

rem saxon embedded.svg embedded_icons.xsl

set ink=C:\prog_mr\inkscape-0.48.1\inkscape.exe

for %%f in (embedded\svg\*.svg) do (
    echo %%~nf
	%ink% %%f --export-png=embedded\16\%%~nf.png -w16 -h16
	%ink% %%f --export-png=embedded\32\%%~nf.png -w32 -h32
	)

endlocal
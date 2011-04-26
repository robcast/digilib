@echo off
setlocal

rem saxon embedded.svg embedded_icons.xsl

set ink=C:\prog_mr\inkscape-0.48.1\inkscape.exe

%ink% embedded\svg\%1.svg --export-png=embedded\16\%1.png -w16 -h16
%ink% embedded\svg\%1.svg --export-png=embedded\32\%1.png -w32 -h32

endlocal
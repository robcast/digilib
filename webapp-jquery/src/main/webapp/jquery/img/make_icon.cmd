@echo off
setlocal

rem saxon embedded.svg embedded_icons.xsl

set ink=U:\programme\inkscape\inkscape.exe

%ink% fullscreen\svg_gen\%1.svg --export-png=fullscreen\16\%1.png -w16 -h16
%ink% fullscreen\svg_gen\%1.svg --export-png=fullscreen\32\%1.png -w32 -h32

endlocal
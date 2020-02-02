@echo off
setlocal
set SVGFILE=fullscreen3.svg
set XSLTFILE=gen_fullscreen_icons.xsl
set SVGDIR=fullscreen\svg_gen
rem PNG directory relative to SVGDIR
set PNGDIR=32

rem run XSLT to create separate SVG files (in fullscreen/svg)
set SAXON=java -jar U:\Programme\Saxon-9.1\saxon9.jar
echo Running Saxon to create separate SVGs
mkdir %SVGDIR%
%SAXON% %SVGFILE% %XSLTFILE%

rem create PNGs from separate SVGs using inkscape
set INKSCAPE=U:\programme\inkscape\inkscape.exe
echo Running Inkscape to create PNGs
cd %SVGDIR%
mkdir %PNGDIR%
for %%f in (*.svg) do (
    echo %%f
    %INKSCAPE% --file=%%f --export-height=32 --export-png=%PNGDIR%\%%~nf.png
    )

echo done.
endlocal

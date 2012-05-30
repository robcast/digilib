#!/bin/bash
#
# script for creating PNG icons from icon SVG file

SVGFILE="fullscreen3.svg"
XSLTFILE="gen_fullscreen_icons.xsl"
SVGDIR="fullscreen/svg_gen"
# PNG directory relative to SVGDIR
PNGDIR="32"

# run XSLT to create separate SVG files (in fullscreen/svg)
#SAXON="java -jar /Volumes/Schlachteplatte/stuff/java/lib/saxonb9-1-0-7j/saxon9.jar"
SAXON="java -jar /Users/casties/tmp/java/SaxonHE9-4-0-3J/saxon9he.jar"
echo "running Saxon to create separate SVGs"
mkdir -p $SVGDIR
$SAXON $SVGFILE $XSLTFILE

# create PNGs from separate SVGs using inkscape
#INKSCAPE=" /Volumes/Schlachteplatte/Applications/Inkscape.app/Contents/Resources/bin/inkscape"
INKSCAPE=" /Applications/Inkscape.app/Contents/Resources/bin/inkscape"
echo "running Inkscape to create PNGs"
cd $SVGDIR
mkdir -p $PNGDIR
ls *.svg | while read fx
do 
    f=`basename "$fx" svg`
    $INKSCAPE --file="$fx" --export-area-drawing --export-height=32 --export-png="$PNGDIR/${f}png"
    #$INKSCAPE --file="$fx" --export-height=32 --export-png="$PNGDIR/${f}png"
done
echo "done."

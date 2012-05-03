<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
   xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns:xlink="http://www.w3.org/1999/xlink"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
	>
	
<!--
Create icons from a single SVG file.
In the SVG the icons reside in labelled groups.
The visible layers will be present in all SVG files,
the hidden layers just once per SVG file. -->

<xsl:output method="xml"/>

<xsl:template match="/">
    <!-- select all layers -->
    <xsl:apply-templates select="//svg:g[@inkscape:groupmode='layer']" />
</xsl:template>

<xsl:template match="svg:g">
    <xsl:variable name="name" select="@inkscape:label"/>
    <xsl:variable name="file" select="concat('fullscreen/svg/',$name,'.svg')"/>
    <xsl:result-document href="{$file}">
    <svg:svg>
        <xsl:copy-of select="/svg:svg/@*"/>
        <xsl:copy-of select="/svg:svg/*[not(@style='display:none')]"/>
        <svg:g>
            <xsl:copy-of select="@*"/>
            <!-- replace the "style" attribute -->
            <xsl:attribute name="style">display:inline</xsl:attribute>
            <xsl:copy-of select="*"/>
        </svg:g>
    </svg:svg>
    </xsl:result-document>
</xsl:template>


</xsl:stylesheet>


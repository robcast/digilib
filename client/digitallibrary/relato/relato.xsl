<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

  <xsl:output method="xml" indent="yes" encoding="iso-8859-1"
    doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"
    doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" />

  <!-- the start -->
  <xsl:template match="relato">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <script type="text/javascript">
          <xsl:apply-templates select="functions" />
          <xsl:apply-templates select="buttons" />
        </script>
        <script type="text/javascript" src="relato/relato.js"></script>
      </head>
      <xsl:apply-templates select="frames" />
    </html>
  </xsl:template>

  <xsl:template match="frames">
    <xsl:copy-of select="frameset" />
  </xsl:template>

  <xsl:template match="functions">
    <xsl:for-each select="function">
      function <xsl:value-of select="@name" />() {
        if (frameSelected()) {
          <xsl:for-each select="validInFrame">
            if (nameOfSelectedFrame() == "<xsl:value-of select="@name" />") {
              id = selectedFrameObject();
              return id.<xsl:value-of select="../@name" />(<xsl:value-of select="../@name" />.arguments[0], <xsl:value-of select="../@name" />.arguments[1], <xsl:value-of select="../@name" />.arguments[2], <xsl:value-of select="../@name" />.arguments[3]);
            }
          </xsl:for-each>
        } else {
          <xsl:choose>
            <xsl:when test="not(@quiet = 'true')">
              // alert message
              noFrameSelected();
            </xsl:when>
            <xsl:otherwise>
              // be quiet
              return false;
            </xsl:otherwise>
          </xsl:choose>
        }
      }
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="buttons">
    function dynamicButtons() {
      var btns = '';
      <xsl:for-each select="button">
      btns += '#<xsl:value-of select="@name" />|<xsl:value-of select="@command" />';</xsl:for-each>
      return btns.slice(1);
    }
  </xsl:template>

</xsl:stylesheet>

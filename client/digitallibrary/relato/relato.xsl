<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

  <xsl:output method="xml" indent="yes" encoding="iso-8859-1"
    doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"
    doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" />

  <!-- the start -->
  <xsl:template match="relato">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <script type="text/javascript" src="relato/relato.js">
        // this comment has to be here, otherwise xerces translates this
        // empty tag to a self-closing one, which is bad for HTML that
        // needs a closing script-tag
        </script>
        <script type="text/javascript">
          <xsl:apply-templates select="functions" />
          <xsl:apply-templates select="buttons" />
          <xsl:apply-templates select="protected" />
          <xsl:apply-templates select="default" />
        </script>
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
              if (typeof(id.<xsl:value-of select="../@name" />) == 'function') {
                return id.<xsl:value-of select="../@name" />(<xsl:value-of select="../@name" />.arguments[0], <xsl:value-of select="../@name" />.arguments[1], <xsl:value-of select="../@name" />.arguments[2], <xsl:value-of select="../@name" />.arguments[3]);
              }
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

  <xsl:template match="protected">
    function protectedFrames() {
      var frames = new Array ();
      <xsl:for-each select="frame">
      frames.push('<xsl:value-of select="@name" />');</xsl:for-each>
      return frames;
    }
  </xsl:template>

  <xsl:template match="default">
    top.focused.name = '<xsl:value-of select="frame/@name" />';
  </xsl:template>

</xsl:stylesheet>

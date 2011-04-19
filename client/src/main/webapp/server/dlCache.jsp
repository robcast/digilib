<%@ page language="java" %>

<%!
// authentication stuff - robert
// -----------------------------
// create DocumentBean instance for all JSP requests
digilib.servlet.DocumentBean docBean = new digilib.servlet.DocumentBean();

// initialize DocumentBean instance in JSP init
public void jspInit() {
    try {
        // set servlet init-parameter
        docBean.setConfig(getServletConfig());
    } catch (javax.servlet.ServletException e) {
        System.out.println(e);
    }
}
%>

<%
// get digilib config
digilib.servlet.DigilibConfiguration dlConfig = docBean.getDlConfig();
// dir cache
digilib.io.DocuDirCache dirCache = (digilib.io.DocuDirCache) dlConfig.getValue("servlet.dir.cache");
%>

<html>
<head>
<title>Digilib cache info</title>
</head>

<h1>Digilib cache info</h1>


 <table>
  <tr>
	<td>size (directories)</td><td><b><%= dirCache.size() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>numFiles</td><td><b><%= dirCache.getNumFiles() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>hits</td><td><b><%= dirCache.getHits() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>misses</td><td><b><%= dirCache.getMisses() %></b></td>
    <td></td>
  </tr>
</table>

<table>
<%
    Object[] keys = dirCache.getChildren("", true).toArray();
    java.util.Arrays.sort(keys);
    int l = keys.length;
    for (int i = 0; i < l; i++) {
	String key = (String) keys[i];
	//	digilib.io.DocuDirectory val = (digilib.io.DocuDirectory) dirCache.getDirectory(key);
%>
  <tr>
       <td valign="top"><%= key %></td><td><b><%= 1 /* val.getDirName() */ %></b></td>
    <td></td>
  </tr>
<%
       }
%>
</table>

</body>
</html>

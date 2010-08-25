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
// parsing the query
digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
// add number of pages
dlRequest.setValue("pt", docBean.getNumPages(dlRequest));
// dir cache
digilib.io.DocuDirCache dirCache = (digilib.io.DocuDirCache) dlConfig.getValue("servlet.dir.cache");
%>

<html>
<head>
<title>Digilib configuration page</title>
</head>
<body>

<h1>Global servlet configuration</h1>

<table>
<%
    Object[] keys = dlConfig.keySet().toArray();
    java.util.Arrays.sort(keys);
    int l = keys.length;
    for (int i = 0; i < l; i++) {
	String key = (String) keys[i];
	String val = dlConfig.getAsString(key);
	if (key.equals("basedir-list")) {
	    String[] bd = (String[]) dlConfig.getValue("basedir-list");
	    val = "";
	    if (bd != null) {
		for (int j = 0; j < bd.length; j++) {
		    val += bd[j] + "<br> ";
		}
	    }
	}
	if (val.length() == 0) {
	    val = "(none)";
	}
%>
  <tr>
    <td valign="top"><%= key %></td><td><b><%= val %></b></td>
    <td></td>
  </tr>
<%
       }
%>
</table>

<h2>Threads</h2>

<table>
  <tr>
    <td>currently waiting</td><td><b><%= digilib.servlet.DigilibWorker.getNumWaiting() %></b></td>
    <td></td>
  </tr>
  <tr>
    <td>currently running</td><td><b><%= digilib.servlet.DigilibWorker.getNumRunning() %></b></td>
    <td></td>
  </tr>
</table>

<h2>Directory cache</h2>

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

<h2>JVM configuration</h2>

<table>
  <tr>
	<td>java.awt.headless</td><td><b><%= System.getProperty("java.awt.headless") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>java.version</td><td><b><%= System.getProperty("java.version") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>java.vendor</td><td><b><%= System.getProperty("java.vendor") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>os.name</td><td><b><%= System.getProperty("os.name") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>Runtime.maxMemory</td><td><b><%= Runtime.getRuntime().maxMemory() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>Runtime.totalMemory</td><td><b><%= Runtime.getRuntime().totalMemory() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>Runtime.freeMemory</td><td><b><%= Runtime.getRuntime().freeMemory() %></b></td>
    <td></td>
  </tr>
</table>

<h2>DocuImage configuration</h2>

<p>Supported image types</p>
<ul>
<% 
  java.util.Iterator dlfs = dlConfig.getDocuImageInstance().getSupportedFormats();
  for (Object f = dlfs.next(); dlfs.hasNext(); f = dlfs.next()) {
%>
  <li><%= (String)f %></li>
<% 
  }
%>
</ul>


</body>
</html>

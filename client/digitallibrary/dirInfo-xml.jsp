<%@ page language="java" %><%!
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
%><?xml version="1.0" encoding="UTF-8" ?>
<%
// process request
// get digilib config
digilib.servlet.DigilibConfiguration dlConfig = docBean.getDlConfig();
// parsing the query
digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
// dir cache
digilib.io.DocuDirCache dirCache = (digilib.io.DocuDirCache) dlConfig.getValue("servlet.dir.cache");
// get directory
digilib.io.DocuDirectory dir = dirCache.getDirectory(dlRequest.getFilePath());

%><!-- Automatically generated XML snippet with directory info -->
<dir><% if (dir != null) { %>
  <name><%= dir.getDirName() %></name>
  <fsname><%= dir.getDir().getPath() %></fsname> 
<%
    int l = dir.size();
    for (int i = 0; i < l; i++) {
    		digilib.io.DocuDirent f = dir.get(i); 
%>  <file>
    <index><%= i+1 %></index>
    <name><%= (f != null) ? f.getBasename() : "null" %></name>
    <fsname><%= (f != null) ? f.getName() : "null" %></fsname>
  </file> 
<%
    } // for 
  } // if dir 
%></dir>

<%@page import="digilib.io.FileOps"%><%@ page language="java" %><%!
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
FileOps.FileClass fc = FileOps.FileClass.IMAGE;
int dirSize = dir.size(fc);

%><!-- Automatically generated XML snippet with directory info -->
<dir><% if (dir != null) { %>
  <size><%= dirSize %></size>
  <name><%= dir.getDirName() %></name>
  <fsname><%= dir.getDir().getPath() %></fsname> 
<%
    if (!dlRequest.hasOption("mo", "dir")) {
      for (int i = 0; i < dirSize; i++) {
        digilib.io.DocuDirent f = dir.get(i, fc);
        String fn = (f != null) ? f.getName() : "null";
%>  <file>
    <index><%= i+1 %></index>
    <name><%= digilib.io.FileOps.basename(fn) %></name>
    <fsname><%= fn %></fsname>
  </file>
<%
      } // for 
    } // if not dironly
  } // if dir 
%></dir>

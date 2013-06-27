<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2004 - 2013 MPIWG Berlin
  %%
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as 
  published by the Free Software Foundation, either version 3 of the 
  License, or (at your option) any later version.
  
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Lesser Public License for more details.
  
  You should have received a copy of the GNU General Lesser Public 
  License along with this program.  If not, see
  <http://www.gnu.org/licenses/lgpl-3.0.html>.
  #L%
  Author: Robert Casties (robcast@berlios.de)
  --%><%@ page language="java"
    import="digilib.servlet.DocumentBean,
          digilib.conf.DigilibServletConfiguration,
          digilib.conf.DigilibServletRequest,
          digilib.io.DocuDirCache,
          digilib.io.DocuDirectory,
          digilib.io.DocuDirent,
          digilib.io.FileOps,
          java.io.File"%>
   
<%!
// create DocumentBean instance for all JSP requests
DocumentBean docBean = new DocumentBean();

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
DigilibServletConfiguration dlConfig = docBean.getDlConfig();
// parsing the query
DigilibServletRequest dlRequest = new DigilibServletRequest(request);
// dir cache
DocuDirCache dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
// get directory
DocuDirectory dir = dirCache.getDirectory(dlRequest.getFilePath());
FileOps.FileClass fc = FileOps.FileClass.IMAGE;
int dirSize = dir != null ? dir.size(fc) : 0;

%><!-- Automatically generated XML snippet with directory info -->
<dir><% if (dir != null) { %>
  <size><%= dirSize %></size>
  <name><%= dir.getDirName() %></name>
  <fsname><%= dir.getDir().getPath() %></fsname> 
<%
    if (!dlRequest.hasOption("mo", "dir")) {
      for (int i = 0; i < dirSize; i++) {
        DocuDirent f = dir.get(i, fc);
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

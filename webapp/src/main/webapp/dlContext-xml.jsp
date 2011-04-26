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
digilib.servlet.DigilibServletRequest dlRequest = new digilib.servlet.DigilibServletRequest(request);
// dir cache
digilib.io.DocuDirCache dirCache = (digilib.io.DocuDirCache) dlConfig.getValue("servlet.dir.cache");

%><!-- Automatically generated XML snippet with document context -->
<result>
<%
int pn = dlRequest.getAsInt("pn");
String fn = dlRequest.getFilePath();
String ctx = "";
digilib.io.DocuDirent f = dirCache.getFile(fn, pn, digilib.io.FileOps.FileClass.IMAGE);
if (f != null) {
    //ctx = "hasfile:"+f.getName();
    f.checkMeta();
    java.util.HashMap meta = f.getFileMeta();
    if (meta != null) {
	//ctx = "JSP:hasmeta!";
	if (meta.containsKey("context")) {
	    ctx = (String) meta.get("context");
	}
    }
}
%><%= ctx %>
</result>

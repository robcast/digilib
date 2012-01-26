<%@page language="java" 
	import="digilib.io.FileOps, digilib.io.ImageFileSet, digilib.io.ImageFile, 
	digilib.util.ImageSize, digilib.servlet.DigilibConfiguration"
	contentType="application/json"%><%!
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
%><%
// parsing the query
digilib.servlet.DigilibServletRequest dlRequest = new digilib.servlet.DigilibServletRequest(request);
docBean.setRequest(dlRequest);
// dir cache
digilib.servlet.DigilibConfiguration dlConfig = docBean.getDlConfig();
digilib.io.DocuDirCache dirCache = (digilib.io.DocuDirCache) dlConfig.getValue("servlet.dir.cache");
// get file
FileOps.FileClass fc = FileOps.FileClass.IMAGE;
ImageFileSet imgFile = (ImageFileSet) dirCache.getFile(dlRequest.getFilePath(), dlRequest.getAsInt("pn"), fc);

%>{ <% 
    if (imgFile != null) {
        imgFile.checkMeta();
		ImageFile img = (ImageFile) imgFile.getBiggest();
		ImageSize imgSize = img.getSize(); 
		%>
  "filename" : "<%= imgFile.getName() %>",
  "aspect" : <%= imgFile.getAspect() %>,
  "dpi_x" : <%= imgFile.getResX() %>,
  "dpi_y" : <%= imgFile.getResY() %><%
  
        if (imgSize != null) { 
            %>,
  "width" : <%= imgSize.getWidth() %>,
  "height" : <%= imgSize.getHeight() %>
<% 		}
  	} 
%>}

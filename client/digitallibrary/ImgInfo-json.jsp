<%@page language="java" 
	import="digilib.io.FileOps, digilib.io.ImageFileset, digilib.io.ImageFile, 
	digilib.image.ImageSize, digilib.servlet.DigilibConfiguration"
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
digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
docBean.setRequest(dlRequest);
// dir cache
digilib.servlet.DigilibConfiguration dlConfig = docBean.getDlConfig();
digilib.io.DocuDirCache dirCache = (digilib.io.DocuDirCache) dlConfig.getValue("servlet.dir.cache");
// get file
FileOps.FileClass fc = FileOps.FileClass.IMAGE;
ImageFileset imgFile = (ImageFileset) dirCache.getFile(dlRequest.getFilePath(), dlRequest.getAsInt("pn"), fc);

%>// JSON format metadata about an image
{ <% 
    if (imgFile != null) {
		ImageFile img = imgFile.getBiggest();
		if (!img.isChecked()) {
			DigilibConfiguration.docuImageIdentify(img);
		}
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

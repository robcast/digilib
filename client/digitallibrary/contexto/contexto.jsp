<%@ page language="java" %>                                                       
<%@ page import="java.io.*" %>
<%@ page import="java.net.*" %>

<%
    digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest();
    dlRequest.setWithRequest(request);

%>

<%
    // Possible parameters
    String htmlPage = request.getParameter("htmlPage");
    // neu eingebaut - christian
    // @beat: kannst du das zeugs bitte checken und mir sagen, ob du
    // dagegen bist oder nicht. es ist ein uebler hack, der keine
    // kontrollmechanismen hat, aber im moment halt meinen anspruechen
    // genuegt. (den import von java.net.* ist auch von mir)
    String htmlURL = request.getParameter("htmlURL");
    String xmlURL = request.getParameter("xmlURL");
    String xslURL = request.getParameter("xslURL");
    String fileName = request.getParameter("fn");
    String pageNumber = request.getParameter("pn");

    // funcktioniert leider nicht - christian
    //System.setProperty("http.proxyHost", "proxy.unibe.ch");
    //System.setProperty("http.proxyPort", "8080");

    if(htmlPage != null) {
        response.getWriter().println(htmlPage);
        // neue parameterart eingebaut - christian
    } else if(htmlURL != null) { 
        try {
            URL u = new URL(htmlURL);
            String content_type = u.openConnection().getContentType();
            InputStream is = u.openStream();
            InputStreamReader isr = new InputStreamReader(is);
            BufferedReader br = new BufferedReader(isr);
            //response.setContentType(content_type);
            String aLine;
            while ((aLine = br.readLine()) != null) {
                response.getWriter().println(aLine);
            }
        } catch (Exception e) {
            response.getWriter().println(e);
        }
    } else if((xmlURL != null)  && (xslURL != null)) { 
        out.println("xsl");
        response.sendRedirect("http://sophia.unibe.ch:8080/xslt/ApplyXSLT?URL="+ xmlURL + "&xslURL=" + xslURL);
    } else if(fileName != null && pageNumber != null) {
        response.sendRedirect("http://hera.unibe.ch:8080/alcatraz/servlet/Texter?fn=" + fileName + "&pn=" + pageNumber);
    }
%>

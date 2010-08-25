import java.io.*;
import java.net.*;
import java.util.*;
import javax.servlet.*;
import javax.servlet.http.*;
import javax.xml.transform.*;
import javax.xml.transform.dom.*;
import javax.xml.transform.stream.*;
import org.apache.xerces.parsers.DOMParser;
import org.apache.xpath.*;
import org.w3c.dom.*;

public class Relato extends HttpServlet {
  
	public final static String FS = System.getProperty("file.separator"); 

	// Respond to HTTP GET requests from browsers.
	public void doGet (HttpServletRequest request, HttpServletResponse response)
                       throws ServletException, IOException {

		Hashtable params = new Hashtable();
		Enumeration enum = request.getParameterNames();
		while (enum.hasMoreElements()) {
			String pName = (String) enum.nextElement();
			params.put(pName, request.getParameter(pName));

		}
		// Set content type for HTML.
		response.setContentType("text/html; charset=UTF-8");    
		// Output goes to the response PrintWriter.
		PrintWriter out = response.getWriter();
		DOMParser parser = new DOMParser();

		try {	
			TransformerFactory tFactory = TransformerFactory.newInstance();
			//get the real path for xml and xsl files.
			String ctx = getServletContext().getRealPath("") + FS;        

			parser.parse(ctx + (String) params.get("xml"));
			Document document = parser.getDocument();
			
			Element topFrameset = (Element) XPathAPI.selectSingleNode(document, "/relato/frames/frameset");
			topFrameset.setAttribute("onload", "init();");
			
			NodeList nodelist = XPathAPI.selectNodeList(document, "//frameset/frame");
			for (int i = 0; i < nodelist.getLength(); i++) {
				Element elem = (Element)nodelist.item(i);
				String name = elem.getAttribute("name");
				if (name != "") {
					if (params.containsKey(name)) {
						String src  = (String) params.get(name);
						elem.setAttribute("src", src);
					}
				}
			}

			Source xmlSource = new DOMSource (document);
			Source xslSource = new StreamSource (new URL("file", "", ctx+"relato/relato.xsl").openStream());
			// Generate the transformer.
			Transformer transformer = tFactory.newTransformer(xslSource);
			// Perform the transformation, sending the output to the response.
			transformer.transform(xmlSource, new StreamResult(out));
    	}

		// If an Exception occurs, return the error to the client.
		catch (Exception e) {
			out.write(e.getMessage());
			e.printStackTrace(out);    
		}

		// Close the PrintWriter.
		out.close();
	}
}

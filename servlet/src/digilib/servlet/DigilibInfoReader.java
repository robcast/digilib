package digilib.servlet;

/** DigilibInfoReader 
 * A class for reading the information from info.xml files used in digilib image directories.
 *
 */

import java.io.File;
import java.util.List;

import org.apache.log4j.Logger;
import org.jdom.*;
import org.jdom.input.*;
import org.jdom.output.*;



public class DigilibInfoReader {

	/** gengeral logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");
	
	private String filename = null;
	private static String base_element = "info";
	
	public DigilibInfoReader(String fn){
		filename = fn;
	}

	
	public String getAsString(String attr){
		try{
			SAXBuilder builder = new SAXBuilder();
			Document doc = builder.build(new File(filename));
			Element root = doc.getRootElement();
			List mainElements = root.getChildren();
			logger.debug("XML mainElements:"+mainElements.toString());

			for(int i=0; i<mainElements.size(); i++){
				Element elem = (Element) mainElements.get(i);
				if(elem.getName()==attr){
					logger.debug(attr+" == "+(String)elem.getTextTrim());
					return (String)elem.getTextTrim();
				}
			}

		}
		catch(Exception e){
			logger.error(e.getMessage());
		}
		return null;
	}
	
	public boolean hasInfo(){
		try {
			SAXBuilder builder = new SAXBuilder();
			Document doc = builder.build(new File(filename));
			return true;
		}
		catch(Exception e){
			return false;
		}
	}
	
}

/* XMLListLoader -- Load an XML list into a Hashtable

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.io;

// JAXP packages
import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

import org.apache.log4j.Logger;
import org.xml.sax.Attributes;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;
import org.xml.sax.helpers.DefaultHandler;

/** Loads a simple XML list into a HashMap.
 * 
 * The XML file has an outer <code>list_tag</code>. Every entry is an 
 * <code>entry_tag</code> with two attributes: the <code>key_att</code>
 * key and the <code>value_att</code> value.
 * 
 * The file is read by the <code>loadURL</code> method, that returns a
 * HashMap with the key-value pairs.
 * 
 * @author casties
 */
public class XMLListLoader {

	private Logger logger = Logger.getLogger(this.getClass());
	private String listTag = "list";
	private String entryTag = "entry";
	private String keyAtt = "key";
	private String valueAtt = "value";

	public XMLListLoader() {
	}

	public XMLListLoader(
		String list_tag,
		String entry_tag,
		String key_att,
		String value_att) {
		logger.debug("xmlListLoader("+list_tag+","+entry_tag+","+key_att+","+value_att+")");
		listTag = list_tag;
		entryTag = entry_tag;
		keyAtt = key_att;
		valueAtt = value_att;
	}

	/**
	 *  inner class XMLListParser to be called by the parser
	 */
	private class XMLListParser extends DefaultHandler {

		private Map<String, String> listData;
		private LinkedList<String> tagSpace;

		public Map<String, String> getData() {
			return listData;
		}

		// Parser calls this once at the beginning of a document
		public void startDocument() throws SAXException {
			listData = new HashMap<String, String>();
			tagSpace = new LinkedList<String>();
		}

		// Parser calls this for each element in a document
		public void startElement(
			String namespaceURI,
			String localName,
			String qName,
			Attributes atts)
			throws SAXException {
			//System.out.println("<"+qName);
			// open a new namespace
			tagSpace.addLast(qName);

			// ist it an entry tag?
			if (qName.equals(entryTag)) {
				// is it inside a list tag?
				if ((listTag.length() > 0) && (!tagSpace.contains(listTag))) {
					logger.error("BOO: Entry "
							+ entryTag
							+ " not inside list "
							+ listTag);
					throw new SAXParseException(
						"Entry " + entryTag + " not inside list " + listTag,
						null);
				}
				// get the attributes
				String key = atts.getValue(keyAtt);
				String val = atts.getValue(valueAtt);
				if ((key == null) || (val == null)) {
					logger.error("BOO: Entry "
							+ entryTag
							+ " does not have Attributes "
							+ keyAtt
							+ ", "
							+ valueAtt);
					throw new SAXParseException(
						"Entry "
							+ entryTag
							+ " does not have Attributes "
							+ keyAtt
							+ ", "
							+ valueAtt,
						null);
				}
				// add the values
				//System.out.println("DATA: "+key+" = "+val);
				listData.put(key, val);
			}
		}

		public void endElement(
			String namespaceURI,
			String localName,
			String qName)
			throws SAXException {
			// exit the namespace
			tagSpace.removeLast();
		}

	}

	/**
	 *  load and parse a file (as URL)
	 *    returns HashMap with list data
	 */
	public Map<String, String> loadURL(String path) throws SAXException, IOException {
		//System.out.println("loadurl ("+path+")");
		// Create a JAXP SAXParserFactory and configure it
		SAXParserFactory spf = SAXParserFactory.newInstance();
		spf.setNamespaceAware(true);

		SAXParser parser = null;
		try {
			// Create a JAXP SAXParser
			parser = spf.newSAXParser();

		} catch (ParserConfigurationException e) {
			throw new SAXException(e);
		}

		// create a list parser (keeps the data!)
		XMLListParser listParser = new XMLListParser();

		// Tell the SAXParser to parse the XML document
		parser.parse(path, listParser);

		return listParser.getData();
	}

}

/* XMLMetaLoader -- Load an XML format metadata into a Hashtable

  Digital Image Library servlet components

  Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)

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

import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedList;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

import org.xml.sax.Attributes;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

public class XMLMetaLoader {

	private String outerTag = "resource";
	private String metaTag = "meta";
	private String fileTag = "file";
	private String fileNameTag = "name";
	private String filePathTag = "path";
	private String infoTag = "img";

	public XMLMetaLoader() {
	}

	/**
	 *  inner class XMLMetaParser to be called by the parser
	 */
	private class XMLMetaParser extends DefaultHandler {

		private LinkedList tags;
		private HashMap files;
		private HashMap meta;
		private StringBuffer content;
		private String fileName;
		private String filePath;

		/**
		 * extracts the elements name from either localName ln or qName qn.
		 * 
		 * @param ln localName
		 * @param qn qName
		 * @return element name
		 */
		private String getName(String ln, String qn) {
			if (ln != null) {
				if (ln.length() > 0) {
					return ln;
				}
			}
			// else it's qName (or nothing)
			return qn;
		}

		// Parser calls this once at the beginning of a document
		public void startDocument() throws SAXException {
			tags = new LinkedList();
			files = new HashMap();
		}

		// Parser calls this for each element in a document
		public void startElement(
			String namespaceURI,
			String localName,
			String qName,
			Attributes atts)
			throws SAXException {

			String name = getName(localName, qName);
			// open a new tag
			tags.addLast(name);
			// start new content (no nesting of tags and content)
			content = new StringBuffer();

			if (name.equals(metaTag)) {
				// new meta tag
				meta = new HashMap();
			} else if (name.equals(fileTag)) {
				// new file tag
				fileName = null;
				filePath = null;
				meta = new HashMap();
			}
		}

		// parser calls this for all tag content (possibly more than once)
		public void characters(char[] ch, int start, int length)
			throws SAXException {
			// append data to current string buffer
			content.append(ch, start, length);
		}

		// parser calls this at the end of each element
		public void endElement(
			String namespaceURI,
			String localName,
			String qName)
			throws SAXException {

			String name = getName(localName, qName);
			// exit the tag
			tags.removeLast();

			// was it a file/name tag?
			if (name.equals(fileNameTag) && tags.contains(fileTag)) {
				// save name as filename
				if ((content != null) && (content.length() > 0)) {
					fileName = content.toString().trim();
				}
				return;
			}

			// was it a file/path tag?
			if (name.equals(filePathTag) && tags.contains(fileTag)) {
				// save path as filepath 
				if ((content != null) && (content.length() > 0)) {
					filePath = content.toString().trim();
				}
				return;
			}

			// was it a file tag?
			if (name.equals(fileTag)) {
				// is there meta to save?
				if ((meta != null) && (meta.size() > 0)) {
					// file name is (optional file/path) / file/name
					String fn = null;

					if (fileName != null) {
						if (filePath != null) {
							fn = filePath + "/" + fileName;
						} else {
							fn = fileName;
						}
					} else {
						// no file name, no file
						return;
					}
					// save meta in file list 
					files.put(fn, meta);
				}
				return;
			}

			// was it a meta tag outside a file tag?
			if (name.equals(metaTag) && !tags.contains(fileTag)) {
				// save meta as dir meta
				if ((meta != null) && (meta.size() > 0)) {
					files.put("", meta);
				}
				return;
			}

			// is this inside an info (=img) tag?
			if (tags.contains(infoTag)) {
				// then add whatever this is
				if ((content != null) && (content.length() > 0)) {
					meta.put(name, content.toString().trim());
				}
			}

		}

	}

	/**
	 *  load and parse a file (as URL)
	 *    returns HashMap with list data
	 */
	public HashMap loadURL(String path) throws SAXException, IOException {
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
		XMLMetaParser listParser = new XMLMetaParser();

		// Tell the SAXParser to parse the XML document
		parser.parse(path, listParser);

		return listParser.files;
	}

}

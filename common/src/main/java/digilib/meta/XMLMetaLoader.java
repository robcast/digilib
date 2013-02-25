package digilib.meta;

/*
 * #%L
 * XMLMetaLoader -- Load an XML format metadata into a Hashtable
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2003 - 2013 Robert Casties (robcast@mail.berlios.de)
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 */

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
import org.xml.sax.helpers.DefaultHandler;

public class XMLMetaLoader {

	private Logger logger = Logger.getLogger(this.getClass());
	private String metaTag = "meta";
	private String fileTag = "file";
	private String fileNameTag = "name";
	private String filePathTag = "path";
	private String imgTag = "img";
	private String collectTag = "context";

	public XMLMetaLoader() {
	}

	/**
	 *  inner class XMLMetaParser to be called by the parser
	 */
	private class XMLMetaParser extends DefaultHandler {

		private LinkedList<String> tags;
		private Map<String, MetadataMap> files;
		private MetadataMap meta;
		private StringBuffer content;
		private boolean collecting;
		private StringBuffer collectedContent;
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

		/**
		 * returns all attributes as a String
		 * 
		 * @param attrs
		 * @return 
		 */
		private String getAttrString(Attributes attrs) {
			StringBuffer s = new StringBuffer();
			for (int i = 0; i < attrs.getLength(); i++) {
				String key = getName(attrs.getLocalName(i), attrs.getQName(i));
				s.append(" "+key+"=\""+attrs.getValue(i)+"\"");
			}
			return s.toString();
		}

			
		// Parser calls this once at the beginning of a document
		public void startDocument() throws SAXException {
			tags = new LinkedList<String>();
			files = new HashMap<String, MetadataMap>();
			collecting = false;
			collectedContent = null;
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
				meta = new MetadataMap();
				collectedContent = new StringBuffer();
			} else if (name.equals(fileTag)) {
				// new file tag
				fileName = null;
				filePath = null;
				meta = new MetadataMap();
				collectedContent = new StringBuffer();
			} else if (name.equals(collectTag)) {
				// start collecting
				collecting = true;
				if (collectedContent == null) {
					collectedContent = new StringBuffer();
				}
			}
			
			// record mode
			if (collecting) {
				collectedContent.append("<"+name);
				collectedContent.append(getAttrString(atts));
				collectedContent.append(">");
			}
		}

		// parser calls this for all tag content (possibly more than once)
		public void characters(char[] ch, int start, int length)
			throws SAXException {
			// append data to current string buffer
			if (content == null) {
				content = new StringBuffer();
			}
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
			String lastTag = (tags.isEmpty()) ? "" : tags.getLast();

			// was it a file/name tag?
			if (name.equals(fileNameTag) && lastTag.equals(fileTag)) {
				// save name as filename
				if ((content != null) && (content.length() > 0)) {
					fileName = content.toString().trim();
				}
				content = null;
				return;
			}

			// was it a file/path tag?
			if (name.equals(filePathTag) && lastTag.equals(fileTag)) {
				// save path as filepath 
				if ((content != null) && (content.length() > 0)) {
					filePath = content.toString().trim();
				}
				content = null;
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
						content = null;
						return;
					}
					// save meta in file list 
					files.put(fn, meta);
				}
				content = null;
				return;
			}

			// was it a meta tag outside a file tag?
			if (name.equals(metaTag) && !tags.contains(fileTag)) {
				// save meta as dir meta
				if ((meta != null) && (meta.size() > 0)) {
					files.put("", meta);
				}
				content = null;
				return;
			}

			// is this inside an digilib info (=img) tag?
			if (lastTag.equals(imgTag)) {
				// then add whatever this is
				if ((content != null) && (content.length() > 0)) {
					meta.put(name, content.toString().trim());
				}
				content = null;
				return;
			}

			// is this the end of collectTag?
			if (name.equals(collectTag)) {
				collecting = false;
				collectedContent.append("</"+collectTag+">\n");
				// store collected stuff
				meta.put(collectTag, collectedContent.toString());
				//logger.debug("collected: '"+collectedContent+"'");
				content = null;
				return;
			}

			// write collected content
			if (collecting) {
				String s = "";
				if ((content != null) && (content.length() > 0)) {
					s = content.toString().trim();
				}
				//logger.debug("collect:"+name+" = "+s);
				collectedContent.append(s);
				collectedContent.append("</"+name+">\n");
				content = null;
				return;
			}
		}

	}

	/**
	 *  load and parse a file (as URL)
	 *    returns HashMap with list data
	 */
	public Map<String, MetadataMap> loadURL(String path) throws SAXException, IOException {
		logger.debug("loading meta: "+path);
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
